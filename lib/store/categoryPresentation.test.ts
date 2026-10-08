import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const marketplace = readFileSync(join(root, "app", "marketplace", "page.tsx"), "utf8");
const sharedIcons = readFileSync(join(root, "components", "store", "CategoryIcon.tsx"), "utf8");
const css = readFileSync(join(root, "app", "globals.css"), "utf8");
const adminCategories = readFileSync(
  join(root, "app", "admin", "categories", "page.tsx"),
  "utf8",
);

describe("marketplace category presentation", () => {
  it("uses official iconKey from approved categories", () => {
    expect(marketplace).toContain("visualId: item.iconKey");
    expect(sharedIcons).toContain('id === "entertainment"');
    expect(marketplace).toContain('import CategoryIcon from "@/components/store/CategoryIcon"');
    expect(marketplace).not.toContain("categoryVisualId(name");
  });

  it("finishes with a collision-safe grid instead of absolute category buttons", () => {
    expect(css).toContain("MARKETPLACE CATEGORY COLLISION FIX");
    expect(css).toContain("grid-template-columns: repeat(6, minmax(0, 1fr)) !important");
    expect(css).toContain("position: relative !important");
    expect(css).toContain("white-space: normal !important");
    expect(css).toContain("overflow-wrap: anywhere !important");
  });

  it("requires an explicit icon when creating a new category", () => {
    expect(adminCategories).toContain("Selecciona el icono que corresponde a la categoría.");
    expect(adminCategories).toContain("IconPicker");
    expect(adminCategories).toContain("<CategoryIcon id={key} />");
    expect(adminCategories).toContain("<CategoryIcon id={category.iconKey} />");
    expect(adminCategories).not.toContain("ICON_PREVIEW");
    expect(adminCategories).toContain("aria-pressed={value === key}");
    expect(adminCategories).toContain("changeCategoryIcon");
  });
});
