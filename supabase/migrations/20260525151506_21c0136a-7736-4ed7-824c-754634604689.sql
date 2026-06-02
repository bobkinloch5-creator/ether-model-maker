
-- Fix redeem_promo: signal authorized bypass before updating credits
create or replace function public.redeem_promo(_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  promo public.promo_codes; clean text := nullif(upper(trim(coalesce(_code, ''))), '');
  new_balance integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if clean is null then raise exception 'Code required'; end if;
  select * into promo from public.promo_codes where upper(code) = clean for update;
  if promo.id is null then raise exception 'Invalid code'; end if;
  if not promo.active then raise exception 'Code is inactive'; end if;
  if promo.expires_at is not null and promo.expires_at < now() then raise exception 'Code expired'; end if;
  if promo.max_uses is not null and promo.uses_count >= promo.max_uses then raise exception 'Code has reached its usage limit'; end if;
  if exists (select 1 from public.promo_redemptions where promo_id = promo.id and user_id = auth.uid()) then
    raise exception 'You already redeemed this code';
  end if;
  insert into public.promo_redemptions (promo_id, user_id, credits_granted) values (promo.id, auth.uid(), promo.credits);
  update public.promo_codes set uses_count = uses_count + 1 where id = promo.id;
  perform set_config('app.allow_protected_profile_update', 'on', true);
  update public.profiles set credits = credits + promo.credits where id = auth.uid() returning credits into new_balance;
  perform public.log_credit_change(auth.uid(), promo.credits, 'promo_redemption',
    format('Redeemed promo code %s', promo.code), promo.code, jsonb_build_object('promo_id', promo.id));
  return jsonb_build_object('success', true, 'credits', promo.credits, 'balance', new_balance, 'code', promo.code);
end $$;

-- Seed LAUNCH250 promo code (250 credits, expires June 10, 2026)
insert into public.promo_codes (code, credits, expires_at, active, note, created_by)
select 'LAUNCH250', 250, '2026-06-10 23:59:59+00'::timestamptz, true, 'Launch promo — 250 credits',
       (select id from public.profiles where is_owner = true order by created_at asc limit 1)
where not exists (select 1 from public.promo_codes where upper(code) = 'LAUNCH250');
