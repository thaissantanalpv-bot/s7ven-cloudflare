import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Check, Copy, Download, Package, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverFile } from "@/lib/download";
import { generateSticker, stickerFileName, stickerPhrases, stickerStyles } from "@/lib/sticker-pack";
import { applyInstaFont, instaFonts } from "@/lib/insta-fonts";

function StickerPack() {
  const [styleId, setStyleId] = useState(stickerStyles[0]?.id ?? "gold-serif");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [packBusy, setPackBusy] = useState(false);
  const [error, setError] = useState("");
  const style = stickerStyles.find((s) => s.id === styleId) ?? stickerStyles[0]!;

  const preview = async (phrase: string) => {
    const key = `${style.id}:${phrase}`;
    if (previews[key]) return;
    setBusy(key);
    setError("");
    try {
      const blob = await generateSticker(phrase, style);
      const url = URL.createObjectURL(blob);
      setPreviews((old) => ({ ...old, [key]: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar a figurinha.");
    } finally {
      setBusy(null);
    }
  };

  const downloadOne = async (phrase: string) => {
    const key = `${style.id}:${phrase}`;
    setBusy(key);
    setError("");
    try {
      const blob = await generateSticker(phrase, style);
      await deliverFile(blob, stickerFileName(phrase, style.id));
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
        const blob = await generateSticker(phrase, style);
        zip.file(stickerFileName(phrase, style.id), blob);
      }
      const pack = await zip.generateAsync({ type: "blob", compression: "STORE" });
      await deliverFile(pack, `pack-figurinhas-s7ven-${style.id}.zip`);
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
          Frases de trabalho e crescimento em PNG transparente. Baixe e cole como figurinha nos Stories.
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
      <ul className="space-y-2">
        {stickerPhrases.map((phrase) => {
          const key = `${style.id}:${phrase}`;
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
      </ul>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button variant="outline" size="sm" disabled={packBusy} onClick={() => void downloadPack()}>
        <Package />
        {packBusy ? "Montando pack…" : `Baixar pack completo (${stickerPhrases.length} figurinhas)`}
      </Button>
    </div>
  );
}

function InstaFonts() {
  const [text, setText] = useState("S7VEN Lounge e Tabacaria");
  const [copiedId, setCopiedId] = useState("");
  const styled = useMemo(
    () => instaFonts.map((f) => ({ ...f, out: applyInstaFont(text, f.id) })),
    [text],
  );
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
          Escreva o texto, copie o estilo e cole na legenda ou nos Stories (ex.: nome e preço do produto).
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
      </ul>
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
