import { describe, expect, it } from "vitest";
import { csvCell, csvDocument } from "@/lib/csv";

describe("safe spreadsheet exports", () => {
  it.each(["=HYPERLINK(\"https://example.org\")", "+123", "-1+1", "@SUM(1)", "  =1", "\t=1", "\r=1", "\n=1", "＝1"])("neutralizes formula cell %j", value => {
    expect(csvCell(value).startsWith('"\'')).toBe(true);
  });
  it("contains quotes, separators and line breaks inside one quoted cell", () => {
    expect(csvCell('Ana;"nome"\n=1')).toBe('"Ana;""nome""\n=1"');
    expect(csvDocument([["Ana", "7.00"]])).toBe('\uFEFF"Ana";"7.00"');
  });
});