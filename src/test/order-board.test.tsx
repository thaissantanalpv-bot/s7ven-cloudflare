import { fireEvent, render, screen, waitFor, within, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/lib/orders";
const mocks = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn(), track: vi.fn(), cancel: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/components/push-notifications", () => ({ PushQuickButton: () => null }));
vi.mock("@/components/store-pause-button", () => ({ StorePauseButton: () => null, StorePauseSwitch: () => null }));
vi.mock("@/lib/orders.functions", () => ({
  listOrders: mocks.list,
  updateOrderStatus: mocks.update,
  updateOrderTracking: mocks.track,
  updateOrderCourier: vi.fn(async () => ({ saved: true })),
  cancelOrder: mocks.cancel,
}));
import { OrderBoard } from "@/components/orders/order-board";
import { NewOrderAlarm } from "@/components/orders/new-order-alarm";
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
  mocks.cancel.mockReset().mockImplementation(async ({ data }) => {
    row = { ...row, status: "cancelled", cancellation_reason: data.reason, cancelled_at: new Date().toISOString(), stock_restored_at: new Date().toISOString() };
    return { cancelled: true, alreadyCancelled: false, stockNotes: [] };
  });
});
afterEach(cleanup);
const mount = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <NewOrderAlarm />
      <OrderBoard />
    </QueryClientProvider>,
  );
describe("Kanban order management", () => {
  it("opens the matching WhatsApp message only after the new stage is saved", async () => {
    const replace = vi.fn(), close = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null, location: { replace }, close } as unknown as Window);
    let finish: (() => void) | undefined;
    mocks.update.mockImplementationOnce(() => new Promise(resolve => { finish = () => { row.status = "ready"; resolve({ saved: true }); }; }));
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Aceitar e avisar pedido 42 no WhatsApp" }));
    expect(replace).not.toHaveBeenCalled();
    finish?.();
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(decodeURIComponent(replace.mock.calls[0]?.[0])).toContain("seu pedido está pronto");
    expect(row.status).toBe("ready");
    open.mockRestore();
  });
  it("never opens a stage message if the status write fails", async () => {
    const replace = vi.fn(), close = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null, location: { replace }, close } as unknown as Window);
    mocks.update.mockRejectedValueOnce(new Error("Falha ao salvar"));
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Aceitar e avisar pedido 42 no WhatsApp" }));
    await screen.findByRole("alert");
    expect(replace).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(row.status).toBe("received");
    open.mockRestore();
  });
  it("requires a reason, persists cancellation and prevents a second action or reactivation", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar pedido" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Motivo do cancelamento"), { target: { value: "Cliente desistiu" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
    await waitFor(() => expect(row.status).toBe("cancelled"));
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expect(mocks.cancel).toHaveBeenCalledWith({ data: { id: row.id, reason: "Cliente desistiu", expectedUpdatedAt: row.updated_at } });
    await waitFor(() => expect(screen.queryByLabelText("Etapa do pedido")).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Cancelar pedido" })).not.toBeInTheDocument();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("opens a printable receipt and saves only local printer settings", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Configurar impressora" }));
    fireEvent.change(screen.getByLabelText("Nome da impressora (identificação)"), { target: { value: "Balcão" } });
    fireEvent.change(screen.getByLabelText("Largura da bobina"), { target: { value: "58" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar preferências" }));
    expect(localStorage.getItem("s7ven-order-printer")).toBe('{"name":"Balcão","paper":"58"}');
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
    fireEvent.click(await screen.findByRole("button", { name: "Imprimir pedido 42" }));
    const receipt = await screen.findByTitle("Via impressa do pedido");
    expect(receipt.getAttribute("srcdoc")).toContain(row.address);
    expect(receipt.getAttribute("srcdoc")).toContain("Sabor: Melancia");
    expect(receipt.getAttribute("srcdoc")).toContain("max-width: 50mm");
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

  it("archives delivered orders from previous days showing only today delivered orders", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oldDelivered: Order = {
      ...row,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      number: 99,
      customer_name: "Cliente Antigo",
      status: "delivered",
      created_at: yesterday,
      updated_at: yesterday,
    };
    mocks.list.mockImplementation(async () => [row, oldDelivered]);
    mount();
    await screen.findByText("Cliente teste");
    expect(screen.queryByText("Cliente Antigo")).not.toBeInTheDocument();
  });
  it("moves through every stage and builds matching customer updates", async () => {
    mount();
    await screen.findByText("Cliente teste");
    const replace = vi.fn(), close = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({ opener: null, location: { replace }, close } as unknown as Window);
    fireEvent.click(screen.getByRole("button", { name: "Aceitar pedido" }));
    await waitFor(() => expect(row.status).toBe("ready"));
    fireEvent.click(await screen.findByRole("button", { name: "Chamar entregador para o pedido 42" }));
    await waitFor(() => expect(row.status).toBe("out_for_delivery"));
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(decodeURIComponent(replace.mock.calls[0]?.[0])).toContain("Entrega · pedido #42");
    fireEvent.click(await screen.findByRole("button", { name: "Concluir entrega do pedido 42" }));
    await waitFor(() => expect(row.status).toBe("delivered"));
    expect(screen.getByText("Pedido entregue")).toBeInTheDocument();
    expect(mocks.update).toHaveBeenCalledTimes(3);
    open.mockRestore();
  });
  it("shows details with flavors and lets admin change stage", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
    expect(await screen.findByText("Sabor: Melancia")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Etapa do pedido"), { target: { value: "ready" } });
    await waitFor(() => expect(row.status).toBe("ready"));
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Avisar cliente no WhatsApp" }).getAttribute("href"),
      ).toContain("pronto"),
    );
  });
  it("shows a recoverable failure without silently moving a card", async () => {
    mocks.update.mockRejectedValueOnce(new Error("Falha ao salvar"));
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Aceitar pedido" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Falha ao salvar");
    expect(row.status).toBe("received");
  });
  it("filters by customer and shows empty state", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.change(screen.getByLabelText("Buscar pedido"), { target: { value: "inexistente" } });
    expect(screen.queryByText("Cliente teste")).not.toBeInTheDocument();
    expect(screen.getByText(/Nenhum pedido novo/)).toBeInTheDocument();
  });
  it("turns sound on automatically and keeps alerting until the order is accepted", async () => {
    const play = vi.fn(() => Promise.resolve());
    const pause = vi.fn();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
    mount();
    await screen.findByText("Cliente teste");
    // Som já vem ativo: o desbloqueio do navegador acontece no toque,
    // e o alerta contínuo começa com o pedido "received" já na tela.
    await screen.findByRole("button", { name: "Desativar alerta sonoro" });
    await waitFor(() => expect(play).toHaveBeenCalled());
    const pausesBeforeAccept = pause.mock.calls.length;
    // Ao aceitar o pedido (sai de "received"), o alerta contínuo para
    mocks.list.mockImplementation(async () => [{ ...row, status: "ready" }]);
    fireEvent.click(screen.getByRole("button", { name: "Atualizar pedidos" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Chamar entregador para o pedido 42" })).toBeInTheDocument());
    await waitFor(() => expect(pause.mock.calls.length).toBeGreaterThan(pausesBeforeAccept));
    vi.restoreAllMocks();
  });
});

  it("saves the courier tracking link on delivery orders only", async () => {
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
    const notify = await screen.findByRole("link", { name: /Avisar cliente no WhatsApp/ });
    expect(decodeURIComponent(notify.getAttribute("href") ?? "")).toContain("https://entrega.app/r/abc123");
  });

  it("hides the tracking field for pickup orders", async () => {
    row.fulfillment = "pickup";
    mount();
    await screen.findByText("Cliente teste");
    fireEvent.click(screen.getByRole("button", { name: "Detalhes do pedido 42" }));
    await screen.findAllByText(/Retirada na loja/);
    expect(screen.queryByLabelText("Link de rastreio do pedido 42")).toBeNull();
  });
