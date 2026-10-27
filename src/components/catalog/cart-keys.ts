/** Saved carts use `productId::option` keys; keep the format stable for compatibility. */
export const SEP = "::";
export const OTHER = "__outro__";
export const keyOf = (id: string, opt?: string) => (opt ? `${id}${SEP}${opt}` : id);
export type Cart = Record<string, number>;
