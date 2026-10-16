CREATE OR REPLACE FUNCTION public.order_tracking(_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $fn$
 SELECT jsonb_build_object('status',o.status,'trackingUrl',CASE WHEN o.status='cancelled' OR o.fulfillment='pickup' THEN NULL ELSE o.tracking_url END) FROM public.orders o WHERE o.id=_id AND o.source='catalog'
$fn$;
DO $ddl$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.admin_ai_dashboard_snapshot()'::regprocedure) INTO definition;
 definition := replace(definition, 'FROM public.orders WHERE created_at >=', 'FROM public.orders WHERE status <> ''cancelled'' AND created_at >=');
 EXECUTE definition;
END $ddl$;
COMMENT ON FUNCTION public.order_tracking(uuid) IS 'Public order status + delivery link only; cancellation reasons and customer details stay private.';