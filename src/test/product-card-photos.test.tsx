import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { mergeCatalog } from "@/lib/catalog";
import { ProductCardPhotos } from "@/components/products/product-card-photos";

describe("Storefront photos", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "Image",
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        decoding = "";
        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows uncropped photos and navigates without opening a dialog", async () => {
    const product = mergeCatalog([])[0];
    if (!product) throw new Error("Missing fixture");
    const enlarge = vi.fn();
    render(
      <ProductCardPhotos
        product={{ ...product, images: ["/produtos/p2.jpg"] }}
        onEnlarge={enlarge}
      />,
    );
    expect(screen.getByAltText(`${product.name} — foto 1`)).toHaveClass("object-contain");
    fireEvent.click(screen.getByRole("button", { name: `Próxima foto de ${product.name}` }));
    await waitFor(() =>
      expect(screen.getByAltText(`${product.name} — foto 2`)).toHaveAttribute(
        "src",
        "/produtos/p2.jpg",
      ),
    );
    expect(enlarge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Ver foto 1 de ${product.name}` }));
    await waitFor(() =>
      expect(screen.getByAltText(`${product.name} — foto 1`)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: `Ver fotos de ${product.name}` }));
    expect(enlarge).toHaveBeenCalledOnce();
  });
});
