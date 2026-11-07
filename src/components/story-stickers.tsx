import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Heart, Loader2, Search, Share2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { deliverFile, downloadBlob } from "@/lib/download";
import { filterStickers, renderSticker, stickerStyles, stickerThemes, storyStickers, type StorySticker } from "@/lib/story-stickers";

const colors = [
  { id: "ink", label: "Preto" }, { id: "white", label: "Branco" }, { id: "pink", label: "Rosa" }, { id: "gold", label: "Dourado" },
] as const;
function colorValue(id: string) { return getComputedStyle(document.documentElement).getPropertyValue(`--sticker-${id}`).trim(); }
function useSticker(item: StorySticker | null, color: string) {
  const [result, setResult] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    setResult(null); setError(false);
    if (!item) return;
    let active = true;
    let url = "";
    renderSticker(item, colorValue(color)).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob); setResult({ url, blob });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [item, color]);
  return { result, error };
}
function StickerTile({ item, color, onSelect }: { item: StorySticker; color: string; onSelect: () => void }) {
  const { result, error } = useSticker(item, color);
  return <li className="min-w-0">
    <Button variant="outline" className="h-full w-full justify-start flex-col overflow-hidden p-0" onClick={onSelect} aria-label={`Abrir figurinha: ${item.phrase}, ${item.style.name}`}>
      <span className={`${color === "ink" ? "sticker-stage-light" : "sticker-stage"} flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden p-2`}>
        {result ? <img src={result.url} alt={item.phrase} className="h-full w-full object-contain" /> : error ? <span className="text-xs text-destructive">Tente abrir novamente</span> : <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      </span>
      <span className="w-full whitespace-normal px-2 py-2 text-left text-[11px] leading-4 text-muted-foreground">{item.emoji} {item.style.name}</span>
    </Button>
  </li>;
}
const PAGE_SIZE = 12;
export function StoryStickers() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("Todos");
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState("todos");
  const [color, setColor] = useState("white");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<StorySticker | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try { const saved: unknown = JSON.parse(localStorage.getItem("s7ven-story-favorites") || "[]"); if (Array.isArray(saved)) setFavorites(saved.filter((id): id is string => typeof id === "string")); } catch { /* Storage may be blocked. */ }
  }, []);
  const filtered = useMemo(() => filterStickers(theme, query, style).filter((item) => !onlyFavorites || favorites.includes(item.id)), [theme, query, style, onlyFavorites, favorites]);
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const current = Math.min(page, Math.max(0, pages - 1));
  const { result, error: renderError } = useSticker(selected, color);
  const favorite = () => {
    if (!selected) return;
    const next = favorites.includes(selected.id) ? favorites.filter((id) => id !== selected.id) : [...favorites, selected.id];
    setFavorites(next);
    try { localStorage.setItem("s7ven-story-favorites", JSON.stringify(next)); } catch { /* In-memory fallback. */ }
  };
  return <div className="border-t pt-4">
    <Button variant="outline" size="sm" onClick={() => setOpen((value) => !value)} aria-expanded={open}><Sparkles />{open ? "Ocultar figurinhas" : "Figurinhas para Stories"}</Button>
    {open && <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-2"><div><h3 className="font-semibold">Coleção de figurinhas</h3><p className="text-xs text-muted-foreground">{storyStickers.length.toLocaleString("pt-BR")} composições · {stickerThemes.length} temas</p></div><Button size="icon" variant={onlyFavorites ? "default" : "outline"} aria-label="Mostrar favoritas" aria-pressed={onlyFavorites} title="Favoritas" onClick={() => { setOnlyFavorites(!onlyFavorites); setPage(0); }}><Heart /></Button></div>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className="field pl-9" aria-label="Buscar figurinhas" placeholder="Buscar frase ou tema…" value={query} maxLength={80} onChange={(e) => { setQuery(e.target.value); setPage(0); }} /></div>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0 text-xs text-muted-foreground">Tema<select className="field mt-1" aria-label="Tema das figurinhas" value={theme} onChange={(e) => { setTheme(e.target.value); setPage(0); }}><option>Todos</option>{stickerThemes.map((entry) => <option key={entry.name} value={entry.name}>{entry.emoji} {entry.name}</option>)}</select></label>
        <label className="min-w-0 text-xs text-muted-foreground">Letras<select className="field mt-1" aria-label="Estilo das figurinhas" value={style} onChange={(e) => { setStyle(e.target.value); setPage(0); }}><option value="todos">Todos os estilos</option>{stickerStyles.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
      </div>
      <div className="flex items-center gap-2"><span className="mr-1 text-xs text-muted-foreground">Cor</span>{colors.map((entry) => <Button key={entry.id} size="icon" variant="outline" className={color === entry.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} aria-label={`Cor ${entry.label}`} title={entry.label} aria-pressed={color === entry.id} onClick={() => setColor(entry.id)}><span className={`size-5 rounded-full border sticker-swatch-${entry.id}`} /></Button>)}</div>
      <p className="text-xs text-muted-foreground">{filtered.length.toLocaleString("pt-BR")} resultados</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE).map((item) => <StickerTile key={item.id} item={item} color={color} onSelect={() => { setSelected(item); setError(""); }} />)}</ul>
      {filtered.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{onlyFavorites ? "Nenhuma favorita encontrada." : "Nenhuma figurinha encontrada."}</p>}
      {pages > 1 && <div className="flex items-center justify-between"><Button size="icon" variant="outline" title="Página anterior" aria-label="Página anterior de figurinhas" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button><span className="text-xs text-muted-foreground">{current + 1} / {pages}</span><Button size="icon" variant="outline" title="Próxima página" aria-label="Próxima página de figurinhas" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight /></Button></div>}
    </div>}
    <Dialog open={!!selected} onOpenChange={(value) => { if (!value) setSelected(null); }}><DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto" aria-describedby={undefined}>
      <DialogTitle className="pr-6">{selected?.phrase}</DialogTitle>
      <div className={`${color === "ink" ? "sticker-stage-light" : "sticker-stage"} flex min-h-56 items-center justify-center rounded-lg p-4`}>{result ? <img src={result.url} alt={selected?.phrase} className="max-h-72 w-full object-contain" /> : <Loader2 className="animate-spin text-muted-foreground" />}</div>
      <p className="text-xs text-muted-foreground">{selected?.theme} · {selected?.style.name} · PNG transparente</p>
      {(error || renderError) && <p role="alert" className="text-xs text-destructive">{error || "Não foi possível gerar esta figurinha. Feche e tente novamente."}</p>}
      <div className="flex gap-2"><Button className="flex-1" disabled={!result} onClick={() => { if (result && selected) downloadBlob(result.blob, `s7ven-figurinha-${selected.id}.png`); }}><Download />Baixar</Button><Button className="flex-1" variant="outline" disabled={!result} onClick={() => { if (result && selected) void deliverFile(result.blob, `s7ven-figurinha-${selected.id}.png`, true).catch(() => setError("Não foi possível compartilhar. Você pode baixar a figurinha.")); }}><Share2 />Enviar</Button><Button size="icon" variant={selected && favorites.includes(selected.id) ? "default" : "outline"} aria-label="Favoritar figurinha" title="Favoritar" onClick={favorite}><Heart /></Button></div>
    </DialogContent></Dialog>
  </div>;
}