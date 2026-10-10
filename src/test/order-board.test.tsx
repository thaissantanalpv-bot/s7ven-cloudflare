import { fireEvent, render, screen, waitFor, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/orders";
const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/orders.functions", () => ({
  listOrders: mocks.list,
  updateOrderStatus: mocks.update,
}));
import { OrderBoard } from "@/components/orders/order-board";
let row: Order;
beforeEach(() => {
  row = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    number: 42,
    customer_name: "Cliente teste",
    customer_phone: "5518999999999",
    address: "Rua de teste, 123",
    payment: "Pix",
    change_for: "",
    notes: "",
    items: [
      {
        productId: "p4",
        name: "Gin Invictus",
        option: "Melancia",
        optionLabel: "Sabor",
        qty: 1,
        price: 20.9,
      },
    ],
    subtotal: 20.9,
    delivery_fee: 0,
    total: 20.9,
    delivery_zone: "",
    delivery_confirmed: false,
    status: "received",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mocks.list.mockReset().mockImplementation(async () => [{ ...row }]);
  mocks.update.mockReset().mockImplementation(async ({ data }) => {
    row.status = data.status;
    return { saved: true };
  });
});
afterEach(cleanup);
const mount = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <OrderBoard />
    </QueryClientProvider>,
  );
describe("Kanban order management", () => {
  it("moves through every stage and builds matching customer updates", async () => {
    mount();
    await screen.findByText("Cliente teste");
    for (const [label, next] of [
      ["Recebido", "Em preparo"],
      ["Em preparo", "Saiu para entrega"],
      ["Saiu para entrega", "Entregue"],
    ] as const) {
      const column = screen.getByRole("region", { name: label });
      expect(within(column).getByText("Cliente teste")).toBeInTheDocument();
      fireEvent.click(within(column).getByRole("button", { name: next }));
      await waitFor(() => expect(row.status).not.toBe(label));
      await waitFor(() =>
        expect(
          within(screen.getByRole("region", { name: next })).getByText("Cliente teste"),
        ).toBeInTheDocument(),
      );
    }
    expect(mocks.update).toHaveBeenCalledTimes(3);
  });
  it("shows details with flavors and lets admin change stage", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes" }));
    expect(await screen.findByText("Sabor: Melancia")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Etapa do pedido"), { target: { value: "preparing" } });
    await waitFor(() => expect(row.status).toBe("preparing"));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Avisar cliente no WhatsApp" }).getAttribute("href"),
      ).toContain("preparo"),
    );
  });
  it("shows a recoverable failure without silently moving a card", async () => {
    mocks.update.mockRejectedValueOnce(new Error("Falha ao salvar"));
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Em preparo" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao salvar");
    expect(row.status).toBe("received");
  });
  it("filters by customer and shows empty state", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.change(screen.getByLabelText("Buscar pedido"), { target: { value: "inexistente" } });
    expect(screen.queryByText("Cliente teste")).not.toBeInTheDocument();
    expect(screen.getAllByText("Nenhum pedido")).toHaveLength(4);
  });
});
