CREATE OR REPLACE FUNCTION public.list_catalog_sales(_offset integer DEFAULT 0)
RETURNS TABLE(id text, data jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT p.id, jsonb_build_object(
 'id',p.id,'name',p.data->'name','description',p.data->'description',
 'price',p.data->'price','category',p.data->'category','emoji',p.data->'emoji',
 'image',p.data->'image','images',coalesce(p.data->'images','[]'::jsonb),
 'active',p.data->'active','stock',p.data->'stock','featured',coalesce(p.data->'featured','false'::jsonb),
 'optionLabel',p.data->'optionLabel','allowOther',p.data->'allowOther',
 'comboGroups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g->'id','name',g->'name','quantity',g->'quantity','productIds',g->'productIds')) FROM jsonb_array_elements(coalesce(p.data->'comboGroups','[]'::jsonb)) g),'[]'::jsonb),
 'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('name',v->'name','active',v->'active','stock',v->'stock')) FROM jsonb_array_elements(p.data->'variations') v),'[]'::jsonb)
 ),p.updated_at FROM public.catalog_products p ORDER BY p.id LIMIT 500 OFFSET greatest(0,least(_offset,100000));
$$;
REVOKE ALL ON FUNCTION public.list_catalog_sales(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_catalog_sales(integer) TO anon, authenticated, service_role;