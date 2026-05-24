
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

-- Backfill referral codes for existing users
UPDATE public.profiles
SET referral_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET DEFAULT upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));

-- 2. Referrals tracking table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code_used text NOT NULL,
  referrer_bonus integer NOT NULL DEFAULT 50,
  referred_bonus integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read all referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "users read referrals they're involved in"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);

-- 3. Update handle_new_user trigger to support referral codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
  grant_amount integer := case when is_admin then 999999 else 25 end;
  ref_code text := nullif(upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', ''))), '');
  referrer record;
  new_code text := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
  bonus_amount integer := 50;
begin
  -- Find referrer if a code was passed
  if ref_code is not null then
    select id, credits, is_owner into referrer
    from public.profiles
    where upper(referral_code) = ref_code
    limit 1;
  end if;

  insert into public.profiles (id, email, display_name, credits, is_owner, api_key, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    grant_amount + case when referrer.id is not null and not is_admin then bonus_amount else 0 end,
    is_admin,
    encode(gen_random_bytes(16), 'hex'),
    new_code,
    referrer.id
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

  -- Referral bonuses
  if referrer.id is not null and referrer.id <> new.id then
    -- Bonus to new user
    if not is_admin then
      perform public.log_credit_change(
        new.id, bonus_amount, 'referral_bonus',
        format('Referral bonus for using code %s', ref_code),
        ref_code, jsonb_build_object('referrer_id', referrer.id)
      );
    end if;
    -- Bonus to referrer
    update public.profiles set credits = credits + bonus_amount where id = referrer.id;
    perform public.log_credit_change(
      referrer.id, bonus_amount, 'referral_bonus',
      format('Earned %s credits for referring %s', bonus_amount, new.email),
      new.id::text, jsonb_build_object('referred_user_id', new.id, 'referred_email', new.email)
    );

    insert into public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
    values (referrer.id, new.id, ref_code, bonus_amount, case when is_admin then 0 else bonus_amount end);
  end if;

  return new;
end $function$;

-- 4. Allow applying a referral code AFTER signup (one-time)
CREATE OR REPLACE FUNCTION public.apply_referral(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me record;
  referrer record;
  bonus_amount integer := 50;
  clean text := nullif(upper(trim(coalesce(_code, ''))), '');
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if clean is null then raise exception 'Referral code required'; end if;

  select id, credits, is_owner, referred_by, created_at, email into me
  from public.profiles where id = auth.uid();

  if me.referred_by is not null then raise exception 'Referral already applied'; end if;
  if me.created_at < now() - interval '30 days' then raise exception 'Referral window expired'; end if;

  select id, is_owner into referrer
  from public.profiles where upper(referral_code) = clean limit 1;

  if referrer.id is null then raise exception 'Invalid referral code'; end if;
  if referrer.id = me.id then raise exception 'Cannot refer yourself'; end if;

  update public.profiles set referred_by = referrer.id where id = me.id;

  if not me.is_owner then
    update public.profiles set credits = credits + bonus_amount where id = me.id;
    perform public.log_credit_change(
      me.id, bonus_amount, 'referral_bonus',
      format('Applied referral code %s', clean),
      clean, jsonb_build_object('referrer_id', referrer.id)
    );
  end if;

  update public.profiles set credits = credits + bonus_amount where id = referrer.id;
  perform public.log_credit_change(
    referrer.id, bonus_amount, 'referral_bonus',
    format('Earned %s credits — %s applied your code', bonus_amount, me.email),
    me.id::text, jsonb_build_object('referred_user_id', me.id, 'referred_email', me.email)
  );

  insert into public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
  values (referrer.id, me.id, clean, bonus_amount, case when me.is_owner then 0 else bonus_amount end)
  on conflict (referred_user_id) do nothing;

  return jsonb_build_object('success', true, 'bonus', bonus_amount);
end $function$;
