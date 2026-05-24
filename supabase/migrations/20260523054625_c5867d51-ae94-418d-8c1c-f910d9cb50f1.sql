CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com','kinlochdavid8@gmail.com'];
  manager_emails text[] := array['mirkwood25@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
  is_manager_flag boolean := lower(new.email) = any (manager_emails);
  grant_amount integer := case when is_admin then 999999 else 25 end;
  ref_code text := nullif(upper(trim(coalesce(new.raw_user_meta_data->>'referral_code', ''))), '');
  referrer_id uuid := null;
  new_code text := upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
  bonus_amount integer := 50;
begin
  if ref_code is not null then
    select id into referrer_id
    from public.profiles
    where upper(referral_code) = ref_code
    limit 1;
  end if;

  insert into public.profiles (id, email, display_name, credits, is_owner, is_manager, api_key, referral_code, referred_by, owner_email)
  values (
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

  if referrer_id is not null and referrer_id <> new.id then
    if not is_admin then
      perform public.log_credit_change(
        new.id, bonus_amount, 'referral_bonus',
        format('Referral bonus for using code %s', ref_code),
        ref_code, jsonb_build_object('referrer_id', referrer_id)
      );
    end if;

    update public.profiles set credits = credits + bonus_amount where id = referrer_id;

    perform public.log_credit_change(
      referrer_id, bonus_amount, 'referral_bonus',
      format('Earned %s credits for referring %s', bonus_amount, new.email),
      new.id::text, jsonb_build_object('referred_user_id', new.id, 'referred_email', new.email)
    );

    insert into public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
    values (referrer_id, new.id, ref_code, bonus_amount, case when is_admin then 0 else bonus_amount end);
  end if;

  return new;
end $function$;