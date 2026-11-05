import { normalizePhone, type Order } from "./orders";
import { brl, STORE_NAME } from "./products";
import { PIX_KEY } from "./pix";

type QuickOrder = Pick<Order, "customer_name" | "customer_phone" | "address" | "payment" | "change_for" | "total" | "delivery_fee" | "notes" | "number" | "tracking_url"> & { fulfillment?: "delivery" | "pickup" | undefined };

export type QuickMessage = { id: string; label: string; text: string; to: "cliente" | "motoboy" };

const isPix = (payment: string) => /pix/i.test(payment);

export function quickMessages(order: QuickOrder): QuickMessage[] {
  const name = order.customer_name.split(" ")[0] || order.customer_name;
  const pickup = order.fulfillment === "pickup";
  const list: QuickMessage[] = [];
  if (isPix(order.payment)) {
    list.push({ id: "pix-ok", to: "cliente", label: "Pix conferido", text: `Olá, ${name}! Chave Pix conferida, recebemos ${brl(order.total)}. Já estamos preparando seu pedido. — ${STORE_NAME}` });
    list.push({ id: "pix-wait", to: "cliente", label: "Aguardando comprovante", text: `Olá, ${name}! Estamos aguardando o comprovante do Pix de ${brl(order.total)} para preparar seu pedido.\nChave Pix: ${PIX_KEY}\n— ${STORE_NAME}` });
  }
  if (pickup) {
    list.push({ id: "pickup", to: "cliente", label: "Pronto para retirada", text: `Olá, ${name}! Seu pedido está pronto para retirada no balcão. Te esperamos! — ${STORE_NAME}` });
  } else {
    list.push({ id: "moto", to: "cliente", label: "Saiu com o motoboy", text: `Olá, ${name}! Seu pedido saiu para entrega com o motoboy! 🛵${order.tracking_url ? `\nAcompanhe: ${order.tracking_url}` : ""}\n— ${STORE_NAME}` });
  }
  return list;
}

export function courierMessage(order: QuickOrder) {
  const payment = isPix(order.payment)
    ? "Já pago via Pix"
    : `Cobrar ${brl(order.total)} (${order.payment})${order.change_for ? ` · troco para ${order.change_for}` : ""}`;
  return [
    `*Entrega · pedido #${order.number}*`,
    `Cliente: ${order.customer_name}`,
    `WhatsApp: ${order.customer_phone}`,
    `Endereço: ${order.address}`,
    `Pagamento: ${payment}`,
    order.notes ? `Obs.: ${order.notes}` : "",
  ].filter(Boolean).join("\n");
}

export function whatsappTo(phone: string | null, text: string) {
  return phone ? `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
}
