import { afterEach, expect, it, vi } from "vitest";
import { generateStoryImage } from "@/lib/story-image";

afterEach(() => vi.restoreAllMocks());

function stubCanvas(naturalWidth: number, naturalHeight: number) {
  const drawImage = vi.fn();
  const ctx = new Proxy({ drawImage, measureText: () => ({ width: 100 }), createLinearGradient: () => ({ addColorStop: vi.fn() }) }, {
    get(target, key) { return Reflect.get(target, key) ?? vi.fn(); },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(new Blob(["image"], { type: "image/png" })));
  vi.stubGlobal("Image", class {
    naturalWidth = naturalWidth;
    naturalHeight = naturalHeight;
    onload?: () => void;
    set src(_value: string) { queueMicrotask(() => this.onload?.()); }
  });
  return drawImage;
}

it("foto pequena quadrada não é ampliada além da largura da tela", async () => {
  const drawImage = stubCanvas(900, 900);
  try {
    await generateStoryImage({ name: "Produto", price: "R$ 25,00", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls[1];
    expect(photoDraw?.[3]).toBe(1080);
    expect(photoDraw?.[4]).toBe(1080);
  } finally { vi.unstubAllGlobals(); }
});

it("foto alta aparece inteira, sem corte", async () => {
  const drawImage = stubCanvas(600, 1600);
  try {
    await generateStoryImage({ name: "Produto alto", price: "R$ 39,90", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls[1];
    expect(photoDraw?.[4]).toBeCloseTo(1382.4);
    expect(photoDraw?.[3]).toBeCloseTo(518.4);
  } finally { vi.unstubAllGlobals(); }
});

it("recusa gerar imagem sem foto do produto", async () => {
  const drawImage = stubCanvas(800, 800);
  try {
    await expect(generateStoryImage({ name: "Sem foto", price: "R$ 10,00" })).rejects.toThrow("sem foto");
    expect(drawImage).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
