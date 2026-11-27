export function visibleCatalogInterval(
  milliseconds: number,
  visibility = typeof document === "undefined" ? "visible" : document.visibilityState,
) {
  return visibility === "visible" ? milliseconds : false;
}
