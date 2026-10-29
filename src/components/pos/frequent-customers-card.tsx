import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFrequentCustomers } from "@/lib/frequent-customers.functions";
import { CUSTOMER_WINDOWS, type CustomerWindow } from "@/lib/frequent-customers";
import { formatBrazilPhone } from "@/lib/phone";
import { brl } from "@/lib/products";

const WINDOW_LABEL: Record<CustomerWindow, string> = { 30: "30 dias", 90: "90 dias", 365: "12 meses" };

export function FrequentCustomersCard() {
  const [days, setDays] = useState<CustomerWindow>(90);
  const load = useServerFn(getFrequentCustomers);
  const customers = useQuery({ queryKey: ["admin-frequent-customers", days], queryFn: () => load({ data: days }), staleTime: 120000, retry: false });
  const rows = customers.data ?? [];
  return (
    <section aria-label="Clientes frequentes" className="mt-8 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Users className="size-5 text-gold" />Clientes frequentes</h2>
        <div className="flex gap-1" role="group" aria-label="Período dos clientes">
          {CUSTOMER_WINDOWS.map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} aria-pressed={days === d} onClick={() => setDays(d)}>{WINDOW_LABEL[d]}</Button>
          ))}
        </div>
      </div>
      {customers.isError ? (
        <p className="mt-3 text-sm text-destructive">Não foi possível carregar os clientes.</p>
      ) : customers.isPending ? (
        <p className="mt-3 text-sm text-muted-foreground">Carregando clientes…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido com WhatsApp neste período.</p>
      ) : (
        <ol className="mt-3 divide-y">
          {rows.map((c, i) => (
            <li key={c.phone} className="flex items-center gap-3 py-3 text-sm">
              <span className="w-6 shrink-0 font-mono text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{c.name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{formatBrazilPhone(c.phone)} · último pedido {new Date(c.lastOrderAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
              </div>
              <span className="shrink-0 text-right">
                <strong>{c.orders} {c.orders === 1 ? "pedido" : "pedidos"}</strong>
                <span className="block text-xs text-muted-foreground">{brl(c.spent)}</span>
              </span>
              <Button asChild size="icon" variant="outline" aria-label={`Conversar com ${c.name || "cliente"} no WhatsApp`} title="Abrir WhatsApp">
                <a href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-4" /></a>
              </Button>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Agrupado pelo número de WhatsApp · pedidos cancelados não contam · valores com entrega</p>
    </section>
  );
}
