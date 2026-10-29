ALTER TABLE public.catalog_sessions ADD COLUMN IF NOT EXISTS device_key text;
CREATE INDEX IF NOT EXISTS catalog_sessions_device_idx ON public.catalog_sessions(device_key, started_at) WHERE device_key IS NOT NULL;
COMMENT ON COLUMN public.catalog_sessions.device_key IS 'Server-side HMAC of network + browser hints; merges visits from one device when browser storage is lost. Never raw IP.';

DROP FUNCTION IF EXISTS public.track_catalog_session(uuid, uuid, boolean, text);
CREATE FUNCTION public.track_catalog_session(_id uuid, _visitor uuid, _cart boolean, _rate_key text, _device text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF length(_rate_key) <> 64 THEN RAISE EXCEPTION 'Invalid tracking'; END IF;
 IF _device IS NOT NULL AND length(_device) <> 64 THEN RAISE EXCEPTION 'Invalid tracking'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_rate_key, 0));
 IF NOT EXISTS(SELECT 1 FROM public.catalog_sessions WHERE id = _id) AND (SELECT count(*) FROM public.catalog_sessions WHERE rate_key = _rate_key AND started_at > now() - interval '1 hour') >= 120 THEN RETURN; END IF;
 INSERT INTO public.catalog_sessions(id, visitor_id, rate_key, cart_started_at, device_key) VALUES(_id, _visitor, _rate_key, CASE WHEN _cart THEN now() ELSE NULL END, _device)
 ON CONFLICT(id) DO UPDATE SET last_seen_at = now(), cart_started_at = coalesce(catalog_sessions.cart_started_at, EXCLUDED.cart_started_at), device_key = coalesce(catalog_sessions.device_key, EXCLUDED.device_key)
 WHERE catalog_sessions.visitor_id = EXCLUDED.visitor_id AND (catalog_sessions.last_seen_at < now() - interval '15 seconds' OR (catalog_sessions.cart_started_at IS NULL AND _cart));
END;
$$;
REVOKE ALL ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text, text) TO service_role;

-- One person per device: browsers ids that share a device key collapse to the smallest id.
CREATE FUNCTION public.catalog_sessions_by_person(_since timestamptz)
RETURNS TABLE(person uuid, started_at timestamptz, last_seen_at timestamptz, cart_started_at timestamptz, checkout_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
 WITH s AS (SELECT cs.visitor_id, cs.device_key, cs.started_at, cs.last_seen_at, cs.cart_started_at, cs.checkout_at FROM public.catalog_sessions cs WHERE cs.started_at >= _since),
 device_first AS (SELECT s.device_key, min(s.visitor_id::text) AS first_visitor FROM s WHERE s.device_key IS NOT NULL GROUP BY s.device_key),
 visitor_person AS (SELECT s.visitor_id, min(coalesce(d.first_visitor, s.visitor_id::text))::uuid AS person FROM s LEFT JOIN device_first d ON d.device_key = s.device_key GROUP BY s.visitor_id)
 SELECT vp.person, s.started_at, s.last_seen_at, s.cart_started_at, s.checkout_at FROM s JOIN visitor_person vp ON vp.visitor_id = s.visitor_id
$$;
REVOKE ALL ON FUNCTION public.catalog_sessions_by_person(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_sessions_by_person(timestamptz) TO authenticated, service_role;

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

CREATE OR REPLACE FUNCTION public.admin_ai_dashboard_snapshot() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$ DECLARE result jsonb; BEGIN
IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
WITH dates AS (SELECT generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date - 29,(now() AT TIME ZONE 'America/Sao_Paulo')::date,interval '1 day')::date AS date_key),
people AS (SELECT (started_at AT TIME ZONE 'America/Sao_Paulo')::date AS date_key, person, bool_or(cart_started_at IS NOT NULL) AS cart, bool_or(checkout_at IS NOT NULL) AS completed, max(last_seen_at) FILTER (WHERE cart_started_at IS NOT NULL) AS cart_seen FROM public.catalog_sessions_by_person((((now() AT TIME ZONE 'America/Sao_Paulo')::date - 29)::timestamp AT TIME ZONE 'America/Sao_Paulo')) GROUP BY 1,2),
funnel AS (SELECT date_key,count(*) AS visitors,count(*) FILTER(WHERE cart) AS carts,count(*) FILTER(WHERE completed) AS converted,count(*) FILTER(WHERE cart AND NOT completed AND cart_seen < now() - interval '30 minutes') AS abandoned FROM people GROUP BY date_key),
sales AS (SELECT (created_at AT TIME ZONE 'America/Sao_Paulo')::date AS date_key,count(*) FILTER(WHERE source='catalog') AS catalog_orders,count(*) FILTER(WHERE source='counter') AS counter_sales,coalesce(sum(total) FILTER(WHERE source='catalog'),0) AS catalog_order_value,count(*) FILTER(WHERE source='catalog' AND status='delivered') AS delivered,count(*) FILTER(WHERE source='catalog' AND fulfillment='pickup') AS pickup FROM public.orders WHERE status <> 'cancelled' AND created_at >= (((now() AT TIME ZONE 'America/Sao_Paulo')::date - 29)::timestamp AT TIME ZONE 'America/Sao_Paulo') GROUP BY 1)
SELECT jsonb_build_object('capturedAt',now(),'timezone','America/Sao_Paulo','trackingSince',(SELECT min(started_at) FROM public.catalog_sessions),'periods',jsonb_build_object('today',public.catalog_funnel_stats('today'),'7d',public.catalog_funnel_stats('7d'),'30d',public.catalog_funnel_stats('30d'),'all',public.catalog_funnel_stats('all')),'daily',jsonb_agg(jsonb_build_object('date',d.date_key,'visitors',coalesce(f.visitors,0),'carts',coalesce(f.carts,0),'convertedVisitors',coalesce(f.converted,0),'abandoned',coalesce(f.abandoned,0),'catalogOrders',coalesce(s.catalog_orders,0),'counterSales',coalesce(s.counter_sales,0),'catalogOrderValue',coalesce(s.catalog_order_value,0),'delivered',coalesce(s.delivered,0),'pickup',coalesce(s.pickup,0)) ORDER BY d.date_key)) INTO result FROM dates d LEFT JOIN funnel f USING(date_key) LEFT JOIN sales s USING(date_key); RETURN result; END; $$;