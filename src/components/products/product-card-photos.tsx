import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productPhotos, type CatalogProduct } from "@/lib/catalog";

export function ProductCardPhotos({ product, onEnlarge }: { product: CatalogProduct; onEnlarge: () => void }) {
  const photos = productPhotos(product);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, photos.length - 1));
  const move = (direction: number) => setIndex((current + direction + photos.length) % photos.length);
  return <div className="shrink-0 bg-photo">
    <div className="relative aspect-square overflow-hidden">
      <Button variant="ghost" aria-label={`Ver fotos de ${product.name}`} onClick={onEnlarge} className="absolute inset-0 h-full w-full rounded-none p-2 text-5xl hover:bg-photo">
        {photos[current] ? <img src={photos[current]} alt={`${product.name} — foto ${current + 1}`} loading="lazy" className="h-full w-full min-w-0 object-contain" /> : product.emoji}
      </Button>
      {photos.length > 1 && <>
        <Button variant="secondary" size="icon-sm" aria-label={`Foto anterior de ${product.name}`} title="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => move(-1)}><ChevronLeft /></Button>
        <Button variant="secondary" size="icon-sm" aria-label={`Próxima foto de ${product.name}`} title="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => move(1)}><ChevronRight /></Button>
        <span className="absolute bottom-2 right-2 rounded bg-background px-2 py-1 text-xs text-foreground">{current + 1} / {photos.length}</span>
      </>}
    </div>
    {photos.length > 1 && <div className="flex gap-1.5 overflow-x-auto px-2 pb-2">
      {photos.map((src, i) => <Button key={src} variant="outline" aria-label={`Ver foto ${i + 1} de ${product.name}`} aria-pressed={i === current} onClick={() => setIndex(i)} className={`size-11 shrink-0 overflow-hidden p-1 ${i === current ? "border-primary ring-1 ring-primary" : ""}`}><img src={src} alt="" loading="lazy" className="size-full object-contain" /></Button>)}
    </div>}
  </div>;
}