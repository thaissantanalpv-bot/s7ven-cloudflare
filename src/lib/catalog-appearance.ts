import { z } from "zod";

/** Fontes liberadas para o catálogo (todas do Google Fonts). */
export const CATALOG_FONTS = {
  geist: { label: "Geist (moderna)", family: '"Geist", "DM Sans", sans-serif', google: "Geist:wght@400;500;600;700;800" },
  "dm-sans": { label: "DM Sans (limpa)", family: '"DM Sans", sans-serif', google: "DM+Sans:wght@400;500;600;700" },
  montserrat: { label: "Montserrat (forte)", family: '"Montserrat", sans-serif', google: "Montserrat:wght@400;500;600;700;800" },
  oswald: { label: "Oswald (alta e marcante)", family: '"Oswald", sans-serif', google: "Oswald:wght@400;500;600;700" },
  "bebas-neue": { label: "Bebas Neue (letreiro)", family: '"Bebas Neue", "Oswald", sans-serif', google: "Bebas+Neue" },
  cinzel: { label: "Cinzel (clássica, luxo)", family: '"Cinzel", serif', google: "Cinzel:wght@400;600;700;800" },
  playfair: { label: "Playfair Display (elegante)", family: '"Playfair Display", serif', google: "Playfair+Display:wght@400;600;700;800" },
  cormorant: { label: "Cormorant (refinada)", family: '"Cormorant Garamond", serif', google: "Cormorant+Garamond:wght@400;500;600;700" },
  lora: { label: "Lora (serifada leve)", family: '"Lora", serif', google: "Lora:wght@400;500;600;700" },
  manrope: { label: "Manrope (arredondada)", family: '"Manrope", sans-serif', google: "Manrope:wght@400;500;600;700;800" },
  "space-grotesk": { label: "Space Grotesk (tecnológica)", family: '"Space Grotesk", sans-serif', google: "Space+Grotesk:wght@400;500;600;700" },
  raleway: { label: "Raleway (fina)", family: '"Raleway", sans-serif', google: "Raleway:wght@400;500;600;700;800" },
} as const;
export type CatalogFont = keyof typeof CATALOG_FONTS;
const fontIds = Object.keys(CATALOG_FONTS) as [CatalogFont, ...CatalogFont[]];

export const CORNER_STYLES = {
  reto: { label: "Retos", sizes: [2, 3, 4, 4, 4] },
  padrao: { label: "Padrão", sizes: [4, 6, 8, 8, 8] },
  arredondado: { label: "Arredondados", sizes: [6, 10, 14, 18, 22] },
} as const;
export type CornerStyle = keyof typeof CORNER_STYLES;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");
const text = (max: number) => z.string().trim().max(max);
/** Mesmo formato aceito pela regra de leitura pública das fotos do catálogo. */
export const BANNER_PATH = /^uploads\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/;
export const BANNER_POSITIONS = { left: "Esquerda", center: "Centro", right: "Direita" } as const;

export const appearanceSchema = z.object({
  background: hex.default("#09090b"),
  card: hex.default("#121218"),
  text: hex.default("#f8fafc"),
  primary: hex.default("#a855f7"),
  gold: hex.default("#e5b842"),
  fontDisplay: z.enum(fontIds).default("geist"),
  fontBody: z.enum(fontIds).default("dm-sans"),
  corners: z.enum(["reto", "padrao", "arredondado"]).default("padrao"),
  bannerKicker: text(60).default("Seu pedido favorito"),
  bannerTitle: text(40).default("Agora online!"),
  bannerText: text(140).default("Tabacaria, bebidas, acessórios e muito mais."),
  bannerButton: text(30).default("Ver catálogo"),
  deliveryLine: text(80).default("Entregas das 16:00 às 23:00"),
  /** Caminho da foto do banner no armazenamento privado; vazio = foto padrão do narguilé. */
  bannerImage: z.union([z.literal(""), z.string().regex(BANNER_PATH, "Foto do banner inválida")]).default(""),
  /** Qual parte da foto fica visível quando ela é cortada. */
  bannerPosition: z.enum(["left", "center", "right"]).default("right"),
});
export type CatalogAppearance = z.infer<typeof appearanceSchema>;
export const DEFAULT_APPEARANCE: CatalogAppearance = appearanceSchema.parse({});

/** Converte o que vier do banco; qualquer campo inválido volta ao padrão sem quebrar o catálogo. */
export function parseAppearance(raw: unknown): CatalogAppearance {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(appearanceSchema.shape)) {
    const r = (field as z.ZodTypeAny).safeParse(src[key]);
    out[key] = r.success ? r.data : (DEFAULT_APPEARANCE as Record<string, unknown>)[key];
  }
  return out as CatalogAppearance;
}

export const APPEARANCE_PRESETS: { id: string; label: string; colors: Pick<CatalogAppearance, "background" | "card" | "text" | "primary" | "gold"> }[] = [
  { id: "noite", label: "S7VEN Noite (atual)", colors: { background: "#09090b", card: "#121218", text: "#f8fafc", primary: "#a855f7", gold: "#e5b842" } },
  { id: "preto-dourado", label: "Preto e dourado", colors: { background: "#0b0a08", card: "#17140f", text: "#f5efe1", primary: "#d4a537", gold: "#f0cc6b" } },
  { id: "lounge-verde", label: "Lounge verde", colors: { background: "#07120d", card: "#0f1f17", text: "#eef6f1", primary: "#22a06b", gold: "#e5b842" } },
  { id: "vinho", label: "Vinho", colors: { background: "#12070a", card: "#1e0e13", text: "#fbeff2", primary: "#c0264f", gold: "#e8b04a" } },
  { id: "claro", label: "Claro", colors: { background: "#f7f5f0", card: "#ffffff", text: "#16141a", primary: "#111111", gold: "#a87b14" } },
];

function luminance(color: string) {
  const ch = (i: number) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}
/** Texto branco quando ele é legível (contraste 3:1 serve para letras em negrito dos botões); senão, escuro. */
export function readableOn(color: string) {
  const l = luminance(color);
  const white = 1.05 / (l + 0.05);
  return white >= 3 || white >= (l + 0.05) / 0.05 ? "#ffffff" : "#111114";
}
export function isLightColor(color: string) {
  return luminance(color) > 0.4;
}

/** Variáveis de tema do catálogo. Só usa cores hex validadas e fontes da lista acima. */
export function appearanceVars(input: CatalogAppearance): Record<string, string> {
  const a = parseAppearance(input);
  const mix = (c: string, pct: number, base: string) => `color-mix(in srgb, ${c} ${pct}%, ${base})`;
  const [sm, md, lg, xl, xxl] = CORNER_STYLES[a.corners].sizes;
  return {
    "--background": a.background,
    "--foreground": a.text,
    "--card": a.card,
    "--primary": a.primary,
    "--primary-foreground": readableOn(a.primary),
    "--accent": mix(a.primary, 75, a.text),
    "--gold": a.gold,
    "--gold-foreground": readableOn(a.gold),
    "--secondary": mix(a.text, 8, a.background),
    "--muted": mix(a.text, 6, a.background),
    "--muted-foreground": mix(a.text, 62, a.background),
    "--border": mix(a.text, 14, a.background),
    "--photo": mix(a.text, 6, a.card),
    "--photo-foreground": a.text,
    "--overlay": `color-mix(in srgb, ${a.background} 90%, transparent)`,
    "--shadow-soft-value": isLightColor(a.background) ? "0 14px 36px rgba(0, 0, 0, 0.12)" : "0 16px 45px rgba(0, 0, 0, 0.7)",
    "--app-font-display": CATALOG_FONTS[a.fontDisplay].family,
    "--app-font-sans": CATALOG_FONTS[a.fontBody].family,
    "--app-radius-sm": `${sm}px`,
    "--app-radius-md": `${md}px`,
    "--app-radius-lg": `${lg}px`,
    "--app-radius-xl": `${xl}px`,
    "--app-radius-2xl": `${xxl}px`,
    "color-scheme": isLightColor(a.background) ? "light" : "dark",
  };
}

/** CSS aplicado ao catálogo (inclusive janelas abertas por cima, como o carrinho). */
export function appearanceCss(input: CatalogAppearance) {
  const body = Object.entries(appearanceVars(input)).map(([k, v]) => `${k}:${v};`).join("");
  return `body:has(.catalog-theme){${body}}`;
}

export function appearanceFontsHref(input: CatalogAppearance) {
  const a = parseAppearance(input);
  const families = [...new Set([a.fontDisplay, a.fontBody])].map((f) => `family=${CATALOG_FONTS[f].google}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}
