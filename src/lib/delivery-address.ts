export const DELIVERY_CITY = "Araçatuba, SP";

export const SAVED_CUSTOMER_KEY = "s7ven-saved-customer";

export type SavedCustomerAddress = {
  name?: string;
  phone?: string;
  street: string;
  number: string;
  neighborhood?: string;
};

export function getSavedCustomerAddress(): SavedCustomerAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_CUSTOMER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCustomerAddress;
    if (parsed && typeof parsed.street === "string" && parsed.street.trim() && typeof parsed.number === "string" && parsed.number.trim()) {
      return {
        name: typeof parsed.name === "string" ? parsed.name : "",
        phone: typeof parsed.phone === "string" ? parsed.phone : "",
        street: parsed.street.trim(),
        number: parsed.number.trim(),
        neighborhood: typeof parsed.neighborhood === "string" ? parsed.neighborhood.trim() : "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveCustomerAddress(data: SavedCustomerAddress): void {
  if (typeof window === "undefined") return;
  try {
    if (data.street.trim() && data.number.trim()) {
      localStorage.setItem(SAVED_CUSTOMER_KEY, JSON.stringify({
        name: data.name?.trim() || "",
        phone: data.phone?.trim() || "",
        street: data.street.trim(),
        number: data.number.trim(),
        neighborhood: data.neighborhood?.trim() || "",
      }));
    }
  } catch {}
}

export function restoreDeliveryFields(saved: Record<string, unknown>) {
  const { address, street, number, neighborhood, ...rest } = saved;
  return {
    ...rest,
    street: typeof street === "string" && street.trim() ? street : typeof address === "string" ? address.trim() : "",
    number: typeof number === "string" ? number : "",
    neighborhood: typeof neighborhood === "string" ? neighborhood : "",
  };
}

export function deliveryFieldsComplete(street: string, number: string) {
  return street.trim().length >= 2 && number.trim().length > 0;
}

const TRAILING_NUMBER = /^(.*?)[,\s]+(\d{1,6}[a-zA-Z-]*)$/;

/** Splits the single "street and number" line the customer types. */
export function splitAddressLine(line: string): { street: string; number: string } {
  const trimmed = line.trim().replace(/\s+/g, " ");
  const found = TRAILING_NUMBER.exec(trimmed);
  return { street: (found?.[1] ?? trimmed).trim(), number: found?.[2] ?? "" };
}

export function joinAddressLine(street: string, number: string) {
  return [street.trim(), number.trim()].filter(Boolean).join(", ");
}


export function deliveryAddress(address: string) {
  const trimmed = address.trim();
  const normalized = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.includes("aracatuba") ? trimmed : `${trimmed}, ${DELIVERY_CITY}, Brasil`;
}

type GeocodeResult = {
  address_components?: { long_name: string; short_name: string; types: string[] }[];
  geometry?: { location?: { lat: number; lng: number }; location_type?: string };
  partial_match?: boolean;
};

export function deliveryLocation(payload: { status?: string; results?: GeocodeResult[] }) {
  const result = payload.results?.[0];
  if (payload.status !== "OK" || !result) throw new Error("Endereço não encontrado. Confira rua, número e bairro em Araçatuba.");
  const components = result.address_components ?? [];
  const city = components.find(c => c.types.includes("administrative_area_level_2"))?.long_name ?? components.find(c => c.types.includes("locality"))?.long_name;
  const state = components.find(c => c.types.includes("administrative_area_level_1"))?.short_name;
  const country = components.find(c => c.types.includes("country"))?.short_name;
  const cityName = city?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (cityName !== "aracatuba" || state !== "SP" || country !== "BR") throw new Error("Fazemos entregas somente em Araçatuba, SP. Confira o endereço ou escolha retirada na loja.");
  const location = result.geometry?.location;
  if (result.partial_match || !components.some(c => c.types.includes("route")) || !components.some(c => c.types.includes("street_number")) || !location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) throw new Error("Informe a rua e o número completos para calcular a entrega em Araçatuba.");
  return { latitude: location.lat, longitude: location.lng };
}
/** Neighborhood (bairro) reported by Google for the first geocoding result, if any. */
export function deliveryNeighborhood(payload: { results?: GeocodeResult[] }) {
  const components = payload.results?.[0]?.address_components ?? [];
  const found = ["sublocality_level_1", "sublocality", "neighborhood"].map(t => components.find(c => c.types.includes(t))?.long_name).find(Boolean);
  return found?.trim().slice(0, 80) ?? "";
}
