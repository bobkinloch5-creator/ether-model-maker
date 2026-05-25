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
  select public.has_role(user_uuid, 'owner') into is_owner_user;
  if is_owner_user then
    select credits into new_credits from public.profiles where id = user_uuid;
    return new_credits;
  end if;

  -- Authorized bypass for the profile-protection trigger; scoped to this transaction.
  perform set_config('app.allow_protected_profile_update', 'on', true);

  update public.profiles
    set credits = credits - amount
    where id = user_uuid and credits >= amount
    returning credits into new_credits;

  if new_credits is null then
    raise exception 'Insufficient credits';
  end if;
  return new_credits;
end
$function$;