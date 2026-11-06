import { afterEach, expect, it, vi } from "vitest";
import { generateStoryImage } from "@/lib/story-image";

afterEach(() => vi.restoreAllMocks());

it("preserva todos os pixels de uma foto panorâmica sem cortar", async () => {
  const drawImage = vi.fn();
  const ctx = new Proxy({ drawImage, measureText: () => ({ width: 100 }), createRadialGradient: () => ({ addColorStop: vi.fn() }) }, {
    get(target, key) { return Reflect.get(target, key) ?? vi.fn(); },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["image"], { type: "image/png" })));
  vi.stubGlobal("Image", class {
    naturalWidth = 2000;
    naturalHeight = 500;
    onload?: () => void;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
  try {
    await generateStoryImage({ price: "R$ 25,00", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls[1];
    expect(photoDraw?.[3]).toBe(900);
    expect(photoDraw?.[4]).toBe(225);
  } finally { vi.unstubAllGlobals(); }
});