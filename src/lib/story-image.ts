const W = 1080;
const H = 1920;
const BG = "#f8f7f3";
const GOLD = "#d4af37";
const INK = "#171717";
const LOGO_GOLD = "#a47b28";

// Photo panel: as large as the photograph allows, never cropped.
const PHOTO_MAX_W = 984;
const PHOTO_MAX_H = 1140;
const RADIUS = 44;
const PRICE_SIZE = 118;
const PHOTO_GAP = 76;
const PRICE_GAP = 54;
const HEADER_BOTTOM = 352;
const CONTENT_BOTTOM = 1888;

// Fit text by measured width, including names with unusually long words.
function nameLines(ctx: CanvasRenderingContext2D, name: string, width: number): { lines: string[]; size: number } {
  const words = name.trim().split(/\s+/);
  for (let size = 66; size >= 16; size -= 2) {
    ctx.font = `600 ${size}px 'Space Grotesk', sans-serif`;
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    if (lines.length <= 3 && lines.every((text) => ctx.measureText(text).width <= width)) return { lines, size };
  }
  return { lines: [name.trim()], size: 16 };
}

function loadImage(src: string, cors = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar uma imagem."));
    img.src = src;
  });
}

// Rounded panel, with a manual path for browsers without ctx.roundRect.
function panelPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") { ctx.roundRect(x, y, w, h, radius); return; }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export type StoryImageInput = {
  name: string;
  price: string;
  photoUrl?: string | undefined;
};

// Vertical image shared by Instagram and WhatsApp; contain-fit preserves the complete photograph.
export async function generateStoryImage({ name, price, photoUrl }: StoryImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu montar a imagem.");
  if (document.fonts) await document.fonts.load("600 66px 'Space Grotesk'");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (!photoUrl) throw new Error("Este produto está sem foto. Adicione uma foto antes de gerar a imagem.");

  const logo = await loadImage("/logo-s7ven.png", false);
  const logoScale = Math.min(520 / logo.naturalWidth, 170 / logo.naturalHeight);
  const lw = logo.naturalWidth * logoScale;
  const lh = logo.naturalHeight * logoScale;
  // Strengthen only the logo's transparent silhouette, preserving the original artwork.
  const logoCanvas = document.createElement("canvas");
  logoCanvas.width = Math.ceil(lw) + 8;
  logoCanvas.height = Math.ceil(lh) + 8;
  const logoCtx = logoCanvas.getContext("2d");
  if (!logoCtx) throw new Error("Seu navegador não conseguiu montar a logo.");
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      if (x * x + y * y <= 4) logoCtx.drawImage(logo, 4 + x, 4 + y, lw, lh);
    }
  }
  logoCtx.globalCompositeOperation = "source-in";
  logoCtx.fillStyle = LOGO_GOLD;
  logoCtx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
  ctx.drawImage(logoCanvas, (W - lw) / 2 - 4, 92 + (170 - lh) / 2 - 4);

  // Gold hairline with a centred diamond: separates the brand from the product.
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(320, 306);
  ctx.lineTo(508, 306);
  ctx.moveTo(572, 306);
  ctx.lineTo(760, 306);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.save();
  ctx.translate(W / 2, 306);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  const img = await loadImage(photoUrl);
  const scale = Math.min(PHOTO_MAX_W / img.naturalWidth, PHOTO_MAX_H / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;

  const title = nameLines(ctx, name, 900);
  const lineHeight = title.size * 1.2;
  const nameHeight = title.lines.length * lineHeight;
  const contentHeight = dh + PHOTO_GAP + nameHeight + PRICE_GAP + PRICE_SIZE;
  const cardY = Math.max(HEADER_BOTTOM, HEADER_BOTTOM + (CONTENT_BOTTOM - HEADER_BOTTOM - contentHeight) / 2);
  const cardX = (W - dw) / 2;

  // Warm halo behind the panel so the photo lifts off the off-white background.
  const glow = ctx.createRadialGradient(W / 2, cardY + dh / 2, Math.min(dw, dh) * 0.1, W / 2, cardY + dh / 2, Math.max(dw, dh) * 0.9);
  glow.addColorStop(0, "rgba(212,175,55,0.18)");
  glow.addColorStop(1, "rgba(212,175,55,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = "rgba(23,23,23,0.24)";
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 22;
  ctx.fillStyle = "#ffffff";
  panelPath(ctx, cardX, cardY, dw, dh, RADIUS);
  ctx.fill();
  ctx.restore();

  ctx.save();
  panelPath(ctx, cardX, cardY, dw, dh, RADIUS);
  ctx.clip();
  ctx.drawImage(img, cardX, cardY, dw, dh);
  ctx.restore();
  ctx.strokeStyle = "rgba(164,123,40,0.55)";
  ctx.lineWidth = 2;
  panelPath(ctx, cardX, cardY, dw, dh, RADIUS);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nameTop = cardY + dh + PHOTO_GAP;
  const nameCenter = nameTop + nameHeight / 2;
  ctx.font = `600 ${title.size}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = INK;
  title.lines.forEach((line, index) => ctx.fillText(line, W / 2, nameCenter + (index - (title.lines.length - 1) / 2) * lineHeight, 900));

  ctx.font = `700 ${PRICE_SIZE}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(price, W / 2, nameTop + nameHeight + PRICE_GAP + PRICE_SIZE / 2, 900);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}
