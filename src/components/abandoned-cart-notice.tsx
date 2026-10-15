import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AbandonedCartNotice({ count, onOpen }: { count: number; onOpen?: () => void }) {
  if (count < 1) return null;
  return <div role="status" aria-label="Aviso de carrinhos abandonados" className="my-5 flex flex-wrap items-start gap-3 border-y border-primary/30 bg-primary/5 px-3 py-4">
    <BellRing className="mt-1 size-5 shrink-0 text-primary" />
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{count.toLocaleString("pt-BR")} {count === 1 ? "carrinho sem pedido enviado" : "carrinhos sem pedido enviado"}</p>
      <p className="mt-1 text-sm text-muted-foreground">Sem atividade há pelo menos 30 minutos.</p>
      <p className="mt-1 text-xs text-muted-foreground">Visitantes anônimos · contato não disponível.</p>
    </div>
    {onOpen && <Button variant="outline" onClick={onOpen}>Ver movimento</Button>}
  </div>;
}