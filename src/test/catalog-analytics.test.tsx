import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trackingSchema, readAnalyticsIdentity } from "@/lib/catalog-analytics";
import { CatalogAnalytics } from "@/components/catalog-analytics";
import { AbandonedCartNotice } from "@/components/abandoned-cart-notice";
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/catalog-analytics.functions", () => ({ getCatalogFunnel: mocks.get }));
describe("Catalog analytics", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); mocks.get.mockReset(); });
  it("validates identities and cart flags without accepting arbitrary text", () => {
    expect(trackingSchema.safeParse({ sessionId: "bad", visitorId: "bad", hasCart: true }).success).toBe(false);
    expect(trackingSchema.safeParse({ sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", visitorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", hasCart: true }).success).toBe(true);
  });
  it("keeps the visitor across sessions and rotates inactive sessions", () => {
    const first = readAnalyticsIdentity();
    expect(first).toBeDefined();
    expect(readAnalyticsIdentity()).toEqual(first);
    sessionStorage.setItem("s7ven-session-seen", String(Date.now() - 31 * 60 * 1000));
    const next = readAnalyticsIdentity();
    expect(next?.visitorId).toBe(first?.visitorId);
    expect(next?.sessionId).not.toBe(first?.sessionId);
  });
  it("shows live counts, estimated abandonment and conversion", async () => {
    mocks.get.mockResolvedValue({ visitors: 20, carts: 10, completed: 4, abandoned: 3, online: 2, pending: 3, updatedAt: "2026-10-11T07:00:00Z", trackingSince: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CatalogAnalytics /></QueryClientProvider>);
    expect(await screen.findByText("2 online agora")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("Desistências estimadas")).toBeInTheDocument();
    expect(screen.getByLabelText("Aviso de carrinhos abandonados")).toHaveTextContent("3 carrinhos sem pedido enviado");
    expect(screen.getAllByText(/30 minutos/).length).toBeGreaterThan(0);
    client.clear();
  });
  it("does not show an abandonment notice for zero carts", () => {
    const { container } = render(<AbandonedCartNotice count={0} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("retains an in-memory identity when browser storage is blocked", () => {
    const blocked = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked storage"); });
    try {
      const identity = readAnalyticsIdentity();
      expect(trackingSchema.safeParse({ ...identity, hasCart: true }).success).toBe(true);
      expect(readAnalyticsIdentity()).toEqual(identity);
    } finally { blocked.mockRestore(); }
  });
});