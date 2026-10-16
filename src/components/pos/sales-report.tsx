import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, TrendingUp, Receipt, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSalesReport } from "@/lib/sales-report.functions";
import type { SalesPeriod } from "@/lib/sales-report";
import { brl } from "@/lib/products";

export function SalesReport() {
  const [period, setPeriod] = useState<SalesPeriod>("today");
  const getReport = useServerFn(getSalesReport);
  const report = useQuery({ queryKey: ["admin-sales-report", period], queryFn: () => getReport({ data: period }), refetchInterval: 60000, retry: false });
  const data = report.data;
  return <section className="py-7" aria-label="Relatório de vendas">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Período das vendas">{([{ id: "today", label: "Hoje" }, { id: "week", label: "Esta semana" }, { id: "month", label: "Este mês" }] as const).map(p => <Button key={p.id} variant={period === p.id ? "default" : "outline"} aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</Button>)}</div>
      <Button variant="outline" size="icon" aria-label="Atualizar relatório" title="Atualizar relatório" disabled={report.isFetching} onClick={() => report.refetch()}><RefreshCw className={report.isFetching ? "animate-spin" : ""} /></Button>
    </div>
    {report.error ? <p role="alert" className="mt-6 text-destructive">Não foi possível carregar as vendas. <Button variant="link" onClick={() => report.refetch()}>Tentar novamente</Button></p> : report.isPending ? <p className="py-12 text-muted-foreground">Carregando vendas…</p> : data && <>
      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-y py-6 lg:grid-cols-4">
        {[{ label: "Vendas registradas", value: brl(data.revenue), Icon: TrendingUp }, { label: "Pedidos válidos", value: String(data.orderCount), Icon: Receipt }, { label: "Ticket médio", value: brl(data.averageTicket), Icon: Receipt }, { label: `Cancelados (${data.cancelledCount})`, value: brl(data.cancelledTotal), Icon: Ban }].map(({ label, value, Icon }) => <div key={label} className="min-w-0"><p className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="size-4 shrink-0" />{label}</p><p className="mt-3 break-words font-display text-xl font-semibold sm:text-2xl">{value}</p></div>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Balcão e catálogo · valores com entrega · cancelados fora das vendas · horário de Brasília</p>
      <h2 className="mt-8 text-lg font-semibold">Produtos mais vendidos</h2>
      {data.bestSellers.length ? <div className="mt-4 divide-y">{data.bestSellers.map((p, i) => <div key={p.id} className="flex items-center gap-3 py-4"><span className="w-6 shrink-0 font-mono text-sm text-muted-foreground">{i + 1}</span><span className="min-w-0 flex-1 break-words text-sm font-medium">{p.name}</span><span className="shrink-0 text-right text-sm"><strong>{p.quantity} un.</strong><span className="block text-xs text-muted-foreground">{brl(p.revenue)}</span></span></div>)}</div> : <p className="py-10 text-sm text-muted-foreground">Nenhuma venda neste período.</p>}
    </>}
  </section>;
}