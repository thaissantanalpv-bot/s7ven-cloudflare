DROP POLICY IF EXISTS public_catalog_read ON public.catalog_products;
CREATE POLICY admin_catalog_read ON public.catalog_products FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE SELECT ON public.catalog_products FROM anon;
GRANT SELECT ON public.catalog_products TO authenticated;
GRANT ALL ON public.catalog_products TO service_role;

CREATE OR REPLACE FUNCTION public.is_catalog_photo(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _path ~ '^uploads/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$'
    AND EXISTS (
      SELECT 1 FROM public.catalog_products p
      WHERE p.data->>'image' = _path
         OR (CASE WHEN jsonb_typeof(p.data->'images') = 'array' THEN p.data->'images' ELSE '[]'::jsonb END) ? _path
    );
$$;
REVOKE ALL ON FUNCTION public.is_catalog_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_catalog_photo(text) TO anon, authenticated, service_role;
DROP POLICY IF EXISTS catalog_photo_read ON storage.objects;
CREATE POLICY catalog_photo_read ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-photos' AND public.is_catalog_photo(name));
CREATE POLICY admin_catalog_photo_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role));