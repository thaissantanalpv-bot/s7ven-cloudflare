ALTER TABLE public.orders ADD COLUMN tracking_url text;
COMMENT ON COLUMN public.orders.tracking_url IS 'Link público de rastreio do entregador, definido pela administração';

CREATE OR REPLACE FUNCTION public.order_tracking(_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('status', o.status, 'trackingUrl', o.tracking_url)
  FROM public.orders o
  WHERE o.id = _id AND o.source = 'catalog' AND o.fulfillment = 'delivery'
$function$;

GRANT EXECUTE ON FUNCTION public.order_tracking(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.order_tracking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_tracking(uuid) TO service_role;