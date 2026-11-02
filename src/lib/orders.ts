import { z } from "zod";
import { brazilPhoneSchema, normalizePhone } from "./phone";
export { normalizePhone } from "./phone";
import { PRODUCTS, PAYMENT_METHODS, STORE_NAME, type Product } from "./products";
import { available, type CatalogProduct } from "./catalog";
import { applyCoupon, type StoreSettings } from "./store-settings";
import { comboSelectionsSchema, type ComboSelection } from "./combos";
import { analyticsIdentitySchema } from "./catalog-analytics";
import { ratingLink } from "./ratings";
export const ORDER_STAGES = [
  {
    id: "received",
    label: "Recebido",
    tone: "text-primary",
    message: "recebemos seu pedido! Em breve iniciaremos o preparo.",
  },
  {
    id: "preparing",
    label: "Em preparo",
    tone: "text-order-preparing",
    message: "seu pedido está em preparo.",
  },
  {
    id: "out_for_delivery",
    label: "Saiu para entrega",
    tone: "text-order-delivery",
    message: "seu pedido saiu para entrega! Estamos a caminho.",
  },
  {
    id: "delivered",
    label: "Entregue",
    tone: "text-whatsapp",
    message: "seu pedido foi entregue. Obrigado por escolher a S7VEN!",
  },
] as const;
export const workflowStatusSchema = z.enum(["received", "preparing", "out_for_delivery", "delivered"]);
export const statusSchema = z.enum(["received", "preparing", "out_for_delivery", "delivered", "cancelled"]);
export const cancelOrderSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().trim().min(1, "Informe o motivo do cancelamento").max(300, "Use até 300 caracteres"),
  expectedUpdatedAt: z.string().datetime({ offset: true }),
});
export function isActiveOrder(status: OrderStatus) { return status !== "delivered" && status !== "cancelled"; }
export function orderStatusLabel(status: OrderStatus) { return status === "cancelled" ? "Cancelado" : ORDER_STAGES.find(s => s.id === status)?.label ?? status; }
export function recordedSalesTotal(orders: Pick<Order, "status" | "total">[]) { return orders.filter(o => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0); }
export type OrderStatus = z.infer<typeof statusSchema>;
export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  phone: brazilPhoneSchema,
  address: z.string().trim().max(300).default(""),
  fulfillment: z.enum(["delivery", "pickup"]).default("delivery"),
  payment: z.string().trim().max(40).refine((v) => PAYMENT_METHODS.includes(v), "Escolha a forma de pagamento"),
  change: z.string().max(30).default(""),
  notes: z.string().max(300).default(""),
  zone: z.string().max(80).default(""),
}).superRefine((customer, ctx) => {
  if (customer.fulfillment === "delivery" && customer.address.length < 8)
    ctx.addIssue({ code: "custom", path: ["address"], message: "Informe o endereço completo" });
});
export const submitOrderSchema = z.object({
  deliveryQuoteId: z.string().uuid().optional(),
  deliveryToken: z.string().max(200).optional(),
  analytics: analyticsIdentitySchema.optional(),
  couponCode: z.string().trim().max(30).optional(),
  requestId: z.string().uuid(),
  customer: customerSchema,
  items: z
    .array(
      z.object({
        productId: z.string().max(30),
        option: z.string().trim().max(40),
        qty: z.number().int().min(1).max(99),
        expectedPrice: z.number().min(0).optional(),
        components: comboSelectionsSchema.optional(),
      }),
    )
    .min(1)
    .max(100),
});
export type OrderItem = {
  productId: string;
  name: string;
  option: string;
  optionLabel: string;
  qty: number;
  price: number;
  components?: (ComboSelection & { name: string; price: number })[];
  comboGroups?: CatalogProduct["comboGroups"];
};
export type Order = {
  fulfillment?: "delivery" | "pickup";
  source?: "catalog" | "counter";
  cash_received?: number | null;
  cash_change?: number | null;
  cashier_id?: string | null;
  coupon_code?: string | null;
  coupon_discount?: number | null;
  id: string;
  number: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  payment: string;
  change_for: string;
  notes: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  delivery_zone: string;
  delivery_confirmed: boolean;
  total: number;
  status: OrderStatus;
  tracking_url?: string | null;
  rating_token?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  stock_restored_at?: string | null;
  cancellation_stock_notes?: string[];
  /** Which purchase this is for the customer (1 = first), counted by normalized phone. */
  purchase_number?: number | undefined;
  created_at: string;
  updated_at: string;
};

const spDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);

/**
 * Cancelled orders stay on the board only on the Brasília day they were cancelled
 * and until the admin clears them; they remain in history and reports.
 */
export function showCancelledOnBoard(
  order: Pick<Order, "status" | "cancelled_at" | "updated_at" | "created_at">,
  now: Date,
  clearedAt: number | null,
): boolean {
  if (order.status !== "cancelled") return true;
  const at = new Date(order.cancelled_at || order.updated_at || order.created_at);
  if (spDay(at) !== spDay(now)) return false;
  return clearedAt == null || at.getTime() > clearedAt;
}
export const trackingUrlSchema = z
  .string()
  .trim()
  .max(300, "Link muito longo")
  .refine((v) => v === "" || /^https:\/\/\S+$/i.test(v), "Cole um link completo começando com https://");
export function validateCartAvailability(
  lines: { productId: string; option: string; qty: number; components?: ComboSelection[] | undefined }[],
  products: (Product | CatalogProduct)[],
) {
  if (!lines.length) throw new Error("Seu carrinho está vazio.");
  const expanded: { productId: string; option: string; qty: number }[] = [];
  for (const line of lines) {
    const product = products.find(p => p.id === line.productId);
    const groups = product && "comboGroups" in product ? product.comboGroups ?? [] : [];
    if (groups.length) {
      if (line.option) throw new Error("Confira a montagem do combo.");
      const parsed = comboSelectionsSchema.safeParse(line.components);
      if (!parsed.success || !parsed.data.length) throw new Error(`Monte todos os grupos de ${product?.name}.`);
      for (const group of groups) {
        const choices = parsed.data.filter(s => s.groupId === group.id);
        if (choices.reduce((sum, s) => sum + s.qty, 0) !== group.quantity)
          throw new Error(`${group.name}: escolha ${group.quantity} item(ns).`);
      }
      for (const s of parsed.data) {
        const group = groups.find(g => g.id === s.groupId);
        const component = products.find(p => p.id === s.productId);
        if (!group?.productIds.includes(s.productId) || !component || ("comboGroups" in component && component.comboGroups?.length))
          throw new Error("Um item do combo não está mais permitido. Monte o combo novamente.");
        expanded.push({ productId: s.productId, option: s.option, qty: s.qty * line.qty });
      }
    } else if (line.components?.length) throw new Error("Este produto não aceita montagem de combo.");
    expanded.push({ productId: line.productId, option: line.option, qty: line.qty });
  }
  // Component quantities can exceed the per-line limit after multiplication; validate the original sale quantities separately.
  if (lines.some(l => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99)) throw new Error("Ajuste a quantidade de 1 a 99 unidades.");
  for (const line of expanded) {
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new Error("Um produto não está mais disponível. Atualize o catálogo.");
    if (product.options?.length && !line.option)
      throw new Error(`Escolha ${product.optionLabel?.toLowerCase()} de ${product.name}.`);
    if ((!product.options?.length && line.option) ||
        (!("active" in product) && line.option && !product.options?.includes(line.option)))
      throw new Error(`${product.name}: variação indisponível. Atualize o carrinho.`);
    const totalQty = expanded.filter(i => i.productId === product.id).reduce((sum, i) => sum + i.qty, 0);
    const optionQty = expanded.filter(i => i.productId === product.id && i.option === line.option).reduce((sum, i) => sum + i.qty, 0);
    if (!available(product, line.option, optionQty) || ("stock" in product && product.stock !== null && totalQty > product.stock))
      throw new Error(`${product.name}: item esgotado ou quantidade indisponível. Remova ou ajuste a quantidade no carrinho.`);
  }
}
export function priceOrder(input: z.infer<typeof submitOrderSchema>, settings: StoreSettings, products: (Product | CatalogProduct)[] = PRODUCTS, verifiedDelivery?: { fee: number; km: number }, couponOverride?: { discount: number; code: string }) {
  validateCartAvailability(input.items, products);
  const items = input.items.map((line) => {
    const product = products.find((p) => p.id === line.productId);
    if (!product) throw new Error("Um produto não está mais disponível. Atualize o catálogo.");
    if (line.expectedPrice !== undefined && Math.round(line.expectedPrice * 100) !== Math.round(product.price * 100)) throw new Error(`${product.name}: preço alterado. Atualize o catálogo antes de enviar.`);
    return {
      productId: product.id,
      name: product.name,
      option: line.components?.length ? line.components.map(s => {
        const p = products.find(p => p.id === s.productId);
        const group = "comboGroups" in product ? product.comboGroups?.find(g => g.id === s.groupId)?.name : "Item";
        return `${group}: ${s.qty}× ${p?.name}${s.option ? ` (${s.option})` : ""}`;
      }).join("; ") : product.options?.length ? line.option : "",
      optionLabel: line.components?.length ? "Itens do combo" : product.optionLabel ?? "",
      qty: line.qty,
      price: product.price,
      ...(line.components?.length ? {
        components: line.components.map(s => ({ ...s, name: products.find(p => p.id === s.productId)?.name ?? "", price: products.find(p => p.id === s.productId)?.price ?? 0 })),
        comboGroups: "comboGroups" in product ? product.comboGroups : [],
      } : {}),
    };
  });
  const zone = settings.delivery_zones.find((z) => z.id === input.customer.zone);
  const delivery = input.customer.fulfillment !== "pickup";
  const byDistance = delivery && settings.delivery_enabled && settings.delivery_distance_enabled;
  if (byDistance && !verifiedDelivery) throw new Error("Calcule a entrega pelo endereço antes de enviar.");
  if (delivery && settings.delivery_enabled && !byDistance && settings.fixed_delivery_fee === null && !zone) throw new Error("Escolha o bairro ou região de entrega.");
  const subtotal =
    Math.round(items.reduce((s, i) => s + Math.round(i.price * 100) * i.qty, 0)) / 100;
  const delivery_fee = byDistance ? verifiedDelivery?.fee ?? 0 : delivery && settings.delivery_enabled ? (settings.fixed_delivery_fee ?? zone?.fee ?? 0) : 0;
  let couponDiscount = couponOverride?.discount ?? 0;
  let couponCode = couponOverride?.code ?? null;
  if (!couponOverride && input.couponCode) {
    const applied = applyCoupon(settings, input.couponCode, subtotal);
    if (!applied) throw new Error("Cupom inválido, inativo ou abaixo do valor mínimo. Remova o cupom e tente de novo.");
    couponDiscount = applied.discount;
    couponCode = input.couponCode.trim().toUpperCase();
  }
  return {
    items,
    subtotal,
    delivery_fee,
    delivery_zone: byDistance ? `${verifiedDelivery?.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km` : delivery && settings.delivery_enabled && settings.fixed_delivery_fee === null ? (zone?.name ?? "") : "",
    delivery_confirmed: !delivery || settings.delivery_enabled,
    coupon_code: couponCode,
    coupon_discount: couponDiscount,
    total: Math.round((subtotal + delivery_fee - couponDiscount) * 100) / 100,
  };
}
/** "1ª compra", "2ª compra"… — shown to customers instead of the store's internal order number. */
export function purchaseLabel(purchase: number | null | undefined) {
  return purchase && purchase > 0 ? `${purchase}ª compra` : "";
}
/**
 * Numbers each order by how many purchases the customer (same normalized phone) had made up to it.
 * Cancelled orders don't count as purchases for later orders.
 */
export function purchaseNumbers(orders: Pick<Order, "id" | "customer_phone" | "status" | "created_at">[]) {
  const result = new Map<string, number>();
  const counts = new Map<string, number>();
  const sorted = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  for (const order of sorted) {
    const phone = normalizePhone(order.customer_phone ?? "");
    const previous = phone === "55" ? 0 : counts.get(phone) ?? 0;
    result.set(order.id, previous + 1);
    if (phone !== "55" && order.status !== "cancelled") counts.set(phone, previous + 1);
  }
  return result;
}
export function orderWhatsApp(
  order: Pick<Order, "customer_name" | "customer_phone" | "status" | "tracking_url"> & { number?: number; cancellation_reason?: string | null; id?: string; rating_token?: string | null; purchase_number?: number | undefined },
) {
  const stage = ORDER_STAGES.find((s) => s.id === order.status);
  const tracking =
    order.status === "out_for_delivery" && order.tracking_url
      ? `\nAcompanhe a entrega em tempo real: ${order.tracking_url}`
      : "";
  const rating =
    order.status === "delivered" && order.id && order.rating_token
      ? `\n\nConte como foi! Avalie seu pedido em 1 toque: ${ratingLink({ id: order.id, rating_token: order.rating_token })}`
      : "";
  const reason = order.cancellation_reason?.trim();
  const cancelled = `seu pedido foi cancelado${reason ? `. Motivo: ${reason}` : ""}. Qualquer dúvida, estamos à disposição.`;
  return `https://wa.me/${normalizePhone(order.customer_phone)}?text=${encodeURIComponent(`Olá, ${order.customer_name}! ${order.status === "cancelled" ? cancelled : stage?.message ?? ""}\n${purchaseLabel(order.purchase_number) ? `Sua ${purchaseLabel(order.purchase_number)} — ` : ""}${STORE_NAME}${tracking}${rating}`)}`;
}
