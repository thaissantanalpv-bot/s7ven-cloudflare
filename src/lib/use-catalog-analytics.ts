import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { trackCatalogVisit } from "./catalog-analytics.functions";
import { readAnalyticsIdentity } from "./catalog-analytics";

export function useCatalogAnalytics(loaded: boolean, hasCart: boolean) {
  const track = useServerFn(trackCatalogVisit);
  const current = useRef(hasCart);
  current.current = hasCart;
  useEffect(() => {
    if (!loaded) return;
    const send = () => {
      if (document.visibilityState !== "visible") return;
      const identity = readAnalyticsIdentity();
      if (identity) void track({ data: { ...identity, hasCart: current.current } }).catch(() => {});
    };
    send();
    const timer = setInterval(send, 30000);
    document.addEventListener("visibilitychange", send);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", send); };
  }, [loaded, track]);
  useEffect(() => {
    if (!loaded || !hasCart) return;
    const identity = readAnalyticsIdentity();
    if (identity) void track({ data: { ...identity, hasCart: true } }).catch(() => {});
  }, [loaded, hasCart, track]);
}