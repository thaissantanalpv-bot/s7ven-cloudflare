import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, TrendingUp, Receipt, Ban, Download, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSalesReport } from "@/lib/sales-report.functions";
import type { SalesPeriod } from "@/lib/sales-report";
import { brl } from "@/lib/products";

export function SalesReport() {
  const [period, setPeriod] = useState<SalesPeriod>("today");
  const getReport = useServerFn(getSalesReport);
  const report = useQuery({ queryKey: ["admin-sales-report", period], queryFn: () => getReport({ data: period }), refetchInterval: 60000, retry: false });
  const data = report.data;

  const exportCsv = () => {
    if (!data) return;
    const summaryRows = [
      ["Métrica", "Valor"],
      ["Período", period],
      ["Vendas registradas (R$)", data.revenue.toFixed(2)],
      ["Pedidos válidos", String(data.orderCount)],
      ["Ticket médio (R$)", data.averageTicket.toFixed(2)],
      ["Total cancelado (R$)", data.cancelledTotal.toFixed(2)],
      ["Quantidade cancelada", String(data.cancelledCount)],
      [],
      ["Método de Pagamento", "Qtd Pedidos", "Total (R$)"],
      ...Object.entries(data.paymentMethods || {}).map(([method, info]) => [method, String(info.count), info.total.toFixed(2)]),
      [],
      ["Posição", "Produto", "Unidades", "Receita (R$)"],
      ...data.bestSellers.map((p, i) => [String(i + 1), `"${p.name.replace(/"/g, '""')}"`, String(p.quantity), p.revenue.toFixed(2)]),
    ];
    const csvContent = "\uFEFF" + summaryRows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="py-7" aria-label="Relatório de vendas">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Período das vendas">
          {([
            { id: "today", label: "Hoje" },
            { id: "week", label: "Esta semana" },
            { id: "month", label: "Este mês" },
          ] as const).map(p => (
            <Button
              key={p.id}
              variant={period === p.id ? "default" : "outline"}
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" disabled={!data} onClick={exportCsv}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Atualizar relatório"
            title="Atualizar relatório"
            disabled={report.isFetching}
            onClick={() => report.refetch()}
          >
            <RefreshCw className={report.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>
      {report.error ? (
        <p role="alert" className="mt-6 text-destructive">
          Não foi possível carregar as vendas. <Button variant="link" onClick={() => report.refetch()}>Tentar novamente</Button>
        </p>
      ) : report.isPending ? (
        <p className="py-12 text-muted-foreground">Carregando vendas…</p>
      ) : data ? (
        <>
          <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6 border-y py-6 lg:grid-cols-4">
            {[
              { label: "Vendas registradas", value: brl(data.revenue), Icon: TrendingUp },
              { label: "Pedidos válidos", value: String(data.orderCount), Icon: Receipt },
              { label: "Ticket médio", value: brl(data.averageTicket), Icon: Receipt },
              { label: `Cancelados (${data.cancelledCount})`, value: brl(data.cancelledTotal), Icon: Ban },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="min-w-0">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </p>
                <p className="mt-3 break-words font-display text-xl font-semibold sm:text-2xl">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Balcão e catálogo · valores com entrega · cancelados fora das vendas · horário de Brasília
          </p>
          {Boolean(data.paymentMethods && Object.keys(data.paymentMethods).length > 0) && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="size-5" />
                Faturamento por forma de pagamento
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Object.entries(data.paymentMethods || {}).map(([method, info]) => (
                  <div key={method} className="rounded-lg border p-3 bg-card">
                    <p className="text-xs text-muted-foreground font-medium truncate">{method}</p>
                    <p className="mt-2 font-display text-lg font-semibold text-primary">{brl(info.total)}</p>
                    <span className="text-xs text-muted-foreground">
                      {info.count} pedido{info.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <h2 className="mt-8 text-lg font-semibold">Produtos mais vendidos</h2>
          {data.bestSellers.length ? (
            <div className="mt-4 divide-y">
              {data.bestSellers.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 py-4">
                  <span className="w-6 shrink-0 font-mono text-sm text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 break-words text-sm font-medium">{p.name}</span>
                  <span className="shrink-0 text-right text-sm">
                    <strong>{p.quantity} un.</strong>
                    <span className="block text-xs text-muted-foreground">{brl(p.revenue)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-sm text-muted-foreground">Nenhuma venda neste período.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
