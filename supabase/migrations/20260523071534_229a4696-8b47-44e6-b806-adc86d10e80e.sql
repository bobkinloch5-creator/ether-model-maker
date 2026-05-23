CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Owners can manage all profile fields.
  IF public.has_role(auth.uid(), 'owner') THEN
    RETURN NEW;
  END IF;

  -- Trusted backend functions can temporarily opt in to protected updates.
  IF current_setting('app.allow_protected_profile_update', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.id            IS DISTINCT FROM OLD.id
  OR NEW.email         IS DISTINCT FROM OLD.email
  OR NEW.is_owner      IS DISTINCT FROM OLD.is_owner
  OR NEW.is_manager    IS DISTINCT FROM OLD.is_manager
  OR NEW.credits       IS DISTINCT FROM OLD.credits
  OR NEW.is_banned     IS DISTINCT FROM OLD.is_banned
  OR NEW.ban_reason    IS DISTINCT FROM OLD.ban_reason
  OR NEW.banned_at     IS DISTINCT FROM OLD.banned_at
  OR NEW.owner_email   IS DISTINCT FROM OLD.owner_email
  OR NEW.api_key       IS DISTINCT FROM OLD.api_key
  OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
  OR NEW.referred_by   IS DISTINCT FROM OLD.referred_by
  THEN
    RAISE EXCEPTION 'Cannot modify protected profile fields';
  END IF;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.add_credits(
  user_uuid uuid,
  amount integer,
  payment_method text DEFAULT 'paypal'::text,
  transaction_id text DEFAULT NULL::text,
  amount_paid numeric DEFAULT 0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_credits integer;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_uuid AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  PERFORM set_config('app.allow_protected_profile_update', 'on', true);

  UPDATE public.profiles
  SET credits = credits + amount
  WHERE id = user_uuid
  RETURNING credits INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.purchases (user_id, credits, amount_paid, payment_method, transaction_id, status)
  VALUES (user_uuid, amount, amount_paid, payment_method, transaction_id, 'completed');

  PERFORM public.log_credit_change(
    user_uuid,
    amount,
    'purchase',
    format('Purchased %s credits via %s', amount, payment_method),
    transaction_id,
    jsonb_build_object('payment_method', payment_method, 'amount_paid', amount_paid)
  );

  RETURN new_credits;
END $function$;

CREATE OR REPLACE FUNCTION public.deduct_credits(user_uuid uuid, amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_credits integer;
  is_owner_user boolean;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_uuid AND NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT public.has_role(user_uuid, 'owner') INTO is_owner_user;

  IF is_owner_user THEN
    SELECT credits INTO new_credits FROM public.profiles WHERE id = user_uuid;
    PERFORM public.log_credit_change(
      user_uuid,
      0,
      'owner_free_use',
      format('Owner generation (no charge, would cost %s)', amount),
      NULL,
      '{}'::jsonb
    );
    RETURN new_credits;
  END IF;

  PERFORM set_config('app.allow_protected_profile_update', 'on', true);

  UPDATE public.profiles
  SET credits = credits - amount
  WHERE id = user_uuid AND credits >= amount
  RETURNING credits INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  PERFORM public.log_credit_change(
    user_uuid,
    -amount,
    'generation',
    format('Spent %s credits on generation', amount),
    NULL,
    '{}'::jsonb
  );

  RETURN new_credits;
END $function$;

CREATE OR REPLACE FUNCTION public.apply_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  me record;
  referrer record;
  bonus_amount integer := 50;
  clean text := nullif(upper(trim(coalesce(_code, ''))), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF clean IS NULL THEN RAISE EXCEPTION 'Referral code required'; END IF;

  SELECT id, credits, is_owner, referred_by, created_at, email INTO me
  FROM public.profiles WHERE id = auth.uid();

  IF me.referred_by IS NOT NULL THEN RAISE EXCEPTION 'Referral already applied'; END IF;
  IF me.created_at < now() - interval '30 days' THEN RAISE EXCEPTION 'Referral window expired'; END IF;

  SELECT id, is_owner INTO referrer
  FROM public.profiles WHERE upper(referral_code) = clean LIMIT 1;

  IF referrer.id IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF referrer.id = me.id THEN RAISE EXCEPTION 'Cannot refer yourself'; END IF;

  PERFORM set_config('app.allow_protected_profile_update', 'on', true);

  UPDATE public.profiles SET referred_by = referrer.id WHERE id = me.id;

  IF NOT me.is_owner THEN
    UPDATE public.profiles SET credits = credits + bonus_amount WHERE id = me.id;
    PERFORM public.log_credit_change(
      me.id,
      bonus_amount,
      'referral_bonus',
      format('Applied referral code %s', clean),
      clean,
      jsonb_build_object('referrer_id', referrer.id)
    );
  END IF;

  UPDATE public.profiles SET credits = credits + bonus_amount WHERE id = referrer.id;
  PERFORM public.log_credit_change(
    referrer.id,
    bonus_amount,
    'referral_bonus',
    format('Earned %s credits — %s applied your code', bonus_amount, me.email),
    me.id::text,
    jsonb_build_object('referred_user_id', me.id, 'referred_email', me.email)
  );

  INSERT INTO public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
  VALUES (referrer.id, me.id, clean, bonus_amount, CASE WHEN me.is_owner THEN 0 ELSE bonus_amount END)
  ON CONFLICT (referred_user_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'bonus', bonus_amount);
END $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com','kinlochdavid8@gmail.com'];
  manager_emails text[] := array['mirkwood25@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
  is_manager_flag boolean := lower(new.email) = any (manager_emails);
  grant_amount integer := case when is_admin then 999999 else 25 end;
  ref_code text := nullif(upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', ''))), '');
  referrer_id uuid := null;
  new_code text := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  bonus_amount integer := 50;
BEGIN
  IF ref_code IS NOT NULL THEN
    SELECT id INTO referrer_id
    FROM public.profiles
    WHERE upper(referral_code) = ref_code
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, display_name, credits, is_owner, is_manager, api_key, referral_code, referred_by, owner_email)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    grant_amount + case when referrer_id is not null and not is_admin then bonus_amount else 0 end,
    is_admin,
    is_manager_flag,
    encode(extensions.gen_random_bytes(16), 'hex'),
    new_code,
    referrer_id,
    case when is_admin then new.email else null end
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);

  PERFORM public.log_credit_change(
    new.id,
    grant_amount,
    case when is_admin then 'admin_signup_bonus' else 'signup_bonus' end,
    case when is_admin then 'Owner account created with unlimited credits' else 'Welcome bonus on signup' end,
    null,
    jsonb_build_object('email', new.email)
  );

  IF referrer_id IS NOT NULL AND referrer_id <> new.id THEN
    IF NOT is_admin THEN
      PERFORM public.log_credit_change(
        new.id,
        bonus_amount,
        'referral_bonus',
        format('Referral bonus for using code %s', ref_code),
        ref_code,
        jsonb_build_object('referrer_id', referrer_id)
      );
    END IF;

    PERFORM set_config('app.allow_protected_profile_update', 'on', true);

    UPDATE public.profiles SET credits = credits + bonus_amount WHERE id = referrer_id;

    PERFORM public.log_credit_change(
      referrer_id,
      bonus_amount,
      'referral_bonus',
      format('Earned %s credits for referring %s', bonus_amount, new.email),
      new.id::text,
      jsonb_build_object('referred_user_id', new.id, 'referred_email', new.email)
    );

    INSERT INTO public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
    VALUES (referrer_id, new.id, ref_code, bonus_amount, case when is_admin then 0 else bonus_amount end);
  END IF;

  RETURN new;
END $function$;