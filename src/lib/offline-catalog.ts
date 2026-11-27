const PREFIX = 's7ven-public-offline-v1:';
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
