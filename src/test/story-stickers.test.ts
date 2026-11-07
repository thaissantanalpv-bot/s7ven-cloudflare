import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/story-fonts", () => ({ storyFonts: [], loadStoryFont: vi.fn() }));
import { filterStickers, stickerThemes, storyStickers } from "@/lib/story-stickers";

describe("coleção de Stories", () => {
  it.each(["Academia", "Trabalho", "Dia a dia"])("inclui o tema solicitado %s", (theme) => {
    expect(stickerThemes.find((entry) => entry.name === theme)?.phrases.length).toBeGreaterThan(0);
    expect(filterStickers(theme, "").every((entry) => entry.theme === theme)).toBe(true);
  });
  it("mantém chaves únicas para todas as composições", () => {
    expect(new Set(storyStickers.map((item) => item.id)).size).toBe(storyStickers.length);
  });
  it("encontra academia sem acentos e combina filtro de letras", () => {
    const found = filterStickers("Academia", "repeticao", "assinatura");
    expect(found).toHaveLength(1);
    expect(found[0]?.phrase).toBe("Uma repetição de cada vez");
    expect(filterStickers("Trabalho", "repeticao")).toHaveLength(0);
  });
});