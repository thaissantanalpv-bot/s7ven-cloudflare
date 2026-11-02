import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Banknote, Download, Package, Receipt, ShoppingCart } from "lucide-react";
import { listOrders } from "@/lib/orders.functions";
import { orderStatusLabel, type Order } from "@/lib/orders";
import { dailySales, historyPeriodRange, inSalesRange, summarizeSales, type HistoryPeriod } from "@/lib/sales-report";
import { OrderCancellation } from "@/components/orders/order-cancellation";
import { brl } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const timestamp = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const shortDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const compactBrl = (value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)}`;
const PERIODS: { id: HistoryPeriod; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "month", label: "Este mês" },
  { id: "lastMonth", label: "Mês anterior" },
  { id: "all", label: "Tudo" },
];
const chartConfig = {
  revenue: { label: "Faturamento", color: "var(--primary)" },
  count: { label: "Vendas", color: "var(--primary)" },
} satisfies ChartConfig;
const statusText = (o: Pick<Order, "status" | "source">) => o.status === "cancelled" ? "Cancelado" : o.source === "counter" ? "Concluída" : orderStatusLabel(o.status);

export function SalesHistory() {
  const fetchOrders = useServerFn(listOrders);
  const orders = useQuery({ queryKey: ["store-orders"], queryFn: () => fetchOrders(), refetchInterval: 5000, retry: false });
  const [period, setPeriod] = useState<HistoryPeriod>("30d");
  const [day, setDay] = useState("");
  const [metric, setMetric] = useState<"revenue" | "count">("revenue");
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const range = useMemo(() => {
    if (!day) return historyPeriodRange(period);
    const next = new Date(`${day}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    return { start: day, end: next.toISOString().slice(0, 10) };
  }, [period, day]);
  const inPeriod = useMemo(() => (orders.data ?? []).filter(o => (source === "all" || (o.source ?? "catalog") === source) && inSalesRange(o.created_at, range)), [orders.data, range, source]);
  const summary = useMemo(() => summarizeSales(inPeriod), [inPeriod]);
  const series = useMemo(() => dailySales(inPeriod, range), [inPeriod, range]);
  const filtered = inPeriod.filter(o => `${o.number} ${o.customer_name} ${o.customer_phone ?? ""} ${o.payment}`.toLowerCase().includes(search.toLowerCase()));
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / 25) - 1));
  const detail = orders.data?.find(o => o.id === selected);
  const leader = summary.bestSellers[0];
  const topProducts = summary.bestSellers.slice(0, showAllProducts ? 10 : 5);
  const maxQty = topProducts[0]?.quantity ?? 1;

  const exportCsv = () => {
    if (!filtered.length) return;
    const quote = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
    const rows = [
      ["Faturamento (R$)", summary.revenue.toFixed(2)],
      ["Vendas", String(summary.orderCount)],
      ["Ticket médio (R$)", summary.averageTicket.toFixed(2)],
      ["Cancelados", String(summary.cancelledCount)],
      [],
      ["Posição", "Produto", "Unidades", "Receita (R$)"],
      ...summary.bestSellers.map((p, i) => [String(i + 1), quote(p.name), String(p.quantity), p.revenue.toFixed(2)]),
      [],
      ["Venda", "Data", "Origem", "Cliente", "Telefone", "Pagamento", "Situação", "Subtotal", "Taxa_Entrega", "Total"],
      ...filtered.map(o => [`#${o.number}`, timestamp(o.created_at), o.source === "counter" ? "Balcão" : "Catálogo", quote(o.customer_name), quote(o.customer_phone ?? ""), quote(o.payment), statusText(o), o.subtotal.toFixed(2), o.delivery_fee.toFixed(2), o.total.toFixed(2)]),
    ];
    const blob = new Blob(["\uFEFF" + rows.map(r => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-${range.start ?? "inicio"}-a-${range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Faturamento", value: brl(summary.revenue), Icon: Banknote },
    { label: "Vendas", value: String(summary.orderCount), Icon: ShoppingCart },
    { label: "Ticket médio", value: brl(summary.averageTicket), Icon: Receipt },
  ];

  return <section className="py-7" aria-label="Histórico de vendas">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Período">
        {PERIODS.map(p => <Button key={p.id} size="sm" variant={!day && period === p.id ? "default" : "outline"} aria-pressed={!day && period === p.id} onClick={() => { setPeriod(p.id); setDay(""); setPage(0); }}>{p.label}</Button>)}
      </div>
      <input type="date" className="field h-9 w-auto" aria-label="Dia específico" value={day} onChange={e => { setDay(e.target.value); setPage(0); }} />
      <Button size="sm" className="gap-2 sm:ml-auto" disabled={!filtered.length} onClick={exportCsv}><Download className="size-4" />Gerar relatório</Button>
    </div>

    {orders.isPending ? <p className="py-12 text-muted-foreground">Carregando vendas…</p> : orders.error ? <div role="alert" className="py-8">Não foi possível carregar as vendas. <Button variant="outline" onClick={() => orders.refetch()}>Tentar novamente</Button></div> : <>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(({ label, value, Icon }) => <div key={label} className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>{label}</p>
          <p className="mt-3 break-words font-display text-2xl font-semibold">{value}</p>
        </div>)}
        <div className="col-span-2 rounded-xl border bg-card p-4 lg:col-span-1">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Package className="size-4" /></span>Produto líder</p>
          {leader ? <><p className="mt-3 line-clamp-2 font-semibold">{leader.name}</p><p className="text-sm text-muted-foreground">{leader.quantity} un vendidas</p></> : <p className="mt-3 text-sm text-muted-foreground">Sem vendas no período</p>}
        </div>
      </div>
      {summary.cancelledCount > 0 && <p className="mt-2 text-xs text-muted-foreground">{summary.cancelledCount} cancelado{summary.cancelledCount === 1 ? "" : "s"} ({brl(summary.cancelledTotal)}) fora do faturamento</p>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{metric === "revenue" ? "Faturamento" : "Vendas"}</h2>
            <select className="field h-9 w-auto" aria-label="Valor do gráfico" value={metric} onChange={e => setMetric(e.target.value as "revenue" | "count")}>
              <option value="revenue">Faturamento (R$)</option>
              <option value="count">Número de vendas</option>
            </select>
          </div>
          {series.length ? <ChartContainer config={chartConfig} className="mt-4 aspect-auto h-64 w-full">
            <AreaChart data={series} margin={{ left: 4, right: 8, top: 8 }}>
              <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDay} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis width={metric === "revenue" ? 64 : 32} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={v => metric === "revenue" ? compactBrl(Number(v)) : String(v)} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, p) => shortDay(String(p?.[0]?.payload?.date ?? ""))} formatter={v => <span className="font-semibold">{metric === "revenue" ? brl(Number(v)) : `${v} venda${Number(v) === 1 ? "" : "s"}`}</span>} />} />
              <Area type="monotone" dataKey={metric} stroke="var(--primary)" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ChartContainer> : <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma venda neste período.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Por dia · horário de Brasília · sem pedidos cancelados</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Produtos mais vendidos</h2>
            {summary.bestSellers.length > 5 && <Button variant="link" size="sm" className="px-0" onClick={() => setShowAllProducts(v => !v)}>{showAllProducts ? "Ver menos" : "Ver todos"}</Button>}
          </div>
          {topProducts.length ? <ol className="mt-4 space-y-3">
            {topProducts.map((p, i) => <li key={p.id} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-muted-foreground">{i + 1}</span>
              <span className="truncate font-medium" title={p.name}>{p.name}</span>
              <span className="text-right font-semibold">{p.quantity} un</span>
              <span className="col-start-2 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (p.quantity / maxQty) * 100)}%` }} /></span>
              <span className="text-right text-xs text-muted-foreground">{brl(p.revenue)}</span>
            </li>)}
          </ol> : <p className="py-16 text-center text-sm text-muted-foreground">Nenhum produto vendido no período.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-lg font-semibold">Vendas do período <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span></h2>
          <input className="field min-w-48 flex-1 sm:max-w-sm" aria-label="Buscar venda" placeholder="Buscar cliente, fone, número ou pagamento…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
          <select className="field w-auto" aria-label="Origem da venda" value={source} onChange={e => { setSource(e.target.value); setPage(0); }}><option value="all">Todas as origens</option><option value="counter">Balcão</option><option value="catalog">Catálogo</option></select>
        </div>
        {!filtered.length ? <p className="py-10 text-muted-foreground">Nenhuma venda encontrada.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-muted-foreground"><tr>{["Venda", "Data", "Cliente", "Pagamento", "Situação", "Total", ""].map(h => <th className="px-3 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(current * 25, current * 25 + 25).map(o => <tr key={o.id} className="border-t"><td className="px-3 py-3 font-medium">#{o.number}</td><td className="whitespace-nowrap px-3">{timestamp(o.created_at)}</td><td className="px-3">{o.customer_name}</td><td className="px-3">{o.payment}</td><td className={`px-3 ${o.status === "cancelled" ? "text-destructive" : ""}`}>{statusText(o)}</td><td className="whitespace-nowrap px-3 font-semibold">{brl(o.total)}</td><td className="px-3 text-right"><Button variant="outline" size="sm" onClick={() => setSelected(o.id)}>Detalhes</Button></td></tr>)}</tbody></table></div>}
        {filtered.length > 25 && <div className="mt-4 flex items-center justify-end gap-3"><Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button><span>{current + 1} / {Math.ceil(filtered.length / 25)}</span><Button variant="outline" disabled={(current + 1) * 25 >= filtered.length} onClick={() => setPage(current + 1)}>Próxima</Button></div>}
      </div>
    </>}

    <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogTitle>Venda #{detail?.number}</DialogTitle><DialogDescription>{detail && timestamp(detail.created_at)} · {detail?.source === "counter" ? "Balcão" : "Catálogo"}</DialogDescription>{detail && <><p>{detail.customer_name} · {detail.payment}</p>{detail.source !== "counter" && <p>{detail.fulfillment === "pickup" ? "Retirada na loja · Sem taxa" : `Entrega · ${detail.address}`}</p>}{detail.items.map((i, n) => <div key={n} className="flex justify-between gap-4 border-b py-3"><span>{i.qty} × {i.name}{i.option && <small className="block text-muted-foreground">{i.optionLabel}: {i.option}</small>}</span><span className="shrink-0">{brl(i.price * i.qty)}</span></div>)}<p>Subtotal: {brl(detail.subtotal)}</p>{detail.delivery_fee > 0 && <p>Entrega: {brl(detail.delivery_fee)}</p>}<p className="text-xl font-semibold">Total: {brl(detail.total)}</p>{detail.cash_received != null && <><p>Recebido: {brl(detail.cash_received)}</p><p>Troco: {brl(detail.cash_change ?? 0)}</p></>}{detail.notes && <p className="break-words text-muted-foreground">{detail.notes}</p>}<OrderCancellation key={detail.id} order={detail} /></>}</DialogContent></Dialog>
  </section>;
}
