CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
begin
  insert into public.profiles (id, email, display_name, credits, is_owner, api_key)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when is_admin then 999999 else 25 end,
    encode(extensions.gen_random_bytes(16), 'hex'),
    is_admin
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);
  return new;
end $$;

-- Fix arg order mistake above (credits/is_owner swapped) by redefining cleanly:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
declare
  admin_emails text[] := array['bobkinloch5@gmail.com','mirkwood25@gmail.com','aiyerrajiv@gmail.com'];
  is_admin boolean := lower(new.email) = any (admin_emails);
begin
  insert into public.profiles (id, email, display_name, credits, is_owner, api_key)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    case when is_admin then 999999 else 25 end,
    is_admin,
    encode(extensions.gen_random_bytes(16), 'hex')
  );
  insert into public.user_roles (user_id, role)
  values (new.id, case when is_admin then 'owner'::app_role else 'user'::app_role end);
  return new;
end $$;
