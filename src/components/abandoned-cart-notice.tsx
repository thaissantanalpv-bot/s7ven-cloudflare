import { ShoppingCart } from "lucide-react";

export function AbandonedCartNotice({ count, onOpen }: { count: number; onOpen?: () => void }) {
  if (!count) return null;
  return (
    <button
      type="button"
      aria-label="Aviso de carrinhos abandonados"
      onClick={onOpen}
      className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-left text-sm"
    >
      <ShoppingCart className="size-4 shrink-0 text-orange-400" />
      <span>
        <strong>{count} carrinhos sem pedido enviado</strong> há mais de 30 minutos — clientes deixaram pedidos pela metade.
      </span>
    </button>
  );
}
