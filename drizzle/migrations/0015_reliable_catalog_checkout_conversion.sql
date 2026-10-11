CREATE OR REPLACE FUNCTION public.complete_catalog_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.source = 'catalog' AND NEW.analytics_session_id IS NOT NULL AND NEW.analytics_visitor_id IS NOT NULL THEN
  INSERT INTO public.catalog_sessions(id, visitor_id, rate_key, cart_started_at, checkout_at, last_seen_at)
  VALUES(NEW.analytics_session_id, NEW.analytics_visitor_id, 'checkout', now(), now(), now())
  ON CONFLICT(id) DO UPDATE SET checkout_at = coalesce(catalog_sessions.checkout_at, EXCLUDED.checkout_at), last_seen_at = EXCLUDED.last_seen_at, cart_started_at = coalesce(catalog_sessions.cart_started_at, EXCLUDED.cart_started_at)
  WHERE catalog_sessions.visitor_id = EXCLUDED.visitor_id;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_catalog_session() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_catalog_session() TO service_role;
COMMENT ON FUNCTION public.complete_catalog_session() IS 'Successful catalog orders atomically record conversion even when visit tracking was unavailable; no public session writes or reads.';