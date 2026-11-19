import { queryOptions } from "@tanstack/react-query";
import { getStoreSettings } from "./store-settings.functions";
import { publicOfflineRead } from "./offline-catalog";
import { retainSignedStorageUrl } from "./catalog-photo-stability";

type SettingsResult = Awaited<ReturnType<typeof getStoreSettings>>;
function retainBanner(previous: SettingsResult | undefined, incoming: SettingsResult) {
  if (
    !previous ||
    previous.catalog_appearance?.bannerImage !== incoming.catalog_appearance?.bannerImage
  ) {
    return incoming;
  }
  return {
    ...incoming,
    banner_image_url: retainSignedStorageUrl(previous.banner_image_url, incoming.banner_image_url),
  };
}
const visibleMinute = () =>
  typeof document === "undefined" || document.visibilityState === "visible" ? 60_000 : false;

export const storeSettingsQuery = queryOptions({
  queryKey: ["store-settings"],
  queryFn: () => getStoreSettings(),
  staleTime: 30_000,
  refetchInterval: visibleMinute,
  refetchIntervalInBackground: false,
  structuralSharing: (previous, incoming) =>
    retainBanner(previous as SettingsResult | undefined, incoming as SettingsResult),
});
export const publicStoreSettingsQuery = queryOptions({
  queryKey: ["public-store-settings"],
  queryFn: () => publicOfflineRead("settings", () => getStoreSettings()),
  networkMode: "always",
  staleTime: 30_000,
  refetchInterval: visibleMinute,
  refetchIntervalInBackground: false,
  refetchOnReconnect: "always",
  structuralSharing: (previous, incoming) =>
    retainBanner(previous as SettingsResult | undefined, incoming as SettingsResult),
});
