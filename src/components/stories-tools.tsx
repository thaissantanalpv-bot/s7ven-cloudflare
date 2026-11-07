import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Loader2, Search, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyInstaFont, instaFonts } from "@/lib/insta-fonts";
import { loadStoryFont, renderFontText, storyFonts, type StoryFont } from "@/lib/story-fonts";
import { downloadBlob } from "@/lib/download";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function FontPreview({ font, text, onSave, busy }: { font: StoryFont; text: string; onSave: (font: StoryFont) => void; busy: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadStoryFont(font).then(() => { if (active) setLoaded(true); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [font]);
  return (
    <li data-story-font={font.id} className="min-w-0 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">{font.family}</p>
          <p className="text-xs text-muted-foreground">{font.category}</p>
        </div>
        <Button size="icon" variant="outline" aria-label={`Salvar texto em ${font.family}`} title={`Salvar texto em ${font.family}`} disabled={!text.trim() || !loaded || busy} onClick={() => onSave(font)}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
        </Button>
      </div>
      <div className="flex min-h-36 items-center justify-center py-6">
        {loaded ? <p className="w-full break-words text-center text-4xl leading-relaxed [overflow-wrap:anywhere]" style={{ fontFamily: `"${font.family}"` }}>{text || "Money"}</p>
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
  const save = async (font: StoryFont) => {
    setSaving(font.id);
    setError("");
    try {
      const color = getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim();
      downloadBlob(await renderFontText(text, font, color), `s7ven-texto-${font.id}.png`);
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
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {designFonts.map((font) => <FontPreview key={font.id} font={font} text={text} onSave={(value) => void save(value)} busy={saving === font.id} />)}
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
