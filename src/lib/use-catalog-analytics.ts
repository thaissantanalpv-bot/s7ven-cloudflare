import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackCatalogVisit } from "./catalog-analytics.functions";
import { deviceHints, readAnalyticsIdentity, shouldTrackHost } from "./catalog-analytics";

export function useCatalogAnalytics(loaded: boolean, hasCart: boolean) {
  const track = useServerFn(trackCatalogVisit);
  const current = useRef(hasCart);
  current.current = hasCart;
  useEffect(() => {
    if (!loaded || !shouldTrackHost(location.hostname)) return;
    const device = deviceHints();
    const send = () => {
      if (document.visibilityState !== "visible") return;
      const identity = readAnalyticsIdentity();
      if (identity) void track({ data: { ...identity, hasCart: current.current, device } }).catch(() => {});
    };
    send();
    const timer = setInterval(send, 30000);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", send); };
  }, [loaded, track]);
  useEffect(() => {
    if (!loaded || !hasCart || !shouldTrackHost(location.hostname)) return;
    const identity = readAnalyticsIdentity();
    if (identity) void track({ data: { ...identity, hasCart: true, device: deviceHints() } }).catch(() => {});
  }, [loaded, hasCart, track]);
}