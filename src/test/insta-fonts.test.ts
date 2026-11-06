import { describe, expect, it } from "vitest";
import { applyInstaFont, instaFonts, instaFontVariants } from "@/lib/insta-fonts";

describe("applyInstaFont", () => {
  it("mantém o texto quando o estilo não existe", () => {
    expect(applyInstaFont("S7VEN", "inexistente")).toBe("S7VEN");
  });

  it("converte letras para negrito matemático", () => {
    expect(applyInstaFont("Ab", "bold")).toBe("𝐀𝐛");
  });

  it("converte dígitos no estilo vazado", () => {
    expect(applyInstaFont("R$ 10", "double")).toBe("ℝ$ 𝟙𝟘");
  });

  it("preserva espaços, acentos e pontuação", () => {
    expect(applyInstaFont("Açaí 100%", "mono")).toBe("𝙰ç𝚊í 𝟷𝟶𝟶%");
  });

  it("usa o h itálico alternativo (U+210E)", () => {
    expect(applyInstaFont("h", "italic")).toBe("ℎ");
  });

  it("todos os estilos alteram ao menos uma letra ASCII", () => {
    for (const f of instaFonts) {
      expect(applyInstaFont("S7VEN Lounge", f.id)).not.toBe("S7VEN Lounge");
    }
  });

  it("oferece mais de 1000 variações de fonte com enfeites", () => {
    expect(instaFontVariants.length).toBeGreaterThan(1000);
  });

  it("todas as variações têm id e rótulo únicos", () => {
    const ids = new Set(instaFontVariants.map((f) => f.id));
    const labels = new Set(instaFontVariants.map((f) => f.label));
    expect(ids.size).toBe(instaFontVariants.length);
    expect(labels.size).toBe(instaFontVariants.length);
  });

  it("aplica enfeite de estrelas ao redor do texto", () => {
    expect(applyInstaFont("Ab", "bold~stars")).toBe("★ 𝐀𝐛 ★");
  });

  it("aplica enfeite de colchetes japoneses", () => {
    expect(applyInstaFont("Ab", "italic~brackets-jp")).toBe("「𝐴𝑏」");
  });

  it("aplica riscado letra a letra, preservando espaços", () => {
    expect(applyInstaFont("A b", "bold~strike")).toBe("𝐀̶ 𝐛̶");
  });

  it("ids de variação sem enfeite equivalem ao estilo puro", () => {
    expect(applyInstaFont("Ab", "bold~plain")).toBe(applyInstaFont("Ab", "bold"));
  });
});
