import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mergeCatalog } from "@/lib/catalog";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.save }));
vi.mock("@/lib/pos.functions", () => ({ submitCounterSale: vi.fn() }));
vi.mock("@/lib/catalog.query", () => ({ adminCatalogQuery: { queryKey: ["admin-catalog-products"], queryFn: async () => [], staleTime: Infinity }, useCatalogUpdates: vi.fn() }));
import { PointOfSale } from "@/components/pos/point-of-sale";
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["admin-catalog-products"], mergeCatalog([]));
  client.invalidateQueries = vi.fn().mockResolvedValue(undefined);
  render(<QueryClientProvider client={client}><PointOfSale /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Selecionar Combo Gin Viagem" }));
}
describe("Point of sale", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ number: 5, total: 45, cash_received: 100, cash_change: 55 }); });
  it("requires sufficient cash and payment confirmation, then shows receipt", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Valor recebido (R$)"), { target: { value: "10" } });
    expect(screen.getByRole("button", { name: "Concluir venda" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Valor recebido (R$)"), { target: { value: "100" } });
    expect(screen.getByRole("button", { name: "Concluir venda" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Dinheiro recebido" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    await waitFor(() => expect(screen.getByText("Venda #5 concluída")).toBeInTheDocument());
    expect(mocks.save.mock.calls[0]?.[0].data).toMatchObject({ payment: "Dinheiro", cashReceived: 100, items: [{ productId: "p1", qty: 1, expectedPrice: 45 }] });
  });
  it("requires physical Pix confirmation and does not submit a cash amount", async () => {
    setup(); fireEvent.click(screen.getByRole("button", { name: "Pix físico" }));
    expect(screen.queryByLabelText("Valor recebido (R$)")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pix recebido e conferido" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0]?.[0].data).toMatchObject({ payment: "Pix físico", cashReceived: null });
  });
  it("keeps sale and idempotency key on a retry", async () => {
    mocks.save.mockRejectedValueOnce(new Error("Tente novamente")); setup();
    fireEvent.change(screen.getByLabelText("Valor recebido (R$)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Dinheiro recebido" }));
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Tente novamente"));
    const requestId = mocks.save.mock.calls[0]?.[0].data.requestId;
    fireEvent.click(screen.getByRole("button", { name: "Concluir venda" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save.mock.calls[1]?.[0].data.requestId).toBe(requestId);
  });
});