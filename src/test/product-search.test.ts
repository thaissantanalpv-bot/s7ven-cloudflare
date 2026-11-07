import { describe, it, expect } from "vitest";
import { matchesSearch } from "@/lib/product-search";

const ziggy = { name: "Essência Ziggy", description: "", category: "Narguiles > Essências", options: ["Melancia", "7 Belo"] };

describe("product search", () => {
  it("ignores accents", () => expect(matchesSearch(ziggy, "essencia")).toBe(true));
  it("finds by flavor", () => expect(matchesSearch(ziggy, "melancia")).toBe(true));
  it("matches separate words", () => expect(matchesSearch(ziggy, "ziggy 7 belo")).toBe(true));
  it("rejects unrelated words", () => expect(matchesSearch(ziggy, "ziggy uva")).toBe(false));
});
