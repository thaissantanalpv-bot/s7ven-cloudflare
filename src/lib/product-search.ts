/** Accent/case-insensitive, word-by-word product search over name, description, category and flavors. */
export const normalizeSearch = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

type Searchable = { name: string; description?: string; category: string; options?: string[]; variations?: { name: string }[] };

export function matchesSearch(p: Searchable, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = normalizeSearch([p.name, p.description ?? "", p.category, ...(p.options ?? []), ...(p.variations ?? []).map(v => v.name)].join(" "));
  return words.every(w => text.includes(w));
}
