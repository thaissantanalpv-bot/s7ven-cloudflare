import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  imageId: vi.fn(),
  prepare: vi.fn(),
  upload: vi.fn(),
  signed: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({ upload: mocks.upload, createSignedUrl: mocks.signed }),
    },
  },
}));
vi.mock("@/lib/photos/image-derivatives", () => ({
  catalogImageId: mocks.imageId,
  prepareCatalogImage: mocks.prepare,
}));

import { uploadCatalogImage } from "@/lib/photos/catalog-image-upload";

const original = new Blob(["original"], { type: "image/jpeg" });
const derivative = new Blob(["webp"], { type: "image/webp" });
const prepared = {
  originalPath: "uploads/v1-hash_original_webp.jpg",
  variants: {
    thumb: "uploads/v1-hash_128.webp",
    card: "uploads/v1-hash_512.webp",
    gallery: "uploads/v1-hash_1600.webp",
  },
  uploads: [
    {
      path: "uploads/v1-hash_original_webp.jpg",
      blob: original,
      contentType: "image/jpeg",
    },
    { path: "uploads/v1-hash_128.webp", blob: derivative, contentType: "image/webp" },
    { path: "uploads/v1-hash_512.webp", blob: derivative, contentType: "image/webp" },
    { path: "uploads/v1-hash_1600.webp", blob: derivative, contentType: "image/webp" },
  ],
  source: { width: 1000, height: 500, bytes: 8 },
};

describe("catalog image upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.imageId.mockResolvedValue("v1-hash");
    mocks.prepare.mockResolvedValue(prepared);
    mocks.upload.mockResolvedValue({ error: null });
    mocks.signed.mockResolvedValue({
      data: { signedUrl: "https://example.test/1600.webp" },
      error: null,
    });
  });

  it("uploads immutable derivatives before the original completion marker", async () => {
    const file = new File(["original"], "photo.jpg", { type: "image/jpeg" });
    const result = await uploadCatalogImage(file);

    expect(mocks.prepare).toHaveBeenCalledWith(file, "v1-hash");
    expect(mocks.upload.mock.calls.map((call) => call[0])).toEqual([
      "uploads/v1-hash_128.webp",
      "uploads/v1-hash_512.webp",
      "uploads/v1-hash_1600.webp",
      "uploads/v1-hash_original_webp.jpg",
    ]);
    expect(mocks.upload.mock.calls.every((call) => call[2].upsert === false)).toBe(true);
    expect(mocks.upload.mock.calls.every((call) => call[2].cacheControl === "31536000")).toBe(true);
    expect(result).toEqual({
      originalPath: prepared.originalPath,
      variants: prepared.variants,
      previewUrl: "https://example.test/1600.webp",
    });
  });

  it("continues an idempotent retry when content-addressed objects already exist", async () => {
    mocks.upload
      .mockResolvedValueOnce({
        error: { statusCode: "409", error: "Duplicate", message: "The resource already exists" },
      })
      .mockResolvedValue({ error: null });

    await expect(
      uploadCatalogImage(new File(["original"], "photo.jpg", { type: "image/jpeg" })),
    ).resolves.toMatchObject({ originalPath: prepared.originalPath });
    expect(mocks.upload).toHaveBeenCalledTimes(4);
    expect(mocks.signed).toHaveBeenCalledOnce();
  });

  it("does not publish the marker or preview after a real derivative failure", async () => {
    mocks.upload.mockResolvedValueOnce({ error: { statusCode: 500, message: "storage down" } });

    await expect(
      uploadCatalogImage(new File(["original"], "photo.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("O catálogo não foi alterado");
    expect(mocks.upload).toHaveBeenCalledOnce();
    expect(mocks.signed).not.toHaveBeenCalled();
  });
});
