import QRCode from "qrcode";

const W = 1080;
const H = 1920;
const BG = "#0c0a09";
const GOLD = "#d4af37";
const TEXT = "#fafaf9";
const MUTED = "#a8a29e";

function loadImage(src: string, cors = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar uma imagem."));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (words.length && lines.length === maxLines) {
    const used = lines.join(" ").split(/\s+/).length;
    const last = lines[maxLines - 1] ?? "";
    if (used < words.length) lines[maxLines - 1] = last.replace(/\s?\S*$/, "") + "…";
  }
  return lines;
}

export type StoryImageInput = {
  name: string;
  price: string;
  compareAt?: string | null;
  photoUrl?: string;
  link: string;
  site: string;
};

// Vertical 1080x1920 story card: logo, product photo, name, price and a QR code with the buy link.
export async function generateStoryImage({ name, price, compareAt, photoUrl, link, site }: StoryImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu montar a imagem.");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, -100, 0, W / 2, -100, 1000);
  glow.addColorStop(0, "rgba(212, 175, 55, 0.22)");
  glow.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  try {
    const logo = await loadImage("/logo-s7ven.png", false);
    const lh = 200;
    const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
    ctx.drawImage(logo, (W - lw) / 2, 60, lw, lh);
  } catch { /* segue sem logo */ }

  let photoBottom = 300;
  if (photoUrl) {
    try {
      const img = await loadImage(photoUrl);
      const px = 90, py = 310, pw = W - 180, ph = 820;
      ctx.save();
      roundRect(ctx, px, py, pw, ph, 48);
      ctx.clip();
      ctx.fillStyle = "#1c1917";
      ctx.fillRect(px, py, pw, ph);
      const scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
      ctx.restore();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.5)";
      ctx.lineWidth = 3;
      roundRect(ctx, px, py, pw, ph, 48);
      ctx.stroke();
      photoBottom = py + ph;
    } catch { /* segue sem foto */ }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = TEXT;
  ctx.font = "600 62px 'Space Grotesk', sans-serif";
  const nameLines = wrapLines(ctx, name, W - 160, 2);
  let y = photoBottom + 130;
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, y);
    y += 76;
  }

  y += 30;
  if (compareAt) {
    ctx.font = "500 44px 'Space Grotesk', sans-serif";
    ctx.fillStyle = MUTED;
    const w = ctx.measureText(compareAt).width;
    ctx.fillText(compareAt, W / 2, y);
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - w / 2, y - 14);
    ctx.lineTo(W / 2 + w / 2, y - 14);
    ctx.stroke();
    y += 90;
  }
  ctx.font = "800 110px 'Space Grotesk', sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText(price, W / 2, y + 40);

  const qrData = await QRCode.toDataURL(link, { width: 340, margin: 1, color: { dark: "#0c0a09", light: "#ffffff" } });
  const qr = await loadImage(qrData, false);
  const cardW = 640, cardH = 560, cardX = (W - cardW) / 2, cardY = H - cardH - 90;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cardX, cardY, cardW, cardH, 40);
  ctx.fill();
  ctx.drawImage(qr, cardX + (cardW - 300) / 2, cardY + 36, 300, 300);
  ctx.fillStyle = BG;
  ctx.font = "700 44px 'Space Grotesk', sans-serif";
  ctx.fillText("Peça pelo catálogo", W / 2, cardY + 400);
  ctx.font = "500 40px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "#57534e";
  ctx.fillText(site.replace(/^https?:\/\//, ""), W / 2, cardY + 462);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}
