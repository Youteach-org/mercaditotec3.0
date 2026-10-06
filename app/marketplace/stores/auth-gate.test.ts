import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const marketplaceSource = readFileSync(
  join(currentDirectory, "..", "page.tsx"),
  "utf8",
);
const detailSource = readFileSync(
  join(currentDirectory, "[slug]", "page.tsx"),
  "utf8",
);
const apiSource = readFileSync(
  join(
    currentDirectory,
    "..",
    "..",
    "api",
    "marketplace",
    "stores",
    "[slug]",
    "route.ts",
  ),
  "utf8",
);

describe("public marketplace with authenticated store entry", () => {
  it("keeps the marketplace storefront public", () => {
    expect(marketplaceSource).not.toContain("<AuthGuard>");
    expect(marketplaceSource).toContain("/api/marketplace-v2");
    expect(marketplaceSource).toContain("/marketplace/stores/");
  });

  it("requires authentication before rendering a store", () => {
    expect(detailSource).toContain("<AuthGuard>");
    expect(detailSource).toContain("storeApiFetch(");
  });

  it("protects the store detail API and disables public caching", () => {
    expect(apiSource).toContain("requireFirebaseUser(request)");
    expect(apiSource).toContain("private, no-store");
    expect(apiSource).not.toContain('"Cache-Control": "public');
  });
});
