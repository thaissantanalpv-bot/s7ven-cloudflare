import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Users, ShoppingCart, ShoppingBag, UserMinus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCatalogFunnel } from "@/lib/catalog-analytics.functions";
import { AbandonedCartNotice } from "./abandoned-cart-notice";
import type { z } from "zod";
import type { analyticsPeriodSchema } from "@/lib/catalog-analytics";

export function CatalogAnalytics() {
  const [period, setPeriod] = useState<z.infer<typeof analyticsPeriodSchema>>("today");
  const getStats = useServerFn(getCatalogFunnel);
  const stats = useQuery({ queryKey: ["admin-catalog-funnel", period], queryFn: () => getStats({ data: period }), refetchInterval: 5000, retry: 1 });
  const data = stats.data;
  const cards = [
    { label: "Visitantes", value: data?.visitors, Icon: Users },
    { label: "Adicionaram ao carrinho", value: data?.carts, Icon: ShoppingCart },
    { label: "Pedidos enviados", value: data?.completed, Icon: ShoppingBag },
    { label: "Desistências estimadas", value: data?.abandoned, Icon: UserMinus },
  ];
  const conversion = data?.visitors ? Math.round(data.completed / data.visitors * 1000) / 10 : 0;
  return <section className="py-7" aria-label="Indicadores do catálogo">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
      <div className="flex items-center gap-2 text-sm text-primary"><Activity className="size-4" />{data ? `${data.online} online agora` : "Conectando…"}</div>
      <div className="flex items-center gap-2">
        <select aria-label="Período dos indicadores" className="field w-auto" value={period} onChange={e => setPeriod(e.target.value as z.infer<typeof analyticsPeriodSchema>)}>
          <option value="today">Hoje</option><option value="7d">Últimos 7 dias</option><option value="30d">Últimos 30 dias</option><option value="all">Desde o início</option>
        </select>
        <Button variant="outline" size="icon" aria-label="Atualizar indicadores" title="Atualizar indicadores" onClick={() => stats.refetch()} disabled={stats.isFetching}><RefreshCw className="size-4" /></Button>
      </div>
    </div>
    {stats.error && <p role="alert" className="py-4 text-sm text-destructive">Não foi possível atualizar os indicadores. <Button variant="link" onClick={() => stats.refetch()}>Tentar novamente</Button></p>}
    {!stats.error && data && <AbandonedCartNotice count={data.abandoned} />}
    <div className="grid grid-cols-2 gap-3 py-6 sm:gap-4 xl:grid-cols-4">
      {cards.map(({ label, value, Icon }) => <article key={label} className="rounded-lg border bg-card p-4 sm:p-5">
        <Icon className="mb-5 size-5 text-primary" /><p className="min-h-10 text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-4xl font-semibold">{value === undefined ? "—" : value.toLocaleString("pt-BR")}</p>
      </article>)}
    </div>
    <div className="grid gap-6 border-y py-6 sm:grid-cols-2">
      <div><p className="text-sm text-muted-foreground">Conversão em pedido enviado</p><p className="mt-2 text-2xl font-semibold">{data ? `${conversion.toLocaleString("pt-BR")}%` : "—"}</p></div>
      <div><p className="text-sm text-muted-foreground">Carrinhos em andamento</p><p className="mt-2 text-2xl font-semibold">{data?.pending ?? "—"}</p></div>
    </div>
    <div className="mt-5 space-y-2 text-xs text-muted-foreground">
      <p>Desistência estimada: carrinho sem pedido enviado e sem atividade por 30 minutos. Se o cliente voltar, a contagem se ajusta.</p>
      <p>Visitantes únicos por navegador no período. Pedidos enviados não significam pagamento confirmado.</p>
      <p>{data?.trackingSince ? `Contagem desde ${new Date(data.trackingSince).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "A contagem começa com as próximas visitas ao catálogo."} {data ? `Última atualização: ${new Date(data.updatedAt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : ""}</p>
    </div>
  </section>;
}