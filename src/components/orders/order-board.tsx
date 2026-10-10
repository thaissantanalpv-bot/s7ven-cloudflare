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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { listOrders, updateOrderStatus } from "@/lib/orders.functions";
import { ORDER_STAGES, orderWhatsApp, type Order, type OrderStatus } from "@/lib/orders";
import { brl } from "@/lib/products";

const time = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
export function OrderBoard() {
  const fetchOrders = useServerFn(listOrders);
  const update = useServerFn(updateOrderStatus);
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
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const beep = () => {
    const ctx = audio.current;
    if (!ctx || ctx.state !== "running") return;
    [660, 880, 990].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      const start = ctx.currentTime + index * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
  };
  const toggleSound = async () => {
    if (sound) {
      setSound(false);
      return;
    }
    try {
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
      setSound(true);
      beep();
    } catch {
      setError("Não foi possível ativar o som neste navegador.");
    }
  };
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    if (!orders.data) return;
    const newOrders = seen.current ? orders.data.filter((o) => o.source !== "counter" && !seen.current?.has(o.id)) : [];
    if (newOrders.length) {
      setNotice(
        `${newOrders.length} ${newOrders.length === 1 ? "novo pedido recebido" : "novos pedidos recebidos"}`,
      );
      if (sound) beep();
    }
    seen.current = new Set(orders.data.map((o) => o.id));
  }, [orders.data, sound]);
  const move = async (order: Order, status: OrderStatus) => {
    if (busy || order.status === status) return;
    setBusy(order.id);
    setError("");
    try {
      await update({ data: { id: order.id, status, expected: order.status } });
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar a etapa.");
      await orders.refetch();
    } finally {
      setBusy("");
      setDrag(null);
    }
  };
  const all = (orders.data ?? []).filter(o => o.source !== "counter");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(),
  );
  const visible = all.filter(
    (o) =>
      (period !== "today" ||
        new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
          new Date(o.created_at),
        ) === today) &&
      (period !== "active" || o.status !== "delivered") &&
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
              {all.filter((o) => o.status !== "delivered").length}
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
          <Button
            variant={sound ? "secondary" : "outline"}
            onClick={toggleSound}
            aria-pressed={sound}
          >
            {sound ? <Volume2 /> : <VolumeX />}
            {sound ? "Som ativo" : "Ativar som"}
          </Button>
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
      {orders.isPending ? (
        <p className="py-16 text-muted-foreground">Carregando pedidos…</p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ORDER_STAGES.map((stage, index) => (
            <section
              key={stage.id}
              aria-label={stage.label}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const order = all.find((o) => o.id === drag);
                if (order) void move(order, stage.id);
              }}
              className={`min-w-0 border-t-2 pt-4 ${drag ? "border-primary" : "border-border"}`}
            >
              <div className="mb-4 flex items-center gap-2">
                <span className={`size-2 rounded-full bg-current ${stage.tone}`} />
                <h2 className="text-sm font-semibold">{stage.label}</h2>
                <span className="ml-auto grid size-6 place-items-center rounded-md bg-secondary text-xs">
                  {visible.filter((o) => o.status === stage.id).length}
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
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex justify-between gap-2">
                        <Button
                          variant="link"
                          className="h-auto p-0 font-mono text-sm text-foreground"
                          onClick={() => setSelected(order.id)}
                        >
                          #{order.number}
                        </Button>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" />
                          {time(order.created_at)}
                        </span>
                      </div>
                      <h3 className="mt-3 break-words font-semibold">{order.customer_name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {order.items.reduce((n, i) => n + i.qty, 0)} itens · {order.payment}
                      </p>
                      <p className="mt-3 line-clamp-2 break-words text-xs text-muted-foreground">
                        {order.address}
                      </p>
                      <div className="my-4 flex items-center justify-between border-t pt-3">
                        <span className={`text-xs ${stage.tone}`}>{stage.label}</span>
                        <strong className="text-sm">{brl(order.total)}</strong>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelected(order.id)}
                        >
                          <Package />
                          Detalhes
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="icon"
                          className="size-8 text-whatsapp"
                          title={`Avisar cliente: ${stage.label}`}
                        >
                          <a
                            href={orderWhatsApp(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Avisar cliente do pedido ${order.number}: ${stage.label}`}
                          >
                            <MessageCircle />
                          </a>
                        </Button>
                      </div>
                      {ORDER_STAGES[index + 1] && (
                        <Button
                          disabled={!!busy}
                          className="mt-2 w-full text-xs"
                          size="sm"
                          onClick={() => void move(order, ORDER_STAGES[index + 1]?.id ?? stage.id)}
                        >
                          {busy === order.id ? "Salvando…" : ORDER_STAGES[index + 1]?.label}
                          <ArrowRight />
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
          ))}
        </div>
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
                  <p className="break-words">{detail.address}</p>
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
                    <span>Entrega {detail.delivery_zone}</span>
                    <span>
                      {detail.delivery_confirmed ? brl(detail.delivery_fee) : "A confirmar"}
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
                <Button asChild className="w-full bg-whatsapp text-whatsapp-foreground">
                  <a href={orderWhatsApp(detail)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                    Avisar cliente no WhatsApp
                  </a>
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
