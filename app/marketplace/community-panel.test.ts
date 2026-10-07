import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(join(currentDirectory, "page.tsx"), "utf8");

describe("Marketplace community panel placement", () => {
  it("keeps the lower blue block and renders quick notices inside it", () => {
    expect(pageSource).toContain('className="mkt-bottom-blue"');
    expect(pageSource).toContain("QuickNoticesPanel");
  });

  it("does not replace the existing upper blue note", () => {
    expect(pageSource).toContain('className="mkt-blue-note"');
  });
});
