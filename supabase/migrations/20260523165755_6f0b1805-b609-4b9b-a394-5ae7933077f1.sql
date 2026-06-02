-- 1) Security definer view -> invoker
ALTER VIEW public.roadmap_vote_counts SET (security_invoker = true);

-- 2) Set search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
begin new.updated_at = now(); return new; end
$$;

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from anon (and public)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, public',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Keep authenticated execute (default grants typically include it; ensure it for user-callable ones)
GRANT EXECUTE ON FUNCTION
  public.create_team(text),
  public.has_role(uuid, app_role),
  public.is_team_member(uuid, uuid),
  public.is_team_owner(uuid, uuid),
  public.regenerate_api_key_for(uuid),
  public.get_user_stats(uuid),
  public.get_user_ledger(uuid, integer, integer),
  public.redeem_promo(text),
  public.apply_referral(text),
  public.invite_to_team(uuid, text, text),
  public.accept_team_invite(uuid),
  public.fingerprint_already_used(text, text)
TO authenticated;

-- 4) Storage: remove broad public listing on models bucket
DROP POLICY IF EXISTS "Public read models" ON storage.objects;
CREATE POLICY "Authenticated list models"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'models');
