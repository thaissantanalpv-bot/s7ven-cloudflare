const PREFIX = 's7ven-public-offline-v1:';
const PHOTO_CACHE = 's7ven-public-photos-v1';
export function savePublicSnapshot<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PREFIX + key, JSON.stringify({ data, savedAt: Date.now() })); } catch {}
}
export function readPublicSnapshot<T>(key: string): T | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return JSON.parse(localStorage.getItem(PREFIX + key) ?? 'null')?.data; } catch { return undefined; }
}
export async function publicOfflineRead<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined' && navigator.onLine === false) {
    const saved = readPublicSnapshot<T>(key);
    if (saved !== undefined) return saved;
    throw new Error('Conecte-se à internet para abrir o catálogo pela primeira vez.');
  }
  try { const fresh = await fetcher(); savePublicSnapshot(key, fresh); return fresh; }
  catch (error) { const saved = readPublicSnapshot<T>(key); if (saved !== undefined) return saved; throw error; }
}
function photoKey(url: string) { const parsed = new URL(url, window.location.origin); return parsed.origin + parsed.pathname; }
export function cacheViewedCatalogPhotos(urls: string[]) {
  if (!('caches' in window)) return () => {};
  const allowed = new Set(urls.map(url => new URL(url, window.location.origin).href));
  const pending = new Set<string>();
  const save = async (image: HTMLImageElement) => {
    const url = image.currentSrc || image.src;
    if (!navigator.onLine || !allowed.has(url) || pending.has(url) || !image.naturalWidth) return;
    pending.add(url);
    try {
      const cache = await caches.open(PHOTO_CACHE);
      const response = await fetch(url, { credentials: 'omit' });
      if (response.ok && response.type !== 'opaque') {
        await cache.put(photoKey(url), response);
        const keys = await cache.keys();
        await Promise.all(keys.slice(0, Math.max(0, keys.length - 400)).map(key => cache.delete(key)));
      }
    } catch {}
  };
  const listener = (event: Event) => { if (event.target instanceof HTMLImageElement) void save(event.target); };
  document.addEventListener('load', listener, true);
  document.querySelectorAll('img').forEach(image => { if (image.complete) void save(image); });
  return () => document.removeEventListener('load', listener, true);
}
export async function offlinePhotoUrls(urls: string[]) {
  const replacements = new Map<string, string>();
  if (!('caches' in window)) return replacements;
  const cache = await caches.open(PHOTO_CACHE);
  await Promise.all(urls.map(async url => { const response = await cache.match(photoKey(url)); if (response) replacements.set(url, URL.createObjectURL(await response.blob())); }));
  return replacements;
}
