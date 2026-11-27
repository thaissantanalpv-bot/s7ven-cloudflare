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

const PIPELINE_VERSION = "v1";

/** Stable per source file, so retries and a future backfill address the same immutable objects. */
export async function catalogImageId(file: File): Promise<string> {
  const bytes = new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error("Não foi possível ler esta foto."));
      reader.readAsArrayBuffer(file);
    }),
  );
  const type = new TextEncoder().encode(`${PIPELINE_VERSION}:${file.type}:`);
  const input = new Uint8Array(type.length + bytes.length);
  input.set(type);
  input.set(bytes, type.length);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", input));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${PIPELINE_VERSION}-${hash.slice(0, 32)}`;
}

const ORIGINAL_PATH = /^(uploads\/[a-zA-Z0-9_-]+)_original_(webp|jpg)\.(jpg|png|webp)$/;

/** Derivatives are used only for uploads that completed the whole pipeline. */
export function catalogDerivativePaths(path: string): CatalogImageVariants | null {
  const match = path.match(ORIGINAL_PATH);
  if (!match?.[1] || !match[2]) return null;
  return {
    thumb: `${match[1]}_128.${match[2]}`,
    card: `${match[1]}_512.${match[2]}`,
    gallery: `${match[1]}_1600.${match[2]}`,
  };
}

/** Only objects in the content-addressed upload namespace can authorize public siblings. */
export function publicCatalogDerivativePaths(path: string): CatalogImageVariants | null {
  return /^uploads\/v1-[a-f0-9]{32}_original_/.test(path) ? catalogDerivativePaths(path) : null;
}

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
 * for one upload id, so an authorized backfill can verify each expected object.
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
  const prepared: {
    kind: CatalogImageKind;
    width: number;
    rendered?: { blob: Blob; extension: "webp" | "jpg" };
  }[] = [];
  try {
    for (const [kind, width] of Object.entries(CATALOG_IMAGE_WIDTHS) as [
      CatalogImageKind,
      number,
    ][]) {
      if (file.type === "image/webp" && Math.max(bitmap.width, bitmap.height) <= width) {
        prepared.push({ kind, width });
        continue;
      }
      const quality = kind === "thumb" ? 0.8 : kind === "card" ? 0.84 : 0.88;
      const rendered = await renderVariant(bitmap, width, quality);
      prepared.push({ kind, width, rendered });
    }
  } finally {
    bitmap.close?.();
  }
  const derivativeExtension = prepared.find((item) => item.rendered)?.rendered?.extension ?? "webp";
  if (prepared.some((item) => item.rendered && item.rendered.extension !== derivativeExtension)) {
    throw new Error("O navegador alternou o formato durante a conversão.");
  }
  const originalPath = `uploads/${safeId}_original_${derivativeExtension}.${sourceExtension}`;
  const uploads = new Map<string, { path: string; blob: Blob; contentType: string }>();
  uploads.set(originalPath, { path: originalPath, blob: file, contentType: file.type });
  const variants = {} as CatalogImageVariants;
  for (const item of prepared) {
    const extension = item.rendered?.extension ?? derivativeExtension;
    const path = `uploads/${safeId}_${item.width}.${extension}`;
    variants[item.kind] = path;
    uploads.set(path, {
      path,
      // A small WebP is already optimal; copy its bytes to the deterministic
      // derivative name instead of decoding and recompressing it.
      blob: item.rendered?.blob ?? file,
      contentType: item.rendered?.blob.type || (extension === "webp" ? "image/webp" : "image/jpeg"),
    });
  }
  return {
    originalPath,
    variants,
    uploads: [...uploads.values()],
    source: { width: bitmap.width, height: bitmap.height, bytes: file.size },
  };
}
