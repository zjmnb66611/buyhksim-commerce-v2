import { describe, expect, it } from "vitest";
import { buildCsv, normalizeAdminPath, parseCsv } from "./admin-utils";

describe("admin utilities", () => {
  it("normalizes static-export trailing slashes", () => {
    expect(normalizeAdminPath("/inventory/")).toBe("/inventory");
    expect(normalizeAdminPath("/")).toBe("/");
  });

  it("parses quoted CSV cells without splitting embedded commas", () => {
    expect(parseCsv('title,description\r\n"香港卡","高速，支持热点"\r\n')).toEqual([["title", "description"], ["香港卡", "高速，支持热点"]]);
  });

  it("rejects malformed and oversized CSV input", () => {
    expect(() => parseCsv('title\n"未闭合')).toThrow("未闭合");
    expect(() => parseCsv("a\nb\nc", 2)).toThrow("10,000");
  });

  it("prevents spreadsheet formula injection in exported CSV", () => {
    const csv = buildCsv(["name"], [["=HYPERLINK(\"https://example.com\")"]]);
    expect(csv).toContain("'=HYPERLINK");
  });
});
