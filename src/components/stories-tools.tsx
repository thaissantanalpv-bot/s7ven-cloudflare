import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Check, Copy, Download, Package, Search, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deliverFile } from "@/lib/download";
import { generateSticker, stickerComboCount, stickerFileName, stickerPhrases, stickerStyles } from "@/lib/sticker-pack";
import { applyInstaFont, instaFontVariants } from "@/lib/insta-fonts";

function StickerPack() {
  const [styleId, setStyleId] = useState(stickerStyles[0]?.id ?? "gold-serif");
  const [framed, setFramed] = useState(false);
  const [query, setQuery] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [error, setError] = useState("");
  const style = stickerStyles.find((s) => s.id === styleId) ?? stickerStyles[0]!;

  const phrases = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stickerPhrases;
    return stickerPhrases.filter((p) => p.toLowerCase().includes(q));
  }, [query]);

  const keyOf = (phrase: string) => `${style.id}:${framed ? "f" : "s"}:${phrase}`;

  const preview = async (phrase: string) => {
    const key = keyOf(phrase);
    if (previews[key]) return;
    setBusy(key);
    setError("");
    try {
      const blob = await generateSticker(phrase, style, framed);
      const url = URL.createObjectURL(blob);
      setPreviews((old) => ({ ...old, [key]: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar a figurinha.");
    } finally {
      setBusy(null);
    }
  };

  const downloadOne = async (phrase: string) => {
    const key = keyOf(phrase);
    setBusy(key);
    setError("");
    try {
      const blob = await generateSticker(phrase, style, framed);
      await deliverFile(blob, stickerFileName(phrase, style.id, framed));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar a figurinha.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPack = async () => {
    setPackBusy(true);
    setError("");
    try {
      const zip = new JSZip();
      for (const phrase of stickerPhrases) {
        const blob = await generateSticker(phrase, style, framed);
        zip.file(stickerFileName(phrase, style.id, framed), blob);
      }
      const pack = await zip.generateAsync({ type: "blob", compression: "STORE" });
      await deliverFile(pack, `pack-figurinhas-s7ven-${style.id}${framed ? "-moldura" : ""}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o pack.");
    } finally {
      setPackBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Figurinhas para os Stories</p>
        <p className="text-xs text-muted-foreground">
          {stickerPhrases.length} frases de trabalho e crescimento × {stickerStyles.length} estilos × com ou sem moldura:{" "}
          {stickerComboCount.toLocaleString("pt-BR")} combinações em PNG transparente. Baixe e cole como figurinha nos Stories.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {stickerStyles.map((s) => (
          <Button
            key={s.id}
            size="sm"
            variant={s.id === style.id ? "default" : "outline"}
            onClick={() => { setStyleId(s.id); setError(""); }}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span>Moldura dourada em volta da figurinha</span>
        <Switch aria-label="Moldura dourada" checked={framed} onCheckedChange={setFramed} />
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar frase"
          placeholder="Buscar frase…"
          className="field w-full pl-9 text-sm"
          maxLength={40}
        />
      </div>
      <ul className="space-y-2">
        {phrases.map((phrase) => {
          const key = keyOf(phrase);
          const url = previews[key];
          return (
            <li key={phrase} className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
              {url ? (
                <img
                  src={url}
                  alt={`Figurinha: ${phrase}`}
                  className="h-16 w-24 shrink-0 rounded-md object-contain [background:repeating-conic-gradient(#e7e5e4_0%_25%,#ffffff_0%_50%)_50%/16px_16px]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => void preview(phrase)}
                  disabled={busy === key}
                  className="flex h-16 w-24 shrink-0 items-center justify-center rounded-md border border-dashed text-[10px] text-muted-foreground"
                >
                  {busy === key ? "Gerando…" : "Ver prévia"}
                </button>
              )}
              <p className="min-w-0 flex-1 truncate text-sm">{phrase}</p>
              <Button size="sm" variant="outline" disabled={busy === key} onClick={() => void downloadOne(phrase)}>
                <Download />
                Baixar
              </Button>
            </li>
          );
        })}
        {phrases.length === 0 && (
          <li className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhuma frase encontrada para “{query}”.
          </li>
        )}
      </ul>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button variant="outline" size="sm" disabled={packBusy} onClick={() => void downloadPack()}>
        <Package />
        {packBusy ? "Montando pack…" : `Baixar pack completo (${stickerPhrases.length} figurinhas neste estilo)`}
      </Button>
    </div>
  );
}

const FONT_PAGE = 60;

function InstaFonts() {
  const [text, setText] = useState("S7VEN Lounge e Tabacaria");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(FONT_PAGE);
  const [copiedId, setCopiedId] = useState("");
  const styled = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? instaFontVariants.filter((f) => f.label.toLowerCase().includes(q)) : instaFontVariants;
    return list.slice(0, shown).map((f) => ({ ...f, out: applyInstaFont(text, f.id) }));
  }, [text, query, shown]);
  const total = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? instaFontVariants.filter((f) => f.label.toLowerCase().includes(q)).length : instaFontVariants.length;
  }, [query]);
  const copy = async (id: string, value: string) => {
    try { await navigator.clipboard.writeText(value); } catch { /* ignore */ }
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2500);
  };
  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <p className="text-sm font-semibold">Fontes para o Instagram</p>
        <p className="text-xs text-muted-foreground">
          {instaFontVariants.length.toLocaleString("pt-BR")} estilos (fontes × enfeites). Escreva o texto, copie o estilo e cole na legenda ou nos Stories.
        </p>
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Texto para converter"
        placeholder="Digite o texto…"
        className="field w-full text-sm"
        maxLength={80}
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShown(FONT_PAGE); }}
          aria-label="Buscar estilo de fonte"
          placeholder="Buscar estilo (ex.: manuscrita, estrelas, riscado)…"
          className="field w-full pl-9 text-sm"
          maxLength={40}
        />
      </div>
      <ul className="space-y-2">
        {styled.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{f.label}</p>
              <p className="truncate text-sm">{f.out || "…"}</p>
            </div>
            <Button size="sm" variant="outline" disabled={!text.trim()} onClick={() => void copy(f.id, f.out)}>
              {copiedId === f.id ? <Check /> : <Copy />}
              {copiedId === f.id ? "Copiado!" : "Copiar"}
            </Button>
          </li>
        ))}
        {styled.length === 0 && (
          <li className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Nenhum estilo encontrado para “{query}”.
          </li>
        )}
      </ul>
      {total > styled.length && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShown((n) => n + FONT_PAGE)}>
          Mostrar mais estilos ({styled.length} de {total.toLocaleString("pt-BR")})
        </Button>
      )}
    </div>
  );
}

export function StoriesTools() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t pt-4">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? <Type /> : <Sparkles />}
        {open ? "Ocultar ferramentas de Stories" : "Figurinhas e fontes para Stories"}
      </Button>
      {open && (
        <div className="mt-4 space-y-4">
          <StickerPack />
          <InstaFonts />
        </div>
      )}
    </div>
  );
}
