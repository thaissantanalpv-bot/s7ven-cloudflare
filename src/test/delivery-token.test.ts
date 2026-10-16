import { describe, it, expect, beforeAll } from "vitest";
import { createDeliveryToken, verifyDeliveryToken } from "@/lib/delivery.server";

describe("delivery token", () => {
  beforeAll(() => { process.env.DELIVERY_SESSION_SECRET = "test-secret-1234567890"; });
  it("verifies authentic tokens and rejects tampered or expired ones", async () => {
    const token = await createDeliveryToken(1_000_000);
    const id = await verifyDeliveryToken(token, 1_000_001);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const [i, exp, sig] = token.split(".");
    expect(await verifyDeliveryToken(`${i}.${Number(exp) + 1}.${sig}`, 1_000_001)).toBeNull();
    expect(await verifyDeliveryToken(`${crypto.randomUUID()}.${exp}.${sig}`, 1_000_001)).toBeNull();
    expect(await verifyDeliveryToken(token, Number(exp) + 1)).toBeNull();
    expect(await verifyDeliveryToken(undefined)).toBeNull();
  });
});
