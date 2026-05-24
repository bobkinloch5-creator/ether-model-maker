
-- Reconciliation: compare profiles.credits to SUM(credit_ledger.amount) per user.
-- Owner-only; reads across all users via SECURITY DEFINER but checks has_role.
CREATE OR REPLACE FUNCTION public.get_credit_reconciliation()
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  is_owner boolean,
  profile_credits integer,
  ledger_sum integer,
  diff integer,
  ledger_entries integer,
  last_entry_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only owners can run reconciliation';
  END IF;

  RETURN QUERY
  SELECT
    p.id                                        AS user_id,
    p.email                                     AS email,
    p.display_name                              AS display_name,
    p.is_owner                                  AS is_owner,
    p.credits                                   AS profile_credits,
    COALESCE(SUM(l.amount), 0)::int             AS ledger_sum,
    (p.credits - COALESCE(SUM(l.amount), 0))::int AS diff,
    COUNT(l.id)::int                            AS ledger_entries,
    MAX(l.created_at)                           AS last_entry_at
  FROM public.profiles p
  LEFT JOIN public.credit_ledger l ON l.user_id = p.id
  GROUP BY p.id, p.email, p.display_name, p.is_owner, p.credits
  ORDER BY ABS(p.credits - COALESCE(SUM(l.amount), 0)) DESC, p.email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_credit_reconciliation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_credit_reconciliation() TO authenticated;
