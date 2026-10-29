import { z } from "zod";

export const RATING_BASE_URL = "https://s7venlounge.shop";

export const ratingLookupSchema = z.object({ id: z.string().uuid(), token: z.string().uuid() });
export const submitRatingSchema = ratingLookupSchema.extend({
  rating: z.number().int().min(1, "Escolha de 1 a 5 estrelas").max(5, "Escolha de 1 a 5 estrelas"),
  comment: z.string().trim().max(300, "Use até 300 caracteres").default(""),
});

export function ratingLink(order: { id: string; rating_token: string }, origin = RATING_BASE_URL) {
  const url = new URL("/avaliar", origin);
  url.searchParams.set("pedido", order.id);
  url.searchParams.set("k", order.rating_token);
  return url.toString();
}

export function ratingSummary(rows: { rating: number }[]) {
  const count = rows.length;
  const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: rows.filter((r) => r.rating === stars).length }));
  return { count, average, distribution };
}
