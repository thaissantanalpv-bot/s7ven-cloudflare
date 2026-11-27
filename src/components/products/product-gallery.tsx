import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StableCatalogImage } from "@/components/catalog/stable-catalog-image";
import { galleryThumbnailUrl, productPhotosFor, type CatalogProduct } from "@/lib/catalog";
import { brl } from "@/lib/products";

export function ProductGallery({
  product,
  open,
  onOpenChange,
}: {
  product: CatalogProduct;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const photos = productPhotosFor(product, "gallery");
  const thumbnails = productPhotosFor(product, "thumb");
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, photos.length - 1));
  const move = (direction: number) =>
    setIndex((current + direction + photos.length) % photos.length);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) setIndex(0);
        onOpenChange(value);
      }}
    >
      <DialogContent
        className="max-h-[94dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6"
        onKeyDown={(e) => {
          if (photos.length < 2) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        <DialogTitle className="pr-8 font-display">{product.name}</DialogTitle>
        <DialogDescription>
          {product.category} · {brl(product.price)}
        </DialogDescription>
        <div className="relative flex h-[55dvh] max-h-[560px] items-center justify-center overflow-hidden rounded bg-photo">
          <StableCatalogImage
            src={photos[current] ?? ""}
            alt={`${product.name} — foto ${current + 1}`}
            decoding="async"
            className="h-full max-h-full w-full min-w-0 object-contain"
            fallback={<span className="text-5xl">{product.emoji}</span>}
          />
          {photos.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2"
                title="Foto anterior"
                aria-label="Foto anterior"
                onClick={() => move(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2"
                title="Próxima foto"
                aria-label="Próxima foto"
                onClick={() => move(1)}
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
        {photos.length > 1 && (
          <>
            <p className="text-center text-xs text-muted-foreground">
              {current + 1} / {photos.length}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => {
                const thumbnail = galleryThumbnailUrl(thumbnails[i], src);
                return (
                  <Button
                    key={src}
                    variant="outline"
                    aria-label={`Ver foto ${i + 1}`}
                    aria-pressed={i === current}
                    onClick={() => setIndex(i)}
                    className={`size-16 shrink-0 overflow-hidden p-1 ${i === current ? "border-primary ring-1 ring-primary" : ""}`}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-full object-contain"
                      />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </>
        )}
        {product.description && (
          <p className="whitespace-pre-line break-words text-sm text-muted-foreground">
            {product.description}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
