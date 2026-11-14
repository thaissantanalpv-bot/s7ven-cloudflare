import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { adminCatalogQuery } from "@/lib/catalog.query";
import { saveCatalogProduct } from "@/lib/catalog.functions";
import { toDraft, type CatalogProduct } from "@/lib/catalog";
import { sharpenPhoto } from "@/lib/photos/sharpen";

type Item = { product: CatalogProduct; state: "waiting" | "working" | "ready" | "error" | "saved"; blob?: Blob; preview?: string; approved: boolean; error?: string };

/** Sharpen the cover photo of many products at once; each result is reviewed (before/after) before replacing the photo. */
export function BulkSharpenDialog({ open, onOpenChange, products }: { open: boolean; onOpenChange: (o: boolean) => void; products: CatalogProduct[] }) {
  const client = useQueryClient();
  const save = useServerFn(saveCatalogProduct);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const patch = (id: string, p: Partial<Item>) => setItems(list => list.map(i => i.product.id === id ? { ...i, ...p } : i));

  useEffect(() => {
    if (!open) return;
    const withPhoto = products.filter(p => p.image);
    setItems(withPhoto.map(product => ({ product, state: "waiting", approved: true })));
    setMessage(withPhoto.length < products.length ? `${products.length - withPhoto.length} produto(s) sem foto foram ignorados.` : "");
    let cancelled = false;
    void (async () => {
      for (const p of withPhoto) {
        if (cancelled) return;
        patch(p.id, { state: "working" });
        try { const blob = await sharpenPhoto(p.image!); if (!cancelled) patch(p.id, { state: "ready", blob, preview: URL.createObjectURL(blob) }); }
        catch (e) { if (!cancelled) patch(p.id, { state: "error", approved: false, error: e instanceof Error ? e.message : "Falhou" }); }
      }
    })();
    return () => { cancelled = true; };
  }, [open, products]);

  const ready = items.filter(i => i.state === "ready" && i.approved);
  const working = items.some(i => i.state === "waiting" || i.state === "working");
  const apply = async () => {
    setSaving(true); setMessage("");
    let ok = 0; const failed: string[] = [];
    for (const item of ready) {
      try {
        const ext = item.blob!.type === "image/webp" ? "webp" : "jpg";
        const path = `uploads/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("product-photos").upload(path, item.blob!, { contentType: item.blob!.type, upsert: false });
        if (error) throw new Error("upload");
        const draft = toDraft(item.product); const old = draft.image;
        const variationPhotos = Object.fromEntries(Object.entries(draft.variationPhotos ?? {}).map(([k, v]) => [k, v === old ? path : v]));
        await save({ data: { product: { ...draft, image: path, variationPhotos }, expected: item.product.updatedAt } });
        patch(item.product.id, { state: "saved" }); ok++;
      } catch { failed.push(item.product.name); }
    }
    await client.invalidateQueries({ queryKey: adminCatalogQuery.queryKey });
    setSaving(false);
    setMessage(`${ok} foto(s) trocada(s).${failed.length ? ` Não foi possível trocar: ${failed.join(", ")}.` : ""}`);
  };

  return <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
    <DialogContent className="flex max-h-[90dvh] flex-col sm:max-w-3xl">
      <DialogTitle>Melhorar nitidez em lote</DialogTitle>
      <DialogDescription>Deixa a foto de capa mais nítida, sem mudar mais nada. Confira o antes e depois e desmarque as que não quiser trocar.</DialogDescription>
      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
        {items.map(i => <div key={i.product.id} className={`rounded-lg border p-3 ${i.approved && i.state === "ready" ? "border-primary" : ""}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{i.product.name}</p>
            {i.state === "ready" && <Button size="sm" variant={i.approved ? "default" : "outline"} onClick={() => patch(i.product.id, { approved: !i.approved })}>{i.approved ? <><Check />Trocar</> : <><X />Manter antiga</>}</Button>}
            {i.state === "saved" && <span className="text-xs text-primary">Foto trocada ✓</span>}
            {(i.state === "waiting" || i.state === "working") && <span className="text-xs text-muted-foreground">{i.state === "working" ? "Melhorando…" : "Na fila"}</span>}
            {i.state === "error" && <span className="text-xs text-destructive">{i.error}</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground">
            <div><div className="aspect-square overflow-hidden rounded bg-photo"><img src={i.product.image} alt={`Antes: ${i.product.name}`} className="size-full object-contain" /></div>Antes</div>
            <div><div className="aspect-square overflow-hidden rounded bg-photo">{i.preview && <img src={i.preview} alt={`Depois: ${i.product.name}`} className="size-full object-contain" />}</div>Depois</div>
          </div>
        </div>)}
      </div>
      {message && <p role="status" className="text-sm text-primary">{message}</p>}
      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>Fechar</Button>
        <Button disabled={saving || working || !ready.length} onClick={() => void apply()}>{saving ? "Trocando…" : working ? "Melhorando fotos…" : `Trocar ${ready.length} foto(s)`}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
