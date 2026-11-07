import { loadStoryFont, storyFonts } from "@/lib/story-fonts";
import { paintReferenceSticker } from "@/lib/sticker-reference-renderer";

const themes = [
  ["Trabalho", "💼", "Bora trabalhar|Nasci linda, não rica|Trabalho e muito café|Empreendedora sim|Meta pra bater|Modo CLT ativado|Já que beleza não paga contas|Meu corre, minhas conquistas|Sextou, mas com trabalho|Hoje o escritório é aqui|Foco no meu negócio|Construindo meu império|A tal da sorte tem muito esforço|Mais um dia de entrega|Expediente encerrado"],
  ["Academia", "💪", "Bora treinar|Projeto minha melhor versão|Treino pago|Hoje teve endorfina|Tá pago, sem desculpas|Uma repetição de cada vez|Ela treina, ela brilha|Meu pré-treino é coragem|Leg day, me respeita|Foco, força e constância|Suando por mim|Não foi sorte, foi treino|Meu compromisso comigo|Cardio e autoestima|Mais forte que ontem|Treino concluído|Focada que fala|Fazendo o que precisa ser feito|Segundou com treino|Treino tá pago|Disciplina supera motivação|Treino pesado|Sendo 1% melhor que ontem|Vencendo a mim mesma|Bora de treino|Dia de cardio"],
  ["Dia a dia", "✨", "Um dia de cada vez|Vivendo meu agora|Só vai|Meu pequeno caos|Vida real, sem filtro|Fazendo acontecer|De leve e de boa|Colecionando momentos|A vida acontece aqui|Por aqui tá assim|Pequenas alegrias|No meu ritmo|Só sendo eu|Um pouquinho de hoje|Presença, não pressa"],
  ["Café", "☕", "Primeiro o café|Café e coragem|Meu combustível diário|Pausa pro cafezinho|Café, depois eu resolvo|Mais café, menos drama|Um gole de paz|Café com boas ideias|Café passado, dia iniciado|O cheiro da felicidade|Na dúvida, café|Afeto em uma xícara|Café e conversa boa|Meu ritual favorito|Hoje eu tô só o café"],
  ["Bom dia", "🌞", "Bom dia, mundo|Hoje vai ser lindo|Acordei pra vencer|Novo dia, novas chances|Que seja leve|Sol na alma|Começando com gratidão|Levanta e brilha|Energia boa pra hoje|Bom dia com carinho|Deus cuida, eu sigo|Que venham coisas boas|Mais um recomeço|Amanheceu por aqui|Bora fazer esse dia valer"],
  ["Boa noite", "🌙", "Boa noite, meus amores|Desligando por hoje|Amanhã tem mais|Descansa, você merece|Missão do dia cumprida|Paz pra essa noite|Meu momento de silêncio|Sonhos bonitos|Recarregando a alma|Hoje eu dei conta|Fechando o dia com gratidão|Até amanhã, mundo|Noite de autocuidado|Agora é meu descanso|Lua, cuida dos meus sonhos"],
  ["Dias da semana", "🗓️", "Segundou com coragem|Terçou com foco|Quartou com muito trabalho|Quintou, quase lá|Sextou de verdade|Sabadou sem pressa|Domingou com paz|Segunda de recomeços|Terça, sua linda|Quarta de conquistas|Quinta com gostinho de sexta|Sexta, eu te esperei|Sábado é meu dia|Domingo de preguiça|Semana nova, energia nova"],
  ["Autocuidado", "🧖‍♀️", "Meu momento|Me escolhendo hoje|Pausa pra cuidar de mim|Amor próprio em dia|Eu mereço esse carinho|Beleza que vem de dentro|Hoje o cuidado é comigo|Cuidando do meu jardim|Ritual de amor próprio|Respeitando meu tempo|Minha paz vem primeiro|Brilhando do meu jeito|Florescendo por dentro|Um respiro pra alma|Eu sou minha prioridade"],
  ["Beleza", "💅", "Unhas feitas, alma leve|Dia de ficar ainda mais linda|Cabelo de milhões|Ela tá diferente|Pronta pra brilhar|Produção de hoje|Um glow desses|Linda sem pedir licença|Meu look, minhas regras|O poder de um batom|Autoestima lá em cima|Detalhes que eu amo|Me arrumei pra mim|Beleza sem padrão|Espelho, olha esse brilho"],
  ["Comida", "🍕", "Hora de comer bem|Feito com amor|Hoje pode repetir|Sabor de felicidade|Meu prato favorito|Almoço de respeito|Comida boa, humor bom|Uma delícia dessas|Cozinhando memórias|Sobremesa é carinho|Tempero de casa|Jantar especial|Bom apetite, amores|Receita de afeto|Só mais um pedacinho"],
  ["Amor", "❤️", "Meu lugar favorito é com você|Nós dois e o mundo|Amor mora aqui|Meu melhor encontro|De mãos dadas com a vida|Você deixa tudo mais bonito|Nosso jeitinho de amar|Sorte a minha|Pra sempre meu crush|Te escolheria de novo|Um amor leve|Meu porto seguro|Com você eu sou casa|Só a gente entende|Amor nos pequenos detalhes"],
  ["Amizade", "🥂", "Com elas é melhor|As de verdade|Amizade de milhões|Minha dupla de caos|Só risada e história boa|Encontro das lindas|Minhas pessoas favoritas|Juntas até no perrengue|Nossa terapia é conversar|Amigas que viram família|No rolê com as minhas|Que sorte ter vocês|O grupo saiu do WhatsApp|Conexão de alma|Café com a melhor companhia"],
  ["Família", "🏡", "Meu maior tesouro|Família é meu lar|Domingo com os meus|Amor que não cabe na foto|Nossa bagunça favorita|Onde meu coração descansa|Casa cheia, coração feliz|Laços que a vida abraça|Momento em família|Tudo por eles|Meu pequeno universo|Memórias de casa|Colo que cura|Perto de quem importa|Raízes e amor"],
  ["Pets", "🐾", "Amor de quatro patas|Meu neném peludo|Patinhas no meu coração|O dono da casa|Companhia perfeita|Hoje tem passeio|Meu melhor amigo|Fofura sem limites|Uma lambida de amor|Aqui tem pelo e carinho|Rotina com meu pet|Meu grudinho favorito|Olha essa carinha|Paz é um ronronar|Passeio com o amor da vida"],
  ["Viagem", "✈️", "Bora viver o mundo|Partiu novos destinos|Minha alma pede estrada|Colecionando lugares|Modo viagem ativado|Próxima parada, felicidade|Mala pronta, coração aberto|Vista que abraça|Eu precisava desse lugar|Memórias na bagagem|Fora da rotina|O mundo me chama|Mais um carimbo na vida|Pra onde o vento levar|Meu destino é ser feliz"],
  ["Praia e sol", "🌊", "Sal na pele, paz na alma|Meu lugar de paz|Dias de sol|Pé na areia|Deixa o mar levar|Sol, mar e nada mais|Bronze e boas histórias|Vida com cheiro de verão|Minha terapia é o mar|Sob o sol|Aqui eu respiro melhor|Cabelo de praia, alma livre|Onda boa de viver|Um mergulho de leveza|Verão no coração"],
  ["Festa e rolê", "🪩", "Hoje eu tô pro rolê|Brinde à vida|Pronta pra noite|O rolê prometeu tudo|Só volto com histórias|Noite das boas|Modo festa ativado|Que noite, meus amigos|Um brinde aos encontros|Dançando os problemas embora|A pista me chama|Drinks e boas risadas|Hoje tem resenha|As melhores noites são assim|Viva esse momento"],
  ["Fé e gratidão", "🙏", "Deus no comando|Gratidão por hoje|Fé pra seguir|Tudo no tempo certo|Abençoada e grata|Que nunca falte fé|Deus conhece meu caminho|Obrigada por tanto|Meu coração agradece|Onde há fé, há recomeço|Entrego e confio|A graça me alcança|Mais motivos pra agradecer|Com Deus eu vou|Uma oração muda o dia"],
  ["Estudos", "📚", "Bora estudar|Foco no meu futuro|Um capítulo por vez|Estudando pra conquistar|Conhecimento é poder|Hoje teve dedicação|Modo estudante|Meu sonho merece esforço|Anotações e café|Mais perto da aprovação|Disciplina também é amor|Pausa entre os estudos|Aprendendo todo dia|O diploma vem|Orgulho do meu processo"],
  ["Loja e vendas", "🛍️", "Novidades por aqui|Pedido saindo com amor|Vem garantir o seu|Tem reposição|Minha loja, meu sonho|Cliente feliz, coração feliz|Últimas unidades|Um mimo pra você|Obrigada pela preferência|Seu pedido tá pronto|Escolhido com carinho|Hoje tem promoção|Tá esperando o quê|Passa aqui na loja|Mais uma venda, gratidão|Novidades|Loja aberta|Chegaram novidades|Reposição|Ativando um lindo dia|Escolha perfeita|Estamos online|Iniciando os atendimentos|Clica aqui|Invista e brilhe ainda mais|Preparada para se apaixonar"],
] as const;

export const stickerThemes = themes.map(([name, emoji, phrases]) => ({ name, emoji, phrases: phrases.split("|") }));
export const stickerStyles = [
  { id: "aesthetic", name: "Aesthetic · letras combinadas", font: "sacramento", layout: "aesthetic" },
  { id: "faixa", name: "Faixa rosa · treino e loja", font: "abril-fatface", layout: "ribbon" },
  { id: "camadas", name: "Editorial em camadas", font: "bodoni-moda", layout: "echo" },
  { id: "fofa", name: "Letras arredondadas", font: "pacifico", layout: "playful" },
  { id: "foco", name: "Interruptores de foco", font: "sacramento", layout: "switches" },
  { id: "assinatura", name: "Assinatura", font: "great-vibes", layout: "script" },
  { id: "editorial", name: "Editorial", font: "birthstone-bounce", layout: "mixed" },
  { id: "manuscrito", name: "Manuscrito", font: "caveat", layout: "script" },
  { id: "impacto", name: "Impacto + cursiva", font: "yellowtail", layout: "mixed" },
  { id: "romantico", name: "Romântico", font: "parisienne", layout: "seal" },
  { id: "vintage", name: "Vintage", font: "sacramento", layout: "seal" },
] as const;
export type StickerStyle = (typeof stickerStyles)[number];
export type StorySticker = { id: string; phrase: string; theme: string; emoji: string; style: StickerStyle };
export const storyStickers: StorySticker[] = stickerThemes.flatMap((theme, ti) => theme.phrases.flatMap((phrase, pi) => stickerStyles.map((style) => ({ id: `${ti}-${pi}-${style.id}`, theme: theme.name, emoji: theme.emoji, phrase, style }))));

export function filterStickers(theme: string, query: string, style = "todos") {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = normalize(query.trim());
  return storyStickers.filter((item) => (theme === "Todos" || item.theme === theme) && (style === "todos" || item.style.id === style) && (!q || normalize(`${item.phrase} ${item.theme}`).includes(q)));
}

export async function renderSticker(item: StorySticker, color: string): Promise<Blob> {
  if (["aesthetic", "ribbon", "echo", "playful", "switches"].includes(item.style.layout)) {
    const canvas = document.createElement("canvas");
    await paintReferenceSticker(canvas, item, color);
    return cropSticker(canvas);
  }
  const font = storyFonts.find((entry) => entry.id === item.style.font);
  const bold = storyFonts.find((entry) => entry.id === "abril-fatface");
  if (!font || !bold) throw new Error("Fonte indisponível.");
  await Promise.all([loadStoryFont(font), loadStoryFont(bold)]);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar a figurinha.");
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textAlign = "center";
  const mixed = item.style.layout === "mixed";
  const words = item.phrase.split(" ");
  const heading = mixed ? words.slice(0, Math.max(1, Math.floor(words.length / 2))).join(" ") : "";
  const rest = mixed ? words.slice(Math.max(1, Math.floor(words.length / 2))).join(" ") : item.phrase;
  const lines: { text: string; font: string; size: number }[] = [];
  const wrap = (value: string, family: string, size: number) => {
    ctx.font = `${size}px "${family}"`;
    let line = "";
    for (const word of value.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      const metrics = ctx.measureText(candidate);
      if (Math.max(metrics.width, metrics.actualBoundingBoxRight) + Math.max(0, metrics.actualBoundingBoxLeft) > 880 && line) { lines.push({ text: line, font: family, size }); line = word; }
      else line = candidate;
    }
    if (line) lines.push({ text: line, font: family, size });
  };
  if (heading) wrap(heading.toUpperCase(), bold.family, 95);
  wrap(rest, font.family, item.style.id === "manuscrito" ? 125 : 135);
  const gap = 155;
  canvas.height = Math.max(1000, lines.length * gap + 360);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textAlign = "center";
  const total = lines.length * gap;
  let y = (canvas.height - total) / 2 + 105;
  for (const line of lines) {
    ctx.font = `${line.size}px "${line.font}"`;
    ctx.fillText(line.text, 600, y);
    y += gap;
  }
  // Independent emoji line avoids collisions with cursive flourishes.
  ctx.font = '62px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.fillText(`${item.emoji}  ✦  ${item.emoji}`, 600, y + 8);
  if (item.style.layout === "seal") {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(330, (canvas.height - total) / 2 - 28);
    ctx.lineTo(870, (canvas.height - total) / 2 - 28);
    ctx.stroke();
  }
  return cropSticker(canvas);
}

function cropSticker(canvas: HTMLCanvasElement): Promise<Blob> {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível salvar a figurinha.");
  // Crop to actual painted bounds, keeping transparent breathing room.
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width, right = 0, top = canvas.height, bottom = 0;
  for (let py = 0; py < canvas.height; py++) for (let px = 0; px < canvas.width; px++) {
    if ((pixels[(py * canvas.width + px) * 4 + 3] ?? 0) > 0) { left = Math.min(left, px); right = Math.max(right, px); top = Math.min(top, py); bottom = Math.max(bottom, py); }
  }
  const output = document.createElement("canvas");
  const margin = 48;
  output.width = right - left + 1 + margin * 2;
  output.height = bottom - top + 1 + margin * 2;
  const out = output.getContext("2d");
  if (!out) throw new Error("Não foi possível salvar a figurinha.");
  out.drawImage(canvas, left, top, right - left + 1, bottom - top + 1, margin, margin, right - left + 1, bottom - top + 1);
  return new Promise((resolve, reject) => output.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Falha ao salvar.")), "image/png"));
}