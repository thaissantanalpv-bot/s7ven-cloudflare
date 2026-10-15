import { queryOptions } from "@tanstack/react-query";
import { getStoreSettings } from "./store-settings.functions";
import { publicOfflineRead } from "./offline-catalog";

export const storeSettingsQuery = queryOptions({ queryKey: ["store-settings"], queryFn: () => getStoreSettings(), staleTime: 30000, refetchInterval: 60000 });
export const publicStoreSettingsQuery = queryOptions({ queryKey: ["public-store-settings"], queryFn: () => publicOfflineRead("settings", () => getStoreSettings()), networkMode: "always", staleTime: 30000, refetchInterval: 60000, refetchOnReconnect: "always" });