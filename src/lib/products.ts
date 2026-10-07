export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
};

// Número do WhatsApp da loja (somente dígitos, com DDI + DDD)
export const WHATSAPP_NUMBER = "5511999999999";
export const STORE_NAME = "Empório Bela Vista";

export const CATEGORIES = ["Todos", "Lanches", "Bebidas", "Doces", "Mercearia"];

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Hambúrguer Artesanal", description: "Pão brioche, blend 180g, queijo e salada", price: 32.9, category: "Lanches", emoji: "🍔" },
  { id: "p2", name: "Pizza Margherita", description: "Molho de tomate, muçarela e manjericão", price: 49.9, category: "Lanches", emoji: "🍕" },
  { id: "p3", name: "Wrap de Frango", description: "Frango grelhado, cream cheese e folhas", price: 24.5, category: "Lanches", emoji: "🌯" },
  { id: "p4", name: "Suco Natural 500ml", description: "Laranja, limão ou maracujá", price: 9.9, category: "Bebidas", emoji: "🧃" },
  { id: "p5", name: "Café Especial", description: "Grãos 100% arábica, coado na hora", price: 7.5, category: "Bebidas", emoji: "☕" },
  { id: "p6", name: "Refrigerante Lata", description: "350ml, diversos sabores", price: 6.0, category: "Bebidas", emoji: "🥤" },
  { id: "p7", name: "Brownie de Chocolate", description: "Com nozes e calda quente", price: 12.9, category: "Doces", emoji: "🍫" },
  { id: "p8", name: "Bolo de Pote", description: "Ninho com morango", price: 14.9, category: "Doces", emoji: "🍰" },
  { id: "p9", name: "Cookies (6 un.)", description: "Gotas de chocolate belga", price: 18.0, category: "Doces", emoji: "🍪" },
  { id: "p10", name: "Mel Puro 500g", description: "Mel silvestre de produtor local", price: 29.9, category: "Mercearia", emoji: "🍯" },
  { id: "p11", name: "Pão de Fermentação Natural", description: "Assado no dia, 800g", price: 22.0, category: "Mercearia", emoji: "🥖" },
  { id: "p12", name: "Queijo Minas Curado", description: "Peça de aproximadamente 500g", price: 38.5, category: "Mercearia", emoji: "🧀" },
];

export const PAYMENT_METHODS = ["Pix", "Cartão de crédito", "Cartão de débito", "Dinheiro"];

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
