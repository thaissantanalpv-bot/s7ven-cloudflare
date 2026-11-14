import { describe, expect, it } from "vitest";
import { unsharp } from "@/lib/photos/sharpen";

describe("unsharp", () => {
  it("boosts edges and keeps transparency", () => {
    const out = unsharp(new Uint8ClampedArray([200, 100, 50, 128]), new Uint8ClampedArray([150, 100, 60, 0]), 1);
    expect([...out]).toEqual([250, 100, 40, 128]);
  });
  it("leaves flat areas (below threshold) untouched to avoid boosting noise", () => {
    const out = unsharp(new Uint8ClampedArray([100, 100, 100, 255]), new Uint8ClampedArray([102, 99, 101, 255]));
    expect([...out]).toEqual([100, 100, 100, 255]);
  });
});
