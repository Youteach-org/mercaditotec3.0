import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
describe("avoid speculative Cloudflare Worker requests", () => {
  for (const file of ["components/AppShell.tsx", "app/marketplace/page.tsx"]) {
    it(`${file}: navigates only when selected rather than prefetching`, () => {
      const source = readFileSync(join(root, file), "utf8");
      expect((source.match(/<Link\b/g) ?? []).length).toBeGreaterThan(0);
      expect((source.match(/<Link\s+prefetch=\{false\}/g) ?? []).length)
        .toBe((source.match(/<Link\b/g) ?? []).length);
    });
  }
});
