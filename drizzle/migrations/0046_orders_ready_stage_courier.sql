ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['received','preparing','ready','out_for_delivery','delivered','cancelled']));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_times jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.stamp_order_status_time()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_times := jsonb_build_object(NEW.status, to_jsonb(coalesce(NEW.created_at, now())));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_times := coalesce(OLD.status_times, '{}'::jsonb) || jsonb_build_object(NEW.status, to_jsonb(now()));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS stamp_order_status_time ON public.orders;
CREATE TRIGGER stamp_order_status_time BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.stamp_order_status_time();