
-- 1. Fix touch_updated_at search_path (linter: function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$ begin new.updated_at = now(); return new; end $$;

-- 2. Prevent privilege escalation via profiles UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admins/owners bypass all restrictions
  IF public.has_role(auth.uid(), 'owner') THEN
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

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Tighten owners-update-all-profiles WITH CHECK (was `true`)
DROP POLICY IF EXISTS "owners update all profiles" ON public.profiles;
CREATE POLICY "owners update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- 4. account_fingerprints: explicit user INSERT scoped to own user_id
DROP POLICY IF EXISTS "users insert own fingerprint" ON public.account_fingerprints;
CREATE POLICY "users insert own fingerprint"
ON public.account_fingerprints
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
