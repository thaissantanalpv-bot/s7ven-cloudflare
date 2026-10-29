import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { listRatings } from "@/lib/ratings.functions";
import { ratingSummary } from "@/lib/ratings";

export function RatingsCard() {
  const load = useServerFn(listRatings);
  const ratings = useQuery({ queryKey: ["admin-ratings"], queryFn: () => load(), refetchInterval: 120000, retry: false });
  const rows = ratings.data ?? [];
  const summary = ratingSummary(rows);
  return (
    <section aria-label="Avaliações dos clientes" className="mt-8 rounded-xl border bg-card p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Star className="size-5 fill-gold text-gold" />Avaliações dos clientes</h2>
      {ratings.isError ? (
        <p className="mt-3 text-sm text-destructive">Não foi possível carregar as avaliações.</p>
      ) : summary.count === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma avaliação ainda. Ao mover um pedido para “Entregue” e avisar pelo WhatsApp, o cliente recebe o link para avaliar.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-4">
            <strong className="font-display text-4xl">{summary.average.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</strong>
            <div className="text-sm text-muted-foreground">
              <p>de 5 estrelas</p>
              <p>{summary.count} {summary.count === 1 ? "avaliação" : "avaliações"}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1 text-xs">
            {summary.distribution.map((d) => (
              <li key={d.stars} className="flex items-center gap-2">
                <span className="w-6 text-muted-foreground">{d.stars}★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-gold" style={{ width: `${(d.count / summary.count) * 100}%` }} /></span>
                <span className="w-6 text-right">{d.count}</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 divide-y">
            {rows.slice(0, 20).map((r) => (
              <li key={r.order_id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.orders ? `#${r.orders.number} · ${r.orders.customer_name}` : "Pedido"}</span>
                  <span className="shrink-0 text-gold" aria-label={`${r.rating} estrelas`}>{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></span>
                </div>
                {r.comment && <p className="mt-1 text-muted-foreground">“{r.comment}”</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
