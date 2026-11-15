import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { savePushSubscription } from "@/lib/push.functions";

describe("push owner boundary", () => {
  it("uses the verified owner's RLS client and rejects an endpoint ownership conflict", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { code: "42501" } });
    const from = vi.fn().mockReturnValue({ upsert });
    const context = { userId: "verified-admin", supabase: { rpc: vi.fn().mockResolvedValue({ data: true, error: null }), from } };
    const handler = savePushSubscription as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>;
    await expect(handler({ context, data: { endpoint: "https://fcm.googleapis.com/fcm/send/owned-by-other", keys: { p256dh: "key", auth: "auth" }, userId: "other-admin", deviceLabel: "teste" } })).rejects.toThrow("Não foi possível ativar");
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "verified-admin" }), { onConflict: "endpoint" });
    expect(from).toHaveBeenCalledTimes(1);
  });
});