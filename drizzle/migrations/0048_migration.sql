ALTER TABLE public.catalog_sessions ADD COLUMN IF NOT EXISTS checkout_stage smallint NOT NULL DEFAULT 0;
DROP FUNCTION IF EXISTS public.track_catalog_session(uuid, uuid, boolean, text, text);
CREATE FUNCTION public.track_catalog_session(_id uuid, _visitor uuid, _cart boolean, _rate_key text, _device text DEFAULT NULL::text, _stage smallint DEFAULT 0)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE s smallint := greatest(0, least(4, coalesce(_stage, 0)));
BEGIN
 IF length(_rate_key) <> 64 THEN RAISE EXCEPTION 'Invalid tracking'; END IF;
 IF _device IS NOT NULL AND length(_device) <> 64 THEN RAISE EXCEPTION 'Invalid tracking'; END IF;
 IF _cart AND s < 1 THEN s := 1; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_rate_key, 0));
 IF NOT EXISTS(SELECT 1 FROM public.catalog_sessions WHERE id = _id) AND (SELECT count(*) FROM public.catalog_sessions WHERE rate_key = _rate_key AND started_at > now() - interval '1 hour') >= 120 THEN RETURN; END IF;
 INSERT INTO public.catalog_sessions(id, visitor_id, rate_key, cart_started_at, device_key, checkout_stage) VALUES(_id, _visitor, _rate_key, CASE WHEN _cart THEN now() ELSE NULL END, _device, s)
 ON CONFLICT(id) DO UPDATE SET last_seen_at = now(), cart_started_at = coalesce(catalog_sessions.cart_started_at, EXCLUDED.cart_started_at), device_key = coalesce(catalog_sessions.device_key, EXCLUDED.device_key), checkout_stage = greatest(catalog_sessions.checkout_stage, EXCLUDED.checkout_stage)
 WHERE catalog_sessions.visitor_id = EXCLUDED.visitor_id AND (catalog_sessions.last_seen_at < now() - interval '15 seconds' OR (catalog_sessions.cart_started_at IS NULL AND _cart) OR EXCLUDED.checkout_stage > catalog_sessions.checkout_stage);
END;
$function$;
REVOKE ALL ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text, text, smallint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_catalog_session(uuid, uuid, boolean, text, text, smallint) TO service_role;

CREATE OR REPLACE FUNCTION public.catalog_funnel_stats(_period text DEFAULT 'today'::text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public'
AS $function$
DECLARE since_at timestamptz; result jsonb; stages jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF _period NOT IN ('today','7d','30d','all') THEN RAISE EXCEPTION 'Invalid period'; END IF;
 since_at := CASE _period WHEN 'today' THEN date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo' WHEN '7d' THEN now() - interval '7 days' WHEN '30d' THEN now() - interval '30 days' ELSE '-infinity'::timestamptz END;
 WITH people AS (
 SELECT person, bool_or(cart_started_at IS NOT NULL) cart, bool_or(checkout_at IS NOT NULL) completed, max(last_seen_at) seen, max(last_seen_at) FILTER (WHERE cart_started_at IS NOT NULL) cart_seen
 FROM public.catalog_sessions_by_person(since_at) GROUP BY person
 ) SELECT jsonb_build_object('visitors',count(*),'carts',count(*) FILTER(WHERE cart),'completed',count(*) FILTER(WHERE completed),'abandoned',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen < now() - interval '30 minutes'),'online',count(*) FILTER(WHERE seen > now() - interval '2 minutes'),'pending',count(*) FILTER(WHERE cart AND NOT completed AND cart_seen >= now() - interval '30 minutes'),'updatedAt',now(),'trackingSince',(SELECT min(started_at) FROM public.catalog_sessions)) INTO result FROM people;
 SELECT jsonb_build_object('cart',count(*) FILTER(WHERE checkout_stage <= 1),'address',count(*) FILTER(WHERE checkout_stage = 2),'payment',count(*) FILTER(WHERE checkout_stage = 3),'send',count(*) FILTER(WHERE checkout_stage = 4)) INTO stages
 FROM public.catalog_sessions WHERE started_at >= since_at AND cart_started_at IS NOT NULL AND checkout_at IS NULL AND last_seen_at < now() - interval '30 minutes';
 RETURN result || jsonb_build_object('stages', stages);
END;
$function$;