import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { available, type CatalogProduct } from "@/lib/catalog";
import { type ComboSelection } from "@/lib/combos";
import { validateCartAvailability } from "@/lib/orders";
import { brl } from "@/lib/products";

export function ComboBuilder({ product, products, open, onOpenChange, onAdd }: { product: CatalogProduct; products: CatalogProduct[]; open: boolean; onOpenChange: (open: boolean) => void; onAdd: (selections: ComboSelection[]) => void }) {
  const [choices, setChoices] = useState<ComboSelection[]>([]);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const change = (groupId: string, productId: string, option: string, delta: number) => {
    const existing = choices.find(s => s.groupId === groupId && s.productId === productId && s.option === option);
    const qty = (existing?.qty ?? 0) + delta;
    const group = product.comboGroups?.find(g => g.id === groupId);
    if (delta > 0 && choices.filter(s => s.groupId === groupId).reduce((n, s) => n + s.qty, 0) >= (group?.quantity ?? 0)) return;
    setChoices(prev => [...prev.filter(s => s !== existing), ...(qty > 0 ? [{ groupId, productId, option, qty }] : [])]);
    setError("");
  };
  const complete = product.comboGroups?.every(g => choices.filter(s => s.groupId === g.id).reduce((n, s) => n + s.qty, 0) === g.quantity);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogTitle>{product.name}</DialogTitle><DialogDescription>Combo · {brl(product.price)}</DialogDescription>
    {product.comboGroups?.map(group => <section key={group.id} className="border-t pt-4"><h3 className="font-semibold">{group.name} <span className="text-sm text-muted-foreground">{choices.filter(s => s.groupId === group.id).reduce((n, s) => n + s.qty, 0)}/{group.quantity}</span></h3><div className="mt-3 divide-y">{group.productIds.map(id => {
      const p = products.find(p => p.id === id);
      if (!p) return null;
      const k = `${group.id}:${id}`;
      const option = options[k] ?? "";
      const ready = !p.variations.length || Boolean(option.trim());
      return <div key={id} className="py-3"><div className="flex items-center gap-3">{p.image && <img src={p.image} alt={p.name} className="size-12 shrink-0 rounded object-contain bg-photo" />}<span className="min-w-0 flex-1 text-sm">{p.name}</span><Button size="icon" variant="outline" title="Adicionar item" aria-label={`Adicionar ${p.name} em ${group.name}`} disabled={!ready || !available(p, option.trim()) || choices.filter(s => s.groupId === group.id).reduce((n, s) => n + s.qty, 0) >= group.quantity} onClick={() => change(group.id, id, option.trim(), 1)}><Plus /></Button></div>
        {p.variations.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{p.variations.map(v => <Button key={v.name} size="sm" variant={option === v.name ? "default" : "outline"} aria-pressed={option === v.name} disabled={!available(p, v.name)} onClick={() => setOptions(prev => ({ ...prev, [k]: v.name }))}>{v.name}</Button>)}{p.allowOther && <input className="field" aria-label={`Outro sabor de ${p.name}`} maxLength={40} placeholder="Outro sabor" value={p.variations.some(v => v.name === option) ? "" : option} onChange={e => setOptions(prev => ({ ...prev, [k]: e.target.value }))} />}</div>}
        {!available(p) && <p className="text-xs text-destructive">Indisponível</p>}
        {choices.filter(s => s.groupId === group.id && s.productId === id).map(s => <div key={s.option} className="mt-2 flex items-center gap-2 text-sm text-primary"><Button variant="ghost" size="icon" title="Remover item" aria-label={`Remover ${p.name} ${s.option}`} onClick={() => change(group.id, id, s.option, -1)}><Minus /></Button>{s.qty}× {p.name} {s.option && `(${s.option})`}</div>)}
      </div>;
    })}</div></section>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button disabled={!complete} onClick={() => { try { validateCartAvailability([{ productId: product.id, qty: 1, option: "", components: choices }], products); onAdd(choices); } catch(e) { setError(e instanceof Error ? e.message : "Confira os itens."); } }}><Plus />Adicionar combo · {brl(product.price)}</Button>
  </DialogContent></Dialog>;
}