CREATE OR REPLACE FUNCTION public.admin_delete_catalog_product(_product_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE rowdata jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir produtos definitivamente.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.catalog_products WHERE id = _product_id) THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.catalog_products
    WHERE id <> _product_id
      AND jsonb_typeof(data->'comboGroups') = 'array'
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(data->'comboGroups') grp
        WHERE grp->'productIds' ? _product_id
      )
  ) THEN
    RAISE EXCEPTION 'Este produto faz parte de um combo ativo. Remova-o do combo antes de excluir definitivamente.';
  END IF;
  DELETE FROM public.customer_wishlists WHERE product_id = _product_id;
  DELETE FROM public.catalog_products WHERE id = _product_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_catalog_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_catalog_product(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_catalog_product(text) TO service_role;
