import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { hasTranslation } from "@buyhksim/i18n";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [".ts", ".tsx"].includes(extname(entry.name)) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("storefront translation coverage", () => {
  it("provides English and Traditional Chinese for every literal t() key", () => {
    const keys = new Set<string>();
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(match[1] ?? "");
    }
    const missing = [...keys].filter((key) => !hasTranslation("en", key) || !hasTranslation("zh-HK", key));
    expect(missing).toEqual([]);
  });
});
