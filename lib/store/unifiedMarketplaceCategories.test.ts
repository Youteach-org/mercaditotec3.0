import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const adminPage = readFileSync(
  join(here, "..", "..", "app", "admin", "marketplace", "page.tsx"),
  "utf8",
);
const publicPage = readFileSync(
  join(here, "..", "..", "app", "marketplace", "page.tsx"),
  "utf8",
);
const repository = readFileSync(
  join(here, "publicMarketplaceRepository.ts"),
  "utf8",
);

describe("unified marketplace categories", () => {
  it("uses selectable approved categories instead of free-text category labels", () => {
    expect(adminPage).toContain("loadAdminCategories");
    expect(adminPage).toContain("toggleMarketplaceCategory");
    expect(adminPage).toContain("Categorías visibles en el Mercadito");
    expect(adminPage).not.toContain('TextField label="Comida"');
    expect(adminPage).not.toContain('TextField label="Bebidas"');
  });

  it("caps the public marketplace at 50 active stores, not 6 or 100", () => {
    expect(repository).toContain('.where("status", "==", "active")');
    expect(repository).toContain(".limit(50)");
    expect(repository).not.toContain(".limit(100)\n    .get();\n\n  return snapshot.docs");
  });

  it("filters real stores by approved category ids instead of inferred text", () => {
    expect(publicPage).toContain("(store.categoryIds ?? []).includes(category)");
    expect(publicPage).toContain("setApprovedCategories");
    expect(publicPage).toContain('label: "Todas"');
  });
});
