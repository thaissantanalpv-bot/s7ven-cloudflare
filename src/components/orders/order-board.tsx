import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  Volume2,
  VolumeX,
  RefreshCw,
  Search,
  ArrowRight,
  MessageCircle,
  Package,
  MapPin,
  Clock,
  X,
  CheckCircle2,
  Check,
  Printer,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listOrders, updateOrderStatus, updateOrderTracking } from "@/lib/orders.functions";
import {
  ORDER_STAGES,
  orderWhatsApp,
  isActiveOrder,
  showCancelledOnBoard,
  type Order,
  type OrderStatus,
} from "@/lib/orders";

const CANCELLED_CLEARED_KEY = "s7ven-cancelled-cleared-at";
import { brl } from "@/lib/products";
import { OrderPrinting } from "./order-printing";
import { OrderCancellation } from "./order-cancellation";
import { PushQuickButton } from "@/components/push-notifications";
import { StorePauseButton } from "@/components/store-pause-button";
import { useOrderAlarm } from "./new-order-alarm";

const time = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function elapsed(created: string): string {
  const diff = Math.max(0, Date.now() - new Date(created).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h${rem > 0 ? String(rem).padStart(2, "0") : ""}`;
}

function elapsedColor(created: string): string {
  const mins = Math.floor(Math.max(0, Date.now() - new Date(created).getTime()) / 60000);
  if (mins < 10) return "text-emerald-500";
  if (mins < 20) return "text-amber-500";
  return "text-red-500";
}

export function OrderBoard() {
  const fetchOrders = useServerFn(listOrders);
  const update = useServerFn(updateOrderStatus);
  const saveTrackingFn = useServerFn(updateOrderTracking);
  const client = useQueryClient();
  const orders = useQuery({
    queryKey: ["store-orders"],
    queryFn: () => fetchOrders(),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all");
  const { sound, ready: audioReady, toggle: toggleSound } = useOrderAlarm();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
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
    setNotice("Cancelados limpos do quadro. Eles continuam em Histórico e no filtro Cancelados.");
  };

  // Tick every 30s to update elapsed timers
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(iv);
  }, []);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!orders.data) return;
    const newOrders = seen.current
      ? orders.data.filter((o) => o.source !== "counter" && o.status === "received" && !seen.current?.has(o.id))
      : [];
    if (newOrders.length) {
      setNotice(
        `${newOrders.length} ${newOrders.length === 1 ? "novo pedido recebido" : "novos pedidos recebidos"}`,
      );
    }
    seen.current = new Set(orders.data.map((o) => o.id));
  }, [orders.data]);


  const move = async (order: Order, status: OrderStatus, notify = false) => {
    if (busy || order.status === status || order.status === "cancelled") return;
    const popup = notify ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    setBusy(order.id);
    setError("");
    try {
      await update({ data: { id: order.id, status, expected: order.status } });
      if (notify) {
        const changed = { ...order, status };
        setPendingMessage(changed);
        if (popup) popup.location.replace(orderWhatsApp(changed));
      }
      void client.invalidateQueries({ queryKey: ["admin-sales-report"] });
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      popup?.close();
      setError(e instanceof Error ? e.message : "Não foi possível alterar a etapa.");
      await orders.refetch();
    } finally {
      setBusy("");
      setDrag(null);
    }
  };

  const saveTracking = async (order: Order, trackingUrl: string) => {
    if (busy || (order.tracking_url ?? "") === trackingUrl.trim()) return;
    setBusy(order.id);
    setError("");
    try {
      await saveTrackingFn({ data: { id: order.id, trackingUrl } });
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o link de rastreio.");
      await orders.refetch();
    } finally {
      setBusy("");
    }
  };

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );

  const isOrderFromToday = (dateStr: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
      new Date(dateStr),
    ) === today;

  const all = (orders.data ?? []).filter(
    (o) =>
      o.source !== "counter" &&
      (o.status !== "delivered" || isOrderFromToday(o.updated_at || o.created_at)),
  );

  const now = new Date();
  const visible = all.filter(
    (o) =>
      (period === "cancelled" || showCancelledOnBoard(o, now, cancelledClearedAt)) &&
      (period !== "today" || isOrderFromToday(o.created_at)) &&
      (period !== "active" || isActiveOrder(o.status)) &&
      (period !== "cancelled" || o.status === "cancelled") &&
      (!search ||
        `${o.number} ${o.customer_name} ${o.customer_phone}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase())),
  );

  const detail = all.find((o) => o.id === selected);

  return (
    <section className="py-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <span>
            <strong className="text-2xl font-display">
              {all.filter((o) => isActiveOrder(o.status)).length}
            </strong>
            <span className="ml-2 text-muted-foreground">em andamento</span>
          </span>
          <span>
            <strong className="text-2xl font-display text-whatsapp">
              {all.filter((o) => o.status === "delivered").length}
            </strong>
            <span className="ml-2 text-muted-foreground">entregues</span>
          </span>
        </div>
        <div className="flex gap-2">
          <OrderPrinting order={printOrder} onClose={() => setPrintOrder(null)} />
          <Button
            variant={sound && audioReady ? "secondary" : "outline"}
            onClick={toggleSound}
            aria-pressed={sound && audioReady}
          >
            {sound && audioReady ? <Volume2 /> : <VolumeX />}
            {!sound ? "Ativar som" : audioReady ? "Som ativo (WhatsApp)" : "Toque na tela para ativar o som"}
          </Button>
          <StorePauseButton />
          <PushQuickButton />
          <Button
            variant="outline"
            size="icon"
            title="Atualizar pedidos"
            aria-label="Atualizar pedidos"
            disabled={orders.isFetching}
            onClick={() => orders.refetch()}
          >
            <RefreshCw className={orders.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <input
            className="field pl-10"
            aria-label="Buscar pedido"
            placeholder="Número, cliente ou telefone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar pedidos"
          className="field max-w-48"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option value="active">Em andamento</option>
          <option value="today">Hoje</option>
          <option value="all">Todos os pedidos</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>
      {notice && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2 border-l-2 border-primary bg-primary/10 px-4 py-3 text-sm text-primary"
        >
          <BellRing className="size-4" />
          {notice}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7"
            aria-label="Dispensar alerta"
            onClick={() => setNotice("")}
          >
            <X />
          </Button>
        </div>
      )}
      {(error || orders.error) && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error || "Não foi possível carregar os pedidos."}{" "}
          <Button variant="link" onClick={() => orders.refetch()}>
            Tentar novamente
          </Button>
        </p>
      )}
      {pendingMessage && (
        <div role="status" className="mt-4 flex flex-wrap items-center gap-3 border-l-2 border-whatsapp py-3 pl-4 text-sm">
          <span>Pedido #{pendingMessage.number}: etapa salva.</span>
          <Button asChild variant="outline" className="text-whatsapp">
            <a href={orderWhatsApp(pendingMessage)} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              Abrir mensagem no WhatsApp
            </a>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Dispensar mensagem" onClick={() => setPendingMessage(null)}>
            <X />
          </Button>
        </div>
      )}
      {orders.isPending ? (
        <p className="py-16 text-muted-foreground">Carregando pedidos…</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ORDER_STAGES.map((stage, index) => {
            const KANBAN_LABELS: Record<string, string> = {
              received: "Novos / Pendente",
              preparing: "Em preparo / Separação",
              out_for_delivery: "Saiu p/ entrega / Pronto retirada",
              delivered: "Concluídos hoje",
            };
            const kanbanLabel = KANBAN_LABELS[stage.id] ?? stage.label;
            const KANBAN_COLORS: Record<string, string> = {
              received: "border-red-500",
              preparing: "border-amber-500",
              out_for_delivery: "border-blue-500",
              delivered: "border-emerald-500",
            };
            const colBorder = KANBAN_COLORS[stage.id] ?? "border-border";
            const count = visible.filter((o) => o.status === stage.id).length;
            return (
            <section
              key={stage.id}
              aria-label={stage.label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const order = all.find((o) => o.id === drag);
                if (order) void move(order, stage.id);
              }}
              className={`min-w-0 border-t-2 pt-4 ${drag ? "border-primary" : colBorder}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className={`size-2.5 rounded-full bg-current ${stage.tone}`} />
                <h2 className="text-sm font-semibold">{kanbanLabel}</h2>
                <span className={`ml-auto grid size-6 place-items-center rounded-full text-xs font-bold ${
                  count > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {count}
                </span>
              </div>
              <div className="space-y-3">
                {visible
                  .filter((o) => o.status === stage.id)
                  .map((order) => (
                    <article
                      key={order.id}
                      draggable={!busy}
                      onDragStart={() => setDrag(order.id)}
                      onDragEnd={() => setDrag(null)}
                      className={`rounded-xl border bg-card p-3.5 shadow-sm transition-all hover:border-primary/50 ${
                        order.status === "received" ? "ring-2 ring-primary/30 animate-pulse-subtle" : ""
                      }`}
                    >
                      {/* Top bar: badges + timer estilo Anota AI */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          order.fulfillment === "pickup"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}>
                          {order.fulfillment === "pickup" ? "🏪 Retirada" : "🛵 Entrega"}
                        </span>
                        <span className="inline-flex items-center rounded-md border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-foreground">
                          💳 {order.payment}
                        </span>
                        <span className={`ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${elapsedColor(order.created_at)}`}>
                          <Clock className="size-3.5" />
                          {elapsed(order.created_at)}
                        </span>
                      </div>
                      {/* Order number + time */}
                      <div className="mt-2 flex justify-between gap-2">
                        <Button
                          variant="link"
                          className="h-auto p-0 font-mono text-sm font-bold text-foreground"
                          onClick={() => setSelected(order.id)}
                        >
                          #{order.number}
                        </Button>
                        <span className="text-[11px] text-muted-foreground">
                          {time(order.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 break-words text-sm font-semibold">{order.customer_name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.items.reduce((n, i) => n + i.qty, 0)} itens
                      </p>
                      <p className="mt-1 line-clamp-1 break-words text-[11px] text-muted-foreground">
                        {order.fulfillment === "pickup" ? "Retirada na loja" : order.address}
                      </p>
                      {order.notes && (
                        <p className="mt-1.5 rounded bg-muted/60 px-2 py-1 text-xs text-foreground">
                          <strong className="text-primary">Obs:</strong> {order.notes}
                        </p>
                      )}
                      <div className="my-2 flex items-center justify-between border-t pt-2">
                        <span className={`text-xs font-medium ${stage.tone}`}>{stage.label}</span>
                        <strong className="text-sm">{brl(order.total)}</strong>
                      </div>
                      {/* Quick action buttons - Anota AI style */}
                      <div className="flex gap-1.5">
                        {ORDER_STAGES[index + 1] ? (
                          <Button
                            disabled={!!busy}
                            className="min-w-0 flex-1 font-semibold text-xs h-9 shadow-sm"
                            size="sm"
                            onClick={() => void move(order, ORDER_STAGES[index + 1]?.id ?? stage.id)}
                          >
                            {busy === order.id ? "Salvando…" : stage.id === "received" ? <><Check className="size-3.5" aria-hidden="true" />Aceitar pedido</> : `Avançar p/ ${ORDER_STAGES[index + 1]?.label}`}
                            <ArrowRight className="size-3.5 ml-1" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-w-0 flex-1 text-xs h-9"
                            onClick={() => setSelected(order.id)}
                          >
                            <CheckCircle2 className="size-3.5 mr-1 text-emerald-500" />
                            Ver detalhes
                          </Button>
                        )}
                        {ORDER_STAGES[index + 1] && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            title="Detalhes"
                            aria-label="Detalhes"
                            onClick={() => setSelected(order.id)}
                          >
                            <Package />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0"
                          title="Imprimir pedido"
                          aria-label={`Imprimir pedido ${order.number}`}
                          onClick={() => setPrintOrder(order)}
                        >
                          <Printer />
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="size-8 shrink-0 text-whatsapp"
                          title={`Avisar cliente no WhatsApp`}
                        >
                          <a
                            href={orderWhatsApp(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Avisar cliente do pedido ${order.number} no WhatsApp`}
                          >
                            <MessageCircle />
                          </a>
                        </Button>
                      </div>
                      {ORDER_STAGES[index + 1] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 w-full text-[11px] text-whatsapp"
                          disabled={!!busy}
                          aria-label={`${stage.id === "received" ? "Aceitar" : ORDER_STAGES[index + 1]?.label} e avisar pedido ${order.number} no WhatsApp`}
                          onClick={() => void move(order, ORDER_STAGES[index + 1]?.id ?? stage.id, true)}
                        >
                          <MessageCircle className="size-3" />
                          {stage.id === "received" ? "Aceitar" : ORDER_STAGES[index + 1]?.label} + WhatsApp
                        </Button>
                      )}
                    </article>
                  ))}
                {!visible.some((o) => o.status === stage.id) && (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-3 border border-dashed text-muted-foreground">
                    <Package className="size-6 opacity-50" />
                    <p className="text-xs">Nenhum pedido</p>
                  </div>
                )}
              </div>
            </section>
          );
          })}
        </div>
      )}
      {visible.some((o) => o.status === "cancelled") && (
        <section aria-label="Cancelados" className="mt-8 border-t pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-destructive">Cancelados</h2>
            {period !== "cancelled" && (
              <Button variant="outline" size="sm" onClick={clearCancelled}>
                <Trash2 />
                Limpar cancelados
              </Button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visible
              .filter((o) => o.status === "cancelled")
              .map((order) => (
                <article key={order.id} className="min-w-0 rounded-lg border bg-card p-4">
                  <Button variant="link" className="h-auto p-0" onClick={() => setSelected(order.id)}>
                    #{order.number} · {order.customer_name}
                  </Button>
                  <p className="mt-2 break-words text-sm text-muted-foreground">{order.cancellation_reason}</p>
                  <p className="mt-3 text-sm">{brl(order.total)} · Cancelado</p>
                  <Button variant="outline" className="mt-3 w-full" onClick={() => setSelected(order.id)}>
                    <Package />
                    Detalhes
                  </Button>
                </article>
              ))}
          </div>
        </section>
      )}
      <Dialog
        open={!!detail}
        onOpenChange={(value) => {
          if (!value) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          {detail && (
            <>
              <DialogTitle>Pedido #{detail.number}</DialogTitle>
              <DialogDescription>
                {time(detail.created_at)} · {detail.customer_name}
              </DialogDescription>
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-primary" />
                  <p className="break-words">{detail.fulfillment === "pickup" ? "Retirada na loja" : detail.address}</p>
                </div>
                <p className="text-muted-foreground">WhatsApp: {detail.customer_phone}</p>
                <ul className="divide-y">
                  {detail.items.map((item, index) => (
                    <li key={index} className="flex justify-between gap-3 py-3">
                      <span className="break-words">
                        {item.qty}× {item.name}
                        {item.option && (
                          <span className="block text-xs text-primary">
                            {item.optionLabel}: {item.option}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0">{brl(item.qty * item.price)}</span>
                    </li>
                  ))}
                </ul>
                <div className="space-y-2 border-y py-3">
                  <p className="flex justify-between">
                    <span>Produtos</span>
                    <span>{brl(detail.subtotal)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>{detail.fulfillment === "pickup" ? "Retirada na loja" : `Entrega ${detail.delivery_zone}`}</span>
                    <span>
                      {detail.fulfillment === "pickup" ? "Sem taxa" : detail.delivery_confirmed ? brl(detail.delivery_fee) : "A confirmar"}
                    </span>
                  </p>
                  <p className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>{brl(detail.total)}</span>
                  </p>
                </div>
                <p>
                  Pagamento: {detail.payment}
                  {detail.change_for && ` · Troco para ${detail.change_for}`}
                </p>
                {detail.notes && (
                  <p className="break-words text-muted-foreground">Observações: {detail.notes}</p>
                )}
                {detail.fulfillment === "delivery" && detail.status !== "cancelled" && (
                  <label className="block">
                    Link de rastreio do entregador
                    <input
                      key={detail.id}
                      className="field mt-2"
                      type="url"
                      inputMode="url"
                      placeholder="https://… (cole o link do aplicativo de entrega)"
                      defaultValue={detail.tracking_url ?? ""}
                      disabled={!!busy}
                      onBlur={(e) => void saveTracking(detail, e.target.value)}
                      aria-label={`Link de rastreio do pedido ${detail.number}`}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">
                      O cliente acompanha a entrega por esse link. Deixe em branco para remover.
                    </span>
                  </label>
                )}
                {detail.status !== "cancelled" && (
                  <label className="block">
                    Etapa
                    <select
                      aria-label="Etapa do pedido"
                      className="field mt-2"
                      disabled={!!busy}
                      value={detail.status}
                      onChange={(e) => void move(detail, e.target.value as OrderStatus)}
                    >
                      {ORDER_STAGES.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <OrderCancellation key={detail.id} order={detail} disabled={!!busy} />
                <Button asChild className="w-full bg-whatsapp text-whatsapp-foreground">
                  <a href={orderWhatsApp(detail)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                    Avisar cliente no WhatsApp
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelected(null);
                    setPrintOrder(detail);
                  }}
                >
                  <Printer />
                  Imprimir pedido
                </Button>
                {detail.status === "delivered" && (
                  <p className="flex items-center gap-2 text-whatsapp">
                    <CheckCircle2 className="size-4" />
                    Entregue
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
