CREATE OR REPLACE FUNCTION public.is_catalog_photo(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _path ~ '^uploads/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$'
    AND (
      EXISTS (
        SELECT 1 FROM public.catalog_products p
        WHERE p.data->>'image' = _path
           OR (CASE WHEN jsonb_typeof(p.data->'images') = 'array' THEN p.data->'images' ELSE '[]'::jsonb END) ? _path
      )
      OR EXISTS (
        SELECT 1 FROM public.store_settings s
        WHERE s.id = 'main' AND s.catalog_appearance->>'bannerImage' = _path
      )
    );
$$;
REVOKE ALL ON FUNCTION public.is_catalog_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_catalog_photo(text) TO anon, authenticated, service_role;