// Resize any browser-decodable image (incl. HEIC on supporting devices) to a compact WebP/JPEG under the upload limit.
export async function shrinkImage(file: File, maxSide = 1600, maxBytes = 4.5 * 1024 * 1024): Promise<File> {
  if (file.size <= maxBytes && ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size < 1.5 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Não foi possível ler esta foto. Tente outra imagem."); });
  let side = maxSide;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp") blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.85));
    if (blob && blob.size <= maxBytes) {
      const webp = blob.type === "image/webp";
      return new File([blob], `foto.${webp ? "webp" : "jpg"}`, { type: webp ? "image/webp" : "image/jpeg" });
    }
    side = Math.round(side * 0.75);
  }
  throw new Error("Não foi possível reduzir esta foto.");
}
