import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const { from, select, maybeSingle } = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), maybeSingle: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
import { submitOrder } from "@/lib/orders.functions";

describe("public checkout privacy", () => {
  it("an idempotent checkout returns no purchase history, even for a known phone", async () => {
    const query = { select, eq: vi.fn().mockReturnThis(), maybeSingle };
    from.mockReturnValue(query);
    select.mockReturnValue(query);
    maybeSingle.mockResolvedValue({ data: { id: "order", number: 100, customer_phone: "5518999999999", customer_name: "Teste", scheduled_for: null }, error: null });
    const handler = submitOrder as unknown as (args: { data: unknown }) => Promise<{ purchase: unknown }>;
    const result = await handler({ data: { requestId: "key", customer: { name: "Teste", phone: "5518999999999" } } });
    expect(result.purchase).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith("id,number,customer_phone,customer_name,created_at,scheduled_for");
  });
});