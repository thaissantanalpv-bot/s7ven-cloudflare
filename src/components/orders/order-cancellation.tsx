import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Ban, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelOrder } from "@/lib/orders.functions";
import { cancelOrderSchema, orderWhatsApp, type Order } from "@/lib/orders";

export function CancellationRecord({ order }: { order: Order }) {
  if (order.status !== "cancelled") return null;
  const notes = Array.isArray(order.cancellation_stock_notes) ? order.cancellation_stock_notes.filter((n): n is string => typeof n === "string") : [];
  return <div className="space-y-2 border-l-2 border-destructive pl-3 text-sm">
    <p className="font-semibold text-destructive">Cancelado{order.cancelled_at ? ` · ${new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(order.cancelled_at))}` : ""}</p>
    <p className="break-words">Motivo: {order.cancellation_reason}</p>
    <p className="text-muted-foreground">{notes.length ? "Devolução processada com pendências:" : "Itens devolvidos ao estoque uma única vez."}</p>
    {notes.length > 0 && <ul className="list-disc pl-5 text-muted-foreground">{notes.map((note, i) => <li key={i} className="break-words">{note}</li>)}</ul>}
  </div>;
}

export function OrderCancellation({ order, disabled = false }: { order: Order; disabled?: boolean }) {
  const cancel = useServerFn(cancelOrder);
  const client = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cancelledReason, setCancelledReason] = useState("");
  if (order.status === "cancelled" && !cancelledReason) return <CancellationRecord order={order} />;
  const submit = async () => {
    const parsed = cancelOrderSchema.safeParse({ id: order.id, reason, expectedUpdatedAt: order.updated_at });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Confira o motivo"); return; }
    if (busy || disabled) return;
    setBusy(true); setError("");
    try {
      await cancel({ data: parsed.data });
      await Promise.all(["store-orders", "catalog-products", "admin-catalog-products", "catalog-funnel"].map(key => client.invalidateQueries({ queryKey: [key] })));
      setConfirming(false);
      setCancelledReason(parsed.data.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
      await client.invalidateQueries({ queryKey: ["store-orders"] });
    } finally { setBusy(false); }
  };
  if (cancelledReason) return <div className="space-y-3 border-t pt-4">
    <p className="font-semibold text-destructive">Pedido #{order.number} cancelado. Os itens voltaram ao estoque.</p>
    <Button asChild className="w-full bg-whatsapp text-whatsapp-foreground">
      <a href={orderWhatsApp({ ...order, status: "cancelled", cancellation_reason: cancelledReason })} target="_blank" rel="noopener noreferrer"><MessageCircle />Avisar o cliente no WhatsApp</a>
    </Button>
    <p className="text-sm text-muted-foreground">A mensagem já vai pronta com o motivo do cancelamento.</p>
  </div>;
  return <div className="space-y-3 border-t pt-4">
    {!confirming ? <Button variant="outline" className="w-full text-destructive" disabled={disabled} onClick={() => setConfirming(true)}><Ban />Cancelar pedido</Button> : <>
      <p className="font-semibold">Cancelar pedido #{order.number}?</p>
      <label className="block text-sm">Motivo do cancelamento
        <textarea aria-label="Motivo do cancelamento" className="field mt-2 min-h-24" maxLength={300} value={reason} disabled={busy} onChange={e => { setReason(e.target.value); setError(""); }} />
      </label>
      <p className="text-sm text-muted-foreground">Os itens serão devolvidos ao estoque. O cancelamento não pode ser desfeito. Pagamentos já recebidos precisam ser reembolsados separadamente.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} onClick={() => { setConfirming(false); setError(""); }}>Voltar</Button><Button variant="destructive" disabled={busy || disabled} onClick={() => void submit()}><Ban />{busy ? "Cancelando…" : "Confirmar cancelamento"}</Button></div>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}