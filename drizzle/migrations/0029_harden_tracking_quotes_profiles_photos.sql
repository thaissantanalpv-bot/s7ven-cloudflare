-- Delivery quotes are only read/written by trusted server code.
DROP POLICY IF EXISTS anon_insert_delivery_quotes ON public.delivery_quotes;
DROP POLICY IF EXISTS read_delivery_quotes ON public.delivery_quotes;
REVOKE ALL ON public.delivery_quotes FROM anon, authenticated;
GRANT ALL ON public.delivery_quotes TO service_role;

-- Profiles: each person reads their own; admins read all.
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Product photos: anonymous listing limited to catalog-linked photos (catalog_photo_read); admins keep full access.
DROP POLICY IF EXISTS public_view_product_photos ON storage.objects;

-- Order tracking requires the order id and the checkout key known only to the customer's browser.
CREATE OR REPLACE FUNCTION public.order_tracking_for(_id uuid, _request_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
 SELECT jsonb_build_object('status',o.status,'trackingUrl',CASE WHEN o.status='cancelled' OR o.fulfillment='pickup' THEN NULL ELSE o.tracking_url END)
 FROM public.orders o WHERE o.id=_id AND o.request_id=_request_id AND o.source='catalog'
$$;
REVOKE ALL ON FUNCTION public.order_tracking_for(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_tracking_for(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.order_tracking(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.order_tracking(uuid) TO service_role;
COMMENT ON FUNCTION public.order_tracking(uuid) IS 'DEPRECATED: replaced by order_tracking_for(_id, _request_id)';