import { describe, it, expect } from "vitest";
import { cancelOrderSchema, workflowStatusSchema, statusSchema, isActiveOrder, recordedSalesTotal } from "@/lib/orders";

describe("cancellation rules", () => {
  const request = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", expectedUpdatedAt: "2026-10-16T22:28:00Z", reason: "Cliente desistiu" };
  it("requires a registered nonblank reason", () => {
    for (const reason of ["", "   ", "x".repeat(301)]) expect(cancelOrderSchema.safeParse({ ...request, reason }).success).toBe(false);
    expect(cancelOrderSchema.parse({ ...request, reason: " Cliente desistiu " }).reason).toBe("Cliente desistiu");
  });
  it("treats cancellation as terminal, not an ordinary stage write", () => {
    expect(statusSchema.parse("cancelled")).toBe("cancelled");
    expect(workflowStatusSchema.safeParse("cancelled").success).toBe(false);
    expect(isActiveOrder("cancelled")).toBe(false);
    expect(isActiveOrder("received")).toBe(true);
  });
  it("retains original order values but excludes cancelled amounts from sales", () => {
    expect(recordedSalesTotal([{ status: "cancelled", total: 49 }, { status: "delivered", total: 20 }, { status: "received", total: 30 }])).toBe(50);
  });
});