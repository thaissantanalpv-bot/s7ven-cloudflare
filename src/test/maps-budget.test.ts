import { afterEach, describe, expect, it, vi } from "vitest";
import { claimMapsBudget } from "@/lib/delivery.server";

afterEach(() => vi.unstubAllEnvs());
describe("existing Maps budget", () => {
  it("claims the shared 200 store / 20 network allowance without storing the IP", async () => {
    vi.stubEnv("DELIVERY_SESSION_SECRET", "test-only-secret");
    const rpc = vi.fn().mockResolvedValue({ data: "ok", error: null });
    await claimMapsBudget({ rpc }, "192.0.2.5");
    expect(rpc).toHaveBeenCalledWith("claim_delivery_quote_attempt", {
      _client_hash: expect.stringMatching(/^[a-f0-9]{64}$/), _global_limit: 200, _client_limit: 20,
    });
  });
  it.each([{ data: "global", error: null }, { data: "client", error: null }, { data: null, error: new Error("offline") }])("blocks paid work when a claim fails", async result => {
    vi.stubEnv("DELIVERY_SESSION_SECRET", "test-only-secret");
    const paidCall = vi.fn();
    await expect((async () => {
      await claimMapsBudget({ rpc: vi.fn().mockResolvedValue(result) }, "192.0.2.5");
      paidCall();
    })()).rejects.toThrow("Muitas buscas");
    expect(paidCall).not.toHaveBeenCalled();
  });
});