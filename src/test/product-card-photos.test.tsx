import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { galleryThumbnailUrl, mergeCatalog } from "@/lib/catalog";
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

  it("renders numbered navigation for signed originals without preloading another photo", () => {
    const product = mergeCatalog([])[0];
    if (!product) throw new Error("Missing fixture");
    const prefix = "https://storage.example/storage/v1/object/sign/product-photos/uploads/";
    const cover = `${prefix}cover.jpg?token=fixture`;
    const second = `${prefix}second.jpg?token=fixture`;
    const thumb = `${prefix}second_128.webp?token=fixture`;
    render(
      <ProductCardPhotos
        product={{ ...product, image: cover, images: [second] }}
        onEnlarge={vi.fn()}
      />,
    );
    expect(screen.getByAltText(`${product.name} — foto 1`)).toHaveAttribute("src", cover);
    expect(screen.getByRole("button", { name: `Ver foto 2 de ${product.name}` })).toHaveTextContent(
      "2",
    );
    expect(document.querySelectorAll("img")).toHaveLength(1);
    expect(galleryThumbnailUrl(thumb, second)).toBe(thumb);
  });

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
