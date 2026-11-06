const W = 1080;
const H = 1920;
const BG = "#ffffff";
const GOLD = "#d4af37";
const INK = "#171717";

// Fit text by measured width, including names with unusually long words.
function nameLines(ctx: CanvasRenderingContext2D, name: string, width: number): { lines: string[]; size: number } {
  const words = name.trim().split(/\s+/);
  for (let size = 64; size >= 16; size -= 2) {
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
  if (document.fonts) await document.fonts.load("600 64px 'Space Grotesk'");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (!photoUrl) throw new Error("Este produto está sem foto. Adicione uma foto antes de gerar a imagem.");
  const logo = await loadImage("/logo-s7ven.png", false);
  const logoScale = Math.min(540 / logo.naturalWidth, 180 / logo.naturalHeight);
  const lw = logo.naturalWidth * logoScale;
  const lh = logo.naturalHeight * logoScale;
  ctx.drawImage(logo, (W - lw) / 2, 140 + (180 - lh) / 2, lw, lh);

  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 365);
  ctx.lineTo(990, 365);
  ctx.stroke();

  const img = await loadImage(photoUrl);
  const px = 90, py = 415, pw = 900, ph = 1000;
  const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const title = nameLines(ctx, name, 900);
  ctx.font = `600 ${title.size}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = INK;
  const lineHeight = title.size * 1.2;
  title.lines.forEach((line, index) => ctx.fillText(line, W / 2, 1550 + (index - (title.lines.length - 1) / 2) * lineHeight, 900));
  ctx.font = "700 112px 'Space Grotesk', sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText(price, W / 2, 1735, 900);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}
