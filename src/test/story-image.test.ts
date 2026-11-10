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

it("foto panorâmica cobre a tela inteira, cortando só o excesso lateral", async () => {
  const drawImage = stubCanvas(2000, 500);
  try {
    await generateStoryImage({ name: "Produto panorâmico", price: "R$ 25,00", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls[0];
    expect(photoDraw?.[1]).toBe(-3300);
    expect(photoDraw?.[2]).toBe(0);
    expect(photoDraw?.[3]).toBe(7680);
    expect(photoDraw?.[4]).toBe(1920);
  } finally { vi.unstubAllGlobals(); }
});

it("foto alta cobre a tela inteira, cortando só o excesso vertical", async () => {
  const drawImage = stubCanvas(600, 1600);
  try {
    await generateStoryImage({ name: "Produto alto", price: "R$ 39,90", photoUrl: "photo.png" });
    const photoDraw = drawImage.mock.calls[0];
    expect(photoDraw?.[1]).toBe(0);
    expect(photoDraw?.[2]).toBe(-480);
    expect(photoDraw?.[3]).toBe(1080);
    expect(photoDraw?.[4]).toBe(2880);
  } finally { vi.unstubAllGlobals(); }
});

it("recusa gerar imagem sem foto do produto", async () => {
  const drawImage = stubCanvas(800, 800);
  try {
    await expect(generateStoryImage({ name: "Sem foto", price: "R$ 10,00" })).rejects.toThrow("sem foto");
    expect(drawImage).not.toHaveBeenCalled();
  } finally { vi.unstubAllGlobals(); }
});
