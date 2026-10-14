import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { mergeCatalog } from "@/lib/catalog";
import { ProductCardPhotos } from "@/components/products/product-card-photos";

describe("Storefront photos", () => {
  it("shows uncropped photos and navigates without opening a dialog", () => {
    const product = mergeCatalog([])[0];
    if (!product) throw new Error("Missing fixture");
    const enlarge = vi.fn();
    render(<ProductCardPhotos product={{ ...product, images: ["/produtos/p2.jpg"] }} onEnlarge={enlarge} />);
    expect(screen.getByAltText(`${product.name} — foto 1`)).toHaveClass("object-contain");
    fireEvent.click(screen.getByRole("button", { name: `Próxima foto de ${product.name}` }));
    expect(screen.getByAltText(`${product.name} — foto 2`)).toHaveAttribute("src", "/produtos/p2.jpg");
    expect(enlarge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: `Ver foto 1 de ${product.name}` }));
    expect(screen.getByAltText(`${product.name} — foto 1`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: `Ver fotos de ${product.name}` }));
    expect(enlarge).toHaveBeenCalledOnce();
  });
});