
SELECT set_config('app.allow_protected_profile_update', 'on', true);

UPDATE public.profiles
SET referral_code = upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
WHERE referral_code IS NULL OR referral_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (upper(referral_code))
  WHERE referral_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
begin
  insert into public.profiles (id, email, display_name, credits, is_owner, api_key, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when is_admin then 999999 else 25 end,
    is_admin,
    encode(extensions.gen_random_bytes(16), 'hex'),
    upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8))
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);
  return new;
end $function$;
