import type { CatalogProduct } from "./catalog";

// A server refresh may issue a new signed URL for the very same private object.
// Reusing the previous, still-valid URL avoids redownloading unchanged photos.
const SAFETY_WINDOW_MS = 20 * 60 * 1000;

function tokenExpiresAfter(url: string, minimumExpiry: number): boolean {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (!token || !parsed.pathname.includes("/storage/v1/object/sign/")) return false;
    const payload = token.split(".")[1];
    if (!payload) return false;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: unknown };
    return typeof decoded.exp === "number" && decoded.exp * 1000 > minimumExpiry;
  } catch {
    return false;
  }
}

function reuseUrl(previous: string | undefined, incoming: string | undefined, now: number): string | undefined {
  if (!previous || !incoming) return incoming;
  try {
    const oldLink = new URL(previous);
    const newLink = new URL(incoming);
    if (oldLink.origin !== newLink.origin || oldLink.pathname !== newLink.pathname) return incoming;
    return tokenExpiresAfter(previous, now + SAFETY_WINDOW_MS) ? previous : incoming;
  } catch {
    return incoming;
  }
}

/** Keep unexpired URLs only when the underlying catalog media path is unchanged. */
export function retainCatalogPhotoUrls(previous: CatalogProduct[] | undefined, incoming: CatalogProduct[], now = Date.now()): CatalogProduct[] {
  if (!previous?.length) return incoming;
  const oldById = new Map(previous.map(product => [product.id, product]));
  return incoming.map(product => {
    const old = oldById.get(product.id);
    if (!old) return product;
    const result: CatalogProduct = { ...product };
    if (product.imagePath && product.imagePath === old.imagePath) {
      result.image = reuseUrl(old.image, product.image, now) ?? product.image;
    }
    if (product.images?.length && product.imagePaths?.length && old.imagePaths?.length) {
      const oldByPath = new Map(old.imagePaths.map((path, index) => [path, old.images?.[index]]));
      result.images = product.images.map((url, index) =>
        reuseUrl(oldByPath.get(product.imagePaths?.[index] ?? ""), url, now) ?? url
      );
    }
    if (product.variationPhotos && product.variationPhotoPaths && old.variationPhotos && old.variationPhotoPaths) {
      const oldByPath = new Map(Object.entries(old.variationPhotoPaths).map(([name, path]) => [path, old.variationPhotos?.[name]]));
      result.variationPhotos = Object.fromEntries(Object.entries(product.variationPhotos).map(([name, url]) => [
        name, reuseUrl(oldByPath.get(product.variationPhotoPaths?.[name] ?? ""), url, now) ?? url,
      ]));
    }
    if (product.videoPath && product.videoPath === old.videoPath) {
      result.video = reuseUrl(old.video, product.video, now) ?? product.video;
    }
    return result;
  });
}
