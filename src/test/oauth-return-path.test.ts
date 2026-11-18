import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "../lib/oauth-return-path";

describe("OAuth local return path", () => {
  it("preserves the complete consent path", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=123#approve")).toBe("/.lovable/oauth/consent?authorization_id=123#approve");
  });
  it("rejects external and malformed return paths", () => {
    for (const path of ["//outside.invalid", "/\\outside.invalid", "https://outside.invalid", "/ok\n", null]) expect(oauthReturnPath(path)).toBe("/");
  });
});