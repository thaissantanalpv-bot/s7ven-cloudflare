import { describe, expect, it } from "vitest";
import { deliveryAddress, deliveryLocation } from "@/lib/delivery-address";

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