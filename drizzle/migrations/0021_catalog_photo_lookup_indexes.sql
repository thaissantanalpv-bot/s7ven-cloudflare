-- Match both existing predicates used by is_catalog_photo exactly.
-- Authorization and linked-photo validation stay unchanged.
CREATE INDEX IF NOT EXISTS catalog_products_cover_path_idx
  ON public.catalog_products ((data->>'image'));

CREATE INDEX IF NOT EXISTS catalog_products_gallery_paths_idx
  ON public.catalog_products USING gin
  ((CASE WHEN jsonb_typeof(data->'images') = 'array'
    THEN data->'images' ELSE '[]'::jsonb END));