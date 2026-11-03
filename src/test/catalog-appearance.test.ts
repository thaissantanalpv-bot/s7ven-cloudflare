import { describe, expect, it } from "vitest";
import { appearanceCss, appearanceSchema, DEFAULT_APPEARANCE, parseAppearance, readableOn } from "@/lib/catalog-appearance";

describe("aparência do catálogo", () => {
  it("sem nada salvo, mantém o visual atual (fundo #09090b, roxo #a855f7, textos do banner)", () => {
    const a = parseAppearance(undefined);
    expect(a.background).toBe("#09090b");
    expect(a.primary).toBe("#a855f7");
    expect(a.bannerTitle).toBe("Agora online!");
    expect(a.deliveryLine).toBe("Entregas das 16:00 às 23:00");
  });
  it("campo inválido volta ao padrão sem perder os outros", () => {
    const a = parseAppearance({ background: "red; } body { display:none", primary: "#ff0000", fontDisplay: "comic" });
    expect(a.background).toBe(DEFAULT_APPEARANCE.background);
    expect(a.primary).toBe("#ff0000");
    expect(a.fontDisplay).toBe("geist");
  });
  it("salvar recusa cor fora do formato e fonte fora da lista", () => {
    expect(appearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, card: "blue" }).success).toBe(false);
    expect(appearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, fontBody: "Arial" }).success).toBe(false);
  });
  it("o CSS só contém as cores escolhidas", () => {
    const css = appearanceCss({ ...DEFAULT_APPEARANCE, primary: "#22a06b" });
    expect(css).toContain("--primary:#22a06b;");
    expect(css.startsWith("body:has(.catalog-theme){")).toBe(true);
  });
  it("texto do botão fica legível: branco no roxo, escuro no dourado claro", () => {
    expect(readableOn("#a855f7")).toBe("#ffffff");
    expect(readableOn("#f0cc6b")).toBe("#111114");
  });
});
