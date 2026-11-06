import { describe, expect, it } from "vitest";
import { stickerComboCount, stickerFileName, stickerPhrases, stickerStyles } from "@/lib/sticker-pack";

describe("sticker pack", () => {
  it("oferece mais de 1000 combinações de figurinhas", () => {
    expect(stickerComboCount).toBeGreaterThan(1000);
    expect(stickerComboCount).toBe(stickerPhrases.length * stickerStyles.length * 2);
  });

  it("frases são únicas e não vazias", () => {
    expect(new Set(stickerPhrases).size).toBe(stickerPhrases.length);
    for (const p of stickerPhrases) expect(p.trim().length).toBeGreaterThan(0);
  });

  it("estilos têm ids e rótulos únicos", () => {
    expect(new Set(stickerStyles.map((s) => s.id)).size).toBe(stickerStyles.length);
    expect(new Set(stickerStyles.map((s) => s.label)).size).toBe(stickerStyles.length);
  });

  it("nome de arquivo é seguro e reflete estilo e moldura", () => {
    expect(stickerFileName("Foco no trabalho", "gold-serif")).toBe("figurinha-gold-serif-foco-no-trabalho.png");
    expect(stickerFileName("Ação", "mono", true)).toBe("figurinha-mono-moldura-acao.png");
  });
});
