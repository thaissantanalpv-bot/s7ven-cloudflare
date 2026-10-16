import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listOrders } from "@/lib/orders.functions";
import { orderStatusLabel, recordedSalesTotal } from "@/lib/orders";
import { OrderCancellation } from "@/components/orders/order-cancellation";
import { brl } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const day = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(value));
const timestamp = (value: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export function SalesHistory() {
  const fetchOrders = useServerFn(listOrders);
  const orders = useQuery({ queryKey: ["store-orders"], queryFn: () => fetchOrders(), refetchInterval: 5000, retry: false });
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = (orders.data ?? []).filter(o => (source === "all" || (o.source ?? "catalog") === source) && (!date || day(o.created_at) === date) && `${o.number} ${o.customer_name} ${o.payment}`.toLowerCase().includes(search.toLowerCase()));
  const current = Math.min(page, Math.max(0, Math.ceil(filtered.length / 25) - 1));
  const detail = orders.data?.find(o => o.id === selected);
  return <section className="py-7">
    <div className="flex flex-wrap gap-8 border-b pb-6"><div><p className="text-sm text-muted-foreground">Vendas e pedidos</p><strong className="text-3xl font-display">{filtered.length}</strong></div><div><p className="text-sm text-muted-foreground">Valor registrado</p><strong className="text-3xl font-display text-primary">{brl(recordedSalesTotal(filtered))}</strong></div></div>
    <div className="my-5 flex flex-wrap gap-3"><input className="field min-w-48 flex-1" aria-label="Buscar venda" placeholder="Número, cliente ou pagamento" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /><select className="field w-auto" aria-label="Origem da venda" value={source} onChange={e => { setSource(e.target.value); setPage(0); }}><option value="all">Todas as origens</option><option value="counter">Balcão</option><option value="catalog">Catálogo</option></select><input type="date" className="field w-auto" aria-label="Data da venda" value={date} onChange={e => { setDate(e.target.value); setPage(0); }} /></div>
    {orders.isPending ? <p>Carregando vendas…</p> : orders.error ? <div role="alert">Não foi possível carregar as vendas. <Button variant="outline" onClick={() => orders.refetch()}>Tentar novamente</Button></div> : !filtered.length ? <p className="py-10 text-muted-foreground">Nenhuma venda encontrada.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-muted-foreground"><tr>{["Venda", "Data", "Origem", "Cliente", "Pagamento", "Situação", "Total"].map(h => <th className="px-3 py-3 font-medium" key={h}>{h}</th>)}</tr></thead><tbody>{filtered.slice(current * 25, current * 25 + 25).map(o => <tr key={o.id} className="border-t"><td className="px-3 py-4"><Button variant="link" className="px-0" onClick={() => setSelected(o.id)}>#{o.number}</Button></td><td className="whitespace-nowrap px-3">{timestamp(o.created_at)}</td><td className="px-3">{o.source === "counter" ? "Balcão" : "Catálogo"}</td><td className="px-3">{o.customer_name}</td><td className="px-3">{o.payment}</td><td className="px-3">{o.status === "cancelled" ? "Cancelado" : o.source === "counter" ? "Concluída" : orderStatusLabel(o.status)}</td><td className="whitespace-nowrap px-3 font-semibold">{brl(o.total)}</td></tr>)}</tbody></table></div>}
    {filtered.length > 25 && <div className="mt-5 flex items-center justify-end gap-3"><Button variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)}>Anterior</Button><span>{current + 1} / {Math.ceil(filtered.length / 25)}</span><Button variant="outline" disabled={(current + 1) * 25 >= filtered.length} onClick={() => setPage(current + 1)}>Próxima</Button></div>}
    <Dialog open={Boolean(detail)} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogTitle>Venda #{detail?.number}</DialogTitle><DialogDescription>{detail && timestamp(detail.created_at)} · {detail?.source === "counter" ? "Balcão" : "Catálogo"}</DialogDescription>{detail && <><p>{detail.customer_name} · {detail.payment}</p>{detail.source !== "counter" && <p>{detail.fulfillment === "pickup" ? "Retirada na loja · Sem taxa" : `Entrega · ${detail.address}`}</p>}{detail.items.map((i, n) => <div key={n} className="flex justify-between gap-4 border-b py-3"><span>{i.qty} × {i.name}{i.option && <small className="block text-muted-foreground">{i.optionLabel}: {i.option}</small>}</span><span className="shrink-0">{brl(i.price * i.qty)}</span></div>)}<p>Subtotal: {brl(detail.subtotal)}</p>{detail.delivery_fee > 0 && <p>Entrega: {brl(detail.delivery_fee)}</p>}<p className="text-xl font-semibold">Total: {brl(detail.total)}</p>{detail.cash_received != null && <><p>Recebido: {brl(detail.cash_received)}</p><p>Troco: {brl(detail.cash_change ?? 0)}</p></>}{detail.notes && <p className="break-words text-muted-foreground">{detail.notes}</p>}<OrderCancellation key={detail.id} order={detail} /></>}</DialogContent></Dialog>
  </section>;
}