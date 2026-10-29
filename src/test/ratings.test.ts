import { describe, expect, it } from "vitest";
import { orderWhatsApp } from "@/lib/orders";
import { ratingSummary, submitRatingSchema } from "@/lib/ratings";

const id = "11111111-1111-4111-8111-111111111111";
const token = "22222222-2222-4222-8222-222222222222";
const base = { id, rating_token: token, number: 5, customer_name: "Cliente", customer_phone: "18999999999", tracking_url: null };

describe("order ratings", () => {
  it("sends the rating link only in the delivered WhatsApp message", () => {
    const delivered = new URL(orderWhatsApp({ ...base, status: "delivered" })).searchParams.get("text") ?? "";
    expect(delivered).toContain(`https://s7venlounge.shop/avaliar?pedido=${id}&k=${token}`);
    for (const status of ["received", "preparing", "out_for_delivery", "cancelled"] as const) {
      expect(new URL(orderWhatsApp({ ...base, status })).searchParams.get("text")).not.toContain("/avaliar");
    }
  });
  it("accepts 1 to 5 stars and comments up to 300 characters", () => {
    expect(submitRatingSchema.safeParse({ id, token, rating: 1 }).success).toBe(true);
    expect(submitRatingSchema.safeParse({ id, token, rating: 5 }).success).toBe(true);
    expect(submitRatingSchema.safeParse({ id, token, rating: 0 }).success).toBe(false);
    expect(submitRatingSchema.safeParse({ id, token, rating: 6 }).success).toBe(false);
    expect(submitRatingSchema.safeParse({ id, token, rating: 4, comment: "a".repeat(301) }).success).toBe(false);
  });
  it("averages ratings with one decimal", () => {
    expect(ratingSummary([{ rating: 5 }, { rating: 4 }, { rating: 4 }]).average).toBe(4.3);
    expect(ratingSummary([]).count).toBe(0);
  });
});
