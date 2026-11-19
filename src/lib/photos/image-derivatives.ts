export const CATALOG_IMAGE_WIDTHS = {
  thumb: 128,
  card: 512,
  gallery: 1600,
} as const;

export type CatalogImageKind = keyof typeof CATALOG_IMAGE_WIDTHS;
export type CatalogImageVariants = Record<CatalogImageKind, string>;

export type PreparedCatalogImage = {
  originalPath: string;
  variants: CatalogImageVariants;
  uploads: { path: string; blob: Blob; contentType: string }[];
  source: { width: number; height: number; bytes: number };
};

const ACCEPTED_TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function canvasBlob(canvas: HTMLCanvasElement, type: "image/webp" | "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function renderVariant(
  bitmap: ImageBitmap,
  width: number,
  quality: number,
): Promise<{ blob: Blob; extension: "webp" | "jpg" }> {
  const scale = Math.min(1, width / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar esta foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = await canvasBlob(canvas, "image/webp", quality);
  if (webp?.type === "image/webp") return { blob: webp, extension: "webp" };
  const jpeg = await canvasBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("Não foi possível converter esta foto.");
  return { blob: jpeg, extension: "jpg" };
}

/**
 * Prepares immutable catalog media without uploading it.
 *
 * The original remains available for rollback. Derivative names are deterministic
 * for one upload id, which also makes retries safe when storage uses `upsert: false`.
 * A small WebP source is reused instead of being recompressed unnecessarily.
 */
export async function prepareCatalogImage(
  file: File,
  id: string = crypto.randomUUID(),
): Promise<PreparedCatalogImage> {
  const sourceExtension = ACCEPTED_TYPES[file.type];
  if (!sourceExtension) throw new Error("Use uma foto JPG, PNG ou WebP.");
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Identificador de imagem inválido.");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Não foi possível ler esta foto. Tente outra imagem.");
  });
  const originalPath = `uploads/${safeId}_original.${sourceExtension}`;
  const uploads = new Map<string, { path: string; blob: Blob; contentType: string }>();
  uploads.set(originalPath, { path: originalPath, blob: file, contentType: file.type });
  const variants = {} as CatalogImageVariants;
  try {
    for (const [kind, width] of Object.entries(CATALOG_IMAGE_WIDTHS) as [
      CatalogImageKind,
      number,
    ][]) {
      if (file.type === "image/webp" && Math.max(bitmap.width, bitmap.height) <= width) {
        variants[kind] = originalPath;
        continue;
      }
      const quality = kind === "thumb" ? 0.8 : kind === "card" ? 0.84 : 0.88;
      const rendered = await renderVariant(bitmap, width, quality);
      const path = `uploads/${safeId}_${width}.${rendered.extension}`;
      variants[kind] = path;
      uploads.set(path, {
        path,
        blob: rendered.blob,
        contentType:
          rendered.blob.type || (rendered.extension === "webp" ? "image/webp" : "image/jpeg"),
      });
    }
  } finally {
    bitmap.close?.();
  }
  return {
    originalPath,
    variants,
    uploads: [...uploads.values()],
    source: { width: bitmap.width, height: bitmap.height, bytes: file.size },
  };
}
