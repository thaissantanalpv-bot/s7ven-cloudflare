CREATE INDEX IF NOT EXISTS catalog_products_video_path_idx ON public.catalog_products ((data->>'video'));

CREATE OR REPLACE FUNCTION public.is_catalog_video(_path text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT _path ~ '^uploads/[a-zA-Z0-9_-]+\.(mp4|mov|webm|m4v)$'
    AND EXISTS (SELECT 1 FROM public.catalog_products p WHERE p.data->>'video' = _path AND coalesce((p.data->>'active')::boolean, false));
$function$;

CREATE POLICY catalog_video_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-videos' AND public.is_catalog_video(name));
CREATE POLICY admin_catalog_video_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_catalog_video_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'::app_role) AND name ~ '^uploads/[a-zA-Z0-9_-]+\.(mp4|mov|webm|m4v)$');
CREATE POLICY admin_catalog_video_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_catalog_video_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'::app_role));

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
 'video',coalesce(p.data->'video','""'::jsonb),'youtube',coalesce(p.data->'youtube','""'::jsonb),
 'variationPhotos',coalesce((SELECT jsonb_object_agg(e.key,e.value) FROM jsonb_each(coalesce(p.data->'variationPhotos','{}'::jsonb)) e WHERE e.value = p.data->'image' OR e.value IN (SELECT je.value FROM jsonb_array_elements(coalesce(p.data->'images','[]'::jsonb)) je)),'{}'::jsonb),
 'active',p.data->'active','stock',p.data->'stock','featured',coalesce(p.data->'featured','false'::jsonb),
 'optionLabel',p.data->'optionLabel','allowOther',p.data->'allowOther',
 'comboGroups',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g->'id','name',g->'name','quantity',g->'quantity','productIds',g->'productIds')) FROM jsonb_array_elements(coalesce(p.data->'comboGroups','[]'::jsonb)) g),'[]'::jsonb),
 'variations',coalesce((SELECT jsonb_agg(jsonb_build_object('name',v->'name','active',v->'active','stock',v->'stock')) FROM jsonb_array_elements(p.data->'variations') v),'[]'::jsonb)
 ),p.updated_at FROM public.catalog_products p ORDER BY p.id LIMIT 500 OFFSET greatest(0,least(_offset,100000));
$function$;