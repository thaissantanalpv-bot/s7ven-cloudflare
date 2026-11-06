import { useMemo, useState } from "react";
import { Check, Copy, Search, Sparkles, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyInstaFont, instaFontVariants } from "@/lib/insta-fonts";

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
