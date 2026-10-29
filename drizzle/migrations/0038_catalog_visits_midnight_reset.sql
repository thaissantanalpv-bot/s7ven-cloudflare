CREATE OR REPLACE FUNCTION public.catalog_funnel_stats(_period text DEFAULT 'today') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE since_at timestamptz; result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF _period NOT IN ('today','7d','30d','all') THEN RAISE EXCEPTION 'Invalid period'; END IF;
 since_at := CASE _period WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' WHEN '7d' THEN now() - interval '7 days' WHEN '30d' THEN now() - interval '30 days' ELSE '-infinity'::timestamptz END;
 WITH people AS (
 SELECT person, bool_or(cart_started_at IS NOT NULL) cart, bool_or(checkout_at IS NOT NULL) completed, max(last_seen_at) seen, max(last_seen_at) FILTER (WHERE cart_started_at IS NOT NULL) cart_seen
 FROM public.catalog_sessions_by_person(since_at) GROUP BY person
 ) SELECT jsonb_build_object('visitors',count(*),'carts',count(*) FILTER(WHERE cart),'completed',count(*) FILTER(WHERE completed),'abandoned',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen < now() - interval '30 minutes'),'online',count(*) FILTER(WHERE seen > now() - interval '2 minutes'),'pending',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen >= now() - interval '30 minutes'),'updatedAt',now(),'trackingSince',(SELECT min(started_at) FROM public.catalog_sessions)) INTO result FROM people;
 RETURN result;
END;
$$;
COMMENT ON FUNCTION public.store_day_start(timestamptz) IS 'DEPRECATED: visits reset at Sao Paulo midnight';