import { useEffect, useState } from "react";
import { Heart, Minus, Plus, Search, Share2, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { ProductCardPhotos } from "@/components/products/product-card-photos";
import { ProductGallery } from "@/components/products/product-gallery";
import { available, discountPercent, type CatalogProduct } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { keyOf, OTHER, type Cart } from "./cart-keys";
import { MANY_OPTIONS, normalize, sortedOptions } from "./option-list";

/** Full product screen: photos, description, variation chips, quantity and add-to-cart. */
export function ProductDetail({
  product: p,
  onClose,
  cart,
  sel,
  typed,
  onSel,
  onTyped,
  onChange,
  onBuild,
  favorite,
  onToggleFavorite,
  onShare,
}: {
  product: CatalogProduct | null;
  onClose: () => void;
  cart: Cart;
  sel: Record<string, string>;
  typed: Record<string, string>;
  onSel: (id: string, v: string) => void;
  onTyped: (id: string, v: string) => void;
  onChange: (key: string, d: number) => void;
  onBuild: (p: CatalogProduct) => void;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShare: (p: CatalogProduct) => void;
}) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [find, setFind] = useState("");
  useEffect(() => { setQty(1); setAdded(false); setFind(""); }, [p?.id]);
  if (!p) return null;
  const many = (p.options?.length ?? 0) > MANY_OPTIONS;
  const q = normalize(find);
  const shownOptions = many ? sortedOptions(p).filter((o) => !q || normalize(o).includes(q)) : [];
  const availableCount = (p.options ?? []).filter((o) => available(p, o)).length;
  const hasOpts = Boolean(p.options?.length);
  const isCombo = Boolean(p.comboGroups?.length);
  const chosen = sel[p.id] ?? "";
  const isOther = chosen === OTHER;
  const text = (typed[p.id] ?? "").trim();
  const option = hasOpts ? (isOther ? text : chosen) : "";
  const key = keyOf(p.id, option || undefined);
  const inCart = cart[key] ?? 0;
  const soldOut = !available(p);
  const ready = (!hasOpts || (isOther ? !!text : !!chosen)) && available(p, option);
  const optionOut = hasOpts && !!option && !available(p, option);
  const off = discountPercent(p);
  const kind = p.optionLabel === "Cor" ? "uma cor" : "um sabor";
  const add = () => {
    onChange(key, qty);
    setAdded(true);
    setTimeout(onClose, 650);
  };
  return (
    <Sheet open onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-lg">
        <div className="flex-1 overflow-y-auto">
          <div className="relative">
            <ProductCardPhotos product={p} option={option} onEnlarge={() => setGalleryOpen(true)} />
          </div>
          <div className="space-y-3 px-4 pb-4 pt-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{p.category.replace("Narguiles > ", "")}</p>
                <SheetTitle className="mt-0.5 font-display text-xl font-bold leading-tight">{p.name}</SheetTitle>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-pressed={favorite} onClick={() => onToggleFavorite(p.id)}>
                  <Heart className={favorite ? "fill-destructive text-destructive" : ""} />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Compartilhar produto" onClick={() => onShare(p)}><Share2 /></Button>
              </div>
            </div>
            <SheetDescription asChild>
              <p className="flex flex-wrap items-baseline gap-x-2">
                {off !== null && <span className="text-sm text-muted-foreground line-through">De {brl(p.compareAtPrice ?? 0)}</span>}
                <span className="font-display text-2xl font-bold text-primary">{off !== null && <span className="sr-only">Por </span>}{brl(p.price)}</span>
                {off !== null && <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">-{off}%</span>}
              </p>
            </SheetDescription>
            {soldOut && <p className="inline-flex rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">{p.active ? "Esgotado" : "Indisponível"}</p>}
            {p.description && <p className="whitespace-pre-line break-words text-sm text-muted-foreground">{p.description}</p>}
            {(p.video || p.youtube) && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Vídeo do produto</p>
                {p.video && <video src={p.video} controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-photo" aria-label={`Vídeo de ${p.name}`} />}
                {p.youtube && (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(p.youtube)}?rel=0&playsinline=1`}
                    title={`Vídeo de ${p.name} no YouTube`}
                    loading="lazy"
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="aspect-video w-full rounded-lg border-0 bg-photo"
                  />
                )}
              </div>
            )}
            {hasOpts && (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{p.optionLabel}</p>
                  {many && <p className="text-xs text-muted-foreground">{availableCount} disponíveis{chosen && !isOther ? <> · <span className="font-semibold text-primary">{chosen}</span></> : null}</p>}
                </div>
                {many && (
                  <div className="relative mt-2">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      aria-label={`Buscar ${p.optionLabel?.toLowerCase() ?? "opção"}`}
                      placeholder={`Buscar ${p.optionLabel === "Cor" ? "cor" : "sabor"}...`}
                      value={find}
                      onChange={(e) => setFind(e.target.value)}
                      className="h-10 w-full rounded-lg border bg-background pl-8 pr-3 text-sm text-foreground outline-none focus-visible:border-primary"
                    />
                  </div>
                )}
                <div className={many ? "mt-2 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-lg border bg-muted/30 p-1.5" : "mt-2 flex flex-wrap gap-2"}>
                  {many && shownOptions.length === 0 && <p className="col-span-2 py-3 text-center text-xs text-muted-foreground">Nenhum {p.optionLabel === "Cor" ? "cor encontrada" : "sabor encontrado"}</p>}
                  {(many ? shownOptions : p.options ?? []).map((o) => (
                    <Button
                      key={o}
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled={!available(p, o)}
                      onClick={() => onSel(p.id, o)}
                      aria-pressed={chosen === o}
                      className={`h-auto min-h-8 whitespace-normal rounded-lg px-3 py-1.5 text-xs ${many ? "justify-start text-left" : ""} ${chosen === o ? "border-primary bg-primary text-primary-foreground hover:bg-primary" : "bg-background"}`}
                    >
                      {o}
                    </Button>
                  ))}
                </div>
                {isOther && (
                  <input className="field mt-2" placeholder={`Qual ${p.optionLabel === "Cor" ? "cor" : "sabor"}?`} maxLength={40} value={typed[p.id] ?? ""} onChange={(e) => onTyped(p.id, e.target.value)} />
                )}
                {optionOut && <p className="mt-1 text-xs font-semibold text-destructive">Esgotado</p>}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2 border-t px-4 py-3">
          {isCombo ? (
            <Button disabled={soldOut} onClick={() => { onClose(); onBuild(p); }} className="h-12 w-full rounded-xl text-base font-semibold"><Plus />Montar combo</Button>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center rounded-lg border bg-background">
                  <Button variant="ghost" size="icon" aria-label="Diminuir quantidade" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus /></Button>
                  <span className="w-8 text-center font-semibold" aria-label="Quantidade a adicionar">{qty}</span>
                  <Button variant="ghost" size="icon" aria-label="Aumentar quantidade" disabled={p.stock !== null && qty + inCart >= p.stock} onClick={() => setQty((q) => Math.min(200, q + 1))}><Plus /></Button>
                </div>
                <p className="text-right text-xs text-muted-foreground">
                  Subtotal: <span className="font-semibold text-foreground">{brl(p.price * qty)}</span>
                  {inCart > 0 && <span className="block">{inCart} já no carrinho</span>}
                </p>
              </div>
              <Button disabled={!ready || soldOut} onClick={add} className="h-12 w-full rounded-xl text-base font-semibold">
                {added ? <><Check />Adicionado!</> : <><ShoppingCart />Adicionar ao carrinho</>}
              </Button>
              {hasOpts && !ready && !soldOut && !optionOut && <p className="text-center text-xs text-muted-foreground">Escolha {kind} para adicionar</p>}
            </>
          )}
        </div>
        <ProductGallery product={p} open={galleryOpen} onOpenChange={setGalleryOpen} />
      </SheetContent>
    </Sheet>
  );
}
