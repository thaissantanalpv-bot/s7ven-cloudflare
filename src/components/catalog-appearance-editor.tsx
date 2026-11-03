import { useMemo, useState, type CSSProperties } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Palette, RotateCcw, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storeSettingsQuery } from "@/lib/store-settings.query";
import { saveCatalogAppearance } from "@/lib/store-settings.functions";
import {
  APPEARANCE_PRESETS, CATALOG_FONTS, CORNER_STYLES, DEFAULT_APPEARANCE,
  appearanceSchema, appearanceVars, parseAppearance,
  type CatalogAppearance, type CatalogFont, type CornerStyle,
} from "@/lib/catalog-appearance";

const ALL_FONTS_HREF = `https://fonts.googleapis.com/css2?${Object.values(CATALOG_FONTS).map((f) => `family=${f.google}`).join("&")}&display=swap`;

const COLOR_FIELDS: { key: "background" | "card" | "text" | "primary" | "gold"; label: string; hint: string }[] = [
  { key: "background", label: "Fundo", hint: "Cor de fundo do catálogo" },
  { key: "card", label: "Cartões", hint: "Fundo dos produtos e caixas" },
  { key: "text", label: "Letras", hint: "Cor principal dos textos" },
  { key: "primary", label: "Botões e destaques", hint: "Botões, ícones e abas" },
  { key: "gold", label: "Títulos especiais", hint: "“Agora online!”, selos e preços em destaque" },
];

const TEXT_FIELDS: { key: "bannerKicker" | "bannerTitle" | "bannerText" | "bannerButton" | "deliveryLine"; label: string; max: number }[] = [
  { key: "bannerKicker", label: "Frase pequena do banner", max: 60 },
  { key: "bannerTitle", label: "Título grande do banner", max: 40 },
  { key: "bannerText", label: "Texto do banner", max: 140 },
  { key: "bannerButton", label: "Botão do banner", max: 30 },
  { key: "deliveryLine", label: "Linha de entregas", max: 80 },
];

function previewStyle(look: CatalogAppearance): CSSProperties {
  const { "color-scheme": scheme, ...vars } = appearanceVars(look);
  return { ...vars, colorScheme: scheme, fontFamily: "var(--app-font-sans)" } as CSSProperties;
}

/** Configurações → Aparência: cores, letras, cantos e textos do catálogo, com prévia ao vivo. */
export function CatalogAppearanceEditor() {
  const { data: settings } = useSuspenseQuery(storeSettingsQuery);
  const saved = useMemo(() => parseAppearance(settings.catalog_appearance), [settings.catalog_appearance]);
  const [draft, setDraft] = useState<CatalogAppearance>(saved);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(saveCatalogAppearance);
  const client = useQueryClient();
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  const set = <K extends keyof CatalogAppearance>(key: K, value: CatalogAppearance[K]) => {
    setStatus(null);
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const submit = async () => {
    const parsed = appearanceSchema.safeParse(draft);
    if (!parsed.success) { setStatus({ kind: "error", text: parsed.error.issues[0]?.message ?? "Confira os campos." }); return; }
    setSaving(true);
    try {
      await save({ data: parsed.data });
      client.setQueryData(storeSettingsQuery.queryKey, { ...settings, catalog_appearance: parsed.data });
      await Promise.all([
        client.invalidateQueries({ queryKey: storeSettingsQuery.queryKey }),
        client.invalidateQueries({ queryKey: ["public-store-settings"] }),
      ]);
      setStatus({ kind: "ok", text: "Aparência salva. O catálogo já mostra o novo visual." });
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Não foi possível salvar." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-6">
      <link rel="stylesheet" href={ALL_FONTS_HREF} precedence="default" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="size-5" /></div>
          <div>
            <h2 className="font-display text-lg font-semibold">Aparência do catálogo</h2>
            <p className="text-xs text-muted-foreground">Mude cores, fundo, letras e textos. A prévia ao lado mostra como fica antes de salvar.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/" target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" />Abrir catálogo</a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Combinações prontas</h3>
            <p className="mt-1 text-xs text-muted-foreground">Toque para usar e depois ajuste se quiser.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {APPEARANCE_PRESETS.map((p) => {
                const active = COLOR_FIELDS.every(({ key }) => draft[key].toLowerCase() === p.colors[key]);
                return (
                  <button key={p.id} type="button" aria-pressed={active} onClick={() => { setStatus(null); setDraft((d) => ({ ...d, ...p.colors })); }}
                    className={`rounded-lg border p-2 text-left text-xs transition-colors ${active ? "border-primary bg-primary/10" : "hover:border-muted-foreground/40"}`}>
                    <span className="flex h-7 overflow-hidden rounded-md border">
                      {[p.colors.background, p.colors.card, p.colors.primary, p.colors.gold].map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
                    </span>
                    <span className="mt-1.5 block font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Cores</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {COLOR_FIELDS.map(({ key, label, hint }) => (
                <label key={key} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <input type="color" aria-label={label} value={draft[key]} onChange={(e) => set(key, e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded border bg-transparent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>
                  </span>
                  <input aria-label={`${label} (código)`} value={draft[key]} maxLength={7}
                    onChange={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set(key, v); }}
                    className="field w-24 px-2 py-1.5 font-mono text-xs uppercase" />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Letras</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([["fontDisplay", "Letra dos títulos"], ["fontBody", "Letra dos textos"]] as const).map(([key, label]) => (
                <label key={key} className="space-y-1.5">
                  <span className="text-sm font-medium">{label}</span>
                  <select aria-label={label} value={draft[key]} onChange={(e) => set(key, e.target.value as CatalogFont)} className="field" style={{ fontFamily: CATALOG_FONTS[draft[key]].family }}>
                    {Object.entries(CATALOG_FONTS).map(([id, f]) => <option key={id} value={id} style={{ fontFamily: f.family }}>{f.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium">Cantos dos cartões</p>
            <div role="radiogroup" aria-label="Cantos dos cartões" className="mt-2 grid grid-cols-3 gap-2">
              {(Object.keys(CORNER_STYLES) as CornerStyle[]).map((id) => (
                <button key={id} type="button" role="radio" aria-checked={draft.corners === id} onClick={() => set("corners", id)}
                  className={`border p-3 text-sm transition-colors ${draft.corners === id ? "border-primary bg-primary/10 font-semibold text-primary" : "hover:border-muted-foreground/40"}`}
                  style={{ borderRadius: CORNER_STYLES[id].sizes[3] }}>
                  {CORNER_STYLES[id].label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <h3 className="font-semibold">Textos do início</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {TEXT_FIELDS.map(({ key, label, max }) => (
                <label key={key} className={`space-y-1.5 ${key === "bannerText" ? "sm:col-span-2" : ""}`}>
                  <span className="text-sm font-medium">{label}</span>
                  <input aria-label={label} value={draft[key]} maxLength={max} placeholder={DEFAULT_APPEARANCE[key]} onChange={(e) => set(key, e.target.value)} className="field" />
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Prévia</p>
          <CatalogPreview look={draft} />
        </aside>
      </div>

      <div className="admin-save-bar sticky z-20 -mx-1 flex flex-wrap items-center gap-3 rounded-xl border bg-card/95 p-3 backdrop-blur">
        <Button onClick={submit} disabled={saving || !changed}>{saving ? "Salvando…" : "Salvar aparência"}</Button>
        <Button variant="outline" disabled={saving} onClick={() => { setStatus(null); setDraft(DEFAULT_APPEARANCE); }}>
          <RotateCcw className="size-4" />Voltar ao padrão
        </Button>
        {changed && !status && <span className="text-xs text-muted-foreground">Alterações ainda não salvas.</span>}
        {status && <span role="status" className={`text-sm ${status.kind === "error" ? "text-destructive" : "text-primary"}`}>{status.text}</span>}
      </div>
    </div>
  );
}

function CatalogPreview({ look }: { look: CatalogAppearance }) {
  return (
    <div style={previewStyle(look)} className="overflow-hidden rounded-2xl border bg-background text-foreground shadow-soft" aria-label="Prévia do catálogo">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <img src="/logo-s7ven.png" alt="" width={360} height={312} className="h-9 w-auto object-contain" />
        <span className="relative grid size-9 place-items-center"><ShoppingCart className="size-5" /><span className="absolute -right-0.5 top-0 grid size-4 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">2</span></span>
      </div>
      <div className="p-3">
        <div className="rounded-md border border-[var(--search-bg)] bg-[var(--search-bg)] px-3 py-2 text-xs text-[var(--search-placeholder)]">O que você está procurando?</div>
        <div className="mt-3 rounded-2xl border border-primary/30 bg-photo p-4">
          <p className="font-display text-[11px] font-semibold uppercase tracking-wide">{look.bannerKicker}</p>
          <p className="font-display text-2xl font-extrabold uppercase leading-none text-gold">{look.bannerTitle}</p>
          <p className="mt-1.5 text-xs opacity-85">{look.bannerText}</p>
          <span className="mt-3 inline-flex h-8 items-center rounded-full bg-primary px-3 text-[11px] font-bold uppercase text-primary-foreground">{look.bannerButton || "Ver catálogo"}</span>
        </div>
        <p className="mt-3 flex items-center gap-2 border-y py-2 text-[11px] font-medium"><Truck className="size-3.5 text-primary" />{look.deliveryLine}</p>
        <p className="mt-3 font-display text-base font-semibold">Promoções e destaques</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[{ n: "Essência Ziggy 50g", p: "R$ 25,00", old: "R$ 30,00" }, { n: "Carvão de coco 1kg", p: "R$ 32,00" }].map((item) => (
            <div key={item.n} className="rounded-xl border bg-card p-2">
              <div className="relative aspect-square rounded-lg bg-photo">
                {item.old && <span className="absolute left-1.5 top-1.5 rounded bg-gold px-1.5 py-0.5 text-[9px] font-bold text-gold-foreground">Promoção</span>}
              </div>
              <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-tight">{item.n}</p>
              <p className="text-[11px] text-muted-foreground">{item.old && <s className="mr-1">{item.old}</s>}<span className="font-bold text-foreground">{item.p}</span></p>
              <span className="mt-1.5 flex h-7 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">Adicionar</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
