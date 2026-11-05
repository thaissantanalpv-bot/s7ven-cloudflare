export function categoryLink(origin: string, category: string) {
  const url = new URL("/", origin);
  url.searchParams.set("aba", "categorias");
  url.searchParams.set("categoria", category.replace("Narguiles > ", ""));
  return url.href;
}

export function productLink(origin: string, id: string) {
  const url = new URL("/", origin);
  url.searchParams.set("produto", id);
  return url.href;
}
