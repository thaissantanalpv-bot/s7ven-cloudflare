import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Coupon, StoreSettings } from "@/lib/store-settings";

export function PromotionsEditor({ draft, update }: { draft: StoreSettings; update: (next: StoreSettings) => void }) {
  const banner = draft.promoBanner;
  const setCoupon = (i: number, patch: Partial<Coupon>) =>
    update({ ...draft, coupons: draft.coupons.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  return (
    <section className="space-y-10 py-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Banner no topo do catálogo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Faixa de aviso ou promoção que o cliente vê ao abrir o catálogo.</p>
          </div>
          <Switch aria-label="Mostrar banner" checked={banner.enabled} onCheckedChange={(enabled) => update({ ...draft, promoBanner: { ...banner, enabled } })} />
        </div>
        <Input placeholder="Ex.: Combo de essências neste fim de semana" maxLength={300} value={banner.text} onChange={(e) => update({ ...draft, promoBanner: { ...banner, text: e.target.value } })} />
        <Input placeholder="Link opcional (https://…)" maxLength={500} value={banner.link} onChange={(e) => update({ ...draft, promoBanner: { ...banner, link: e.target.value } })} />
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Cupons de desconto</h2>
            <p className="mt-1 text-sm text-muted-foreground">O cliente digita o código no carrinho. O desconto vale sobre os produtos.</p>
          </div>
          <Button variant="outline" onClick={() => update({ ...draft, coupons: [...draft.coupons, { code: "", type: "percent", value: 10, minOrder: 0, active: true }] })}>
            <Plus />Novo cupom
          </Button>
        </div>
        {!draft.coupons.length && <p className="text-sm text-muted-foreground">Nenhum cupom cadastrado.</p>}
        {draft.coupons.map((c, i) => (
          <div key={i} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto_7rem_8rem_auto_auto] sm:items-end">
            <label className="text-xs text-muted-foreground">Código
              <Input className="mt-1 uppercase" maxLength={30} value={c.code} onChange={(e) => setCoupon(i, { code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
            </label>
            <label className="text-xs text-muted-foreground">Tipo
              <select className="mt-1 flex h-9 rounded-md border bg-background px-2 text-sm text-foreground" value={c.type} onChange={(e) => setCoupon(i, { type: e.target.value as Coupon["type"] })}>
                <option value="percent">%</option>
                <option value="fixed">R$</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">Desconto
              <Input className="mt-1" type="number" min={0} step="0.01" value={c.value} onChange={(e) => setCoupon(i, { value: Number(e.target.value) })} />
            </label>
            <label className="text-xs text-muted-foreground">Pedido mínimo (R$)
              <Input className="mt-1" type="number" min={0} step="0.01" value={c.minOrder} onChange={(e) => setCoupon(i, { minOrder: Number(e.target.value) })} />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch aria-label={`Ativar cupom ${c.code}`} checked={c.active} onCheckedChange={(active) => setCoupon(i, { active })} />Ativo
            </label>
            <Button variant="ghost" size="icon" aria-label="Excluir cupom" onClick={() => update({ ...draft, coupons: draft.coupons.filter((_, idx) => idx !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
