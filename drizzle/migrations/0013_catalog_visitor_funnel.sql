CREATE TABLE public.catalog_sessions (
 id uuid PRIMARY KEY,
 visitor_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 cart_started_at timestamptz,
 checkout_at timestamptz,
 rate_key text NOT NULL
);
GRANT SELECT ON public.catalog_sessions TO authenticated;
GRANT ALL ON public.catalog_sessions TO service_role;
ALTER TABLE public.catalog_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_catalog_sessions_read ON public.catalog_sessions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX catalog_sessions_started_idx ON public.catalog_sessions(started_at);
CREATE INDEX catalog_sessions_rate_idx ON public.catalog_sessions(rate_key, started_at);
CREATE OR REPLACE FUNCTION public.track_catalog_session(_id uuid, _visitor uuid, _cart boolean, _rate_key text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF length(_rate_key) <> 64 THEN RAISE EXCEPTION 'Invalid tracking'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_rate_key, 0));
 IF NOT EXISTS(SELECT 1 FROM public.catalog_sessions WHERE id = _id) AND (SELECT count(*) FROM public.catalog_sessions WHERE rate_key = _rate_key AND started_at > now() - interval '1 hour') >= 120 THEN RETURN; END IF;
 INSERT INTO public.catalog_sessions(id, visitor_id, rate_key, cart_started_at) VALUES(_id, _visitor, _rate_key, CASE WHEN _cart THEN now() ELSE NULL END)
 ON CONFLICT(id) DO UPDATE SET last_seen_at = now(), cart_started_at = coalesce(catalog_sessions.cart_started_at, EXCLUDED.cart_started_at)
 WHERE catalog_sessions.visitor_id = EXCLUDED.visitor_id AND (catalog_sessions.last_seen_at < now() - interval '15 seconds' OR (catalog_sessions.cart_started_at IS NULL AND _cart));
END;
$$;
REVOKE ALL ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text) TO service_role;
CREATE OR REPLACE FUNCTION public.catalog_funnel_stats(_period text DEFAULT 'today') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE since_at timestamptz; result jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF _period NOT IN ('today','7d','30d','all') THEN RAISE EXCEPTION 'Invalid period'; END IF;
 since_at := CASE _period WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' WHEN '7d' THEN now() - interval '7 days' WHEN '30d' THEN now() - interval '30 days' ELSE '-infinity'::timestamptz END;
 WITH people AS (
 SELECT visitor_id, bool_or(cart_started_at IS NOT NULL) cart, bool_or(checkout_at IS NOT NULL) completed, max(last_seen_at) seen, max(last_seen_at) FILTER (WHERE cart_started_at IS NOT NULL) cart_seen
 FROM public.catalog_sessions WHERE started_at >= since_at GROUP BY visitor_id
 ) SELECT jsonb_build_object('visitors',count(*),'carts',count(*) FILTER(WHERE cart),'completed',count(*) FILTER(WHERE completed),'abandoned',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen < now() - interval '30 minutes'),'online',count(*) FILTER(WHERE seen > now() - interval '2 minutes'),'pending',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen >= now() - interval '30 minutes'),'updatedAt',now(),'trackingSince',(SELECT min(started_at) FROM public.catalog_sessions)) INTO result FROM people;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.catalog_funnel_stats(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.catalog_funnel_stats(text) TO authenticated, service_role;