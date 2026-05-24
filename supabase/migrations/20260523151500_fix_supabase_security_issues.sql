-- 1. Tighten public.profiles UPDATE policy to restrict column updates
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;

CREATE POLICY "users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND (
      SELECT 
        p.id = profiles.id AND
        p.email = profiles.email AND
        p.credits = profiles.credits AND
        p.api_key = profiles.api_key AND
        p.is_owner = profiles.is_owner AND
        p.is_manager = profiles.is_manager AND
        p.is_banned = profiles.is_banned AND
        (p.ban_reason IS NOT DISTINCT FROM profiles.ban_reason) AND
        (p.banned_at IS NOT DISTINCT FROM profiles.banned_at) AND
        (p.owner_email IS NOT DISTINCT FROM profiles.owner_email) AND
        (p.referral_code IS NOT DISTINCT FROM profiles.referral_code) AND
        (p.referred_by IS NOT DISTINCT FROM profiles.referred_by)
      FROM public.profiles p 
      WHERE p.id = auth.uid()
    )
  );

-- 2. Restrict realtime.messages SELECT/INSERT policies by topic namespace
DROP POLICY IF EXISTS "authenticated users can read realtime" ON realtime.messages;
CREATE POLICY "authenticated users can read realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    (topic = 'teams-collab') OR
    (topic LIKE '%' || auth.uid()::text || '%')
  );

DROP POLICY IF EXISTS "authenticated users can write realtime" ON realtime.messages;
CREATE POLICY "authenticated users can write realtime"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (topic = 'teams-collab') OR
    (topic LIKE '%' || auth.uid()::text || '%')
  );

-- 3. Restrict public.community_likes SELECT policy to only return user's own likes
DROP POLICY IF EXISTS "authenticated read community likes" ON public.community_likes;
CREATE POLICY "authenticated read community likes"
  ON public.community_likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Restrict public.roadmap_votes SELECT policy to only return user's own votes,
-- and create a secure View to expose aggregate vote counts without user IDs.
DROP POLICY IF EXISTS "anyone can read roadmap votes" ON public.roadmap_votes;
CREATE POLICY "anyone can read roadmap votes"
  ON public.roadmap_votes FOR SELECT
  TO anon, authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.roadmap_vote_counts AS
  SELECT item_slug, (count(*))::integer as vote_count
  FROM public.roadmap_votes
  GROUP BY item_slug;

GRANT SELECT ON public.roadmap_vote_counts TO anon, authenticated;

-- 5. Prevent execution of SECURITY DEFINER functions by the PUBLIC (anon) role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_credits(uuid, integer, text, text, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_stats(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_api_key(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_api_key(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.regenerate_api_key_for(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_api_key_for(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.apply_referral(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_referral(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_banned(uuid, boolean, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_delete_generation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_generation(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_wipe_user_generations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_wipe_user_generations(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_manager(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_manager(uuid, boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_owner(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_owner(uuid, boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_get_analytics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.fingerprint_already_used(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fingerprint_already_used(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_credit_reconciliation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_credit_reconciliation() TO authenticated, service_role;

-- Revoke execute on trigger functions from PUBLIC to satisfy security standards
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.community_likes_count_trg() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.community_comments_count_trg() FROM PUBLIC;
