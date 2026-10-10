import { queryOptions } from "@tanstack/react-query";
import { getStoreSettings } from "./store-settings.functions";

export const storeSettingsQuery = queryOptions({ queryKey: ["store-settings"], queryFn: () => getStoreSettings(), staleTime: 30000, refetchInterval: 60000 });