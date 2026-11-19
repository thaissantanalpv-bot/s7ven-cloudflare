import { queryOptions, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCatalog, getAdminCatalog } from "./catalog.functions";
import { retainCatalogPhotoUrls } from "./catalog-photo-stability";
import { publicOfflineRead } from "./offline-catalog";
import { visibleCatalogInterval } from "./page-visibility";

// Public catalog: realtime invalidation below already pushes product changes,
// so poll lightly instead of refetching the full catalog every 5s.
// Realtime updates invalidate the query immediately. The slow safety refresh also
// renews signed photo links before their 1-hour expiry (including when Realtime drops).
export const catalogQuery = queryOptions({
  queryKey: ["catalog-products"],
  queryFn: () => publicOfflineRead("products", () => getCatalog()),
  networkMode: "always",
  staleTime: 15 * 60 * 1000,
  refetchInterval: () => visibleCatalogInterval(45 * 60 * 1000),
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  refetchOnReconnect: "always",
  structuralSharing: (previous, incoming) =>
    retainCatalogPhotoUrls(
      Array.isArray(previous) ? previous : undefined,
      incoming as Awaited<ReturnType<typeof getCatalog>>,
    ),
});
export const adminCatalogQuery = queryOptions({
  queryKey: ["admin-catalog-products"],
  queryFn: () => getAdminCatalog(),
  staleTime: 60 * 1000,
  refetchInterval: () => visibleCatalogInterval(10 * 60 * 1000),
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
  structuralSharing: (previous, incoming) =>
    retainCatalogPhotoUrls(
      Array.isArray(previous) ? previous : undefined,
      incoming as Awaited<ReturnType<typeof getAdminCatalog>>,
    ),
});
type CatalogSubscription = {
  users: number;
  pending: boolean;
  channel: ReturnType<typeof supabase.channel>;
  onVisibility: () => void;
};
const catalogSubscriptions = new WeakMap<QueryClient, CatalogSubscription>();

export function useCatalogUpdates() {
  const client = useQueryClient();
  useEffect(() => {
    let subscription = catalogSubscriptions.get(client);
    if (!subscription) {
      const invalidate = () => {
        if (document.visibilityState === "hidden") {
          const current = catalogSubscriptions.get(client);
          if (current) current.pending = true;
          return;
        }
        void client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
        void client.invalidateQueries({ queryKey: catalogQuery.queryKey });
      };
      const channel = supabase
        .channel("catalog-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "catalog_products" },
          invalidate,
        )
        .subscribe();
      const onVisibility = () => {
        const current = catalogSubscriptions.get(client);
        if (document.visibilityState === "visible" && current?.pending) {
          current.pending = false;
          invalidate();
        }
      };
      subscription = { users: 0, pending: false, channel, onVisibility };
      catalogSubscriptions.set(client, subscription);
      document.addEventListener("visibilitychange", onVisibility);
    }
    subscription.users += 1;
    return () => {
      const current = catalogSubscriptions.get(client);
      if (!current) return;
      current.users -= 1;
      if (current.users > 0) return;
      document.removeEventListener("visibilitychange", current.onVisibility);
      catalogSubscriptions.delete(client);
      void supabase.removeChannel(current.channel);
    };
  }, [client]);
}
