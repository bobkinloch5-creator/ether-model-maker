
-- Revoke EXECUTE from anon on all public SECURITY DEFINER functions.
-- They remain callable by authenticated users (RPCs) and the service role.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public',
      fn.schema_name, fn.func_name, fn.args
    );
  END LOOP;
END $$;
