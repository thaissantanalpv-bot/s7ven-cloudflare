import { afterEach, expect, it, vi } from "vitest";
import { generateStoryImage } from "@/lib/story-image";

afterEach(() => vi.restoreAllMocks());

function stubCanvas(naturalWidth: number, naturalHeight: number) {
  const drawImage = vi.fn();
  const ctx = new Proxy({ drawImage, measureText: () => ({ width: 100 }), createRadialGradient: () => ({ addColorStop: vi.fn() }) }, {
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

it("preserva todos os pixels de uma foto panorâmica sem cortar", async () => {
  const drawImage = stubCanvas(2000, 500);
  try {
    await generateStoryImage({ name: "Produto panorâmico", price: "R$ 25,00", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls.at(-1);
    expect(photoDraw?.[3]).toBe(984);
    expect(photoDraw?.[4]).toBe(246);
  } finally { vi.unstubAllGlobals(); }
});

it("preserva todos os pixels de uma foto alta sem cortar", async () => {
  const drawImage = stubCanvas(600, 1600);
  try {
    await generateStoryImage({ name: "Produto alto", price: "R$ 39,90", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls.at(-1);
    expect(photoDraw?.[3]).toBeCloseTo(427.5, 6);
    expect(photoDraw?.[4]).toBe(1140);
  } finally { vi.unstubAllGlobals(); }
});

it("recusa gerar imagem sem foto do produto", async () => {
  const drawImage = stubCanvas(800, 800);
  try {
    await expect(generateStoryImage({ name: "Sem foto", price: "R$ 10,00" })).rejects.toThrow("sem foto");
    expect(drawImage).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
