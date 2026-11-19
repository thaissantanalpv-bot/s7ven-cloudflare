import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareCatalogImage } from "@/lib/photos/image-derivatives";

describe("catalog image derivatives", () => {
  const close = vi.fn();
  const drawImage = vi.fn();
  let toBlob = vi.fn<(callback: BlobCallback, type?: string, quality?: number) => void>();

  beforeEach(() => {
    close.mockReset();
    drawImage.mockReset();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 2400, height: 1200, close })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    toBlob = vi.fn((callback: BlobCallback, type?: string) =>
      callback(new Blob([type ?? ""], { type: type ?? "" })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlob);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps the original and creates proportional 128/512/1600 WebP derivatives", async () => {
    const file = new File(["original"], "photo.png", { type: "image/png" });
    const result = await prepareCatalogImage(file, "photo-id");

    expect(result.originalPath).toBe("uploads/photo-id_original.png");
    expect(result.variants).toEqual({
      thumb: "uploads/photo-id_128.webp",
      card: "uploads/photo-id_512.webp",
      gallery: "uploads/photo-id_1600.webp",
    });
    expect(result.uploads.map((item) => item.path)).toEqual([
      "uploads/photo-id_original.png",
      "uploads/photo-id_128.webp",
      "uploads/photo-id_512.webp",
      "uploads/photo-id_1600.webp",
    ]);
    expect(drawImage.mock.calls.map((call) => call.slice(3))).toEqual([
      [128, 64],
      [512, 256],
      [1600, 800],
    ]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not recompress a WebP that already fits every target", async () => {
    vi.mocked(createImageBitmap).mockResolvedValue({
      width: 100,
      height: 80,
      close,
    } as unknown as ImageBitmap);
    const file = new File(["small"], "small.webp", { type: "image/webp" });
    const result = await prepareCatalogImage(file, "small");

    expect(result.variants).toEqual({
      thumb: "uploads/small_original.webp",
      card: "uploads/small_original.webp",
      gallery: "uploads/small_original.webp",
    });
    expect(result.uploads).toHaveLength(1);
    expect(toBlob).not.toHaveBeenCalled();
  });

  it("falls back to JPEG when WebP encoding is unavailable", async () => {
    toBlob.mockImplementation((callback: BlobCallback, type?: string) => {
      callback(type === "image/webp" ? null : new Blob(["jpeg"], { type: "image/jpeg" }));
    });
    const result = await prepareCatalogImage(
      new File(["jpeg"], "photo.jpg", { type: "image/jpeg" }),
      "fallback",
    );
    expect(result.variants).toEqual({
      thumb: "uploads/fallback_128.jpg",
      card: "uploads/fallback_512.jpg",
      gallery: "uploads/fallback_1600.jpg",
    });
  });

  it("rejects unsupported originals before decoding", async () => {
    await expect(
      prepareCatalogImage(new File(["gif"], "photo.gif", { type: "image/gif" }), "gif"),
    ).rejects.toThrow("JPG, PNG ou WebP");
    expect(createImageBitmap).not.toHaveBeenCalled();
  });
});
