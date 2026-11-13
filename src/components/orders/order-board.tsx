import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bell,
  BellRing,
  Bike,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Link2,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  Printer,
  RefreshCw,
  Search,
  ShoppingBag,
  StickyNote,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
const ALFA_DELIVERY_URL = "https://alfa-delivery.entregasexpressas.com.br/";
import { quickMessages, courierMessage, courierPayment, whatsappTo } from "@/lib/quick-messages";
import { copyToClipboard } from "@/lib/pix";
import { formatBrazilPhone } from "@/lib/phone";
import { CopyField } from "./copy-field";
import { callAlfaDelivery, cancelAlfaDelivery } from "@/lib/alfa.functions";
import { alfaStatusLabel, canCallAlfa } from "@/lib/alfa";
import { listOrders, updateOrderCourier, updateOrderStatus, updateOrderTracking } from "@/lib/orders.functions";
import {
  ORDER_STAGES,
  orderWhatsApp,
  isActiveOrder,
  showCancelledOnBoard,
  isWaitingSchedule,
  type Order,
  type OrderStatus,
} from "@/lib/orders";
import { brl } from "@/lib/products";
import { OrderPrinting } from "./order-printing";
import { OrderCancellation } from "./order-cancellation";
import { PushQuickButton } from "@/components/push-notifications";
import { StorePauseSwitch } from "@/components/store-pause-button";
import { useOrderAlarm } from "./new-order-alarm";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { variationPhoto } from "@/lib/catalog";
import { Package } from "lucide-react";

const CANCELLED_CLEARED_KEY = "s7ven-cancelled-cleared-at";
/** Estimated minutes used for the countdown bar; informative only. */
export const DELIVERY_MINUTES = 30;

const COLUMNS = [
  { id: "received", title: "Pedidos novos", subtitle: "Aguardando aceite", head: "bg-kanban-new text-kanban-ink", edge: "border-kanban-new/70", icon: BellRing },
  { id: "ready", title: "Pedidos prontos", subtitle: "Aguardando entrega / retirada", head: "bg-kanban-ready text-kanban-ink", edge: "border-kanban-ready/60", icon: PackageCheck },
  { id: "out_for_delivery", title: "Saiu p/ entrega", subtitle: "Ou pronto pra retirada na loja", head: "bg-kanban-transit text-kanban-ink", edge: "border-kanban-transit/60", icon: Bike },
  { id: "delivered", title: "Pedidos entregues", subtitle: "Concluídos hoje", head: "bg-whatsapp text-whatsapp-foreground", edge: "border-whatsapp/60", icon: CheckCircle2 },
] as const;

/** Legacy "preparing" orders are shown in the "ready" column; the board flow no longer uses that stage. */
const boardStatus = (status: OrderStatus) => (status === "preparing" ? "ready" : status);

type Mode = "all" | "delivery" | "pickup";

const clock = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(value))
    : "";

const minutesSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));

function waitLabel(created: string) {
  const mins = minutesSince(created);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  return `há ${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}`;
}

/** Remaining minutes and elapsed fraction of an estimated stage duration. */
export function countdown(startedAt: string, totalMinutes: number, now = Date.now()) {
  const spent = Math.max(0, (now - new Date(startedAt).getTime()) / 60000);
  return { remaining: Math.max(0, Math.ceil(totalMinutes - spent)), fraction: Math.min(1, spent / totalMinutes), late: spent > totalMinutes };
}

const stageStart = (order: Order, status: OrderStatus) => order.status_times?.[status] ?? order.updated_at ?? order.created_at;

const itemsSummary = (order: Order) => {
  const shown = order.items.slice(0, 2).map((i) => `${i.qty}x ${i.name}`).join(", ");
  return order.items.length > 2 ? `${shown} +${order.items.length - 2}` : shown;
};

const isPix = (payment: string) => /pix/i.test(payment);
const isPickup = (order: Order) => order.fulfillment === "pickup";

function ModeBadge({ order }: { order: Order }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      {isPickup(order) ? <ShoppingBag className="size-3.5" /> : <Bike className="size-3.5" />}
      {isPickup(order) ? "Retirada" : "Delivery"}
    </span>
  );
}

function TimeBar({ order, status, minutes, label }: { order: Order; status: OrderStatus; minutes: number; label: string }) {
  const c = countdown(stageStart(order, status), minutes);
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(c.fraction * 100)}>
        <div className={`h-full rounded-full transition-all ${c.late ? "bg-destructive" : "bg-kanban-transit"}`} style={{ width: `${Math.max(4, c.fraction * 100)}%` }} />
      </div>
      <p className={`mt-1 text-xs ${c.late ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
        {c.late ? `Passou do tempo estimado (${minutes} min)` : `${c.remaining} min restante${c.remaining === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

export function OrderBoard() {
  const fetchOrders = useServerFn(listOrders);
  const update = useServerFn(updateOrderStatus);
  const saveTrackingFn = useServerFn(updateOrderTracking);
  const saveCourierFn = useServerFn(updateOrderCourier);
  const alfaFn = useServerFn(callAlfaDelivery);
  const callAlfa = async (order: Order) => {
    if (busy) return;
    setBusy(order.id);
    setError("");
    try {
      const quote = await alfaFn({ data: { id: order.id, confirm: false } });
      const price = quote.price != null ? brl(quote.price) : "a confirmar";
      const eta = quote.etaMinutes != null ? ` · entrega em ~${quote.etaMinutes} min` : "";
      if (!window.confirm(`Chamar motoboy da Alfa para o pedido #${order.number}?\n\nCorrida: ${price}${eta}`)) return;
      await alfaFn({ data: { id: order.id, confirm: true } });
      setNotice(`Pedido #${order.number} enviado para a Alfa. O quadro atualiza sozinho quando o motoboy retirar e entregar.`);
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível chamar a Alfa.");
    } finally {
      setBusy("");
    }
  };
  const cancelAlfaFn = useServerFn(cancelAlfaDelivery);
  const cancelAlfa = async (order: Order) => {
    if (busy || !window.confirm(`Cancelar a corrida da Alfa do pedido #${order.number}? O pedido continua no quadro.`)) return;
    setBusy(order.id); setError("");
    try {
      await cancelAlfaFn({ data: { id: order.id } });
      setNotice(`Corrida da Alfa do pedido #${order.number} cancelada.`);
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar na Alfa.");
    } finally { setBusy(""); }
  };
  const client = useQueryClient();
  const catalog = useQuery(adminCatalogQuery);
  const photoFor = (productId: string, option?: string) => { const p = catalog.data?.find(x => x.id === productId); return p ? variationPhoto(p, option ?? "") || p.image || "" : ""; };
  const orders = useQuery({
    queryKey: ["store-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [showCancelledOnly, setShowCancelledOnly] = useState(false);
  const { sound, ready: audioReady, toggle: toggleSound } = useOrderAlarm();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [cancelIntent, setCancelIntent] = useState(false);
  const [printJob, setPrintJob] = useState<{ order: Order; kitchen: boolean } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<Order | null>(null);
  const [, setTick] = useState(0);
  const [cancelledClearedAt, setCancelledClearedAt] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(CANCELLED_CLEARED_KEY));
      if (saved > 0) setCancelledClearedAt(saved);
    } catch {
      /* storage blocked: keep showing today's cancelled orders */
    }
  }, []);

  const clearCancelled = () => {
    const at = Date.now();
    setCancelledClearedAt(at);
    try {
      window.localStorage.setItem(CANCELLED_CLEARED_KEY, String(at));
    } catch {
      /* storage blocked: cleared only until the page reloads */
    }
    setNotice("Cancelados limpos do quadro. Eles continuam no Histórico.");
  };

  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!orders.data) return;
    const newOrders = seen.current
      ? orders.data.filter((o) => o.source !== "counter" && o.status === "received" && !isWaitingSchedule(o) && !seen.current?.has(o.id))
      : [];
    if (newOrders.length) {
      setNotice(`${newOrders.length} ${newOrders.length === 1 ? "novo pedido recebido" : "novos pedidos recebidos"}`);
    }
    // Scheduled orders are "seen" only once released, so the alert rings when the store opens.
    seen.current = new Set(orders.data.filter((o) => !isWaitingSchedule(o)).map((o) => o.id));
  }, [orders.data]);

  /** Saves the stage; an optional WhatsApp link opens only after the save succeeds. */
  const move = async (order: Order, status: OrderStatus, link?: (changed: Order) => string) => {
    if (busy || order.status === status || order.status === "cancelled") return;
    const popup = link ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    setBusy(order.id);
    setError("");
    try {
      await update({ data: { id: order.id, status, expected: order.status } });
      if (link) {
        const changed = { ...order, status };
        setPendingMessage(changed);
        if (popup) popup.location.replace(link(changed));
      }
      void client.invalidateQueries({ queryKey: ["admin-sales-report"] });
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      popup?.close();
      setError(e instanceof Error ? e.message : "Não foi possível alterar a etapa.");
      await orders.refetch();
    } finally {
      setBusy("");
    }
  };

  const saveField = async (order: Order, kind: "tracking" | "courier", value: string) => {
    const current = kind === "tracking" ? order.tracking_url ?? "" : order.courier_name ?? "";
    if (busy || current === value.trim()) return;
    setBusy(order.id);
    setError("");
    try {
      if (kind === "tracking") await saveTrackingFn({ data: { id: order.id, trackingUrl: value } });
      else await saveCourierFn({ data: { id: order.id, courierName: value } });
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
      await orders.refetch();
    } finally {
      setBusy("");
    }
  };

  /** Copia o bloco inteiro do pedido, pronto para colar no site da entregadora. */
  const copyAll = async (order: Order) => {
    const ok = await copyToClipboard(courierMessage(order).replace(/\*/g, ""));
    if (ok) setNotice(`Dados do pedido #${order.number} copiados. Cole no site da Alfa.`);
    else setError("Não consegui copiar os dados. Tente copiar campo por campo.");
  };

  const spDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  const today = spDay(new Date());
  const isToday = (value: string) => spDay(new Date(value)) === today;

  const all = (orders.data ?? []).filter(
    (o) => o.source !== "counter" && (o.status !== "delivered" || isToday(o.updated_at || o.created_at)),
  );
  const now = new Date();
  const term = search.trim().toLocaleLowerCase();
  const waitingSchedule = all.filter((o) => o.status !== "cancelled" && isWaitingSchedule(o, now));
  const visible = all.filter(
    (o) =>
      !isWaitingSchedule(o, now) &&
      showCancelledOnBoard(o, now, cancelledClearedAt) &&
      (mode === "all" || (mode === "pickup" ? isPickup(o) : !isPickup(o))) &&
      (!term || `${o.number} #${o.number} ${o.customer_name} ${o.customer_phone}`.toLocaleLowerCase().includes(term)),
  );
  const newCount = all.filter((o) => o.status === "received" && !isWaitingSchedule(o, now)).length;
  const delivered = visible.filter((o) => o.status === "delivered");
  const cancelled = visible.filter((o) => o.status === "cancelled");
  const detail = all.find((o) => o.id === selected);

  const open = (order: Order, cancel = false) => {
    setCancelIntent(cancel);
    setSelected(order.id);
  };

  const card = (order: Order) => {
    const column = COLUMNS.find((c) => c.id === boardStatus(order.status)) ?? COLUMNS[0];
    const isBusy = busy === order.id;
    return (
      <article
        key={order.id}
        aria-label={`Pedido ${order.number}`}
        className={`rounded-xl border-2 bg-card p-3 shadow-sm transition-colors ${column.edge} ${selected === order.id ? "ring-2 ring-primary" : ""}`}
      >
        <button type="button" className="block w-full min-w-0 text-left" onClick={() => open(order)} aria-label={`Detalhes do pedido ${order.number}`}>
          <span className="flex items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold">
              <column.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate">#{order.number} · <span>{order.customer_name}</span></span>
            </span>
            {order.status === "received" && (
              <span className="shrink-0 rounded-full bg-kanban-new px-2 py-0.5 text-[11px] font-bold text-kanban-ink">Novo!</span>
            )}
          </span>
          {order.status === "received" && <span className="mt-0.5 block text-xs text-muted-foreground">{waitLabel(order.scheduled_for ?? order.created_at)}</span>}
          <span className="mt-2 block break-words text-sm text-foreground/90">
            {itemsSummary(order)} · <strong>{brl(order.total)}</strong>
          </span>
          <span className="mt-1.5 flex items-center justify-between gap-2">
            <ModeBadge order={order} />
            {order.status === "out_for_delivery" && !isPickup(order) && (
              <span className="truncate text-xs text-muted-foreground">
                Motoboy: <strong className="text-foreground">{order.courier_name || "não informado"}</strong>
              </span>
            )}
            {!!order.alfa_status && order.status !== "delivered" && (
              <span className="truncate text-xs font-semibold text-muted-foreground">🛵 {alfaStatusLabel(order.alfa_status)}{order.alfa_status === "REJECTED" && order.alfa_message ? ` (${order.alfa_message})` : ""}</span>
            )}
          </span>
        </button>
        {order.status === "out_for_delivery" && <TimeBar order={order} status="out_for_delivery" minutes={DELIVERY_MINUTES} label={`Tempo de entrega do pedido ${order.number}`} />}

        {order.status === "received" && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button disabled={!!busy} className="bg-whatsapp font-bold text-whatsapp-foreground hover:bg-whatsapp/90" aria-label="Aceitar pedido" onClick={() => void move(order, "ready")}>
                {isBusy ? "Salvando…" : <><Check aria-hidden="true" />Aceitar</>}
              </Button>
              <Button variant="secondary" disabled={!!busy} aria-label={`Recusar pedido ${order.number}`} onClick={() => open(order, true)}>
                Recusar
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-1 w-full text-xs text-whatsapp" disabled={!!busy} aria-label={`Aceitar e avisar pedido ${order.number} no WhatsApp`} onClick={() => void move(order, "ready", orderWhatsApp)}>
              <MessageCircle className="size-3" />Aceitar e avisar no WhatsApp
            </Button>
          </>
        )}
        {boardStatus(order.status) === "ready" && order.status !== "cancelled" &&
          (isPickup(order) ? (
            <Button disabled={!!busy} className="mt-3 w-full bg-kanban-ready font-bold text-kanban-ink hover:bg-kanban-ready/90" aria-label={`Marcar pedido ${order.number} como pronto para retirada`} onClick={() => void move(order, "out_for_delivery")}>
              {isBusy ? "Salvando…" : <><ShoppingBag aria-hidden="true" />Pronto pra retirada</>}
            </Button>
          ) : (
            canCallAlfa(order.alfa_status) ? (
              <>
                <Button disabled={!!busy} className="mt-3 w-full bg-kanban-prep font-bold text-kanban-ink hover:bg-kanban-prep/90" aria-label={`Chamar Alfa Delivery para o pedido ${order.number}`} onClick={() => void callAlfa(order)}>
                  {isBusy ? "Consultando a Alfa…" : <><Bike aria-hidden="true" />🛵 Chamar Alfa Delivery</>}
                </Button>
                <Button variant="ghost" size="sm" className="mt-1 w-full text-xs" disabled={!!busy} aria-label={`Copiar dados e abrir site da Alfa para o pedido ${order.number}`} onClick={() => { void navigator.clipboard?.writeText(courierMessage(order).replace(/\*/g, "")).then(() => setNotice("Dados do pedido copiados. Cole no site da Alfa."), () => setError("Não consegui copiar os dados; use o painel do pedido.")); void move(order, "out_for_delivery", () => ALFA_DELIVERY_URL); }}>
                  Copiar dados e abrir site da Alfa
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 rounded-md bg-kanban-prep/15 px-2 py-1.5 text-center text-xs font-semibold" role="status">🛵 {alfaStatusLabel(order.alfa_status)}</p>
                <Button variant="ghost" size="sm" className="mt-1 w-full text-xs text-destructive" disabled={!!busy} aria-label={`Cancelar corrida da Alfa do pedido ${order.number}`} onClick={() => void cancelAlfa(order)}>
                  Cancelar corrida da Alfa
                </Button>
              </>
            )
          ))}
        {boardStatus(order.status) === "ready" && order.status !== "cancelled" && (
          <Button variant="ghost" size="sm" className="mt-1 w-full text-xs text-whatsapp" asChild>
            <a href={orderWhatsApp(order)} target="_blank" rel="noopener noreferrer" aria-label={`Avisar cliente do pedido ${order.number} que está pronto`}>
              <MessageCircle className="size-3" />Avisar cliente que está pronto
            </a>
          </Button>
        )}
        {order.status === "out_for_delivery" && (
          <Button disabled={!!busy} className="mt-3 w-full bg-whatsapp font-bold text-whatsapp-foreground hover:bg-whatsapp/90" aria-label={`Concluir entrega do pedido ${order.number}`} onClick={() => void move(order, "delivered")}>
            {isBusy ? "Salvando…" : <><CheckCircle2 aria-hidden="true" />{isPickup(order) ? "Entregar ao Cliente" : "Concluir entrega"}</>}
          </Button>
        )}
        {order.status === "delivered" && (
          <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-whatsapp"><CheckCircle2 className="size-4" />Pedido entregue</p>
        )}
      </article>
    );
  };

  const timeline = (order: Order) => {
    const t = order.status_times ?? {};
    const reached = (s: OrderStatus) => {
      const flow = ["received", "ready", "out_for_delivery", "delivered"] as const;
      return order.status !== "cancelled" && flow.indexOf(boardStatus(order.status) as (typeof flow)[number]) >= flow.indexOf(s as (typeof flow)[number]);
    };
    const steps: { label: string; status: OrderStatus; at?: string | undefined }[] = [
      { label: "Pedido novo", status: "received", at: t.received ?? order.created_at },
      { label: "Pedido pronto", status: "ready", at: t.ready ?? t.preparing },
      { label: isPickup(order) ? "Pronto pra retirada" : "Saiu para entrega", status: "out_for_delivery", at: t.out_for_delivery },
      { label: "Pedido entregue", status: "delivered", at: t.delivered },
    ];
    return (
      <ol className="space-y-0" aria-label="Linha do tempo do pedido">
        {steps.map((step, i) => {
          const done = reached(step.status);
          return (
            <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden="true" className={`absolute left-[9px] top-5 h-full w-0.5 ${done ? "bg-primary" : "bg-border"}`} />}
              <span className={`relative z-10 grid size-5 shrink-0 place-items-center rounded-full border-2 ${done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40 bg-card"}`}>
                {done && <Check className="size-3" />}
              </span>
              <span className={`text-sm ${done ? "font-semibold" : "text-muted-foreground"}`}>
                {step.label}
                {done && step.at && <span className="ml-1 font-normal text-muted-foreground">({clock(step.at)})</span>}
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <section className="py-2">
      {/* Top bar */}
      <div className="grid gap-3 rounded-2xl border bg-card p-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2 lg:min-w-56">
          <StorePauseSwitch />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative min-w-44 flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input className="field pl-10" aria-label="Buscar pedido" placeholder="Buscar cliente ou nº do pedido" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 rounded-xl border bg-background p-1" role="group" aria-label="Filtrar por modalidade">
            {([["all", "Todos"], ["delivery", "Delivery"], ["pickup", "Retirada"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${mode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="relative grid size-10 place-items-center rounded-xl border bg-background"
            aria-label={`${newCount} pedido${newCount === 1 ? "" : "s"} aguardando aceite`}
            title="Pedidos aguardando aceite"
            onClick={() => document.getElementById("kanban-received")?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })}
          >
            <Bell className="size-5" />
            {newCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-primary-foreground">{newCount}</span>
            )}
          </button>
          <Button variant="outline" size="icon" aria-label={sound && audioReady ? "Desativar alerta sonoro" : "Ativar alerta sonoro"} title="Alerta sonoro" onClick={() => toggleSound()}>
            {sound && audioReady ? <Volume2 /> : <VolumeX />}
          </Button>
          <OrderPrinting order={printJob?.order ?? null} kitchen={printJob?.kitchen ?? false} onClose={() => setPrintJob(null)} />
          <PushQuickButton />
          <Button variant="outline" size="icon" title="Atualizar pedidos" aria-label="Atualizar pedidos" disabled={orders.isFetching} onClick={() => orders.refetch()}>
            <RefreshCw className={orders.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {notice && (
        <div role="status" className="mt-3 flex items-center gap-2 rounded-xl border-l-4 border-kanban-new bg-kanban-new/10 px-4 py-2.5 text-sm">
          <BellRing className="size-4 text-kanban-new" />
          {notice}
          <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Dispensar alerta" onClick={() => setNotice("")}><X /></Button>
        </div>
      )}
      {(error || orders.error) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error || "Não foi possível carregar os pedidos."}{" "}
          <Button variant="link" onClick={() => orders.refetch()}>Tentar novamente</Button>
        </p>
      )}
      {pendingMessage && (
        <div role="status" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-l-4 border-whatsapp bg-whatsapp/10 px-4 py-2.5 text-sm">
          <span>Pedido #{pendingMessage.number}: etapa salva.</span>
          <Button asChild variant="outline" size="sm" className="text-whatsapp">
            <a href={pendingMessage.status === "out_for_delivery" ? whatsappTo(null, courierMessage(pendingMessage)) : orderWhatsApp(pendingMessage)} target="_blank" rel="noopener noreferrer"><MessageCircle />Abrir mensagem no WhatsApp</a>
          </Button>
          <Button variant="ghost" size="icon" className="ml-auto size-7" aria-label="Dispensar mensagem" onClick={() => setPendingMessage(null)}><X /></Button>
        </div>
      )}

      {waitingSchedule.length > 0 && (
        <details className="mt-4 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold">⏰ {waitingSchedule.length} {waitingSchedule.length === 1 ? "pedido agendado" : "pedidos agendados"} para quando a loja abrir</summary>
          <p className="mt-1 text-xs text-muted-foreground">Feitos com a loja fechada. Entram sozinhos em "Pedidos novos" no horário de abertura, com alerta no celular.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {waitingSchedule.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2">
                <button type="button" className="font-medium underline-offset-2 hover:underline" onClick={() => open(o)}>#{o.number} · {o.customer_name}</button>
                <span className="text-muted-foreground">{brl(o.total)} · {new Date(o.scheduled_for!).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Kanban */}
      {orders.isPending ? (
        <p className="py-16 text-muted-foreground">Carregando pedidos…</p>
      ) : showCancelledOnly ? null : (
        <div className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0 xl:grid xl:grid-cols-4 xl:overflow-visible">
          {COLUMNS.map((column) => {
            const list = visible.filter((o) => boardStatus(o.status) === column.id);
            return (
              <section key={column.id} id={`kanban-${column.id}`} aria-label={column.title} className="flex w-[82vw] max-w-sm shrink-0 snap-start flex-col rounded-2xl border bg-muted/30 sm:w-80 xl:w-auto xl:max-w-none">
                <header className={`flex items-center justify-between gap-2 rounded-t-2xl px-3 py-2.5 ${column.head}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold uppercase tracking-wide">{column.title}</span>
                    <span className="block truncate text-[11px] font-medium opacity-80">{column.subtitle}</span>
                  </span>
                  <span className="grid min-w-7 place-items-center rounded-full bg-kanban-ink/15 px-2 py-0.5 text-sm font-bold">{list.length}</span>
                </header>
                <div className="flex max-h-[70vh] min-h-40 flex-col gap-3 overflow-y-auto p-2.5">
                  {list.length ? list.map(card) : (
                    <p className="m-auto max-w-[14rem] py-8 text-center text-xs text-muted-foreground">
                      {column.id === "received"
                        ? "Nenhum pedido novo. Quando um cliente finalizar no catálogo, ele aparece aqui com alerta."
                        : column.id === "delivered"
                          ? "Nenhum pedido entregue hoje ainda."
                          : "Nenhum pedido nesta etapa."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Delivered today + cancelled */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{all.filter((o) => isActiveOrder(o.status)).length}</strong> em andamento</span>·
        <span><strong className="text-whatsapp">{delivered.length}</strong> entregues hoje</span>
        <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-xs" onClick={() => setShowCancelledOnly((v) => !v)}>
          {showCancelledOnly ? "Voltar ao quadro" : "Ver cancelados"}
        </Button>
      </div>
      {cancelled.length > 0 && (
        <section aria-label="Cancelados" className="mt-4 rounded-2xl border bg-card p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-destructive">Cancelados hoje</h2>
            <Button variant="outline" size="sm" onClick={clearCancelled}><Trash2 />Limpar cancelados</Button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {cancelled.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => open(o)} className="w-full rounded-lg border bg-background px-3 py-2 text-left text-sm">
                  <span className="block truncate font-medium">#{o.number} · {o.customer_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{o.cancellation_reason}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {showCancelledOnly && cancelled.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Nenhum pedido cancelado hoje.</p>}

      {/* Right detail panel */}
      <Sheet open={!!detail} onOpenChange={(value) => { if (!value) { setSelected(null); setCancelIntent(false); } }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          {detail && (
            <>
              <div className="border-b p-5 pr-12">
                <SheetTitle className="text-lg">Pedido #{detail.number} · {detail.customer_name}</SheetTitle>
                <SheetDescription>Recebido às {clock(detail.created_at)} · WhatsApp {detail.customer_phone}</SheetDescription>
              </div>
              <div className="space-y-5 p-5 text-sm">
                <section aria-label="Produtos">
                  <ul className="space-y-2">
                    {detail.items.map((item, index) => (
                      <li key={index} className="flex items-start justify-between gap-3">
                        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border bg-photo">
                          {photoFor(item.productId, item.option) ? <img src={photoFor(item.productId, item.option)} alt={item.name} loading="lazy" className="size-full object-contain" /> : <Package className="size-6 text-photo-foreground" />}
                        </span>
                        <span className="min-w-0 flex-1 break-words">
                          <strong>{item.qty}x</strong> {item.name}
                          {item.option && <span className="block text-xs text-primary">{item.optionLabel}: {item.option}</span>}
                          {item.qty > 1 && <span className="block text-xs text-muted-foreground">{brl(item.price)} cada</span>}
                        </span>
                        <span className="shrink-0">{brl(item.qty * item.price)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 space-y-1 border-t pt-3">
                    <p className="flex justify-between text-muted-foreground"><span>Produtos</span><span>{brl(detail.subtotal)}</span></p>
                    {!!detail.coupon_discount && <p className="flex justify-between text-muted-foreground"><span>Cupom {detail.coupon_code}</span><span>- {brl(detail.coupon_discount)}</span></p>}
                    <p className="flex justify-between text-muted-foreground">
                      <span>{isPickup(detail) ? "Retirada" : `Entrega ${detail.delivery_zone}`}</span>
                      <span>{isPickup(detail) ? "Sem taxa" : detail.delivery_confirmed ? brl(detail.delivery_fee) : "A confirmar"}</span>
                    </p>
                    <p className="flex justify-between text-base font-bold"><span>Total</span><span>{brl(detail.total)}</span></p>
                  </div>
                </section>

                <section aria-label="Entrega e pagamento" className="space-y-2 border-t pt-4">
                  <p className="flex items-center gap-2 font-semibold">{isPickup(detail) ? <ShoppingBag className="size-4 text-primary" /> : <Bike className="size-4 text-primary" />}{isPickup(detail) ? "Retirada na loja" : "Delivery"}</p>
                  <p className="text-xs text-muted-foreground">Toque em um dado para copiar e colar no site da entrega.</p>
                  <CopyField icon={User} label="Nome do cliente" copyLabel="nome do cliente" value={detail.customer_name} />
                  <CopyField icon={Phone} label="WhatsApp" copyLabel="WhatsApp do cliente" value={formatBrazilPhone(detail.customer_phone)} />
                  {!isPickup(detail) && <CopyField icon={MapPin} label="Endereço" copyLabel="endereço de entrega" value={detail.address} />}
                  <CopyField icon={CreditCard} label="Pagamento" copyLabel="forma de pagamento" value={courierPayment(detail)} hint={isPix(detail.payment) ? "confira o comprovante" : "cobrar na entrega"} />
                  {detail.notes && <CopyField icon={StickyNote} label="Observações" copyLabel="observações" value={detail.notes} />}
                  {!isPickup(detail) && !!detail.tracking_url && <CopyField icon={Link2} label="Link de rastreio" copyLabel="link de rastreio" value={detail.tracking_url} />}
                  <Button variant="outline" size="sm" className="w-full" aria-label={`Copiar todos os dados do pedido ${detail.number}`} onClick={() => void copyAll(detail)}>
                    <Copy />Copiar tudo
                  </Button>
                </section>

                <div className="grid gap-2">
                  <Button className="w-full bg-kanban-prep font-semibold text-kanban-ink hover:bg-kanban-prep/90" onClick={() => setPrintJob({ order: detail, kitchen: true })}>
                    <Printer />Imprimir p/ Cozinha
                  </Button>
                  <Button variant="outline" className="w-full border-kanban-prep text-kanban-prep" aria-label={`Imprimir pedido ${detail.number}`} onClick={() => setPrintJob({ order: detail, kitchen: false })}>
                    <Printer />Imprimir Cupom
                  </Button>
                </div>

                {!isPickup(detail) && detail.status !== "cancelled" && (
                  <section aria-label="Entregador" className="space-y-3 border-t pt-4">
                    <label className="block">
                      Nome do motoboy
                      <input key={`c-${detail.id}`} className="field mt-2" maxLength={60} placeholder="Ex.: Carlos" defaultValue={detail.courier_name ?? ""} disabled={!!busy} onBlur={(e) => void saveField(detail, "courier", e.target.value)} aria-label={`Motoboy do pedido ${detail.number}`} />
                    </label>
                    <label className="block">
                      Link de rastreio do entregador
                      <input key={`t-${detail.id}`} className="field mt-2" type="url" inputMode="url" placeholder="https://… (cole o link do aplicativo de entrega)" defaultValue={detail.tracking_url ?? ""} disabled={!!busy} onBlur={(e) => void saveField(detail, "tracking", e.target.value)} aria-label={`Link de rastreio do pedido ${detail.number}`} />
                      <span className="mt-1 block text-xs text-muted-foreground">O cliente acompanha a entrega por esse link.</span>
                    </label>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={whatsappTo(null, courierMessage(detail))} target="_blank" rel="noopener noreferrer"><Bike />Enviar dados para o motoboy</a>
                    </Button>
                  </section>
                )}

                <section aria-label="Etapas" className="border-t pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Andamento</p>
                  {detail.status === "cancelled" ? <p className="text-destructive">Pedido cancelado.</p> : timeline(detail)}
                  {detail.status !== "cancelled" && (
                    <label className="mt-4 block">
                      Mudar etapa manualmente
                      <select aria-label="Etapa do pedido" className="field mt-2" disabled={!!busy} value={detail.status} onChange={(e) => void move(detail, e.target.value as OrderStatus)}>
                        {ORDER_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                      </select>
                    </label>
                  )}
                </section>

                {detail.status !== "cancelled" && (
                  <section aria-label="Mensagens" className="space-y-2 border-t pt-4">
                    <Button asChild className="w-full bg-whatsapp text-whatsapp-foreground">
                      <a href={orderWhatsApp(detail)} target="_blank" rel="noopener noreferrer"><MessageCircle />Avisar cliente no WhatsApp</a>
                    </Button>
                    <div className="flex flex-wrap gap-2">
                      {quickMessages(detail).map((m) => (
                        <Button key={m.id} asChild variant="outline" size="sm" className="text-whatsapp">
                          <a href={whatsappTo(detail.customer_phone, m.text)} target="_blank" rel="noopener noreferrer">{m.label}</a>
                        </Button>
                      ))}
                    </div>
                  </section>
                )}

                <div className={cancelIntent ? "rounded-xl border border-destructive/40 p-3" : ""}>
                  {cancelIntent && detail.status !== "cancelled" && <p className="mb-2 text-sm font-semibold text-destructive">Para recusar, informe o motivo e confirme o cancelamento.</p>}
                  <OrderCancellation key={detail.id} order={detail} disabled={!!busy} />
                </div>
                {detail.status === "delivered" && <p className="flex items-center gap-2 text-whatsapp"><CheckCircle2 className="size-4" />Entregue</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
