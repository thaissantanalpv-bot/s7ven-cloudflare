ALTER TABLE public.orders ADD COLUMN cancellation_reason text, ADD COLUMN cancelled_at timestamptz, ADD COLUMN cancelled_by uuid, ADD COLUMN stock_restored_at timestamptz, ADD COLUMN stock_reservations jsonb, ADD COLUMN cancellation_stock_notes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('received','preparing','out_for_delivery','delivered','cancelled'));

CREATE FUNCTION public.order_stock_snapshot(_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE demands jsonb := '[]'::jsonb; line jsonb; component jsonb; demand record; product jsonb; variation jsonb; result jsonb := '[]'::jsonb;
BEGIN
 FOR line IN SELECT value FROM jsonb_array_elements(_items) LOOP
  demands := demands || jsonb_build_array(jsonb_build_object('productId',line->>'productId','option',CASE WHEN jsonb_array_length(coalesce(line->'components','[]'::jsonb)) > 0 THEN '' ELSE coalesce(line->>'option','') END,'qty',(line->>'qty')::integer));
  FOR component IN SELECT value FROM jsonb_array_elements(coalesce(line->'components','[]'::jsonb)) LOOP
   demands := demands || jsonb_build_array(jsonb_build_object('productId',component->>'productId','option',coalesce(component->>'option',''),'qty',(component->>'qty')::integer*(line->>'qty')::integer));
  END LOOP;
 END LOOP;
 FOR demand IN SELECT value->>'productId' pid, value->>'option' opt, sum((value->>'qty')::integer)::integer qty FROM jsonb_array_elements(demands) GROUP BY 1,2 ORDER BY 1,2 LOOP
  SELECT data INTO product FROM public.catalog_products WHERE id=demand.pid FOR UPDATE;
  SELECT value INTO variation FROM jsonb_array_elements(coalesce(product->'variations','[]'::jsonb)) WHERE value->>'name'=demand.opt;
  result := result || jsonb_build_array(jsonb_build_object('productId',demand.pid,'option',demand.opt,'qty',demand.qty,'productStock',product->>'stock' IS NOT NULL,'variationStock',variation->>'stock' IS NOT NULL));
 END LOOP;
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION public.order_stock_snapshot(jsonb) FROM PUBLIC, anon, authenticated;

-- Older orders retain a snapshot of currently controlled stock; untracked quantities remain untracked.
UPDATE public.orders SET stock_reservations=public.order_stock_snapshot(items) WHERE stock_reservations IS NULL;

CREATE FUNCTION public.capture_order_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
BEGIN
 IF NEW.status='cancelled' OR NEW.cancellation_reason IS NOT NULL OR NEW.cancelled_at IS NOT NULL OR NEW.cancelled_by IS NOT NULL OR NEW.stock_restored_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid initial cancellation'; END IF;
 NEW.stock_reservations := public.order_stock_snapshot(NEW.items);
 NEW.cancellation_stock_notes := '[]'::jsonb;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.capture_order_stock() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER capture_order_stock BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.capture_order_stock();

CREATE FUNCTION public.restore_cancelled_order_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE pid text; product jsonb; updated jsonb; reservation jsonb; variations jsonb; variation jsonb; quantity integer; notes jsonb := '[]'::jsonb;
BEGIN
 IF OLD.status='cancelled' THEN
  IF NEW IS DISTINCT FROM OLD THEN RAISE EXCEPTION 'Cancelled order is immutable'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.items IS DISTINCT FROM OLD.items OR NEW.stock_reservations IS DISTINCT FROM OLD.stock_reservations THEN RAISE EXCEPTION 'Order stock reservation is immutable'; END IF;
 IF NEW.status <> 'cancelled' THEN
  IF NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at OR NEW.cancelled_by IS DISTINCT FROM OLD.cancelled_by OR NEW.stock_restored_at IS DISTINCT FROM OLD.stock_restored_at OR NEW.cancellation_stock_notes IS DISTINCT FROM OLD.cancellation_stock_notes THEN RAISE EXCEPTION 'Invalid cancellation metadata'; END IF;
  RETURN NEW;
 END IF;
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF NEW.cancellation_reason IS NULL OR length(btrim(NEW.cancellation_reason)) < 1 OR length(btrim(NEW.cancellation_reason)) > 300 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
 IF OLD.stock_restored_at IS NOT NULL THEN RAISE EXCEPTION 'Stock already restored'; END IF;
 FOR pid IN SELECT DISTINCT value->>'productId' FROM jsonb_array_elements(coalesce(OLD.stock_reservations,'[]'::jsonb)) ORDER BY 1 LOOP
  SELECT data INTO product FROM public.catalog_products WHERE id=pid FOR UPDATE;
  IF product IS NULL THEN notes := notes || jsonb_build_array('Produto excluído: ' || pid); CONTINUE; END IF;
  updated := product;
  SELECT coalesce(sum((value->>'qty')::integer),0)::integer INTO quantity FROM jsonb_array_elements(OLD.stock_reservations) WHERE value->>'productId'=pid AND (value->>'productStock')::boolean;
  IF quantity > 0 THEN
   IF product->>'stock' IS NOT NULL THEN updated := jsonb_set(updated,'{stock}',to_jsonb((product->>'stock')::integer+quantity));
   ELSE notes := notes || jsonb_build_array('Estoque não controlado: ' || pid); END IF;
  END IF;
  variations := coalesce(product->'variations','[]'::jsonb);
  FOR reservation IN SELECT value FROM jsonb_array_elements(OLD.stock_reservations) WHERE value->>'productId'=pid AND (value->>'variationStock')::boolean LOOP
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(variations) v WHERE v->>'name'=reservation->>'option' AND v->>'stock' IS NOT NULL) THEN
    notes := notes || jsonb_build_array('Variação removida ou sem controle: ' || pid || ' / ' || (reservation->>'option'));
   ELSE
    SELECT jsonb_agg(CASE WHEN v->>'name'=reservation->>'option' THEN jsonb_set(v,'{stock}',to_jsonb((v->>'stock')::integer+(reservation->>'qty')::integer)) ELSE v END ORDER BY n) INTO variations FROM jsonb_array_elements(variations) WITH ORDINALITY AS a(v,n);
   END IF;
  END LOOP;
  updated := jsonb_set(updated,'{variations}',variations);
  IF updated IS DISTINCT FROM product THEN UPDATE public.catalog_products SET data=updated,updated_at=clock_timestamp() WHERE id=pid; END IF;
 END LOOP;
 NEW.cancellation_reason := btrim(NEW.cancellation_reason);
 NEW.cancelled_at := clock_timestamp(); NEW.cancelled_by := auth.uid(); NEW.stock_restored_at := NEW.cancelled_at; NEW.updated_at := NEW.cancelled_at; NEW.tracking_url := NULL; NEW.cancellation_stock_notes := notes;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.restore_cancelled_order_stock() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER restore_cancelled_order_stock BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.restore_cancelled_order_stock();

CREATE FUNCTION public.cancel_store_order(_id uuid, _reason text, _expected_updated_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $fn$
DECLARE saved public.orders;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
 IF _reason IS NULL OR length(btrim(_reason)) < 1 OR length(btrim(_reason)) > 300 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
 SELECT * INTO saved FROM public.orders WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF saved.status='cancelled' THEN RETURN jsonb_build_object('cancelled',true,'alreadyCancelled',true,'stockNotes',saved.cancellation_stock_notes); END IF;
 IF saved.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'Order changed'; END IF;
 UPDATE public.orders SET status='cancelled',cancellation_reason=_reason WHERE id=_id RETURNING * INTO saved;
 RETURN jsonb_build_object('cancelled',true,'alreadyCancelled',false,'stockNotes',saved.cancellation_stock_notes);
END $fn$;
REVOKE ALL ON FUNCTION public.cancel_store_order(uuid,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_store_order(uuid,text,timestamptz) TO authenticated;
