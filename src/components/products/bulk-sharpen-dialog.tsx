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
import { streamImage } from "@/lib/photos/stream-image";

export const BACKGROUNDS = [
  { label: "Estúdio claro", prompt: "fundo de estúdio off-white liso, com sombra suave embaixo do produto" },
  { label: "Mármore", prompt: "bancada de mármore branco com fundo desfocado e luz suave" },
  { label: "Lounge escuro", prompt: "ambiente de lounge escuro e elegante, com luz roxa e dourada desfocada ao fundo" },
  { label: "Madeira", prompt: "mesa de madeira escura com fundo desfocado e iluminação quente" },
];

async function newBackground(url: string, name: string, background: string): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre novamente.");
  const photo = await fetch(url); if (!photo.ok) throw new Error("Não foi possível baixar a foto.");
  const blob = await photo.blob();
  const form = new FormData();
  form.set("image", new File([blob], "produto.png", { type: blob.type }));
  form.set("prompt", `Troque somente o fundo da foto por: ${background}. Mantenha o produto exatamente igual: mesma forma, cores, rótulos, logos e textos. Não redesenhe o produto.`);
  form.set("productName", name); form.set("quality", "medium");
  let result = "";
  await streamImage("/api/edit-photo", form, (src, done) => { if (done) result = src; }, undefined, { Authorization: `Bearer ${data.session.access_token}` });
  if (!result) throw new Error("A IA não devolveu a foto.");
  return (await fetch(result)).blob();
}

type Item = { product: CatalogProduct; state: "waiting" | "working" | "ready" | "error" | "saved"; blob?: Blob; preview?: string; approved: boolean; error?: string };

/** Sharpen the cover photo of many products at once; each result is reviewed (before/after) before replacing the photo. */
export function BulkSharpenDialog({ open, onOpenChange, products, mode = "sharpen" }: { open: boolean; onOpenChange: (o: boolean) => void; products: CatalogProduct[]; mode?: "sharpen" | "background" }) {
  const ai = mode === "background";
  const [background, setBackground] = useState(BACKGROUNDS[0]!.prompt);
  const [started, setStarted] = useState(false);
  const client = useQueryClient();
  const save = useServerFn(saveCatalogProduct);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const patch = (id: string, p: Partial<Item>) => setItems(list => list.map(i => i.product.id === id ? { ...i, ...p } : i));

  useEffect(() => { if (!open) setStarted(false); }, [open]);
  useEffect(() => {
    if (!open) return;
    const withPhoto = products.filter(p => p.image);
    setItems(withPhoto.map(product => ({ product, state: "waiting", approved: true })));
    setMessage(withPhoto.length < products.length ? `${products.length - withPhoto.length} produto(s) sem foto foram ignorados.` : "");
    if (ai && !started) return;
    let cancelled = false;
    void (async () => {
      for (const p of withPhoto) {
        if (cancelled) return;
        patch(p.id, { state: "working" });
        try { const blob = ai ? await newBackground(p.image!, p.name, background) : await sharpenPhoto(p.image!); if (!cancelled) patch(p.id, { state: "ready", blob, preview: URL.createObjectURL(blob) }); }
        catch (e) { if (!cancelled) patch(p.id, { state: "error", approved: false, error: e instanceof Error ? e.message : "Falhou" }); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, products, started]);

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
      <DialogTitle>{ai ? "Novo fundo em lote" : "Melhorar nitidez em lote"}</DialogTitle>
      <DialogDescription>{ai ? "A IA troca só o fundo da foto de capa. Cada foto consome créditos de IA e leva cerca de 25 segundos." : "Deixa a foto de capa mais nítida, sem mudar mais nada."} Confira o antes e depois e desmarque as que não quiser trocar.</DialogDescription>
      {ai && !started && <div className="space-y-2">
        <div className="flex flex-wrap gap-2">{BACKGROUNDS.map(b => <Button key={b.label} type="button" size="sm" variant={background === b.prompt ? "default" : "outline"} onClick={() => setBackground(b.prompt)}>{b.label}</Button>)}</div>
        <label className="block text-sm">Fundo desejado<textarea className="field mt-1" rows={2} maxLength={500} value={background} onChange={e => setBackground(e.target.value)} /></label>
        <Button className="w-full" disabled={!background.trim() || !items.length} onClick={() => setStarted(true)}>Gerar novo fundo ({items.length} foto{items.length === 1 ? "" : "s"})</Button>
      </div>}
      <div className="-mx-1 flex-1 space-y-3 overflow-y-auto px-1">
        {items.map(i => <div key={i.product.id} className={`rounded-lg border p-3 ${i.approved && i.state === "ready" ? "border-primary" : ""}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{i.product.name}</p>
            {i.state === "ready" && <Button size="sm" variant={i.approved ? "default" : "outline"} onClick={() => patch(i.product.id, { approved: !i.approved })}>{i.approved ? <><Check />Trocar</> : <><X />Manter antiga</>}</Button>}
            {i.state === "saved" && <span className="text-xs text-primary">Foto trocada ✓</span>}
            {(i.state === "waiting" || i.state === "working") && <span className="text-xs text-muted-foreground">{i.state === "working" ? "Gerando…" : ai && !started ? "" : "Na fila"}</span>}
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
        <Button disabled={saving || (working && (!ai || started)) || !ready.length} onClick={() => void apply()}>{saving ? "Trocando…" : working && (!ai || started) ? "Gerando fotos…" : `Trocar ${ready.length} foto(s)`}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
