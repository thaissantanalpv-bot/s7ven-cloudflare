CREATE OR REPLACE FUNCTION public.list_catalog_sales(_offset integer DEFAULT 0)
 RETURNS TABLE(id text, data jsonb, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT p.id, jsonb_build_object(
 'id',p.id,'name',p.data->'name','description',p.data->'description',
 'price',p.data->'price','compareAtPrice',coalesce(p.data->'compareAtPrice','null'::jsonb),'category',p.data->'category','emoji',p.data->'emoji',
 'image',p.data->'image','images',coalesce(p.data->'images','[]'::jsonb),
 'variationPhotos',coalesce((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(coalesce(p.data->'variationPhotos','{}'::jsonb)) e WHERE e.value = p.data->'image' OR e.value IN (SELECT je.value FROM jsonb_array_elements(coalesce(p.data->'images','[]'::jsonb)) je)),'{}'::jsonb),
 'active',p.data->'active','stock',p.data->'stock','featured',coalesce(p.data->'featured','false'::jsonb),
 'optionLabel',p.data->'optionLabel','allowOther',p.data->'allowOther',
 'comboGroups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g->'id','name',g->'name','quantity',g->'quantity','productIds',g->'productIds')) FROM jsonb_array_elements(coalesce(p.data->'comboGroups','[]'::jsonb)) g),'[]'::jsonb),
 'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('name',v->'name','active',v->'active','stock',v->'stock')) FROM jsonb_array_elements(p.data->'variations') v),'[]'::jsonb)
 ),p.updated_at FROM public.catalog_products p ORDER BY p.id LIMIT 500 OFFSET greatest(0,least(_offset,100000));
$function$;
REVOKE ALL ON FUNCTION public.list_catalog_sales(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_catalog_sales(integer) TO anon, authenticated, service_role;
COMMENT ON COLUMN public.catalog_products.data IS 'compareAtPrice is the optional pre-discount price shown struck through (price is always the charged price). variationPhotos maps variation name to a photo path; only paths already exposed via image/images are projected publicly.';