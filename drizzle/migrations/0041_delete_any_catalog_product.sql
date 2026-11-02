CREATE OR REPLACE FUNCTION public.admin_remove_catalog_product(_product_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  combo record;
  new_groups jsonb;
  dropped boolean;
  touched text[] := '{}';
  paused text[] := '{}';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir produtos definitivamente.';
  END IF;
  -- Remove the product from every combo that offers it; a combo whose group became empty is paused.
  FOR combo IN
    SELECT id, data FROM public.catalog_products
    WHERE id <> _product_id
      AND jsonb_typeof(data->'comboGroups') = 'array'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(data->'comboGroups') grp WHERE grp->'productIds' ? _product_id)
    ORDER BY id
    FOR UPDATE
  LOOP
    SELECT coalesce(jsonb_agg(g ORDER BY ord), '[]'::jsonb), coalesce(bool_or(jsonb_array_length(g->'productIds') = 0), false)
      INTO new_groups, dropped
      FROM (
        SELECT ord, jsonb_set(grp, '{productIds}', coalesce((SELECT jsonb_agg(pid) FROM jsonb_array_elements(grp->'productIds') pid WHERE pid #>> '{}' <> _product_id), '[]'::jsonb)) AS g
        FROM jsonb_array_elements(combo.data->'comboGroups') WITH ORDINALITY AS t(grp, ord)
      ) s;
    IF dropped THEN
      SELECT coalesce(jsonb_agg(g), '[]'::jsonb) INTO new_groups FROM jsonb_array_elements(new_groups) g WHERE jsonb_array_length(g->'productIds') > 0;
      paused := paused || (combo.data->>'name');
    END IF;
    UPDATE public.catalog_products
      SET data = CASE WHEN dropped THEN jsonb_set(jsonb_set(data, '{comboGroups}', new_groups), '{active}', 'false'::jsonb) ELSE jsonb_set(data, '{comboGroups}', new_groups) END,
          updated_at = now()
      WHERE id = combo.id;
    touched := touched || (combo.data->>'name');
  END LOOP;
  DELETE FROM public.customer_wishlists WHERE product_id = _product_id;
  DELETE FROM public.catalog_products WHERE id = _product_id;
  RETURN jsonb_build_object('combos', to_jsonb(touched), 'paused', to_jsonb(paused));
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_remove_catalog_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_remove_catalog_product(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_catalog_product(text) TO service_role;
COMMENT ON FUNCTION public.admin_delete_catalog_product(text) IS 'DEPRECATED: replaced by admin_remove_catalog_product, which also removes the product from combos';