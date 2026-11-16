import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isWaitingSchedule } from "@/lib/orders";
import { useServerFn } from "@tanstack/react-start";
import { listOrders } from "@/lib/orders.functions";
import { brl } from "@/lib/products";

/**
 * Alerta de pedido novo do painel inteiro: fica ligado desde a abertura do aplicativo,
 * em qualquer aba, e toca em loop enquanto houver pedido do catálogo em "Recebido".
 * O estado é compartilhado com o botão de som da aba Pedidos.
 */
type AlarmState = { sound: boolean; ready: boolean };
let state: AlarmState = { sound: true, ready: false };
const listeners = new Set<() => void>();
const set = (next: Partial<AlarmState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
let audio: HTMLAudioElement | null = null;
let unlocking = false;

/**
 * Testa se o navegador já permite som. Toca com volume zero (sem mudo), porque o
 * modo mudo é sempre liberado e não prova nada. Aplicativos instalados na tela
 * inicial do Android costumam liberar sem toque; senão, libera no primeiro toque.
 */
function unlock() {
  const el = audio;
  if (!el || state.ready || unlocking) return;
  unlocking = true;
  el.muted = false;
  el.volume = 0;
  const done = (ok: boolean) => {
    unlocking = false;
    if (audio !== el) return;
    if (ok) {
      el.pause();
      el.currentTime = 0;
    }
    el.volume = 1;
    if (ok) set({ ready: true });
  };
  try {
    Promise.resolve(el.play()).then(() => done(true), () => done(false));
  } catch {
    done(false);
  }
}

export function useOrderAlarm() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
  const toggle = () => {
    if (current.sound && current.ready) return set({ sound: false });
    set({ sound: true });
    unlock();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => undefined);
    }
  };
  return { ...current, toggle };
}

function vibrate() {
  try {
    if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
  } catch {}
}

export function NewOrderAlarm() {
  const fetchOrders = useServerFn(listOrders);
  const orders = useQuery({
    queryKey: ["store-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const { sound, ready } = useOrderAlarm();
  const seen = useRef<Set<string> | null>(null);
  const client = useQueryClient();

  // Aceite em outro computador: atualiza na hora para o alerta parar em todos os painéis.
  useEffect(() => {
    const refresh = () => void client.invalidateQueries({ queryKey: ["store-orders"] });
    const channel = supabase
      .channel(`orders-alarm-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh)
      .subscribe();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [client]);

  useEffect(() => {
    const el = new Audio("/sounds/new-order-alert.mp3");
    el.loop = true;
    el.preload = "auto";
    audio = el;
    unlock();
    const arm = () => unlock();
    const onVisible = () => document.visibilityState === "visible" && unlock();
    window.addEventListener("pointerdown", arm);
    window.addEventListener("touchstart", arm);
    window.addEventListener("keydown", arm);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("keydown", arm);
      document.removeEventListener("visibilitychange", onVisible);
      el.pause();
      if (audio === el) audio = null;
      set({ ready: false });
    };
  }, []);

  useEffect(() => {
    if (!orders.data) return;
    const fresh = seen.current
      ? orders.data.filter((o) => o.source !== "counter" && o.status === "received" && !seen.current?.has(o.id))
      : [];
    if (fresh.length) {
      vibrate();
      if ("Notification" in window && Notification.permission === "granted") {
        fresh.forEach((o) => {
          try {
            new Notification(`🔔 Novo Pedido #${o.number} — ${o.customer_name}`, {
              body: `${o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")} · Total: ${brl(o.total)}`,
              icon: "/icons/s7ven-192.png",
              tag: `order-${o.id}`,
            });
          } catch {}
        });
      }
    }
    seen.current = new Set(orders.data.map((o) => o.id));
  }, [orders.data]);

  const hasNew = (orders.data ?? []).some((o) => o.source !== "counter" && o.status === "received" && !isWaitingSchedule(o));

  useEffect(() => {
    const el = audio;
    if (!el) return;
    if (sound && ready && hasNew) {
      el.volume = 1;
      try {
        Promise.resolve(el.play()).catch(() => set({ ready: false }));
      } catch {
        set({ ready: false });
      }
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [sound, ready, hasNew]);

  return null;
}
