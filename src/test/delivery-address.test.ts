import { describe, expect, it } from "vitest";
import { deliveryAddress, deliveryLocation, restoreDeliveryFields, deliveryFieldsComplete } from "@/lib/delivery-address";

const result = (city = "Araçatuba") => ({ status: "OK", results: [{
  address_components: [
    { long_name: city, short_name: city, types: ["administrative_area_level_2"] },
    { long_name: "São Paulo", short_name: "SP", types: ["administrative_area_level_1"] },
    { long_name: "Brasil", short_name: "BR", types: ["country"] },
    { long_name: "Rua de teste", short_name: "Rua de teste", types: ["route"] },
    { long_name: "123", short_name: "123", types: ["street_number"] },
  ], geometry: { location: { lat: -21.2, lng: -50.4 } },
}] });

describe("Endereço de entrega em Araçatuba", () => {
  it("preserves the street, number and neighborhood after reopening a saved cart", () => {
    const saved = { street: "Joaquim Candido", number: "2282", neighborhood: "", name: "Teste" };
    expect(restoreDeliveryFields(saved)).toEqual(saved);
    expect(restoreDeliveryFields({ address: "Rua antiga, 123", payment: "Pix" })).toEqual({ street: "Rua antiga, 123", number: "", neighborhood: "", payment: "Pix" });
    expect(restoreDeliveryFields({ ...saved, address: "Endereço antigo" }).street).toBe(saved.street);
  });
  it("does not calculate an address missing its street or number", () => {
    expect(deliveryFieldsComplete("Joaquim Candido", "2282")).toBe(true);
    expect(deliveryFieldsComplete("", "2282")).toBe(false);
    expect(deliveryFieldsComplete("Joaquim Candido", " ")).toBe(false);
  });
  it("includes the city automatically without duplicating it", () => {
    expect(deliveryAddress("Rua Marechal Deodoro, 1696")).toBe("Rua Marechal Deodoro, 1696, Araçatuba, SP, Brasil");
    expect(deliveryAddress("Rua de teste, 123, Aracatuba SP")).toBe("Rua de teste, 123, Aracatuba SP");
  });
  it("uses confirmed destination coordinates and rejects other cities", () => {
    expect(deliveryLocation(result())).toEqual({ latitude: -21.2, longitude: -50.4 });
    expect(() => deliveryLocation(result("Birigui"))).toThrow("somente em Araçatuba");
  });
  it("rejects missing and imprecise addresses", () => {
    expect(() => deliveryLocation({ status: "ZERO_RESULTS" })).toThrow("não encontrado");
    const incomplete = result();
    const first = incomplete.results[0];
    if (!first) throw new Error("Missing fixture");
    first.address_components = first.address_components.filter(c => !c.types.includes("street_number"));
    expect(() => deliveryLocation(incomplete)).toThrow("número completos");
  });
});
import { deliveryNeighborhood, joinAddressLine, reverseGeocodeAddress, splitAddressLine } from "@/lib/delivery-address";
itN("reads street, number and neighborhood from the live location", () => {
  expectN(reverseGeocodeAddress(result())).toEqual({ street: "Rua de teste", number: "123", neighborhood: "" });
  const located = result();
  const first = located.results[0];
  if (!first) throw new Error("Missing fixture");
  first.address_components = first.address_components.filter(c => !c.types.includes("street_number"));
  first.address_components.push({ long_name: "Jardim América", short_name: "Jd. América", types: ["sublocality_level_1", "sublocality"] });
  expectN(reverseGeocodeAddress(located)).toEqual({ street: "Rua de teste", number: "", neighborhood: "Jardim América" });
});
itN("rejects live locations outside Araçatuba or without a street", () => {
  expectN(() => reverseGeocodeAddress(result("Birigui"))).toThrow("fora de Araçatuba");
  expectN(() => reverseGeocodeAddress({ status: "ZERO_RESULTS" })).toThrow("Não encontramos um endereço");
  const noStreet = result();
  const first = noStreet.results[0];
  if (!first) throw new Error("Missing fixture");
  first.address_components = first.address_components.filter(c => !c.types.includes("route"));
  expectN(() => reverseGeocodeAddress(noStreet)).toThrow("Não identificamos a rua");
});
import { it as itN, expect as expectN } from "vitest";
itN("reads the neighborhood from geocoding results", () => {
  expectN(deliveryNeighborhood({ results: [{ address_components: [{ long_name: "Jardim Nova Yorque", short_name: "Jd.", types: ["sublocality_level_1", "sublocality", "political"] }] }] })).toBe("Jardim Nova Yorque");
  expectN(deliveryNeighborhood({ results: [] })).toBe("");
});
itN("splits the single street and number line the customer types", () => {
  expectN(splitAddressLine("Rua Joaquim Cândido 2282")).toEqual({ street: "Rua Joaquim Cândido", number: "2282" });
  expectN(splitAddressLine("Rua Joaquim Cândido, 2282")).toEqual({ street: "Rua Joaquim Cândido", number: "2282" });
  expectN(splitAddressLine("  Av. Carlos Chagas   1550-A  ")).toEqual({ street: "Av. Carlos Chagas", number: "1550-A" });
  expectN(splitAddressLine("Rua sem número")).toEqual({ street: "Rua sem número", number: "" });
  expectN(splitAddressLine("2282")).toEqual({ street: "2282", number: "" });
  expectN(joinAddressLine("Rua Joaquim Cândido", "2282")).toBe("Rua Joaquim Cândido, 2282");
  expectN(joinAddressLine("Rua Joaquim Cândido", "")).toBe("Rua Joaquim Cândido");
});
