CREATE OR REPLACE FUNCTION public.list_catalog_sales(_offset integer DEFAULT 0)
RETURNS TABLE(id text, data jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id, jsonb_build_object(
 'id',p.id,'name',p.data->'name','description',p.data->'description',
 'price',p.data->'price','category',p.data->'category','emoji',p.data->'emoji',
 'image',p.data->'image','images',coalesce(p.data->'images','[]'::jsonb),
 'active',p.data->'active','stock',p.data->'stock',
 'optionLabel',p.data->'optionLabel','allowOther',p.data->'allowOther',
 'comboGroups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g->'id','name',g->'name','quantity',g->'quantity','productIds',g->'productIds')) FROM jsonb_array_elements(coalesce(p.data->'comboGroups','[]'::jsonb)) g),'[]'::jsonb),
 'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('name',v->'name','active',v->'active','stock',v->'stock')) FROM jsonb_array_elements(p.data->'variations') v),'[]'::jsonb)
 ),p.updated_at FROM public.catalog_products p ORDER BY p.id LIMIT 500 OFFSET greatest(0,least(_offset,100000));
$$;
REVOKE ALL ON FUNCTION public.list_catalog_sales(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_catalog_sales(integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reserve_catalog_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid text; rowdata jsonb; updated jsonb; line jsonb; component jsonb; grp jsonb; variation jsonb; newvars jsonb; totalqty integer; optionqty integer; stockqty integer; opt text; foundoption boolean; demands jsonb := '[]'::jsonb;
BEGIN
-- Lock every top-level and component row in the same deterministic order before validation.
FOR pid IN SELECT DISTINCT x FROM (
 SELECT v->>'productId' x FROM jsonb_array_elements(NEW.items) v
 UNION ALL SELECT c->>'productId' FROM jsonb_array_elements(NEW.items) v CROSS JOIN LATERAL jsonb_array_elements(coalesce(v->'components','[]'::jsonb)) c
) ids ORDER BY x LOOP
 PERFORM 1 FROM public.catalog_products WHERE id=pid FOR UPDATE;
END LOOP;
FOR line IN SELECT value FROM jsonb_array_elements(NEW.items) LOOP
 SELECT data INTO rowdata FROM public.catalog_products WHERE id=line->>'productId';
 IF rowdata IS NOT NULL AND (line->>'price')::numeric <> (rowdata->>'price')::numeric THEN RAISE EXCEPTION 'Price changed'; END IF;
 IF rowdata IS NOT NULL AND jsonb_array_length(coalesce(rowdata->'comboGroups','[]'::jsonb)) > 0 THEN
  IF coalesce(line->'comboGroups','[]'::jsonb) <> rowdata->'comboGroups' THEN RAISE EXCEPTION 'Combo configuration changed'; END IF;
  IF jsonb_array_length(coalesce(line->'components','[]'::jsonb)) = 0 THEN RAISE EXCEPTION 'Combo incomplete'; END IF;
  FOR grp IN SELECT value FROM jsonb_array_elements(rowdata->'comboGroups') LOOP
   SELECT coalesce(sum((c->>'qty')::integer),0) INTO totalqty FROM jsonb_array_elements(line->'components') c WHERE c->>'groupId'=grp->>'id';
   IF totalqty <> (grp->>'quantity')::integer THEN RAISE EXCEPTION 'Combo group incomplete'; END IF;
  END LOOP;
  FOR component IN SELECT value FROM jsonb_array_elements(line->'components') LOOP
   SELECT value INTO grp FROM jsonb_array_elements(rowdata->'comboGroups') WHERE value->>'id'=component->>'groupId';
   IF grp IS NULL OR NOT (grp->'productIds' ? (component->>'productId')) OR component->>'productId'=line->>'productId' OR (component->>'qty')::integer < 1 THEN RAISE EXCEPTION 'Invalid combo component'; END IF;
   IF EXISTS(SELECT 1 FROM public.catalog_products WHERE id=component->>'productId' AND jsonb_array_length(coalesce(data->'comboGroups','[]'::jsonb)) > 0) THEN RAISE EXCEPTION 'Nested combo unavailable'; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.catalog_products WHERE id=component->>'productId') AND component->>'productId' !~ '^p[0-9]+$' THEN RAISE EXCEPTION 'Component unavailable'; END IF;
   demands := demands || jsonb_build_array(jsonb_build_object('productId',component->>'productId','option',coalesce(component->>'option',''),'qty',(component->>'qty')::integer*(line->>'qty')::integer));
  END LOOP;
  demands := demands || jsonb_build_array(jsonb_build_object('productId',line->>'productId','option','','qty',(line->>'qty')::integer));
 ELSE
  IF jsonb_array_length(coalesce(line->'components','[]'::jsonb)) > 0 THEN RAISE EXCEPTION 'Combo changed'; END IF;
  demands := demands || jsonb_build_array(line);
 END IF;
END LOOP;
FOR pid IN SELECT DISTINCT value->>'productId' FROM jsonb_array_elements(demands) ORDER BY 1 LOOP
 SELECT data INTO rowdata FROM public.catalog_products WHERE id=pid FOR UPDATE;
 IF rowdata IS NULL THEN CONTINUE; END IF;
 IF NOT (rowdata->>'active')::boolean THEN RAISE EXCEPTION 'Product unavailable'; END IF;
 SELECT sum((value->>'qty')::integer) INTO totalqty FROM jsonb_array_elements(demands) WHERE value->>'productId'=pid;
 FOR line IN SELECT value FROM jsonb_array_elements(demands) WHERE value->>'productId'=pid LOOP
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
  SELECT coalesce(sum((value->>'qty')::integer),0) INTO optionqty FROM jsonb_array_elements(demands) WHERE value->>'productId'=pid AND value->>'option'=variation->>'name';
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