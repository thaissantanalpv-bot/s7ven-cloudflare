/** Unsharp mask on raw RGBA pixels: original + amount × (original − blurred), skipping alpha. */
export function unsharp(orig: Uint8ClampedArray, blurred: Uint8ClampedArray, amount = 0.8, threshold = 3): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(orig.length));
  for (let i = 0; i < orig.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const diff = orig[i + c]! - blurred[i + c]!;
      out[i + c] = Math.abs(diff) < threshold ? orig[i + c]! : orig[i + c]! + amount * diff;
    }
    out[i + 3] = orig[i + 3]!;
  }
  return out;
}

/** Sharpen a photo in the browser (no AI, no cost). Keeps framing and colors; returns a PNG/WebP blob. */
export async function sharpenPhoto(url: string, maxSide = 1800): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não foi possível baixar a foto.");
  const bitmap = await createImageBitmap(await res.blob());
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
  const make = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d", { willReadFrequently: true })!] as const; };
  const [base, bctx] = make();
  bctx.imageSmoothingQuality = "high";
  bctx.drawImage(bitmap, 0, 0, w, h);
  const [blur, blurCtx] = make();
  blurCtx.filter = `blur(${Math.max(1, Math.round(Math.max(w, h) / 900))}px)`;
  blurCtx.drawImage(base, 0, 0);
  const orig = bctx.getImageData(0, 0, w, h);
  const sharp = unsharp(orig.data, blurCtx.getImageData(0, 0, w, h).data);
  bctx.putImageData(new ImageData(sharp, w, h), 0, 0);
  const blob = await new Promise<Blob | null>(r => base.toBlob(r, "image/webp", 0.92));
  if (blob && blob.type === "image/webp") return blob;
  const jpg = await new Promise<Blob | null>(r => base.toBlob(r, "image/jpeg", 0.92));
  if (!jpg) throw new Error("Não foi possível gerar a foto.");
  return jpg;
}
