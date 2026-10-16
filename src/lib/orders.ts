import { z } from "zod";
import { brazilPhoneSchema, normalizePhone } from "./phone";
export { normalizePhone } from "./phone";
import { PRODUCTS, PAYMENT_METHODS, STORE_NAME, type Product } from "./products";
import { available, type CatalogProduct } from "./catalog";
import type { StoreSettings } from "./store-settings";
import { comboSelectionsSchema, type ComboSelection } from "./combos";
import { analyticsIdentitySchema } from "./catalog-analytics";
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
export const statusSchema = z.enum(["received", "preparing", "out_for_delivery", "delivered"]);
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
  created_at: string;
  updated_at: string;
};
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
export function priceOrder(input: z.infer<typeof submitOrderSchema>, settings: StoreSettings, products: (Product | CatalogProduct)[] = PRODUCTS, verifiedDelivery?: { fee: number; km: number }) {
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
  return {
    items,
    subtotal,
    delivery_fee,
    delivery_zone: byDistance ? `${verifiedDelivery?.km.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} km` : delivery && settings.delivery_enabled && settings.fixed_delivery_fee === null ? (zone?.name ?? "") : "",
    delivery_confirmed: !delivery || settings.delivery_enabled,
    total: Math.round((subtotal + delivery_fee) * 100) / 100,
  };
}
export function orderWhatsApp(
  order: Pick<Order, "number" | "customer_name" | "customer_phone" | "status" | "tracking_url">,
) {
  const stage = ORDER_STAGES.find((s) => s.id === order.status);
  const tracking =
    order.status === "out_for_delivery" && order.tracking_url
      ? `\nAcompanhe a entrega em tempo real: ${order.tracking_url}`
      : "";
  return `https://wa.me/${normalizePhone(order.customer_phone)}?text=${encodeURIComponent(`Olá, ${order.customer_name}! ${stage?.message ?? ""}\nPedido #${order.number} — ${STORE_NAME}${tracking}`)}`;
}
