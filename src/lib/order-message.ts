import { brl, STORE_NAME, WHATSAPP_NUMBER } from "./products";

export function productPhotoLink(origin: string, id: string) {
  const url = new URL("/", origin);
  url.searchParams.set("produto", id);
  return url.href;
}

export function checkoutWhatsApp(number: number, lines: string[], phone: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent([`*Pedido #${number} — ${STORE_NAME}*`, ...lines, `*WhatsApp do cliente:* ${phone}`].join("\n"))}`;
}

export function productMessage(item: { id: string; name: string; qty: number; price: number; option: string; optionLabel?: string; hasPhoto: boolean; combo?: string }, origin: string) {
  return [
    `*${item.qty}x ${item.name}*`,
    item.option ? `${item.optionLabel ?? "Variação"}: ${item.option}` : "",
    item.combo ?? "",
    `${brl(item.price)} por unidade · ${brl(item.qty * item.price)}`,
    item.hasPhoto ? `Foto: ${productPhotoLink(origin, item.id)}` : "",
  ].filter(Boolean).join("\n");
}