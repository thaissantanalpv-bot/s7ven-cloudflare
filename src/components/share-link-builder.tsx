import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, ImageDown, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { catalogQuery } from "@/lib/catalog.query";
import { categoryLink, productLink } from "@/lib/share-links";
import { discountPercent } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { generateStoryImage } from "@/lib/story-image";
import { deliverFile } from "@/lib/download";

const ORIGIN = "https://s7venlounge.shop";

export function ShareLinkBuilder() {
  const { data: products = [] } = useQuery(catalogQuery);
  const [kind, setKind] = useState<"categoria" | "produto">("categoria");
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);
  const visible = products.filter((p) => p.active);
  const categories = useMemo(() => [...new Set(visible.map((p) => p.category))].sort(), [visible]);
  const sortedProducts = useMemo(() => [...visible].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [visible]);
  const selectedProduct = kind === "produto" ? sortedProducts.find((p) => p.id === value) : undefined;
  const url = value ? (kind === "categoria" ? categoryLink(ORIGIN, value) : productLink(ORIGIN, value)) : "";
  const [story, setStory] = useState<{ blob: Blob; url: string } | null>(null);
  const [storyBusy, setStoryBusy] = useState(false);
  const [storyError, setStoryError] = useState("");
  const makeStory = async () => {
    if (!selectedProduct || !url) return;
    setStoryBusy(true);
    setStoryError("");
    try {
      const blob = await generateStoryImage({
        name: selectedProduct.name,
        price: brl(selectedProduct.price),
        compareAt: discountPercent(selectedProduct) !== null ? brl(selectedProduct.compareAtPrice ?? 0) : null,
        photoUrl: selectedProduct.image ?? undefined,
        link: url,
        site: ORIGIN,
      });
      setStory((old) => { if (old) URL.revokeObjectURL(old.url); return { blob, url: URL.createObjectURL(blob) }; });
    } catch (e) {
      setStoryError(e instanceof Error ? e.message : "Não foi possível gerar a imagem.");
    } finally {
      setStoryBusy(false);
    }
  };
  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="mt-4 space-y-2 border-t pt-4">
      <p className="text-sm font-semibold">Link direto para Stories</p>
      <p className="text-xs text-muted-foreground">Escolha uma categoria ou produto e use o link na figurinha do Instagram.</p>
      <div className="flex gap-2">
        <Button size="sm" variant={kind === "categoria" ? "default" : "outline"} onClick={() => { setKind("categoria"); setValue(""); }}>Categoria</Button>
        <Button size="sm" variant={kind === "produto" ? "default" : "outline"} onClick={() => { setKind("produto"); setValue(""); }}>Produto</Button>
      </div>
      <select aria-label={kind === "categoria" ? "Escolher categoria" : "Escolher produto"} value={value} onChange={(e) => setValue(e.target.value)} className="field w-full text-sm">
        <option value="">Selecione…</option>
        {kind === "categoria"
          ? categories.map((c) => <option key={c} value={c}>{c.replace("Narguiles > ", "")}</option>)
          : sortedProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {selectedProduct && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
          {selectedProduct.image ? (
            <img src={selectedProduct.image} alt={selectedProduct.name} className="h-14 w-14 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">Sem foto</div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedProduct.name}</p>
            <p className="text-xs text-muted-foreground">{selectedProduct.category.replace("Narguiles > ", "")} · R$ {selectedProduct.price.toFixed(2).replace(".", ",")}</p>
          </div>
        </div>
      )}
      {url && (
        <div className="flex items-center gap-2">
          <input readOnly value={url} aria-label="Link gerado" className="field flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
          <Button onClick={copy} className="shrink-0">{copied ? <Check /> : <Copy />}{copied ? "Copiado!" : "Copiar"}</Button>
        </div>
      )}
      {selectedProduct && url && (
        <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-semibold">Imagem pronta para os Stories</p>
          <p className="text-xs text-muted-foreground">Gera uma imagem vertical com foto, preço e QR code do produto. No celular, toque em compartilhar e escolha o Instagram.</p>
          <Button variant="outline" size="sm" disabled={storyBusy} onClick={() => void makeStory()}>
            <ImageDown />{storyBusy ? "Gerando imagem…" : story ? "Gerar novamente" : "Gerar imagem do Stories"}
          </Button>
          {storyError && <p role="alert" className="text-xs text-destructive">{storyError}</p>}
          {story && (
            <div className="flex items-center gap-3 pt-1">
              <img src={story.url} alt={`Imagem de Stories de ${selectedProduct.name}`} className="h-40 w-auto rounded-lg border" />
              <Button size="sm" onClick={() => void deliverFile(story.blob, `story-${selectedProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`)}>
                <Instagram />Baixar / enviar ao Instagram
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
