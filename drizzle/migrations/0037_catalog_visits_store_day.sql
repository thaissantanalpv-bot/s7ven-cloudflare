-- Start of the current "store day": the most recent opening time (Sao Paulo) at or before _at.
-- Visits after midnight stay in the shift that opened the previous afternoon. Falls back to midnight when hours are not configured.
CREATE FUNCTION public.store_day_start(_at timestamptz DEFAULT now()) RETURNS timestamptz LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE
 local_now timestamp := _at AT TIME ZONE 'America/Sao_Paulo';
 enabled boolean; hours jsonb; h jsonb; d int; candidate_date date; candidate timestamp;
BEGIN
 SELECT hours_enabled, opening_hours INTO enabled, hours FROM public.store_settings WHERE id = 'main';
 IF coalesce(enabled, false) AND jsonb_typeof(hours) = 'array' THEN
  FOR d IN 0..7 LOOP
   candidate_date := local_now::date - d;
   SELECT x INTO h FROM jsonb_array_elements(hours) x
    WHERE (x->>'day')::int = extract(dow FROM candidate_date)::int AND coalesce((x->>'enabled')::boolean, false) AND (x->>'open') ~ '^\d{2}:\d{2}$'
    LIMIT 1;
   IF h IS NOT NULL THEN
    candidate := candidate_date + (h->>'open')::time;
    IF candidate <= local_now THEN RETURN candidate AT TIME ZONE 'America/Sao_Paulo'; END IF;
   END IF;
  END LOOP;
 END IF;
 RETURN date_trunc('day', local_now) AT TIME ZONE 'America/Sao_Paulo';
END;
$$;
REVOKE ALL ON FUNCTION public.store_day_start(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.store_day_start(timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.catalog_funnel_stats(_period text DEFAULT 'today') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE since_at timestamptz; result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF _period NOT IN ('today','7d','30d','all') THEN RAISE EXCEPTION 'Invalid period'; END IF;
 since_at := CASE _period WHEN 'today' THEN public.store_day_start(now()) WHEN '7d' THEN now() - interval '7 days' WHEN '30d' THEN now() - interval '30 days' ELSE '-infinity'::timestamptz END;
 WITH people AS (
 SELECT person, bool_or(cart_started_at IS NOT NULL) cart, bool_or(checkout_at IS NOT NULL) completed, max(last_seen_at) seen, max(last_seen_at) FILTER (WHERE cart_started_at IS NOT NULL) cart_seen
 FROM public.catalog_sessions_by_person(since_at) GROUP BY person
 ) SELECT jsonb_build_object('visitors',count(*),'carts',count(*) FILTER(WHERE cart),'completed',count(*) FILTER(WHERE completed),'abandoned',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen < now() - interval '30 minutes'),'online',count(*) FILTER(WHERE seen > now() - interval '2 minutes'),'pending',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen >= now() - interval '30 minutes'),'updatedAt',now(),'trackingSince',(SELECT min(started_at) FROM public.catalog_sessions),'periodStart',CASE WHEN _period = 'today' THEN since_at END) INTO result FROM people;
 RETURN result;
END;
$$;