import { Minus, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { available, discountPercent, productPhotos, variationPhoto, type CatalogProduct } from "@/lib/catalog";
import { brl } from "@/lib/products";
import { keyOf, type Cart } from "./cart-keys";
import { MANY_OPTIONS, kindOf, sortedOptions } from "./option-list";

/** Compact product card: photo, name, price and a quick action. Details open in ProductDetail. */
export function ProductTile({
  p,
  cart,
  onOpen,
  onChange,
  onBuild,
  sel,
  onSel,
}: {
  p: CatalogProduct;
  cart: Cart;
  sel: Record<string, string>;
  onSel: (id: string, v: string) => void;
  onOpen: () => void;
  onChange: (key: string, d: number) => void;
  onBuild: () => void;
}) {
  const hasOpts = Boolean(p.options?.length);
  const isCombo = Boolean(p.comboGroups?.length);
  const chosen = hasOpts ? (sel[p.id] ?? "") : "";
  const option = chosen && chosen !== "__outro__" ? chosen : "";
  // A selected variation with its own photo replaces the cover right on the card.
  const photo = variationPhoto(p, option) || productPhotos(p)[0];
  const key = keyOf(p.id, option || undefined);
  const ready = (!hasOpts || !!option) && available(p, option);
  const qty = cart[key] ?? 0;
  const soldOut = !available(p);
  const off = discountPercent(p);
  return (
    <article className={`group flex min-w-0 flex-col self-start overflow-hidden rounded-xl border border-border bg-card shadow-soft transition hover:border-primary/60 ${soldOut ? "opacity-80 grayscale" : ""}`}>
      <button type="button" onClick={onOpen} aria-label={`Ver detalhes de ${p.name}`} className="relative block aspect-square w-full overflow-hidden bg-photo">
        {photo ? (
          <img key={photo} src={photo} alt={option ? `${p.name} — ${option}` : p.name} loading="lazy" decoding="async" className="size-full object-contain p-2 transition duration-300 group-hover:scale-105" />
        ) : (
          <span className="grid size-full place-items-center text-5xl">{p.emoji}</span>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">{p.active ? "Esgotado" : "Indisponível"}</span>
        ) : off !== null ? (
          <span className="absolute left-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">Promoção</span>
        ) : p.featured ? (
          <span className="absolute left-2 top-2 rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold uppercase text-gold-foreground">Destaque</span>
        ) : isCombo ? (
          <span className="absolute left-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">Combo</span>
        ) : null}
        {(p.video || p.youtube) && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-bold uppercase text-foreground"><Play className="size-3 fill-current" />Vídeo</span>
        )}
        {off !== null && !soldOut && (
          <span className="absolute right-2 top-2 rounded-md bg-destructive px-2 py-0.5 text-[11px] font-bold text-destructive-foreground">-{off}%</span>
        )}
      </button>
      <div className="flex min-w-0 flex-col p-2.5 sm:p-3">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{p.category.replace("Narguiles > ", "")}</p>
        <button type="button" onClick={onOpen} className="mt-0.5 line-clamp-2 text-left text-sm font-medium leading-snug hover:text-primary">
          {p.name}
        </button>
        {hasOpts && !soldOut && (
          <div className="mt-2">
            <p className="text-[10px] font-medium uppercase text-muted-foreground">{p.optionLabel}</p>
            {(p.options?.length ?? 0) > MANY_OPTIONS ? (
              <select
                aria-label={`Escolher ${p.optionLabel?.toLowerCase() ?? "opção"} de ${p.name}`}
                value={option}
                onChange={(e) => onSel(p.id, e.target.value)}
                className={`mt-1 h-9 w-full rounded-md border bg-background px-2 text-xs font-medium text-foreground outline-none focus-visible:border-primary ${option ? "border-primary" : "border-border"}`}
              >
                <option value="">Escolha {kindOf(p)} ({p.options?.length})</option>
                {sortedOptions(p).map((o) => (
                  <option key={o} value={o} disabled={!available(p, o)}>{o}{available(p, o) ? "" : " — esgotado"}</option>
                ))}
              </select>
            ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {p.options?.map((o) => (
                <button
                  key={o}
                  type="button"
                  disabled={!available(p, o)}
                  aria-pressed={chosen === o}
                  onClick={() => onSel(p.id, o)}
                  className={`rounded-md border px-2 py-0.5 text-[11px] transition disabled:opacity-40 ${chosen === o ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary"}`}
                >
                  {o}
                </button>
              ))}
            </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-1.5 pt-1.5">
          {off !== null && <span className="text-xs text-muted-foreground line-through" aria-label={`De ${brl(p.compareAtPrice ?? 0)}`}>{brl(p.compareAtPrice ?? 0)}</span>}
          <span className="font-display text-base font-bold text-foreground sm:text-lg">{off !== null && <span className="sr-only">Por </span>}{brl(p.price)}</span>
        </div>
        {!soldOut && (
          <div className="pt-2">
            {isCombo ? (
              <Button onClick={onBuild} className="h-9 w-full rounded-full text-sm font-semibold">Montar combo</Button>
            ) : qty > 0 ? (
              <div className="mx-auto flex w-fit items-center rounded-full border bg-background">
                <Button variant="ghost" size="icon" className="size-9" aria-label={`Diminuir ${p.name}`} onClick={() => onChange(key, -1)}><Minus /></Button>
                <span className="w-6 text-center text-sm font-semibold" aria-label="Quantidade no carrinho">{qty}</span>
                <Button variant="ghost" size="icon" className="size-9" aria-label={`Aumentar ${p.name}`} disabled={p.stock !== null && qty >= p.stock} onClick={() => onChange(key, 1)}><Plus /></Button>
              </div>
            ) : (
              <Button onClick={() => onChange(key, 1)} disabled={!ready} aria-label={`Adicionar ${p.name}`} className="h-9 w-full rounded-full text-sm font-semibold">
                <Plus />Adicionar
              </Button>
            )}
            {hasOpts && !option && <p className="pt-1 text-center text-[10px] text-muted-foreground">Escolha {kindOf(p)}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
