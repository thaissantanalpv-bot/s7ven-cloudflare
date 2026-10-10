CREATE OR REPLACE FUNCTION public.reserve_catalog_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid text; rowdata jsonb; updated jsonb; line jsonb; variation jsonb; newvars jsonb; totalqty integer; optionqty integer; stockqty integer; storedprice numeric; opt text; foundoption boolean;
BEGIN
FOR pid IN SELECT DISTINCT value->>'productId' FROM jsonb_array_elements(NEW.items) ORDER BY 1 LOOP
  SELECT data INTO rowdata FROM public.catalog_products WHERE id=pid FOR UPDATE;
  IF rowdata IS NULL THEN CONTINUE; END IF;
  IF NOT (rowdata->>'active')::boolean THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  SELECT sum((value->>'qty')::integer) INTO totalqty FROM jsonb_array_elements(NEW.items) WHERE value->>'productId'=pid;
  storedprice := (rowdata->>'price')::numeric;
  FOR line IN SELECT value FROM jsonb_array_elements(NEW.items) WHERE value->>'productId'=pid LOOP
    IF (line->>'price')::numeric <> storedprice THEN RAISE EXCEPTION 'Price changed'; END IF;
    opt := coalesce(line->>'option','');
    IF jsonb_array_length(rowdata->'variations') > 0 THEN
      SELECT EXISTS(SELECT 1 FROM jsonb_array_elements(rowdata->'variations') v WHERE v->>'name'=opt) INTO foundoption;
      IF opt='' OR (NOT foundoption AND NOT (rowdata->>'allowOther')::boolean) THEN RAISE EXCEPTION 'Variation unavailable'; END IF;
    ELSIF opt<>'' THEN RAISE EXCEPTION 'Variation unavailable'; END IF;
  END LOOP;
  updated := rowdata;
  IF rowdata->>'stock' IS NOT NULL THEN
    stockqty := (rowdata->>'stock')::integer;
    IF stockqty < totalqty THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
    updated := jsonb_set(updated,'{stock}',to_jsonb(stockqty-totalqty));
  END IF;
  newvars := '[]'::jsonb;
  FOR variation IN SELECT value FROM jsonb_array_elements(rowdata->'variations') LOOP
    SELECT coalesce(sum((value->>'qty')::integer),0) INTO optionqty FROM jsonb_array_elements(NEW.items) WHERE value->>'productId'=pid AND value->>'option'=variation->>'name';
    IF optionqty > 0 THEN
      IF NOT (variation->>'active')::boolean THEN RAISE EXCEPTION 'Variation unavailable'; END IF;
      IF variation->>'stock' IS NOT NULL THEN
        stockqty := (variation->>'stock')::integer;
        IF stockqty < optionqty THEN RAISE EXCEPTION 'Insufficient variation stock'; END IF;
        variation := jsonb_set(variation,'{stock}',to_jsonb(stockqty-optionqty));
      END IF;
    END IF;
    newvars := newvars || jsonb_build_array(variation);
  END LOOP;
  updated := jsonb_set(updated,'{variations}',newvars);
  IF updated IS DISTINCT FROM rowdata THEN UPDATE public.catalog_products SET data=updated, updated_at=clock_timestamp() WHERE id=pid; END IF;
END LOOP;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reserve_catalog_stock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_catalog_stock() TO service_role;
CREATE TRIGGER reserve_catalog_stock BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.reserve_catalog_stock();