import { fireEvent, render, screen, waitFor, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/orders";
const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), track: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/orders.functions", () => ({
  listOrders: mocks.list,
  updateOrderStatus: mocks.update,
  updateOrderTracking: mocks.track,
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
    fulfillment: "delivery",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  mocks.list.mockReset().mockImplementation(async () => [{ ...row }]);
  mocks.update.mockReset().mockImplementation(async ({ data }) => {
    row.status = data.status;
    return { saved: true };
  });
  mocks.track.mockReset().mockImplementation(async ({ data }) => {
    row.tracking_url = data.trackingUrl || null;
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
  it("opens a printable receipt and saves only local printer settings", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Configurar impressora" }));
    fireEvent.change(screen.getByLabelText("Nome da impressora (identificação)"), { target: { value: "Balcão" } });
    fireEvent.change(screen.getByLabelText("Largura da bobina"), { target: { value: "58" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(localStorage.getItem("s7ven-order-printer")).toBe('{"name":"Balcão","paper":"58"}');
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Imprimir pedido 42" }));
    const receipt = await screen.findByTitle("Via impressa do pedido");
    expect(receipt.getAttribute("srcdoc")).toContain(row.address);
    expect(receipt.getAttribute("srcdoc")).toContain("Sabor: Melancia");
    expect(receipt.getAttribute("srcdoc")).toContain("54mm");
    expect(mocks.update).not.toHaveBeenCalled();
    localStorage.removeItem("s7ven-order-printer");
  });
  it("excludes counter sales from delivery columns and new order alerts", async () => {
    mount();
    await screen.findByText("Cliente teste");
    mocks.list.mockImplementation(async () => [row, { ...row, id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", number: 44, source: "counter", customer_name: "Cliente balcão" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar pedidos" }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Cliente balcão")).not.toBeInTheDocument();
    expect(screen.queryByText("1 novo pedido recebido")).not.toBeInTheDocument();
  });
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
  it("alerts and plays sound only for new orders after activation", async () => {
    const start = vi.fn();
    class TestAudio {
      state = "running";
      currentTime = 0;
      destination = {};
      resume = async () => {};
      close = async () => {};
      createOscillator = () => ({ connect: vi.fn(), frequency: { value: 0 }, start, stop: vi.fn() });
      createGain = () => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
    }
    vi.stubGlobal("AudioContext", TestAudio);
    mount();
    await screen.findByText("Cliente teste");
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ativar som" }));
    await screen.findByRole("button", { name: "Som ativo" });
    expect(start).toHaveBeenCalledTimes(3);
    mocks.list.mockImplementation(async () => [row, { ...row, id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", number: 43 }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar pedidos" }));
    await screen.findByText("1 novo pedido recebido");
    expect(start).toHaveBeenCalledTimes(6);
    vi.unstubAllGlobals();
  });
});

  it("saves the courier tracking link on delivery orders only", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes" }));
    const input = await screen.findByLabelText("Link de rastreio do pedido 42");
    fireEvent.change(input, { target: { value: "https://entrega.app/r/abc123" } });
    fireEvent.blur(input);
    await waitFor(() => expect(mocks.track).toHaveBeenCalledWith({ data: { id: row.id, trackingUrl: "https://entrega.app/r/abc123" } }));
  });

  it("includes the tracking link in the out-for-delivery WhatsApp message", async () => {
    row.status = "out_for_delivery";
    row.tracking_url = "https://entrega.app/r/abc123";
    mount();
    await screen.findByText("Cliente teste");
    const notify = screen.getByRole("link", { name: /Avisar cliente do pedido 42/ });
    expect(decodeURIComponent(notify.getAttribute("href") ?? "")).toContain("https://entrega.app/r/abc123");
  });

  it("hides the tracking field for pickup orders", async () => {
    row.fulfillment = "pickup";
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes" }));
    await screen.findAllByText(/Retirada na loja/);
    expect(screen.queryByLabelText("Link de rastreio do pedido 42")).toBeNull();
  });
