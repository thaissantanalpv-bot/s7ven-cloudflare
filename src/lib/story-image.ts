const W = 1080;
const H = 1920;
const BG = "#0c0a09";
const GOLD = "#d4af37";

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
  price: string;
  photoUrl?: string | undefined;
};

// Vertical image shared by Instagram and WhatsApp; contain-fit preserves the complete photograph.
export async function generateStoryImage({ price, photoUrl }: StoryImageInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu montar a imagem.");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (!photoUrl) throw new Error("Este produto está sem foto. Adicione uma foto antes de gerar a imagem.");
  const logo = await loadImage("/logo-s7ven.png", false);
  const logoScale = Math.min(720 / logo.naturalWidth, 220 / logo.naturalHeight);
  const lw = logo.naturalWidth * logoScale;
  const lh = logo.naturalHeight * logoScale;
  ctx.drawImage(logo, (W - lw) / 2, 70 + (220 - lh) / 2, lw, lh);

  const img = await loadImage(photoUrl);
  const px = 90, py = 350, pw = 900, ph = 1200;
  const scale = Math.min(pw / img.naturalWidth, ph / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);

  ctx.textAlign = "center";
  ctx.font = "800 110px 'Space Grotesk', sans-serif";
  ctx.fillStyle = GOLD;
  ctx.fillText(price, W / 2, 1740, 900);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Não foi possível gerar a imagem.");
  return blob;
}
