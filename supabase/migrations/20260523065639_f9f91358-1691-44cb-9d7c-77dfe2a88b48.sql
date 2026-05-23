
CREATE OR REPLACE FUNCTION public.add_credits(user_uuid uuid, amount integer, payment_method text DEFAULT 'paypal'::text, transaction_id text DEFAULT NULL::text, amount_paid numeric DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_credits integer;
begin
  if auth.uid() is distinct from user_uuid and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Not authorized';
  end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.create_api_key(user_uuid uuid, key_label text DEFAULT 'API Key'::text)
 RETURNS SETOF api_keys
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  new_key text;
begin
  if auth.uid() is distinct from user_uuid and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Not authorized';
  end if;
  new_key := encode(extensions.gen_random_bytes(24), 'hex');
  return query insert into public.api_keys (user_id, key, label) values (user_uuid, new_key, key_label) returning *;
end $function$;

CREATE OR REPLACE FUNCTION public.deduct_credits(user_uuid uuid, amount integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_credits integer;
  is_owner_user boolean;
begin
  if auth.uid() is distinct from user_uuid and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Not authorized';
  end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.get_user_stats(user_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is distinct from user_uuid and not public.has_role(auth.uid(), 'owner') then
    raise exception 'Not authorized';
  end if;
  return (
    select jsonb_build_object(
      'current_credits', coalesce((select credits from public.profiles where id = user_uuid), 0),
      'total_purchased', coalesce((select sum(credits) from public.purchases where user_id = user_uuid and status = 'completed'), 0),
      'total_used', coalesce((select sum(credits_used) from public.generations where user_id = user_uuid), 0),
      'total_generations', coalesce((select count(*) from public.generations where user_id = user_uuid), 0),
      'member_since', coalesce((select created_at from public.profiles where id = user_uuid), now())
    )
  );
end $function$;
