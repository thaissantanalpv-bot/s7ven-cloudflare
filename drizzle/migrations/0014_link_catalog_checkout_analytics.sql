ALTER TABLE public.orders ADD COLUMN analytics_session_id uuid, ADD COLUMN analytics_visitor_id uuid;
CREATE OR REPLACE FUNCTION public.complete_catalog_session() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NEW.source = 'catalog' AND NEW.analytics_session_id IS NOT NULL THEN
  UPDATE public.catalog_sessions SET checkout_at = coalesce(checkout_at, now()), last_seen_at = now(), cart_started_at = coalesce(cart_started_at, now()) WHERE id = NEW.analytics_session_id AND visitor_id = NEW.analytics_visitor_id;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_catalog_session() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_catalog_session() TO service_role;
CREATE TRIGGER complete_catalog_session AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.complete_catalog_session();