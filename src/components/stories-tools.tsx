import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Loader2, Search, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyInstaFont, instaFonts } from "@/lib/insta-fonts";
import { defaultFontTextStyle, loadStoryFont, OUTLINE_EM, renderFontText, storyFonts, styledText, type FontTextStyle, type StoryFont } from "@/lib/story-fonts";
import type { CSSProperties } from "react";

const SWATCHES = ["#111111", "#ffffff", "#d4a537", "#f2b5d5", "#e11d48", "#f97316", "#facc15", "#22c55e", "#0ea5e9", "#7c3aed"];

function isLight(hex: string) {
  const v = hex.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) > 170;
}

function previewStyle(font: StoryFont, s: FontTextStyle): CSSProperties {
  const strokeEm = s.boldEm + (s.outlineColor ? OUTLINE_EM : 0);
  const shadow = s.shadow ? "0.05em 0.07em 0.15em rgba(0,0,0,0.45)" : undefined;
  return {
    fontFamily: `"${font.family}"`,
    color: s.color,
    letterSpacing: `${s.letterSpacingEm}em`,
    WebkitTextStroke: strokeEm > 0 ? `${strokeEm * 2}em ${s.outlineColor ?? s.color}` : undefined,
    paintOrder: "stroke fill",
    textShadow: shadow,
    transform: s.italic ? "skewX(-11deg)" : undefined,
  };
}
import { downloadBlob } from "@/lib/download";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function FontPreview({ font, text, onSave, busy, textStyle }: { font: StoryFont; text: string; onSave: (font: StoryFont) => void; busy: boolean; textStyle: FontTextStyle }) {
  const dark = isLight(textStyle.color) && (!textStyle.outlineColor || isLight(textStyle.outlineColor));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadStoryFont(font).then(() => { if (active) setLoaded(true); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [font]);
  return (
    <li data-story-font={font.id} className={`min-w-0 rounded-lg border p-3 ${dark ? "bg-foreground text-background" : "bg-muted/40"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{font.family}</p>
          <p className="text-xs opacity-70">{font.category}</p>
        </div>
        <Button size="icon" variant="outline" aria-label={`Salvar texto em ${font.family}`} title={`Salvar texto em ${font.family}`} disabled={!text.trim() || !loaded || busy} onClick={() => onSave(font)}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      </div>
      <div className="flex min-h-36 items-center justify-center py-6">
        {loaded ? <p className="w-full break-words text-center text-4xl leading-relaxed [overflow-wrap:anywhere]" style={previewStyle(font, textStyle)}>{styledText(text || "Money", textStyle)}</p>
          : <p className="text-xs text-muted-foreground">{failed ? "Não foi possível carregar esta fonte." : "Carregando fonte…"}</p>}
      </div>
    </li>
  );
}

function InstaFonts() {
  const [text, setText] = useState("S7VEN Lounge e Tabacaria");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [mode, setMode] = useState("design");
  const [category, setCategory] = useState("Todas");
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [textStyle, setTextStyle] = useState<FontTextStyle>(defaultFontTextStyle);
  const patch = (p: Partial<FontTextStyle>) => setTextStyle((s) => ({ ...s, ...p }));
  const save = async (font: StoryFont) => {
    setSaving(font.id);
    setError("");
    try {
      downloadBlob(await renderFontText(text, font, textStyle), `s7ven-texto-${font.id}.png`);
    } catch { setError("Não foi possível salvar. Tente novamente."); }
    finally { setSaving(""); }
  };
  const styled = useMemo(() => {
    const q = query.trim().toLowerCase();
    return instaFonts.filter((f) => !q || f.label.toLowerCase().includes(q)).map((f) => ({ ...f, out: applyInstaFont(text, f.id) }));
  }, [text, query]);
  const designFonts = storyFonts.filter((font) => (category === "Todas" || font.category === category) && `${font.family} ${font.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const copy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2500);
    } catch { setError("Não foi possível copiar. Tente novamente."); }
  };
  return (
    <div className="space-y-3 border-t pt-4">
      <div>
        <p className="text-sm font-semibold">Fontes para o Instagram</p>
        <p className="text-xs text-muted-foreground">24 fontes de design · 19 estilos de texto copiável</p>
      </div>
      <Tabs value={mode} onValueChange={(value) => { setMode(value); setQuery(""); setError(""); }}>
        <TabsList className="w-full">
          <TabsTrigger value="design" className="flex-1">Fontes de design</TabsTrigger>
          <TabsTrigger value="copy" className="flex-1">Texto copiável</TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === "design" && <p className="text-xs text-muted-foreground">Fontes de design são salvas como imagem transparente; copiar e colar texto não mantém essas letras no Instagram.</p>}
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
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar estilo de fonte"
          placeholder="Buscar fonte…"
          className="field w-full pl-9 text-sm"
          maxLength={40}
        />
      </div>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {mode === "design" ? <>
        <div className="flex flex-wrap gap-2" aria-label="Categorias de fontes">
          {["Todas", "Cursiva", "Manuscrita", "Elegante", "Destaque"].map((value) => <Button key={value} size="sm" variant={category === value ? "default" : "outline"} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</Button>)}
        </div>
        <div className="space-y-3 rounded-lg border p-3" aria-label="Editar estilo do texto">
          <div>
            <p className="mb-2 text-xs font-medium">Cor da letra</p>
            <div className="flex flex-wrap items-center gap-2">
              {SWATCHES.map((c) => <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={textStyle.color === c} onClick={() => patch({ color: c })} className={`size-7 rounded-full border-2 ${textStyle.color === c ? "border-primary ring-2 ring-primary/40" : "border-border"}`} style={{ background: c }} />)}
              <label className="flex items-center gap-1 text-xs">Outra <input type="color" aria-label="Escolher outra cor" value={textStyle.color} onChange={(e) => patch({ color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border bg-transparent" /></label>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium">Espessura</p>
            <div className="flex flex-wrap gap-2">
              {([["Normal", 0], ["Grossa", 0.02], ["Extra grossa", 0.04]] as const).map(([label, v]) => <Button key={label} size="sm" variant={textStyle.boldEm === v ? "default" : "outline"} aria-pressed={textStyle.boldEm === v} onClick={() => patch({ boldEm: v })}>{label}</Button>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={textStyle.shadow ? "default" : "outline"} aria-pressed={textStyle.shadow} onClick={() => patch({ shadow: !textStyle.shadow })}>Sombra</Button>
            <Button size="sm" variant={textStyle.italic ? "default" : "outline"} aria-pressed={textStyle.italic} onClick={() => patch({ italic: !textStyle.italic })}>Inclinada</Button>
            <Button size="sm" variant={textStyle.uppercase ? "default" : "outline"} aria-pressed={textStyle.uppercase} onClick={() => patch({ uppercase: !textStyle.uppercase })}>MAIÚSCULAS</Button>
            <Button size="sm" variant={textStyle.outlineColor ? "default" : "outline"} aria-pressed={!!textStyle.outlineColor} onClick={() => patch({ outlineColor: textStyle.outlineColor ? null : (isLight(textStyle.color) ? "#111111" : "#ffffff") })}>Contorno</Button>
            {textStyle.outlineColor && <label className="flex items-center gap-1 text-xs">Cor do contorno <input type="color" aria-label="Cor do contorno" value={textStyle.outlineColor} onChange={(e) => patch({ outlineColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border bg-transparent" /></label>}
          </div>
          <label className="block text-xs font-medium">Espaço entre letras
            <input type="range" min={0} max={0.3} step={0.02} value={textStyle.letterSpacingEm} onChange={(e) => patch({ letterSpacingEm: Number(e.target.value) })} className="mt-1 w-full accent-primary" />
          </label>
          <Button size="sm" variant="ghost" onClick={() => setTextStyle(defaultFontTextStyle)}>Restaurar padrão</Button>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {designFonts.map((font) => <FontPreview key={font.id} font={font} text={text} textStyle={textStyle} onSave={(value) => void save(value)} busy={saving === font.id} />)}
        </ul>
        {designFonts.length === 0 && <p className="text-center text-xs text-muted-foreground">Nenhuma fonte encontrada.</p>}
      </> : <ul className="space-y-2">
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
      </ul>}
    </div>
  );
}

export function StoriesTools() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 border-t pt-4">
      <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        {open ? <Type /> : <Sparkles />}
        {open ? "Ocultar fontes para Stories" : "Fontes para Stories"}
      </Button>
      {open && (
        <div className="mt-4">
          <InstaFonts />
        </div>
      )}
    </div>
  );
}
