// Transparent PNG stickers (1080x1080) with work/growth phrases, dark + gold S7VEN style.
// 60 phrases × 12 styles × 2 frame options = 1.440 possible stickers.

const GOLD = "#d4af37";
const GOLD_SOFT = "#e8c96a";
const TEXT = "#fafaf9";
const SIZE = 1080;

export type StickerStyle = {
  id: string;
  label: string;
  font: (px: number) => string;
  fill: string;
  accent: string;
  outline?: boolean; // stroke instead of fill
  neon?: boolean; // strong glow
  uppercase?: boolean;
};

export const stickerStyles: StickerStyle[] = [
  { id: "gold-serif", label: "Clássica dourada", font: (px) => `italic 700 ${px}px Georgia, 'Times New Roman', serif`, fill: GOLD, accent: GOLD_SOFT },
  { id: "bold-sans", label: "Forte moderna", font: (px) => `800 ${px}px 'Arial Black', Arial, sans-serif`, fill: TEXT, accent: GOLD },
  { id: "elegant", label: "Elegante fina", font: (px) => `300 ${px}px 'Helvetica Neue', Arial, sans-serif`, fill: TEXT, accent: GOLD },
  { id: "script", label: "Manuscrita", font: (px) => `400 ${px}px 'Brush Script MT', 'Segoe Script', cursive`, fill: GOLD_SOFT, accent: GOLD },
  { id: "mono", label: "Máquina de escrever", font: (px) => `700 ${px}px 'Courier New', monospace`, fill: TEXT, accent: GOLD },
  { id: "outline", label: "Contorno dourado", font: (px) => `800 ${px}px 'Arial Black', Arial, sans-serif`, fill: GOLD, accent: GOLD_SOFT, outline: true },
  { id: "neon", label: "Neon dourado", font: (px) => `700 ${px}px 'Helvetica Neue', Arial, sans-serif`, fill: TEXT, accent: GOLD, neon: true },
  { id: "impact", label: "Impacto", font: (px) => `900 ${px}px 'Arial Black', Arial, sans-serif`, fill: GOLD, accent: TEXT, uppercase: true },
  { id: "serif-clean", label: "Serifada limpa", font: (px) => `700 ${px}px Georgia, 'Times New Roman', serif`, fill: TEXT, accent: GOLD },
  { id: "condensed", label: "Condensada", font: (px) => `700 ${px}px 'Arial Narrow', Arial, sans-serif`, fill: GOLD_SOFT, accent: GOLD, uppercase: true },
  { id: "script-white", label: "Manuscrita branca", font: (px) => `400 ${px}px 'Brush Script MT', 'Segoe Script', cursive`, fill: TEXT, accent: GOLD },
  { id: "mono-gold", label: "Máquina dourada", font: (px) => `700 ${px}px 'Courier New', monospace`, fill: GOLD, accent: GOLD_SOFT },
];

export const stickerPhrases: string[] = [
  "Foco no trabalho",
  "Quem planta, colhe",
  "Trabalho duro vence",
  "Crescimento diário",
  "Disciplina é liberdade",
  "Feito é melhor que perfeito",
  "Um dia de cada vez",
  "Constância vence talento",
  "Sonho grande, pé no chão",
  "A pressa é inimiga do lucro",
  "Trabalhe em silêncio",
  "O sucesso é construído",
  "Gratidão pelo processo",
  "Hoje melhor que ontem",
  "Foco, força e fé",
  "Nada vem sem esforço",
  "Resultado ama rotina",
  "Pequenos passos, grandes voos",
  "Disciplina paga as contas",
  "O impossível é questão de treino",
  "Sucesso é hábito diário",
  "Quem não desiste, chega",
  "Planta hoje, colhe amanhã",
  "Trabalho dignifica",
  "A meta é o caminho",
  "Persistência é o segredo",
  "Cada dia uma conquista",
  "Esforço silencioso, resultado barulhento",
  "Faça acontecer",
  "O futuro é de quem trabalha",
  "Sem atalhos, só trabalho",
  "Evolução constante",
  "Mente forte, negócio forte",
  "O cliente volta pelo capricho",
  "Qualidade é o melhor marketing",
  "Respeito constrói impérios",
  "Honestidade rende juros",
  "Sonhar é o primeiro passo",
  "Ação transforma sonho em meta",
  "Não pare quando cansar, pare quando terminar",
  "O melhor investimento é você",
  "Aprender todo dia",
  "Sorte é preparo com oportunidade",
  "Quem serve bem, vende sempre",
  "Detalhes fazem a diferença",
  "Comece de onde está",
  "Use o que tem, faça o que pode",
  "A disciplina pesa gramas, o arrependimento pesa toneladas",
  "Seja dono da sua história",
  "Trabalho em equipe multiplica",
  "Crescer é sair da zona de conforto",
  "Hustle todos os dias",
  "Meta batida, meta dobrada",
  "O lucro mora na constância",
  "Feito com amor, vendido com orgulho",
  "A loja cresce com cada cliente feliz",
  "Hoje é dia de vencer",
  "Nada substitui o trabalho",
  "Construa o seu legado",
  "Progresso, não perfeição",
  "Acredite e execute",
];

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(ctx: CanvasRenderingContext2D, style: StickerStyle, lines: string[], px: number, centerY: number) {
  const lineHeight = px * 1.18;
  let y = centerY - (lines.length * lineHeight) / 2 + lineHeight / 2;
  for (const line of lines) {
    if (style.outline) {
      ctx.lineWidth = Math.max(3, px / 22);
      ctx.strokeStyle = style.fill;
      ctx.strokeText(line, SIZE / 2, y);
    } else {
      ctx.fillText(line, SIZE / 2, y);
    }
    y += lineHeight;
  }
}

// Renders one transparent sticker; the canvas is cropped to the text bounds.
export async function generateSticker(phrase: string, style: StickerStyle, framed = false): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu montar a figurinha.");

  const text = style.uppercase ? phrase.toUpperCase() : phrase;
  const inner = framed ? 320 : 220;

  // Find a font size where the phrase fits in up to 3 lines.
  let px = 150;
  let lines: string[] = [];
  for (; px >= 44; px -= 6) {
    ctx.font = style.font(px);
    lines = wrapLines(ctx, text, SIZE - inner);
    if (lines.length <= 3) break;
  }
  ctx.font = style.font(px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lineHeight = px * 1.18;
  const blockH = lines.length * lineHeight;
  const centerY = SIZE / 2;

  // Soft glow behind the text (stronger for neon).
  ctx.save();
  ctx.shadowColor = style.neon ? "rgba(212, 175, 55, 0.95)" : "rgba(212, 175, 55, 0.55)";
  ctx.shadowBlur = style.neon ? 70 : 42;
  ctx.fillStyle = style.fill;
  drawText(ctx, style, lines, px, centerY);
  ctx.restore();
  ctx.fillStyle = style.fill;
  drawText(ctx, style, lines, px, centerY);

  // Gold underline accent.
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const lineW = Math.min(widest * 0.6, SIZE - inner - 100);
  const lineY = centerY + blockH / 2 + 34;
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(SIZE / 2 - lineW / 2, lineY);
  ctx.lineTo(SIZE / 2 + lineW / 2, lineY);
  ctx.stroke();
  // Small diamond at each end of the underline.
  ctx.fillStyle = style.accent;
  for (const x of [SIZE / 2 - lineW / 2 - 26, SIZE / 2 + lineW / 2 + 26]) {
    ctx.save();
    ctx.translate(x, lineY);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-9, -9, 18, 18);
    ctx.restore();
  }

  // Optional rounded gold frame around the whole sticker.
  if (framed) {
    const m = 70;
    const r = 60;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(m, m, SIZE - m * 2, SIZE - m * 2, r);
    ctx.stroke();
    ctx.strokeStyle = GOLD_SOFT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(m + 18, m + 18, SIZE - (m + 18) * 2, SIZE - (m + 18) * 2, r - 12);
    ctx.stroke();
  }

  // Crop to content so the sticker hugs the text.
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  let minX = SIZE, minY = SIZE, maxX = 0, maxY = 0;
  for (let yy = 0; yy < SIZE; yy++) {
    for (let xx = 0; xx < SIZE; xx++) {
      if ((data[(yy * SIZE + xx) * 4 + 3] ?? 0) > 8) {
        if (xx < minX) minX = xx;
        if (xx > maxX) maxX = xx;
        if (yy < minY) minY = yy;
        if (yy > maxY) maxY = yy;
      }
    }
  }
  const pad = 60;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(SIZE - 1, maxX + pad);
  maxY = Math.min(SIZE - 1, maxY + pad);

  const out = document.createElement("canvas");
  out.width = maxX - minX + 1;
  out.height = maxY - minY + 1;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Seu navegador não conseguiu montar a figurinha.");
  octx.drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);

  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a figurinha.");
  return blob;
}

export function stickerFileName(phrase: string, styleId: string, framed = false): string {
  const slug = phrase.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `figurinha-${styleId}${framed ? "-moldura" : ""}-${slug}.png`;
}

export const stickerComboCount = stickerPhrases.length * stickerStyles.length * 2;
