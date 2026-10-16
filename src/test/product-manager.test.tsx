import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mergeCatalog } from "@/lib/catalog";

const mocks = vi.hoisted(() => ({ save: vi.fn(), remove: vi.fn(), upload: vi.fn(), signed: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: { __kind?: string }) => fn.__kind === "remove" ? mocks.remove : mocks.save }));
vi.mock("@/lib/catalog.functions", () => ({ saveCatalogProduct: { __kind: "save" }, deleteCatalogProduct: { __kind: "remove" } }));
vi.mock("@/lib/catalog.query", () => ({ adminCatalogQuery: { queryKey: ["admin-catalog-products"], queryFn: async () => [], staleTime: Infinity }, useCatalogUpdates: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, createSignedUrl: mocks.signed }) } } }));
vi.mock("@/components/ui/switch", () => ({ Switch: ({ checked, onCheckedChange, ...props }: { checked: boolean; onCheckedChange: (value: boolean) => void; "aria-label": string }) => <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} {...props} /> }));
import { ProductManager } from "@/components/products/product-manager";

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["admin-catalog-products"], mergeCatalog([]));
  client.invalidateQueries = vi.fn().mockResolvedValue(undefined);
  render(<QueryClientProvider client={client}><ProductManager /></QueryClientProvider>);
}
describe("Product manager", () => {
  it("uploads multiple photos, changes cover and removes a photo", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar Combo Gin Viagem" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Enviar foto do produto"), { target: { files: [new File(["1"], "one.jpg", { type: "image/jpeg" }), new File(["2"], "two.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(within(dialog).getAllByRole("button", { name: "Usar capa" })).toHaveLength(2));
    const coverButton = within(dialog).getAllByRole("button", { name: "Usar capa" })[0];
    if (!coverButton) throw new Error("Missing cover button");
    fireEvent.click(coverButton);
    fireEvent.click(within(dialog).getByRole("button", { name: "Remover foto 3" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    const draft = mocks.save.mock.calls[0]?.[0].data.product;
    expect(draft.image).toMatch(/^uploads\//);
    expect(draft.images).toEqual(["/produtos/p1.jpg"]);
  });
  beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); vi.clearAllMocks(); mocks.save.mockResolvedValue({}); mocks.upload.mockResolvedValue({ error: null }); mocks.signed.mockResolvedValue({ data: { signedUrl: "https://example.test/photo.jpg" }, error: null }); });
  it("edits prices and variation stock while preserving the product ID", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar Gin Invictus" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Preço (R$)"), { target: { value: "21.90" } });
    fireEvent.click(within(dialog).getByRole("switch", { name: "Controlar estoque da variação 1" }));
    fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Estoque da variação 1" }), { target: { value: "5" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0]?.[0].data.product).toMatchObject({ id: "p4", price: 21.9, allowOther: false });
    expect(mocks.save.mock.calls[0]?.[0].data.product.variations[0]).toMatchObject({ stock: 5 });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("creates products with uploaded photos and pauses existing products", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Novo produto" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Nome", { exact: true }), { target: { value: "Produto teste" } });
    fireEvent.change(within(dialog).getByLabelText("Categoria", { exact: true }), { target: { value: "Bebidas" } });
    fireEvent.change(within(dialog).getByLabelText("Enviar foto do produto"), { target: { files: [new File(["foto"], "foto.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Salvar produto" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalled());
    expect(mocks.save.mock.calls[0]?.[0].data.product.image).toMatch(/^uploads\/.+\.jpg$/);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Pausar Combo Gin Viagem" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(2));
    expect(mocks.save.mock.calls[1]?.[0].data.product).toMatchObject({ id: "p1", active: false });
  });
  it("keeps failed edits open with an actionable error", async () => {
    mocks.save.mockRejectedValue(new Error("O produto mudou. Atualize a lista."));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Editar Combo Gin Viagem" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("O produto mudou"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});