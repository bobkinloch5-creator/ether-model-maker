-- Track device fingerprints per account to enforce one-account-per-user
CREATE TABLE public.account_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fingerprint_hash text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_account_fp_hash ON public.account_fingerprints (fingerprint_hash);
CREATE INDEX idx_account_fp_ip ON public.account_fingerprints (ip_hash);
CREATE INDEX idx_account_fp_user ON public.account_fingerprints (user_id);

ALTER TABLE public.account_fingerprints ENABLE ROW LEVEL SECURITY;

-- Only owners can read; writes happen only via service role (server fn)
CREATE POLICY "owners read all fingerprints"
  ON public.account_fingerprints
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role));

-- Function to check if a fingerprint or IP already has an account
-- Returns true if signup should be BLOCKED
CREATE OR REPLACE FUNCTION public.fingerprint_already_used(
  _fingerprint_hash text,
  _ip_hash text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_fingerprints
    WHERE fingerprint_hash = _fingerprint_hash
       OR (_ip_hash IS NOT NULL AND ip_hash = _ip_hash)
  );
$$;
