import { queryOptions, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCatalog, getAdminCatalog } from "./catalog.functions";
import { publicOfflineRead } from "./offline-catalog";

// Public catalog: realtime invalidation below already pushes product changes,
// so poll lightly instead of refetching the full catalog every 5s.
export const catalogQuery = queryOptions({ queryKey: ["catalog-products"], queryFn: () => publicOfflineRead("products", () => getCatalog()), networkMode: "always", staleTime: 60000, refetchInterval: 60000, refetchOnReconnect: "always" });
export const adminCatalogQuery = queryOptions({ queryKey: ["admin-catalog-products"], queryFn: () => getAdminCatalog(), staleTime: 0, refetchInterval: 5000 });
export function useCatalogUpdates() {
  const client = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(`catalog-updates-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "catalog_products" }, () => {
      void client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
      void client.invalidateQueries({ queryKey: catalogQuery.queryKey });
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
}