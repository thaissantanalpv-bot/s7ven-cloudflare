import { brl, STORE_NAME, WHATSAPP_NUMBER } from "./products";

export function productPhotoLink(origin: string, id: string) {
  const url = new URL("/", origin);
  url.searchParams.set("produto", id);
  return url.href;
}

export function checkoutWhatsApp(number: number, lines: string[], phone: string, coupon?: { code: string; discount: number } | null) {
  const couponLine = coupon && coupon.discount > 0 ? [`*Cupom ${coupon.code}: −${brl(coupon.discount)}*`] : [];
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent([`*Pedido #${number} — ${STORE_NAME}*`, ...lines, ...couponLine, `*WhatsApp do cliente:* ${phone}`].join("\n"))}`;
}

export function insertCouponLine(lines: string[], coupon: { code: string; discount: number; label: string }, newTotal: number): string[] {
  const totalIdx = lines.findIndex(l => l.startsWith("*Total"));
  const couponLine = `*Cupom ${coupon.code} (${coupon.label}): −${brl(coupon.discount)}*`;
  const totalLine = `*Total com desconto: ${brl(newTotal)}*`;
  if (totalIdx >= 0) {
    const result = [...lines];
    result.splice(totalIdx + 1, 0, couponLine, totalLine);
    return result;
  }
  return [...lines, couponLine, totalLine];
}

export function productMessage(item: { id: string; name: string; qty: number; price: number; option: string; optionLabel?: string | undefined; hasPhoto: boolean; combo?: string | undefined }, origin: string) {
  return [
    `*${item.qty}x ${item.name}*`,
    item.option ? `${item.optionLabel ?? "Variação"}: ${item.option}` : "",
    item.combo ?? "",
    `${brl(item.price)} por unidade · ${brl(item.qty * item.price)}`,
    item.hasPhoto ? `Foto: ${productPhotoLink(origin, item.id)}` : "",
  ].filter(Boolean).join("\n");
}