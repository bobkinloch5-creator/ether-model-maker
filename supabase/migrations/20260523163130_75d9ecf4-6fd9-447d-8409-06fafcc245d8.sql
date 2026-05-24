-- account_fingerprints table
CREATE TABLE public.account_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fingerprint_hash text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_account_fp_hash ON public.account_fingerprints (fingerprint_hash);
CREATE INDEX idx_account_fp_ip ON public.account_fingerprints (ip_hash);
CREATE INDEX idx_account_fp_user ON public.account_fingerprints (user_id);
ALTER TABLE public.account_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read all fingerprints" ON public.account_fingerprints FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'::app_role));
CREATE POLICY "users insert own fingerprint" ON public.account_fingerprints FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- fingerprint_already_used function
CREATE OR REPLACE FUNCTION public.fingerprint_already_used(_fingerprint_hash text, _ip_hash text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_fingerprints
    WHERE fingerprint_hash = _fingerprint_hash
       OR (_ip_hash IS NOT NULL AND ip_hash = _ip_hash)
  );
$$;

-- roadmap_votes table
CREATE TABLE public.roadmap_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_slug text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_slug, user_id)
);
CREATE INDEX idx_roadmap_votes_slug ON public.roadmap_votes(item_slug);
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own votes" ON public.roadmap_votes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users can vote" ON public.roadmap_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users can remove own vote" ON public.roadmap_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- roadmap_vote_counts view
CREATE OR REPLACE VIEW public.roadmap_vote_counts AS
  SELECT item_slug, (count(*))::integer as vote_count
  FROM public.roadmap_votes
  GROUP BY item_slug;
GRANT SELECT ON public.roadmap_vote_counts TO anon, authenticated;

-- prevent_profile_privilege_escalation
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'owner') THEN RETURN NEW; END IF;
  IF current_setting('app.allow_protected_profile_update', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.is_owner IS DISTINCT FROM OLD.is_owner OR NEW.is_manager IS DISTINCT FROM OLD.is_manager
     OR NEW.credits IS DISTINCT FROM OLD.credits OR NEW.is_banned IS DISTINCT FROM OLD.is_banned
     OR NEW.ban_reason IS DISTINCT FROM OLD.ban_reason OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
     OR NEW.owner_email IS DISTINCT FROM OLD.owner_email OR NEW.api_key IS DISTINCT FROM OLD.api_key
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
  THEN RAISE EXCEPTION 'Cannot modify protected profile fields'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_prevent_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_escalation BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- tighten owners update policy
DROP POLICY IF EXISTS "owners update all profiles" ON public.profiles;
CREATE POLICY "owners update all profiles" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));

-- Profile extensions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS banner_gradient text DEFAULT 'aurora',
  ADD COLUMN IF NOT EXISTS avatar_style text DEFAULT 'avataaars',
  ADD COLUMN IF NOT EXISTS avatar_seed text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles (upper(referral_code));

-- Regenerate api key function
CREATE OR REPLACE FUNCTION public.regenerate_api_key_for(target_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
declare new_key text;
begin
  if auth.uid() is null or auth.uid() <> target_user_id then raise exception 'Not authorized'; end if;
  new_key := encode(extensions.gen_random_bytes(16), 'hex');
  update public.profiles set api_key = new_key where id = target_user_id;
  return new_key;
end $$;

-- admin_set_manager / admin_set_owner / admin_get_analytics stubs if not present
CREATE OR REPLACE FUNCTION public.admin_set_manager(target_user_id uuid, value boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners'; end if;
  update public.profiles set is_manager = value where id = target_user_id;
  return value;
end $$;

CREATE OR REPLACE FUNCTION public.admin_set_owner(target_user_id uuid, value boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners'; end if;
  update public.profiles set is_owner = value where id = target_user_id;
  return value;
end $$;

CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'owner') then raise exception 'Only owners'; end if;
  return jsonb_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_generations', (select count(*) from public.generations),
    'total_purchases', (select count(*) from public.purchases),
    'total_credits_issued', (select coalesce(sum(credits), 0) from public.purchases where status = 'completed')
  );
end $$;

-- apply_referral function
CREATE OR REPLACE FUNCTION public.apply_referral(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  me record; referrer record; bonus_amount integer := 50;
  clean text := nullif(upper(trim(coalesce(_code, ''))), '');
begin
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF clean IS NULL THEN RAISE EXCEPTION 'Referral code required'; END IF;
  SELECT id, credits, is_owner, referred_by, created_at, email INTO me FROM public.profiles WHERE id = auth.uid();
  IF me.referred_by IS NOT NULL THEN RAISE EXCEPTION 'Referral already applied'; END IF;
  IF me.created_at < now() - interval '30 days' THEN RAISE EXCEPTION 'Referral window expired'; END IF;
  SELECT id, is_owner INTO referrer FROM public.profiles WHERE upper(referral_code) = clean LIMIT 1;
  IF referrer.id IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF referrer.id = me.id THEN RAISE EXCEPTION 'Cannot refer yourself'; END IF;
  PERFORM set_config('app.allow_protected_profile_update', 'on', true);
  UPDATE public.profiles SET referred_by = referrer.id WHERE id = me.id;
  IF NOT me.is_owner THEN
    UPDATE public.profiles SET credits = credits + bonus_amount WHERE id = me.id;
    PERFORM public.log_credit_change(me.id, bonus_amount, 'referral_bonus', format('Applied referral code %s', clean), clean, jsonb_build_object('referrer_id', referrer.id));
  END IF;
  UPDATE public.profiles SET credits = credits + bonus_amount WHERE id = referrer.id;
  PERFORM public.log_credit_change(referrer.id, bonus_amount, 'referral_bonus', format('Earned %s credits — %s applied your code', bonus_amount, me.email), me.id::text, jsonb_build_object('referred_user_id', me.id, 'referred_email', me.email));
  INSERT INTO public.referrals (referrer_id, referred_user_id, code_used, referrer_bonus, referred_bonus)
  VALUES (referrer.id, me.id, clean, bonus_amount, CASE WHEN me.is_owner THEN 0 ELSE bonus_amount END)
  ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN jsonb_build_object('success', true, 'bonus', bonus_amount);
end $$;

-- get_credit_reconciliation
CREATE OR REPLACE FUNCTION public.get_credit_reconciliation()
RETURNS TABLE (user_id uuid, email text, display_name text, is_owner boolean, profile_credits integer, ledger_sum integer, diff integer, ledger_entries integer, last_entry_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN RAISE EXCEPTION 'Only owners can run reconciliation'; END IF;
  RETURN QUERY
  SELECT p.id AS user_id, p.email, p.display_name, p.is_owner, p.credits AS profile_credits,
    COALESCE(SUM(l.amount), 0)::int AS ledger_sum,
    (p.credits - COALESCE(SUM(l.amount), 0))::int AS diff,
    COUNT(l.id)::int AS ledger_entries, MAX(l.created_at) AS last_entry_at
  FROM public.profiles p LEFT JOIN public.credit_ledger l ON l.user_id = p.id
  GROUP BY p.id, p.email, p.display_name, p.is_owner, p.credits
  ORDER BY ABS(p.credits - COALESCE(SUM(l.amount), 0)) DESC, p.email;
END $$;

-- get_user_ledger
CREATE OR REPLACE FUNCTION public.get_user_ledger(target_user_id uuid, _limit int default 200, _offset int default 0)
RETURNS TABLE (id uuid, user_id uuid, amount integer, balance_after integer, kind text, reason text, reference_id text, metadata jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(), 'owner') and auth.uid() <> target_user_id then raise exception 'Not authorized'; end if;
  return query
    select l.id, l.user_id, l.amount, l.balance_after, l.kind, l.reason, l.reference_id, l.metadata, l.created_at
    from public.credit_ledger l where l.user_id = target_user_id order by l.created_at desc
    limit greatest(1, least(_limit, 1000)) offset greatest(0, _offset);
end $$;