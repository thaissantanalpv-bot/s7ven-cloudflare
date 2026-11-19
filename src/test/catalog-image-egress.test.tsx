import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StableCatalogImage } from "@/components/catalog/stable-catalog-image";
import { productPhotosFor, variationPhoto, type CatalogProduct } from "@/lib/catalog";
import { visibleCatalogInterval } from "@/lib/page-visibility";

const product = {
  image: "signed-original",
  images: [],
  imagePath: "uploads/item_original_webp.jpg",
  imagePaths: [],
  photoVariants: {
    "uploads/item_original_webp.jpg": {
      thumb: "signed-128",
      card: "signed-512",
      gallery: "signed-1600",
    },
  },
  variationPhotos: { Uva: "signed-variation-original" },
  variationPhotoPaths: { Uva: "uploads/uva_original_webp.png" },
} as unknown as CatalogProduct;

describe("catalog image egress controls", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects only the size required by each display context", () => {
    expect(productPhotosFor(product, "thumb")).toEqual(["signed-128"]);
    expect(productPhotosFor(product, "card")).toEqual(["signed-512"]);
    expect(productPhotosFor(product, "gallery")).toEqual(["signed-1600"]);
    expect(variationPhoto(product, "Uva", "card")).toBe("signed-variation-original");
  });

  it("keeps legacy originals as a safe fallback", () => {
    const { photoVariants: _variants, ...legacy } = product;
    expect(productPhotosFor(legacy, "card")).toEqual(["signed-original"]);
  });

  it("pauses safety polling while the tab is hidden", () => {
    expect(visibleCatalogInterval(60_000, "visible")).toBe(60_000);
    expect(visibleCatalogInterval(60_000, "hidden")).toBe(false);
  });

  it("keeps the old bitmap until one newly requested image has loaded", () => {
    const loaders: Array<{
      src: string;
      onload: (() => void) | null;
      onerror: (() => void) | null;
      decoding: string;
    }> = [];
    class Loader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = "";
      private value = "";
      constructor() {
        loaders.push(this);
      }
      set src(value: string) {
        this.value = value;
      }
      get src() {
        return this.value;
      }
    }
    vi.stubGlobal("Image", Loader);
    const view = render(
      <StableCatalogImage src="signed-a" alt="Produto" fallback={<span>Sem foto</span>} />,
    );
    expect(screen.getByAltText("Produto")).toHaveAttribute("src", "signed-a");

    view.rerender(
      <StableCatalogImage src="signed-b" alt="Produto" fallback={<span>Sem foto</span>} />,
    );
    expect(screen.getByAltText("Produto")).toHaveAttribute("src", "signed-a");
    expect(loaders).toHaveLength(1);
    expect(loaders[0]?.src).toBe("signed-b");

    act(() => loaders[0]?.onload?.());
    expect(screen.getByAltText("Produto")).toHaveAttribute("src", "signed-b");
  });
});
