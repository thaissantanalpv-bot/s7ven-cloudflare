import font0 from "@fontsource/ballet/files/ballet-latin-400-normal.woff2?url";
import font1 from "@fontsource/birthstone-bounce/files/birthstone-bounce-latin-400-normal.woff2?url";
import font2 from "@fontsource/borel/files/borel-latin-400-normal.woff2?url";
import font3 from "@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff2?url";
import font4 from "@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2?url";
import font5 from "@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url";
import font6 from "@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2?url";
import font7 from "@fontsource/allura/files/allura-latin-400-normal.woff2?url";
import font8 from "@fontsource/alex-brush/files/alex-brush-latin-400-normal.woff2?url";
import font9 from "@fontsource/parisienne/files/parisienne-latin-400-normal.woff2?url";
import font10 from "@fontsource/sacramento/files/sacramento-latin-400-normal.woff2?url";
import font11 from "@fontsource/pinyon-script/files/pinyon-script-latin-400-normal.woff2?url";
import font12 from "@fontsource/tangerine/files/tangerine-latin-400-normal.woff2?url";
import font13 from "@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2?url";
import font14 from "@fontsource/satisfy/files/satisfy-latin-400-normal.woff2?url";
import font15 from "@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2?url";
import font16 from "@fontsource/pacifico/files/pacifico-latin-400-normal.woff2?url";
import font17 from "@fontsource/caveat/files/caveat-latin-400-normal.woff2?url";
import font18 from "@fontsource/shadows-into-light/files/shadows-into-light-latin-400-normal.woff2?url";
import font19 from "@fontsource/indie-flower/files/indie-flower-latin-400-normal.woff2?url";
import font20 from "@fontsource/amatic-sc/files/amatic-sc-latin-400-normal.woff2?url";
import font21 from "@fontsource/lobster/files/lobster-latin-400-normal.woff2?url";
import font22 from "@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff2?url";
import font23 from "@fontsource/prata/files/prata-latin-400-normal.woff2?url";

export const storyFonts = [
  { id: "ballet", family: "Ballet", category: "Cursiva", url: font0 },
  { id: "birthstone-bounce", family: "Birthstone Bounce", category: "Cursiva", url: font1 },
  { id: "borel", family: "Borel", category: "Manuscrita", url: font2 },
  { id: "bodoni-moda", family: "Bodoni Moda", category: "Elegante", url: font3 },
  { id: "playfair-display", family: "Playfair Display", category: "Elegante", url: font4 },
  { id: "cormorant-garamond", family: "Cormorant Garamond", category: "Elegante", url: font5 },
  { id: "great-vibes", family: "Great Vibes", category: "Cursiva", url: font6 },
  { id: "allura", family: "Allura", category: "Cursiva", url: font7 },
  { id: "alex-brush", family: "Alex Brush", category: "Cursiva", url: font8 },
  { id: "parisienne", family: "Parisienne", category: "Cursiva", url: font9 },
  { id: "sacramento", family: "Sacramento", category: "Cursiva", url: font10 },
  { id: "pinyon-script", family: "Pinyon Script", category: "Cursiva", url: font11 },
  { id: "tangerine", family: "Tangerine", category: "Cursiva", url: font12 },
  { id: "dancing-script", family: "Dancing Script", category: "Cursiva", url: font13 },
  { id: "satisfy", family: "Satisfy", category: "Manuscrita", url: font14 },
  { id: "yellowtail", family: "Yellowtail", category: "Manuscrita", url: font15 },
  { id: "pacifico", family: "Pacifico", category: "Manuscrita", url: font16 },
  { id: "caveat", family: "Caveat", category: "Manuscrita", url: font17 },
  { id: "shadows-into-light", family: "Shadows Into Light", category: "Manuscrita", url: font18 },
  { id: "indie-flower", family: "Indie Flower", category: "Manuscrita", url: font19 },
  { id: "amatic-sc", family: "Amatic SC", category: "Destaque", url: font20 },
  { id: "lobster", family: "Lobster", category: "Destaque", url: font21 },
  { id: "abril-fatface", family: "Abril Fatface", category: "Destaque", url: font22 },
  { id: "prata", family: "Prata", category: "Elegante", url: font23 },
 ] as const;

export type StoryFont = (typeof storyFonts)[number];
const pending = new Map<string, Promise<FontFace>>();
export function loadStoryFont(font: StoryFont) {
  const existing = pending.get(font.id);
  if (existing) return existing;
  const promise = new FontFace(font.family, `url("${font.url}")`).load().then((face) => {
    document.fonts.add(face);
    return face;
  }).catch((error) => { pending.delete(font.id); throw error; });
  pending.set(font.id, promise);
  return promise;
}

export async function renderFontText(text: string, font: StoryFont, color: string): Promise<Blob> {
  await loadStoryFont(font);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível gerar a imagem.");
  const value = text.trim();
  if (!value) throw new Error("Digite um texto antes de salvar.");
  const fontSize = 120;
  ctx.font = `${fontSize}px "${font.family}"`;
  const maxWidth = 1200;
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) { line = candidate; continue; }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (ctx.measureText(line + character).width > maxWidth && line) { lines.push(line); line = ""; }
      line += character;
    }
  }
  if (line) lines.push(line);
  // Actual glyph bounds include cursive swashes and ascenders/descenders.
  const measured = lines.map((entry) => ctx.measureText(entry));
  const left = Math.max(0, ...measured.map((m) => m.actualBoundingBoxLeft));
  const right = Math.max(...measured.map((m) => Math.max(m.width, m.actualBoundingBoxRight)));
  const ascent = Math.max(fontSize, ...measured.map((m) => m.actualBoundingBoxAscent));
  const descent = Math.max(fontSize * 0.5, ...measured.map((m) => m.actualBoundingBoxDescent));
  const gap = ascent + descent + 30;
  const margin = 90;
  canvas.width = Math.ceil(left + right + margin * 2);
  canvas.height = Math.ceil(ascent + descent + (lines.length - 1) * gap + margin * 2);
  ctx.font = `${fontSize}px "${font.family}"`;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  for (let index = 0; index < lines.length; index++) {
    const entry = lines[index];
    if (entry) ctx.fillText(entry, margin + left, margin + ascent + index * gap);
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível salvar a imagem.")), "image/png"));
}
