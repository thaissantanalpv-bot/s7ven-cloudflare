import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { saveBulkPrices } from "@/lib/catalog.functions";
import { bulkPrice, bulkPriceChangeSchema, type BulkPriceChange, type CatalogProduct } from "@/lib/catalog";
import { brl } from "@/lib/products";

const parseNumber = (value: string) => Number(value.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));

/** Change many prices at once: by percentage or to one fixed value, for the products currently listed. */
export function BulkPriceDialog({ open, onOpenChange, products }: { open: boolean; onOpenChange: (open: boolean) => void; products: CatalogProduct[] }) {
  const client = useQueryClient();
  const apply = useServerFn(saveBulkPrices);
  const [mode, setMode] = useState<BulkPriceChange["mode"]>("percent");
  const [value, setValue] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = products.filter(p => !excluded.has(p.id));
  const change = useMemo(() => {
    const n = parseNumber(value);
    const candidate = mode === "percent" ? { mode, percent: n } : { mode, price: Math.round(n * 100) / 100 };
    return value.trim() ? bulkPriceChangeSchema.safeParse(candidate) : null;
  }, [mode, value]);
  const toggle = (id: string) => setExcluded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const submit = async () => {
    if (!change?.success) { setError(change?.error.issues[0]?.message ?? "Informe o valor."); return; }
    if (!selected.length) { setError("Escolha pelo menos um produto."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await apply({ data: { ids: selected.map(p => p.id), change: change.data } });
      await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
      setMessage(`${result.saved} ${result.saved === 1 ? "preço atualizado" : "preços atualizados"}.${result.failed.length ? ` Não foi possível alterar: ${result.failed.slice(0, 5).join(", ")}${result.failed.length > 5 ? "…" : ""}. Atualize a lista e tente de novo.` : ""}`);
      setValue("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível alterar os preços."); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={next => { if (!busy) { onOpenChange(next); if (!next) { setMessage(""); setError(""); setExcluded(new Set()); } } }}>
    <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-xl">
      <DialogTitle>Mudar preços em lote</DialogTitle>
      <DialogDescription>Vale para os produtos da lista atual. Use a busca e os filtros antes de abrir para escolher, por exemplo, uma categoria.</DialogDescription>
      <fieldset disabled={busy} className="space-y-3">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de mudança">
          <Button type="button" variant={mode === "percent" ? "default" : "outline"} aria-pressed={mode === "percent"} onClick={() => { setMode("percent"); setValue(""); }}>Aumentar/diminuir %</Button>
          <Button type="button" variant={mode === "set" ? "default" : "outline"} aria-pressed={mode === "set"} onClick={() => { setMode("set"); setValue(""); }}>Preço igual para todos</Button>
        </div>
        <label className="block text-sm">{mode === "percent" ? "Porcentagem (use - para diminuir, ex.: 10 ou -5)" : "Novo preço (R$)"}
          <input className="field mt-1" inputMode="decimal" placeholder={mode === "percent" ? "10" : "25,00"} value={value} onChange={e => { setValue(e.target.value); setError(""); setMessage(""); }} />
        </label>
        {mode === "percent" && <p className="text-xs text-muted-foreground">Produtos em promoção mantêm o desconto: o preço riscado muda na mesma proporção.</p>}
        {mode === "set" && <p className="text-xs text-muted-foreground">O preço riscado é removido quando não fica maior que o novo preço.</p>}
      </fieldset>
      <div className="flex items-center justify-between text-sm">
        <span><strong>{selected.length}</strong> de {products.length} selecionados</span>
        <span className="flex gap-2"><Button type="button" variant="link" size="sm" className="px-0" onClick={() => setExcluded(new Set())}>Todos</Button><Button type="button" variant="link" size="sm" className="px-0" onClick={() => setExcluded(new Set(products.map(p => p.id)))}>Nenhum</Button></span>
      </div>
      <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border">
        {products.map(p => {
          const next = change?.success ? bulkPrice(p, change.data) : null;
          const on = !excluded.has(p.id);
          return <li key={p.id}><label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={() => toggle(p.id)} aria-label={`Incluir ${p.name}`} />
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="shrink-0 font-mono text-xs">{brl(p.price)}{next && on && next.price !== p.price && <> → <strong className="text-primary">{brl(next.price)}</strong></>}</span>
          </label></li>;
        })}
        {!products.length && <li className="py-8 text-center text-sm text-muted-foreground">Nenhum produto na lista.</li>}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <Button disabled={busy || !selected.length || !change?.success} onClick={() => void submit()}>{busy ? "Aplicando…" : `Aplicar em ${selected.length} ${selected.length === 1 ? "produto" : "produtos"}`}</Button>
    </DialogContent>
  </Dialog>;
}
