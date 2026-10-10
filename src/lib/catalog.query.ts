import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCatalog } from "./catalog.functions";

export const catalogQuery = queryOptions({ queryKey: ["catalog-products"], queryFn: () => getCatalog(), staleTime: 0, refetchInterval: 5000 });
export function useCatalogUpdates() {
  const client = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel("catalog-updates").on("postgres_changes", { event: "*", schema: "public", table: "catalog_products" }, () => { void client.invalidateQueries({ queryKey: catalogQuery.queryKey }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
}