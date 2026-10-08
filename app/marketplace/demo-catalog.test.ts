import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(dir, "page.tsx"), "utf8");
const snapshot = readFileSync(join(dir, "..", "..", "lib", "store", "publicMarketplaceSnapshot.ts"), "utf8");
const demos = readFileSync(join(dir, "..", "..", "lib", "store", "demoMarketplace.ts"), "utf8");

describe("Marketplace demo catalog", () => {
  it("preserves the original demos and offers more than six examples", () => {
    expect(demos.match(/id: "demo-/g)?.length).toBeGreaterThan(6);
    expect(demos).toContain('id: "demo-postres-ana"');
    expect(demos).toContain('id: "demo-papeleria-express"');
  });

  it("never caps demo stores to the six featured positions", () => {
    expect(snapshot).not.toContain("Math.max(0, 6 - liveStores.length)");
    expect(page).not.toContain("const needed = Math.max(0, 6 - liveStores.length)");
    expect(page).toContain("filteredStores.slice(0, 6)");
    expect(page).toContain("filteredStores.slice(6)");
  });
});
