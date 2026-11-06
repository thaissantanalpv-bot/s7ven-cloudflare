import { describe, expect, it } from "vitest";
import { applyInstaFont, instaFonts } from "@/lib/insta-fonts";

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
});
