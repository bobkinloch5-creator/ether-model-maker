
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  totals jsonb;
  daily jsonb;
  top_spenders jsonb;
  recent_purchases jsonb;
  recent_generations jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'owner') THEN
    RAISE EXCEPTION 'Only owners';
  END IF;

  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM public.profiles),
    'managers', (SELECT count(*) FROM public.profiles WHERE is_manager = true),
    'owners', (SELECT count(*) FROM public.profiles WHERE is_owner = true),
    'generations', (SELECT count(*) FROM public.generations),
    'credits_circulating', (SELECT coalesce(sum(credits), 0) FROM public.profiles WHERE is_owner = false),
    'purchases_count', (SELECT count(*) FROM public.purchases WHERE status = 'completed'),
    'revenue_total', (SELECT coalesce(sum(amount_paid), 0) FROM public.purchases WHERE status = 'completed'),
    'credits_sold', (SELECT coalesce(sum(credits), 0) FROM public.purchases WHERE status = 'completed'),
    'revenue_30d', (SELECT coalesce(sum(amount_paid), 0) FROM public.purchases WHERE status = 'completed' AND created_at >= now() - interval '30 days'),
    'new_users_30d', (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'generations_30d', (SELECT count(*) FROM public.generations WHERE created_at >= now() - interval '30 days'),
    'referrals_count', (SELECT count(*) FROM public.referrals)
  ) INTO totals;

  -- Build a 30-day series (fill gaps with 0)
  WITH days AS (
    SELECT generate_series(
      (current_date - interval '29 days')::date,
      current_date,
      interval '1 day'
    )::date AS day
  ),
  pu AS (
    SELECT created_at::date AS day,
           sum(amount_paid)::numeric AS revenue,
           sum(credits)::int AS credits_sold
    FROM public.purchases
    WHERE status = 'completed' AND created_at >= current_date - interval '29 days'
    GROUP BY 1
  ),
  np AS (
    SELECT created_at::date AS day, count(*)::int AS new_users
    FROM public.profiles
    WHERE created_at >= current_date - interval '29 days'
    GROUP BY 1
  ),
  ge AS (
    SELECT created_at::date AS day, count(*)::int AS generations
    FROM public.generations
    WHERE created_at >= current_date - interval '29 days'
    GROUP BY 1
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'day', to_char(d.day, 'MM-DD'),
      'new_users', coalesce(np.new_users, 0),
      'generations', coalesce(ge.generations, 0),
      'revenue', coalesce(pu.revenue, 0),
      'credits_sold', coalesce(pu.credits_sold, 0)
    ) ORDER BY d.day
  ), '[]'::jsonb)
  INTO daily
  FROM days d
  LEFT JOIN pu ON pu.day = d.day
  LEFT JOIN np ON np.day = d.day
  LEFT JOIN ge ON ge.day = d.day;

  -- Top spenders (sum of completed purchases per user)
  SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO top_spenders FROM (
    SELECT p.email, p.display_name,
           coalesce(sum(pu.amount_paid), 0)::numeric AS spent,
           coalesce(sum(pu.credits), 0)::int AS credits
    FROM public.purchases pu
    JOIN public.profiles p ON p.id = pu.user_id
    WHERE pu.status = 'completed'
    GROUP BY p.email, p.display_name
    ORDER BY spent DESC
    LIMIT 10
  ) t;

  -- Recent purchases (last 15)
  SELECT coalesce(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO recent_purchases FROM (
    SELECT pu.id::text, pu.created_at, pu.amount_paid, pu.credits, pu.payment_method,
           p.email, p.display_name
    FROM public.purchases pu
    JOIN public.profiles p ON p.id = pu.user_id
    WHERE pu.status = 'completed'
    ORDER BY pu.created_at DESC
    LIMIT 15
  ) t;

  -- Recent generations (last 20)
  SELECT coalesce(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO recent_generations FROM (
    SELECT g.id::text, g.created_at, g.generation_type, g.credits_used, g.status, p.email
    FROM public.generations g
    JOIN public.profiles p ON p.id = g.user_id
    ORDER BY g.created_at DESC
    LIMIT 20
  ) t;

  result := jsonb_build_object(
    'totals', totals,
    'daily', daily,
    'top_spenders', top_spenders,
    'recent_purchases', recent_purchases,
    'recent_generations', recent_generations
  );

  RETURN result;
END;
$function$;
