import { describe, expect, it } from "vitest";
import { bulkPrice, bulkPriceChangeSchema, catalogProductSchema, videoExtension, youtubeId } from "@/lib/catalog";

describe("bulk price changes", () => {
  it("raises and lowers prices by percentage, rounded to cents", () => {
    expect(bulkPrice({ price: 25, compareAtPrice: null }, { mode: "percent", percent: 10 })).toEqual({ price: 27.5, compareAtPrice: null });
    expect(bulkPrice({ price: 19.9, compareAtPrice: null }, { mode: "percent", percent: -5 })).toEqual({ price: 18.9, compareAtPrice: null });
  });
  it("keeps a promotion's struck-through price in proportion on percentage changes", () => {
    expect(bulkPrice({ price: 40, compareAtPrice: 50 }, { mode: "percent", percent: 10 })).toEqual({ price: 44, compareAtPrice: 55 });
  });
  it("sets one price for all and drops a struck-through price that is no longer higher", () => {
    expect(bulkPrice({ price: 30, compareAtPrice: 35 }, { mode: "set", price: 25 })).toEqual({ price: 25, compareAtPrice: 35 });
    expect(bulkPrice({ price: 30, compareAtPrice: 35 }, { mode: "set", price: 40 })).toEqual({ price: 40, compareAtPrice: null });
  });
  it("rejects a zero percentage and prices of zero", () => {
    expect(bulkPriceChangeSchema.safeParse({ mode: "percent", percent: 0 }).success).toBe(false);
    expect(bulkPriceChangeSchema.safeParse({ mode: "set", price: 0 }).success).toBe(false);
    expect(bulkPriceChangeSchema.safeParse({ mode: "percent", percent: -91 }).success).toBe(false);
  });
});

describe("product videos", () => {
  it("reads the video id from common YouTube links", () => {
    for (const link of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=abc", "youtube.com/shorts/dQw4w9WgXcQ", "https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=10"]) expect(youtubeId(link)).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://vimeo.com/123")).toBeNull();
    expect(youtubeId("https://youtube.com/watch?v=curto")).toBeNull();
  });
  it("accepts MP4, MOV and WEBM uploads only", () => {
    expect(videoExtension({ name: "a.MOV", type: "" })).toBe("mov");
    expect(videoExtension({ name: "a.mp4", type: "video/mp4" })).toBe("mp4");
    expect(videoExtension({ name: "a.avi", type: "video/x-msvideo" })).toBeNull();
  });
  it("only stores uploaded video paths and YouTube ids", () => {
    const base = { id: "p1", name: "Produto", description: "", price: 10, category: "X", image: "", active: true, stock: null, optionLabel: "Sabor", allowOther: false, variations: [] };
    expect(catalogProductSchema.safeParse({ ...base, video: "uploads/abc.mp4", youtube: "dQw4w9WgXcQ" }).success).toBe(true);
    expect(catalogProductSchema.safeParse({ ...base, video: "https://evil.example/x.mp4" }).success).toBe(false);
    expect(catalogProductSchema.safeParse({ ...base, youtube: "<script>" }).success).toBe(false);
    expect(catalogProductSchema.parse(base).video).toBe("");
  });
});
