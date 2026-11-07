import { loadStoryFont, storyFonts } from "@/lib/story-fonts";

export type ReferenceSticker = { phrase: string; emoji: string; theme: string; style: { layout: string; font: string } };
export async function paintReferenceSticker(canvas: HTMLCanvasElement, item: ReferenceSticker, ink: string) {
  const ids = [item.style.font, "abril-fatface", "bodoni-moda", "amatic-sc", "pacifico", "sacramento"];
  await Promise.all(storyFonts.filter((font) => ids.includes(font.id)).map(loadStoryFont));
  canvas.width = 1200;
  canvas.height = 2800;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível gerar a figurinha.");
  const ctx: CanvasRenderingContext2D = context;
  const tokens = getComputedStyle(document.documentElement);
  const pink = tokens.getPropertyValue("--sticker-pink").trim();
  const paper = tokens.getPropertyValue("--sticker-white").trim();
  const dark = tokens.getPropertyValue("--sticker-ink").trim();
  const family = storyFonts.find((font) => font.id === item.style.font)?.family || "Sacramento";
  const words = item.phrase.split(/\s+/);
  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  function text(value: string, font: string, size: number, y: number, color = ink, max = 940) {
    ctx.fillStyle = color;
    ctx.font = `${size}px "${font}"`;
    while (ctx.measureText(value).width > max && size > 28) { size -= 2; ctx.font = `${size}px "${font}"`; }
    ctx.fillText(value, 600, y);
  }
  function wrap(value: string, font: string, size: number, width = 920) {
    ctx.font = `${size}px "${font}"`;
    const lines: string[] = [];
    let line = "";
    for (const word of value.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > width && line) { lines.push(line); line = word; } else line = candidate;
    }
    if (line) lines.push(line);
    return lines;
  }
  function ribbon(value: string, y: number, fill = pink) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(170, y - 55, 860, 84, 28); ctx.fill();
    text(value.toUpperCase(), "Amatic SC", 67, y + 8, dark, 810);
  }
  function heart(x: number, y: number, size = 32) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = pink;
    ctx.beginPath(); ctx.moveTo(0, size * .3); ctx.bezierCurveTo(-size, -size * .35, -size * .6, -size, 0, -size * .55); ctx.bezierCurveTo(size * .6, -size, size, -size * .35, 0, size * .3); ctx.fill(); ctx.restore();
  }
  function smile(x: number, y: number) {
    ctx.strokeStyle = ink; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, 35, .15, Math.PI - .15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 18, y - 26); ctx.lineTo(x - 15, y - 16); ctx.moveTo(x + 15, y - 26); ctx.lineTo(x + 18, y - 16); ctx.stroke();
  }
  const layout = item.style.layout;
  if (layout === "echo") {
    const lines = wrap(item.phrase.toUpperCase(), "Bodoni Moda", 142);
    let y = 280;
    for (const line of lines) {
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = [1, .5, .22][i] ?? 1; text(line, "Bodoni Moda", 142, y + i * 143); }
      y += 485;
    }
    ctx.globalAlpha = 1; heart(940, Math.min(y, 1300));
  } else if (layout === "switches") {
    text(item.phrase, "Sacramento", 155, 290);
    const labels = item.theme === "Academia" ? ["Foco", "Dedicação", "Motivação", "Desculpas"] : ["Foco", "Coragem", "Dedicação", "Desculpas"];
    labels.forEach((label, index) => {
      const y = 405 + index * 160;
      ctx.fillStyle = paper; ctx.beginPath(); ctx.roundRect(235, y, 730, 118, 59); ctx.fill();
      ctx.fillStyle = index === 3 ? tokens.getPropertyValue("--sticker-preview").trim() : tokens.getPropertyValue("--whatsapp").trim();
      ctx.beginPath(); ctx.roundRect(260, y + 23, 170, 72, 36); ctx.fill();
      ctx.fillStyle = index === 3 ? dark : paper; ctx.beginPath(); ctx.arc(index === 3 ? 298 : 390, y + 59, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = dark; ctx.font = '48px sans-serif'; ctx.fillText(label, 660, y + 76);
    });
    heart(980, 1100);
  } else if (layout === "ribbon") {
    const lines = wrap(item.phrase, "Abril Fatface", 135);
    let y = 330;
    lines.forEach((line) => { text(line, "Abril Fatface", 135, y); y += 145; });
    ribbon(item.phrase === "Treino concluído" ? "com sucesso" : item.theme === "Academia" ? "Foco, força e fé!" : "feito com carinho", y - 30);
    smile(930, 175); heart(235, y + 65);
  } else if (layout === "playful") {
    const lines = wrap(item.phrase, "Pacifico", 120);
    let y = 325;
    lines.forEach((line) => { text(line, "Pacifico", 120, y); y += 160; });
    heart(195, 210); heart(970, y - 75); smile(960, 185);
    ctx.strokeStyle = pink; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(300, y + 15); ctx.quadraticCurveTo(580, y + 65, 895, y + 5); ctx.stroke();
  } else {
    const cut = Math.max(1, Math.floor(words.length / 2));
    const first = words.slice(0, cut).join(" ");
    const second = words.slice(cut).join(" ");
    const lines = wrap(first, "Bodoni Moda", 155);
    let y = 335;
    lines.forEach((line) => { text(line, "Bodoni Moda", 155, y); y += 165; });
    wrap(second, family, 152).forEach((line) => { text(line, family, 152, y); y += 180; });
    text(item.phrase === "Loja aberta" ? "que seja um dia abençoado" : item.theme === "Loja e vendas" ? "feito pra você" : item.theme === "Academia" ? "minha melhor versão" : "um dia de cada vez", "Amatic SC", 48, y - 70);
    heart(950, 210); smile(250, y - 80);
  }
}