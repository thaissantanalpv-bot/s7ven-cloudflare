// Alfa Delivery (Entregas Expressas) via the ABRASEL Open Delivery standard. Pure helpers, safe for client and server.
export const ALFA_BASE_URL = "https://entregasexpressas.com.br/api/opendelivery";
export const ALFA_APP_ID = "d3e3eaf2-e585-4177-962a-7be998efab8e";
/** Merchant id shared with Alfa (36..100 chars). */
export const ALFA_MERCHANT_ID = "s7ven-lounge-tabacaria-aracatuba-site-0001";
export const ALFA_MERCHANT_NAME = "S7VEN Lounge e Tabacaria";

export type AlfaAddress = {
  country: "BR"; state: string; city: string; district: string; street: string; number: string;
  postalCode: string; complement: string; latitude: number; longitude: number;
};

/** Board stage an Alfa event moves the order to; null keeps the current stage. */
export function alfaEventStage(type: string): "out_for_delivery" | "delivered" | null {
  if (["ORDER_PICKED", "DELIVERY_ONGOING", "ARRIVED_AT_CUSTOMER"].includes(type)) return "out_for_delivery";
  if (["ORDER_DELIVERED", "DELIVERY_FINISHED"].includes(type)) return "delivered";
  return null;
}

const LABELS: Record<string, string> = {
  PENDING: "Aguardando a Alfa aceitar",
  ACCEPTED: "Alfa aceitou — procurando motoboy",
  REJECTED: "Alfa recusou a corrida",
  PICKUP_ONGOING: "Motoboy a caminho da loja",
  ARRIVED_AT_MERCHANT: "Motoboy chegou na loja",
  ORDER_PICKED: "Motoboy retirou o pedido",
  DELIVERY_ONGOING: "Em rota de entrega",
  ARRIVED_AT_CUSTOMER: "Motoboy chegou no cliente",
  ORDER_DELIVERED: "Entregue pela Alfa",
  DELIVERY_FINISHED: "Entrega finalizada",
  RETURNING_TO_MERCHANT: "Motoboy voltando para a loja",
  RETURNED_TO_MERCHANT: "Motoboy voltou para a loja",
  CANCELLED: "Corrida cancelada na Alfa",
};
export function alfaStatusLabel(status: string | null | undefined) {
  return status ? LABELS[status] ?? status : "";
}
/** Whether a new Alfa call is allowed (none yet, or the last one ended without a courier). */
export function canCallAlfa(status: string | null | undefined) {
  return !status || status === "REJECTED" || status === "CANCELLED";
}

/** Open Delivery payment block from the order's payment method. */
export function alfaPayments(payment: string, total: number, changeFor: string) {
  const amount = { value: Math.round(total * 100) / 100, currency: "BRL" };
  if (payment === "Pix") return { method: "OFFLINE", wirelessPos: false, offlineMethod: [{ type: "PIX", amount }] };
  if (payment === "Dinheiro") {
    const cash = Number(String(changeFor).replace(/[^\d,.]/g, "").replace(",", "."));
    const change = Number.isFinite(cash) && cash > total ? Math.round((cash - total) * 100) / 100 : 0;
    return { method: "OFFLINE", wirelessPos: false, offlineMethod: [{ type: "CASH", amount }], ...(change ? { change: { value: change, currency: "BRL" } } : {}) };
  }
  const type = payment === "Cartão de débito" ? "DEBIT" : payment === "Cartão de crédito" ? "CREDIT" : "OTHER";
  return { method: "OFFLINE", wirelessPos: type !== "OTHER", offlineMethod: [{ type, amount }] };
}

type GeocodeResult = { address_components?: { long_name: string; short_name: string; types: string[] }[]; geometry?: { location?: { lat: number; lng: number } } };
/** Structured Open Delivery address from a Google geocoding result; complement comes from the typed text. */
export function alfaAddressFromGeocode(result: GeocodeResult | undefined, complement = ""): AlfaAddress {
  const c = result?.address_components ?? [];
  const get = (t: string, short = false) => { const f = c.find(x => x.types.includes(t)); return (short ? f?.short_name : f?.long_name) ?? ""; };
  const loc = result?.geometry?.location;
  if (!loc || !get("route")) throw new Error("Não consegui localizar o endereço no mapa. Confira rua e número.");
  return {
    country: "BR",
    state: `BR-${get("administrative_area_level_1", true) || "SP"}`,
    city: get("administrative_area_level_2") || get("locality") || "Araçatuba",
    district: get("sublocality_level_1") || get("sublocality") || get("neighborhood") || "Centro",
    street: get("route"),
    number: get("street_number") || "S/N",
    postalCode: get("postal_code") || "16000-000",
    complement: complement.slice(0, 120),
    latitude: loc.lat,
    longitude: loc.lng,
  };
}
