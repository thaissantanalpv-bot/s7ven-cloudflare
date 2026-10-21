import { z } from "zod";
import { brl } from "./products";

// Browser-safe shared definitions for new-order push notifications.
export const PUSH_WORKER_URL = "/admin-push-sw.js";
// Dedicated scope: the push worker never controls pages, so it cannot interfere with the offline catalog worker.
export const PUSH_WORKER_SCOPE = "/avisos-painel/";
export const OPEN_ORDERS_MESSAGE = "s7ven-open-orders";

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(2048)
    .refine((u) => u.startsWith("https://"), "Endereço de aviso inválido."),
  keys: z.object({
    p256dh: z
      .string()
      .regex(/^[A-Za-z0-9_-]+=*$/)
      .min(40)
      .max(200),
    auth: z
      .string()
      .regex(/^[A-Za-z0-9_-]+=*$/)
      .min(8)
      .max(64),
  }),
  deviceLabel: z.string().trim().max(80).default(""),
});
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export type PushPayload = { title: string; body: string; tag: string; url: string };

export function newOrderPush(order: {
  id: string;
  number: number;
  customerName: string;
  total: number;
  fulfillment: "delivery" | "pickup";
  items: { qty: number; name: string; option?: string }[];
}): PushPayload {
  const items = order.items
    .map((i) => `${i.qty}x ${i.name}${i.option ? ` (${i.option})` : ""}`)
    .join(", ");
  const summary = `${order.customerName} · ${brl(order.total)} · ${order.fulfillment === "pickup" ? "Retirada" : "Entrega"}`;
  const body = `${summary}\n${items}`;
  return {
    title: `🔔 Novo pedido #${order.number}`,
    body: body.length > 220 ? `${body.slice(0, 217)}...` : body,
    tag: `order-${order.id}`,
    url: "/painel?aba=pedidos",
  };
}

export function deviceLabelFromAgent(agent: string) {
  if (/android/i.test(agent)) return "Celular Android";
  if (/iphone|ipad/i.test(agent)) return "iPhone";
  if (/windows/i.test(agent)) return "Computador Windows";
  if (/mac os/i.test(agent)) return "Computador Mac";
  return "Aparelho";
}
