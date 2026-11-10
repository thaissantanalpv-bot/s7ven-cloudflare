const W = 1080;
const H = 1920;
const GOLD = "#d4af37";
const WHITE = "#ffffff";
const LOGO_BLACK = "#000000";
const MARGIN = 72;

// Bottom scrim: keeps the product visible while making the text readable.
const SCRIM_TOP = 0.52; // gradient starts at 52% of the height
const PRICE_SIZE = 96;

// Fit text by measured width, including names with unusually long words.
function nameLines(ctx: CanvasRenderingContext2D, name: string, width: number): { lines: string[]; size: number } {
  const words = name.trim().split(/\s+/);
  for (let size = 72; size >= 16; size -= 2) {
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

// Full-screen vertical image shared by Instagram and WhatsApp: the photo covers the
// whole canvas and the name/price sit over a soft dark gradient in the lower corner.
export async function generateStoryImage({ name, price, photoUrl }: StoryImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu montar a imagem.");
  if (document.fonts) await document.fonts.load("600 72px 'Space Grotesk'");

  if (!photoUrl) throw new Error("Este produto está sem foto. Adicione uma foto antes de gerar a imagem.");

  // Instagram compresses everything, so the product photo is never magnified more than
  // needed: a blurred copy fills the screen and the sharp photo sits at full width on top.
  const img = await loadImage(photoUrl);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const cover = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  ctx.filter = "blur(40px) brightness(0.7)";
  ctx.drawImage(img, (W - img.naturalWidth * cover) / 2 - 60, (H - img.naturalHeight * cover) / 2 - 60, img.naturalWidth * cover + 120, img.naturalHeight * cover + 120);
  ctx.filter = "none";
  const fit = Math.min(W / img.naturalWidth, (H * 0.72) / img.naturalHeight);
  const dw = img.naturalWidth * fit;
  const dh = img.naturalHeight * fit;
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.drawImage(img, (W - dw) / 2, Math.max(150, H * 0.44 - dh / 2), dw, dh);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  // Dark gradient at the bottom so the text reads well without hiding the product.
  const scrim = ctx.createLinearGradient(0, H * SCRIM_TOP, 0, H);
  scrim.addColorStop(0, "rgba(10,10,10,0)");
  scrim.addColorStop(0.55, "rgba(10,10,10,0.55)");
  scrim.addColorStop(1, "rgba(10,10,10,0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * SCRIM_TOP, W, H * (1 - SCRIM_TOP));

  // Small black logo in the top-left corner, with a soft white halo so it stays
  // readable over any photo.
  const logo = await loadImage("/logo-s7ven.png", false);
  const logoScale = Math.min(280 / logo.naturalWidth, 120 / logo.naturalHeight);
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
  logoCtx.fillStyle = LOGO_BLACK;
  logoCtx.fillRect(0, 0, logoCanvas.width, logoCanvas.height);

  // White glow drawn under the black logo: keeps it visible over dark photos.
  const halo = 26;
  const haloCanvas = document.createElement("canvas");
  haloCanvas.width = logoCanvas.width + halo * 2;
  haloCanvas.height = logoCanvas.height + halo * 2;
  const haloCtx = haloCanvas.getContext("2d");
  if (!haloCtx) throw new Error("Seu navegador não conseguiu montar a logo.");
  haloCtx.drawImage(logoCanvas, halo, halo);
  haloCtx.globalCompositeOperation = "source-in";
  haloCtx.fillStyle = WHITE;
  haloCtx.fillRect(0, 0, haloCanvas.width, haloCanvas.height);
  ctx.filter = "blur(14px)";
  ctx.globalAlpha = 0.8;
  ctx.drawImage(haloCanvas, MARGIN - 4 - halo, 64 - 4 - halo);
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.drawImage(logoCanvas, MARGIN - 4, 64 - 4);

  // Name and price in the lower-left corner, over the gradient.
  const textWidth = W - MARGIN * 2;
  const title = nameLines(ctx, name, textWidth);
  const lineHeight = title.size * 1.18;
  const nameHeight = title.lines.length * lineHeight;
  const priceTop = H - MARGIN - PRICE_SIZE;
  const nameTop = priceTop - 40 - nameHeight;

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Small gold dash above the name, as a brand accent.
  ctx.fillStyle = GOLD;
  ctx.fillRect(MARGIN, nameTop - 34, 96, 6);

  ctx.font = `600 ${title.size}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = WHITE;
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 3;
  title.lines.forEach((line, index) => ctx.fillText(line, MARGIN, nameTop + index * lineHeight, textWidth));

  ctx.font = `700 ${PRICE_SIZE}px 'Space Grotesk', sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(price, MARGIN, priceTop, textWidth);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.97));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}
