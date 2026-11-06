// Unicode font styles for Instagram captions/stories: copy & paste anywhere.
// Each style maps A-Z a-z (and 0-9 when Unicode provides them) to styled codepoints.
// Styles combine with decorations (borders, sparkles, strikethrough…) for 1000+ variants.

type Range = { upper: number; lower?: number; digits?: number };

const STYLES: { id: string; label: string; ranges: Range[] }[] = [
  { id: "bold", label: "Negrito", ranges: [{ upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce }] },
  { id: "italic", label: "Itálico", ranges: [{ upper: 0x1d434, lower: 0x1d44e }] },
  { id: "bold-italic", label: "Negrito itálico", ranges: [{ upper: 0x1d468, lower: 0x1d482 }] },
  { id: "script", label: "Manuscrita", ranges: [{ upper: 0x1d49c, lower: 0x1d4b6 }] },
  { id: "script-bold", label: "Manuscrita forte", ranges: [{ upper: 0x1d4d0, lower: 0x1d4ea }] },
  { id: "fraktur", label: "Gótica", ranges: [{ upper: 0x1d504, lower: 0x1d51e }] },
  { id: "fraktur-bold", label: "Gótica forte", ranges: [{ upper: 0x1d56c, lower: 0x1d586 }] },
  { id: "double", label: "Vazada", ranges: [{ upper: 0x1d538, lower: 0x1d552, digits: 0x1d7d8 }] },
  { id: "sans", label: "Moderna", ranges: [{ upper: 0x1d5a0, lower: 0x1d5ba, digits: 0x1d7e2 }] },
  { id: "sans-bold", label: "Moderna forte", ranges: [{ upper: 0x1d5d4, lower: 0x1d5ee, digits: 0x1d7ec }] },
  { id: "sans-italic", label: "Moderna itálica", ranges: [{ upper: 0x1d608, lower: 0x1d622 }] },
  { id: "sans-bold-italic", label: "Moderna forte itálica", ranges: [{ upper: 0x1d63c, lower: 0x1d656 }] },
  { id: "mono", label: "Máquina", ranges: [{ upper: 0x1d670, lower: 0x1d68a, digits: 0x1d7f6 }] },
  { id: "circled", label: "Bolinhas", ranges: [{ upper: 0x24b6, lower: 0x24d0, digits: 0x2460 }] },
  { id: "circled-dark", label: "Bolinhas escuras", ranges: [{ upper: 0x1f150 }] },
  { id: "squared", label: "Quadrados", ranges: [{ upper: 0x1f130 }] },
  { id: "parenthesized", label: "Parênteses", ranges: [{ lower: 0x249c, digits: 0x2474, upper: 0x1f110 }] },
  { id: "fullwidth", label: "Larga", ranges: [{ upper: 0xff21, lower: 0xff41, digits: 0xff10 }] },
  { id: "regional", label: "Blocos", ranges: [{ upper: 0x1f1e6 }] },
  { id: "small-caps", label: "Versalete", ranges: [] }, // custom map below
];

// Letters whose styled glyph sits outside the sequential block.
const EXCEPTIONS: Record<number, number> = {
  0x1d455: 0x210e, // italic h
  0x1d49d: 0x212c, 0x1d4a0: 0x2130, 0x1d4a1: 0x2131, 0x1d4a3: 0x210b,
  0x1d4a4: 0x2110, 0x1d4a7: 0x2112, 0x1d4a8: 0x2133, 0x1d4ad: 0x211b,
  0x1d4ba: 0x212f, 0x1d4bc: 0x210a, 0x1d4c4: 0x2134,
  0x1d506: 0x212d, 0x1d50b: 0x210c, 0x1d50c: 0x2111, 0x1d515: 0x211c,
  0x1d51d: 0x2128,
  0x1d53a: 0x2102, 0x1d53f: 0x210d, 0x1d545: 0x2115, 0x1d547: 0x2119,
  0x1d548: 0x211a, 0x1d549: 0x211d, 0x1d551: 0x2124,
};

// Small caps has no sequential block; map each lowercase letter directly.
const SMALL_CAPS: Record<string, string> = {
  a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ",
  j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ", n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ",
  s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ",
};

function mapChar(ch: string, styleId: string, ranges: Range[]): string {
  if (styleId === "small-caps") return SMALL_CAPS[ch] ?? ch;
  const code = ch.codePointAt(0)!;
  for (const r of ranges) {
    let target: number | null = null;
    if (code >= 65 && code <= 90 && r.upper !== undefined) target = r.upper + (code - 65);
    else if (code >= 97 && code <= 122 && r.lower !== undefined) target = r.lower + (code - 97);
    else if (code >= 48 && code <= 57 && r.digits !== undefined) target = r.digits + (code - 48);
    if (target !== null) return String.fromCodePoint(EXCEPTIONS[target] ?? target);
  }
  return ch;
}

// Decorations wrap or overlay the styled text. `combining` adds a Unicode mark after each letter.
type Decoration = { id: string; label: string; pre?: string; post?: string; combining?: string };

const DECORATIONS: Decoration[] = [
  { id: "plain", label: "Sem enfeite" },
  { id: "stars", label: "Estrelas", pre: "★ ", post: " ★" },
  { id: "sparkles", label: "Brilhos", pre: "✦ ", post: " ✦" },
  { id: "diamonds", label: "Losangos", pre: "◆ ", post: " ◆" },
  { id: "hearts", label: "Corações", pre: "♡ ", post: " ♡" },
  { id: "arrows", label: "Setas", pre: "➤ ", post: "" },
  { id: "brackets-jp", label: "Colchetes 「」", pre: "「", post: "」" },
  { id: "brackets-solid", label: "Colchetes 【】", pre: "【", post: "】" },
  { id: "brackets-double", label: "Colchetes duplos ⟦⟧", pre: "⟦ ", post: " ⟧" },
  { id: "brackets-angle", label: "Aspa angular «»", pre: "« ", post: " »" },
  { id: "dots", label: "Pontos", pre: "• ", post: " •" },
  { id: "lines", label: "Linhas", pre: "─ ", post: " ─" },
  { id: "double-lines", label: "Linhas duplas", pre: "═ ", post: " ═" },
  { id: "wave", label: "Ondas", pre: "～", post: "～" },
  { id: "crown", label: "Coroa", pre: "♛ ", post: " ♛" },
  { id: "fire", label: "Fogo", pre: "🔥 ", post: " 🔥" },
  { id: "clover", label: "Trevo", pre: "☘ ", post: " ☘" },
  { id: "moon", label: "Lua", pre: "☾ ", post: " ☽" },
  { id: "sun", label: "Sol", pre: "☀ ", post: " ☀" },
  { id: "flower", label: "Flor", pre: "✿ ", post: " ✿" },
  { id: "music", label: "Música", pre: "♪ ", post: " ♫" },
  { id: "chess", label: "Xadrez", pre: "♞ ", post: " ♞" },
  { id: "anchor", label: "Âncora", pre: "⚓ ", post: " ⚓" },
  { id: "key", label: "Chave", pre: "⚿ ", post: "" },
  { id: "gear", label: "Engrenagem", pre: "⚙ ", post: " ⚙" },
  { id: "bolt", label: "Raio", pre: "⚡ ", post: " ⚡" },
  { id: "target", label: "Alvo", pre: "◎ ", post: " ◎" },
  { id: "infinity", label: "Infinito", pre: "∞ ", post: " ∞" },
  { id: "check", label: "Confirmação", pre: "✔ ", post: "" },
  { id: "cross", label: "Cruz", pre: "✝ ", post: " ✝" },
  { id: "corner", label: "Cantos ⌜⌟", pre: "⌜ ", post: " ⌟" },
  { id: "ceil", label: "Tetos ⌈⌉", pre: "⌈ ", post: " ⌉" },
  { id: "paren", label: "Parênteses 〖〗", pre: "〖", post: "〗" },
  { id: "tortoise", label: "Casco 〔〕", pre: "〔", post: "〕" },
  { id: "white-paren", label: "Parênteses 〚〛", pre: "〚", post: "〛" },
  { id: "strike", label: "Riscado", combining: "̶" },
  { id: "underline", label: "Sublinhado", combining: "̲" },
  { id: "double-underline", label: "Sublinhado duplo", combining: "̳" },
  { id: "overline", label: "Linha em cima", combining: "̅" },
  { id: "tilde", label: "Til", combining: "̴" },
  { id: "slash", label: "Cortado", combining: "̸" },
  { id: "arrow-under", label: "Flecha embaixo", combining: "͢" },
  { id: "ring", label: "Anel em cima", combining: "̊" },
  { id: "dots-above", label: "Pontos em cima", combining: "̈" },
  { id: "cross-above", label: "Cruz em cima", combining: "̽" },
  { id: "asterisk-below", label: "Asterisco embaixo", combining: "͙" },
  { id: "plus-below", label: "Mais embaixo", combining: "̟" },
  { id: "x-below", label: "X embaixo", combining: "̽" },
  { id: "bridge", label: "Ponte embaixo", combining: "̪" },
  { id: "square-below", label: "Quadrado embaixo", combining: "̻" },
  { id: "seagull", label: "Gaivota embaixo", combining: "̼" },
  { id: "up-arrow", label: "Seta para cima", pre: "↑ ", post: " ↑" },
  { id: "level", label: "Nível", pre: "▰ ", post: " ▰" },
  { id: "triangle", label: "Triângulos", pre: "▲ ", post: " ▲" },
  { id: "circle", label: "Círculos", pre: "● ", post: " ●" },
];

export type InstaFont = { id: string; label: string; sample: string };

// Base styles (no decoration), kept for simple listings.
export const instaFonts: InstaFont[] = STYLES.map((s) => ({
  id: s.id,
  label: s.label,
  sample: "S7VEN Lounge",
}));

// Every style × decoration combination (1000+ copy-paste variants).
export const instaFontVariants: InstaFont[] = STYLES.flatMap((s) =>
  DECORATIONS.map((d) => ({
    id: `${s.id}~${d.id}`,
    label: d.id === "plain" ? s.label : `${s.label} · ${d.label}`,
    sample: "S7VEN Lounge",
  })),
);

function applyStyle(text: string, styleId: string): string {
  const style = STYLES.find((s) => s.id === styleId);
  if (!style) return text;
  return [...text].map((ch) => mapChar(ch, style.id, style.ranges)).join("");
}

export function applyInstaFont(text: string, variantId: string): string {
  const [styleId, decoId = "plain"] = variantId.split("~");
  const styled = applyStyle(text, styleId);
  if (styled === text && !STYLES.some((s) => s.id === styleId)) return text;
  const deco = DECORATIONS.find((d) => d.id === decoId);
  if (!deco || deco.id === "plain") return styled;
  if (deco.combining) {
    return [...styled].map((ch) => (ch.trim() ? ch + deco.combining : ch)).join("");
  }
  return `${deco.pre ?? ""}${styled}${deco.post ?? ""}`;
}
