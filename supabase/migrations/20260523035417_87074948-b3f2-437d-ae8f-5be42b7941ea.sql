
-- Ledger table
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount integer not null,
  balance_after integer,
  kind text not null,
  reason text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_ledger_user_created on public.credit_ledger(user_id, created_at desc);

alter table public.credit_ledger enable row level security;

drop policy if exists "users read own ledger" on public.credit_ledger;
create policy "users read own ledger" on public.credit_ledger
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "owners read all ledger" on public.credit_ledger;
create policy "owners read all ledger" on public.credit_ledger
  for select to authenticated using (public.has_role(auth.uid(), 'owner'));

-- Helper to write a ledger entry
create or replace function public.log_credit_change(
  _user_id uuid,
  _amount integer,
  _kind text,
  _reason text default null,
  _reference_id text default null,
  _metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _balance integer;
begin
  select credits into _balance from public.profiles where id = _user_id;
  insert into public.credit_ledger (user_id, amount, balance_after, kind, reason, reference_id, metadata)
  values (_user_id, _amount, _balance, _kind, _reason, _reference_id, coalesce(_metadata, '{}'::jsonb));
end $$;

-- Updated handle_new_user: also log signup grant
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
  grant_amount integer := case when is_admin then 999999 else 25 end;
begin
  insert into public.profiles (id, email, display_name, credits, is_owner, api_key)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    grant_amount,
    is_admin,
    encode(gen_random_bytes(16), 'hex')
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);

  perform public.log_credit_change(
    new.id,
    grant_amount,
    case when is_admin then 'admin_signup_bonus' else 'signup_bonus' end,
    case when is_admin then 'Owner account created with unlimited credits' else 'Welcome bonus on signup' end,
    null,
    jsonb_build_object('email', new.email)
  );
  return new;
end $$;

-- Updated add_credits: log grant
create or replace function public.add_credits(
  user_uuid uuid,
  amount integer,
  payment_method text default 'paypal',
  transaction_id text default null,
  amount_paid numeric default 0
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
begin
  update public.profiles set credits = credits + amount
    where id = user_uuid returning credits into new_credits;
  if new_credits is null then
    raise exception 'Profile not found';
  end if;
  insert into public.purchases (user_id, credits, amount_paid, payment_method, transaction_id, status)
    values (user_uuid, amount, amount_paid, payment_method, transaction_id, 'completed');

  perform public.log_credit_change(
    user_uuid,
    amount,
    'purchase',
    format('Purchased %s credits via %s', amount, payment_method),
    transaction_id,
    jsonb_build_object('payment_method', payment_method, 'amount_paid', amount_paid)
  );
  return new_credits;
end $$;

-- Updated deduct_credits: log deduction
create or replace function public.deduct_credits(user_uuid uuid, amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
  is_owner_user boolean;
begin
  select public.has_role(user_uuid, 'owner') into is_owner_user;
  if is_owner_user then
    select credits into new_credits from public.profiles where id = user_uuid;
    perform public.log_credit_change(
      user_uuid, 0, 'owner_free_use',
      format('Owner generation (no charge, would cost %s)', amount), null, '{}'::jsonb
    );
    return new_credits;
  end if;
  update public.profiles
    set credits = credits - amount
    where id = user_uuid and credits >= amount
    returning credits into new_credits;
  if new_credits is null then
    raise exception 'Insufficient credits';
  end if;
  perform public.log_credit_change(
    user_uuid, -amount, 'generation',
    format('Spent %s credits on generation', amount), null, '{}'::jsonb
  );
  return new_credits;
end $$;

-- Admin manual adjustment (owners only)
create or replace function public.admin_adjust_credits(
  target_user_id uuid,
  delta integer,
  note text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_credits integer;
begin
  if not public.has_role(auth.uid(), 'owner') then
    raise exception 'Only owners can adjust credits';
  end if;
  update public.profiles set credits = greatest(0, credits + delta)
    where id = target_user_id returning credits into new_credits;
  if new_credits is null then
    raise exception 'Profile not found';
  end if;
  perform public.log_credit_change(
    target_user_id,
    delta,
    'admin_adjustment',
    coalesce(note, 'Admin credit adjustment'),
    auth.uid()::text,
    jsonb_build_object('admin_id', auth.uid())
  );
  return new_credits;
end $$;

-- Backfill purchases
insert into public.credit_ledger (user_id, amount, balance_after, kind, reason, reference_id, metadata, created_at)
select
  p.user_id,
  p.credits,
  null,
  'purchase',
  format('Purchased %s credits via %s', p.credits, p.payment_method),
  p.transaction_id,
  jsonb_build_object('payment_method', p.payment_method, 'amount_paid', p.amount_paid, 'backfilled', true),
  p.created_at
from public.purchases p
where not exists (
  select 1 from public.credit_ledger l
  where l.kind = 'purchase'
    and l.user_id = p.user_id
    and l.reference_id is not distinct from p.transaction_id
    and l.created_at = p.created_at
);

-- Backfill generations
insert into public.credit_ledger (user_id, amount, balance_after, kind, reason, reference_id, metadata, created_at)
select
  g.user_id,
  -g.credits_used,
  null,
  'generation',
  format('Spent %s credits on %s', g.credits_used, g.generation_type),
  g.id::text,
  jsonb_build_object('generation_type', g.generation_type, 'status', g.status, 'backfilled', true),
  g.created_at
from public.generations g
where g.credits_used > 0
  and not exists (
    select 1 from public.credit_ledger l
    where l.kind = 'generation' and l.reference_id = g.id::text
  );
