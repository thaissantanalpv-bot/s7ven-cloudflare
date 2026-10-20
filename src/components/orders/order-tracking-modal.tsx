import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, CheckCircle2, Truck, ChefHat, Clock } from "lucide-react";
import { orderTracking } from "@/lib/orders.functions";
import { ORDER_STAGES } from "@/lib/orders";

const ICONS = [Clock, ChefHat, Truck, CheckCircle2] as const;

export function OrderTrackingStatus({ orderId, requestId }: { orderId: string; requestId: string }) {
  const track = useServerFn(orderTracking);
  const tracking = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: () => track({ data: { id: orderId, requestId } }),
    enabled: Boolean(orderId && requestId),
    refetchInterval: (q) =>
      ["delivered", "cancelled"].includes(q.state.data?.status ?? "") ? false : 15000,
    retry: 2,
  });

  if (tracking.isPending) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Carregando acompanhamento…
      </div>
    );
  }

  if (tracking.error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Não foi possível carregar o status do pedido.
      </div>
    );
  }

  const data = tracking.data;
  if (!data) return null;

  if (data.status === "cancelled") {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <Package className="mx-auto mb-3 size-8 text-destructive" />
        <p className="font-semibold text-destructive">Pedido cancelado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre em contato com a loja para mais informações.
        </p>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.findIndex((s) => s.id === data.status);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-muted" />
        {/* Filled line */}
        <div
          className="absolute left-0 top-5 h-1 rounded-full bg-primary transition-all duration-700"
          style={{ width: `${currentIndex >= 0 ? (currentIndex / (ORDER_STAGES.length - 1)) * 100 : 0}%` }}
        />
        {ORDER_STAGES.map((stage, i) => {
          const Icon = ICONS[i] ?? Package;
          const done = i <= currentIndex;
          const active = i === currentIndex;
          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`grid size-10 place-items-center rounded-full border-2 transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-muted bg-background text-muted-foreground"
                }`}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={`max-w-20 text-center text-[11px] leading-tight ${
                  active ? "font-semibold text-primary" : done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current status message */}
      {currentIndex >= 0 && (
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className={`text-sm font-medium ${ORDER_STAGES[currentIndex]?.tone ?? "text-foreground"}`}>
            {ORDER_STAGES[currentIndex]?.message ?? ""}
          </p>
        </div>
      )}

      {/* Tracking link */}
      {data.status === "out_for_delivery" && data.trackingUrl && (
        <a
          href={data.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <Truck className="size-4" />
          Acompanhar entrega em tempo real
        </a>
      )}

      {data.status === "delivered" && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
          <CheckCircle2 className="mx-auto mb-2 size-8 text-green-500" />
          <p className="font-semibold text-green-700 dark:text-green-400">Pedido entregue!</p>
          <p className="mt-1 text-sm text-muted-foreground">Obrigado por escolher a S7VEN!</p>
        </div>
      )}
    </div>
  );
}
