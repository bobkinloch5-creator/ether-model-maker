-- 1. Lock down add_credits: only service_role may call it.
revoke execute on function public.add_credits(uuid, integer, text, text, numeric) from public;
revoke execute on function public.add_credits(uuid, integer, text, text, numeric) from authenticated;
grant execute on function public.add_credits(uuid, integer, text, text, numeric) to service_role;

-- 2. User-callable RPC: submit a purchase claim. Records pending only, no credits granted.
create or replace function public.submit_purchase_request(
  _credits integer,
  _amount numeric,
  _transaction_id text,
  _payment_method text default 'paypal'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  clean_txid text := nullif(trim(coalesce(_transaction_id, '')), '');
  clean_method text := nullif(trim(coalesce(_payment_method, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if _credits is null or _credits <= 0 or _credits > 100000 then
    raise exception 'Invalid credits amount';
  end if;
  if _amount is null or _amount < 0 or _amount > 10000 then
    raise exception 'Invalid amount';
  end if;
  if clean_txid is null or char_length(clean_txid) < 4 or char_length(clean_txid) > 128 then
    raise exception 'Transaction ID required';
  end if;
  if clean_method is null then clean_method := 'paypal'; end if;
  if clean_method not in ('paypal','manual') then
    raise exception 'Invalid payment method';
  end if;

  insert into public.purchases (user_id, credits, amount_paid, payment_method, transaction_id, status)
    values (auth.uid(), _credits, _amount, clean_method, clean_txid, 'pending')
    returning id into new_id;

  return new_id;
end $$;

revoke execute on function public.submit_purchase_request(integer, numeric, text, text) from public;
grant  execute on function public.submit_purchase_request(integer, numeric, text, text) to authenticated;

-- 3. Owner approval: grants credits, marks purchase completed, logs ledger.
create or replace function public.admin_approve_purchase(_purchase_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pur record;
  new_balance integer;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can approve purchases';
  end if;

  select * into pur from public.purchases where id = _purchase_id for update;
  if pur is null then raise exception 'Purchase not found'; end if;
  if pur.status <> 'pending' then
    raise exception 'Purchase is not pending (current: %)', pur.status;
  end if;

  update public.profiles
     set credits = credits + pur.credits
   where id = pur.user_id
   returning credits into new_balance;
  if new_balance is null then raise exception 'Buyer profile not found'; end if;

  update public.purchases
     set status = 'completed'
   where id = pur.id;

  perform public.log_credit_change(
    pur.user_id, pur.credits, 'purchase_approved',
    format('Approved purchase %s (%s)', pur.id, pur.payment_method),
    pur.transaction_id,
    jsonb_build_object('purchase_id', pur.id, 'approved_by', auth.uid(), 'amount_paid', pur.amount_paid)
  );

  return jsonb_build_object('success', true, 'credits', pur.credits, 'balance', new_balance, 'user_id', pur.user_id);
end $$;

revoke execute on function public.admin_approve_purchase(uuid) from public;
grant  execute on function public.admin_approve_purchase(uuid) to authenticated;

-- 4. Owner rejection.
create or replace function public.admin_reject_purchase(_purchase_id uuid, _note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare pur record;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can reject purchases';
  end if;
  select * into pur from public.purchases where id = _purchase_id for update;
  if pur is null then raise exception 'Purchase not found'; end if;
  if pur.status <> 'pending' then
    raise exception 'Purchase is not pending';
  end if;
  update public.purchases set status = 'rejected' where id = pur.id;
  perform public.log_credit_change(
    pur.user_id, 0, 'purchase_rejected',
    coalesce(_note, 'Purchase rejected by admin'),
    pur.transaction_id,
    jsonb_build_object('purchase_id', pur.id, 'rejected_by', auth.uid())
  );
  return true;
end $$;

revoke execute on function public.admin_reject_purchase(uuid, text) from public;
grant  execute on function public.admin_reject_purchase(uuid, text) to authenticated;

-- 5. Owner list of pending purchases (with buyer email/display name).
create or replace function public.admin_list_pending_purchases()
returns table(
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  credits integer,
  amount_paid numeric,
  payment_method text,
  transaction_id text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners';
  end if;
  return query
    select pu.id, pu.user_id, p.email, p.display_name,
           pu.credits, pu.amount_paid, pu.payment_method, pu.transaction_id, pu.created_at
      from public.purchases pu
      join public.profiles p on p.id = pu.user_id
     where pu.status = 'pending'
     order by pu.created_at asc;
end $$;

revoke execute on function public.admin_list_pending_purchases() from public;
grant  execute on function public.admin_list_pending_purchases() to authenticated;