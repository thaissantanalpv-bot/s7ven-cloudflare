import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { mergeCatalog } from "@/lib/catalog";
import { ProductGallery } from "@/components/products/product-gallery";
describe("Product gallery", () => {
  it("enlarges photos and supports arrows, thumbnails and keyboard", () => {
    const p = mergeCatalog([])[0];
    if (!p) throw new Error("Missing fixture");
    render(<ProductGallery product={{ ...p, images: ["/produtos/p2.jpg"] }} open onOpenChange={vi.fn()} />);
    expect(screen.getByAltText(`${p.name} — foto 1`)).toHaveAttribute("src", p.image);
    fireEvent.click(screen.getByRole("button", { name: "Próxima foto" }));
    expect(screen.getByAltText(`${p.name} — foto 2`)).toHaveAttribute("src", "/produtos/p2.jpg");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByAltText(`${p.name} — foto 1`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver foto 2" }));
    expect(screen.getByRole("button", { name: "Ver foto 2" })).toHaveAttribute("aria-pressed", "true");
  });
});