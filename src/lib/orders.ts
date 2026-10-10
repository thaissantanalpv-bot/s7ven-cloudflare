import { z } from 'zod';
import { PRODUCTS, PAYMENT_METHODS, STORE_NAME } from './products';
import type { StoreSettings } from './store-settings';
export const ORDER_STAGES = [
  { id: 'received', label: 'Recebido', tone: 'text-primary', message: 'recebemos seu pedido! Em breve iniciaremos o preparo.' },
  { id: 'preparing', label: 'Em preparo', tone: 'text-order-preparing', message: 'seu pedido está em preparo.' },
  { id: 'out_for_delivery', label: 'Saiu para entrega', tone: 'text-order-delivery', message: 'seu pedido saiu para entrega! Estamos a caminho.' },
  { id: 'delivered', label: 'Entregue', tone: 'text-whatsapp', message: 'seu pedido foi entregue. Obrigado por escolher a S7VEN!' },
] as const;
export const statusSchema = z.enum(['received', 'preparing', 'out_for_delivery', 'delivered']);
export type OrderStatus = z.infer<typeof statusSchema>;
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}
export const customerSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  phone: z.string().transform(normalizePhone).refine(v => /^55[1-9]\d\d{8,9}$/.test(v), 'Informe seu WhatsApp com DDD'),
  address: z.string().trim().min(8, 'Informe o endereço completo').max(300),
  payment: z.string().refine(v => PAYMENT_METHODS.includes(v), 'Escolha a forma de pagamento'),
  change: z.string().max(30).default(''), notes: z.string().max(300).default(''), zone: z.string().max(80).default(''),
});
export const submitOrderSchema = z.object({ requestId: z.string().uuid(), customer: customerSchema,
  items: z.array(z.object({ productId: z.string().max(30), option: z.string().trim().max(40), qty: z.number().int().min(1).max(99) })).min(1).max(100),
});
export type OrderItem = { productId: string; name: string; option: string; optionLabel: string; qty: number; price: number };
export type Order = { id: string; number: number; customer_name: string; customer_phone: string; address: string; payment: string; change_for: string; notes: string; items: OrderItem[]; subtotal: number; delivery_fee: number; delivery_zone: string; delivery_confirmed: boolean; total: number; status: OrderStatus; created_at: string; updated_at: string };
export function priceOrder(input: z.infer<typeof submitOrderSchema>, settings: StoreSettings) {
  const items = input.items.map(line => {
    const product = PRODUCTS.find(p => p.id === line.productId);
    if (!product) throw new Error('Um produto não está mais disponível. Atualize o catálogo.');
    if (product.options?.length && !line.option) throw new Error(`Escolha ${product.optionLabel?.toLowerCase()} de ${product.name}.`);
    return { productId: product.id, name: product.name, option: product.options?.length ? line.option : '', optionLabel: product.optionLabel ?? '', qty: line.qty, price: product.price };
  });
  const zone = settings.delivery_zones.find(z => z.id === input.customer.zone);
  if (settings.delivery_enabled && !zone) throw new Error('Escolha o bairro ou região de entrega.');
  const subtotal = Math.round(items.reduce((s,i) => s + Math.round(i.price * 100) * i.qty, 0)) / 100;
  const delivery_fee = settings.delivery_enabled ? zone?.fee ?? 0 : 0;
  return { items, subtotal, delivery_fee, delivery_zone: settings.delivery_enabled ? zone?.name ?? '' : '', delivery_confirmed: settings.delivery_enabled, total: Math.round((subtotal + delivery_fee) * 100) / 100 };
}
export function orderWhatsApp(order: Pick<Order,'number'|'customer_name'|'customer_phone'|'status'>) {
  const stage = ORDER_STAGES.find(s => s.id === order.status);
  return `https://wa.me/${normalizePhone(order.customer_phone)}?text=${encodeURIComponent(`Olá, ${order.customer_name}! ${stage?.message ?? ''}\nPedido #${order.number} — ${STORE_NAME}`)}`;
}
