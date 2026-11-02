import { describe, expect, it } from "vitest";
import { showCancelledOnBoard } from "@/lib/orders";

const base = { created_at: "2026-11-02T13:00:00Z", updated_at: "2026-11-02T14:00:00Z" };
// 12:45 in São Paulo on Nov 2
const now = new Date("2026-11-02T15:45:00Z");

describe("cancelled orders on the board", () => {
  it("shows an order cancelled today that was not cleared", () => {
    expect(showCancelledOnBoard({ ...base, status: "cancelled", cancelled_at: "2026-11-02T14:00:00Z" }, now, null)).toBe(true);
  });

  it("hides an order cancelled on a previous Brasília day", () => {
    // 23:30 Nov 1 in São Paulo
    expect(showCancelledOnBoard({ ...base, status: "cancelled", cancelled_at: "2026-11-02T02:30:00Z" }, now, null)).toBe(false);
  });

  it("hides cancelled orders cleared after their cancellation, keeps later ones", () => {
    const cleared = new Date("2026-11-02T15:00:00Z").getTime();
    expect(showCancelledOnBoard({ ...base, status: "cancelled", cancelled_at: "2026-11-02T14:00:00Z" }, now, cleared)).toBe(false);
    expect(showCancelledOnBoard({ ...base, status: "cancelled", cancelled_at: "2026-11-02T15:30:00Z" }, now, cleared)).toBe(true);
  });

  it("never hides orders that are not cancelled", () => {
    expect(showCancelledOnBoard({ ...base, status: "received", cancelled_at: null }, now, Date.now())).toBe(true);
  });
});
