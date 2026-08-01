import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(tsx|ts)$/.test(name) && !name.includes(".test.") ? [path] : [];
  });
}

describe("admin theme coverage", () => {
  it("does not use fixed white surfaces in theme-aware content", () => {
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(/\bbg-white(?:\s|\")/);
      expect(source, file).not.toContain("bg-slate-50");
    }
  });

  it("uses semantic tokens for modal, field and table surfaces", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain(".modal-surface");
    expect(css).toContain(".field-surface");
    expect(css).toContain(".table-head");
  });
});
