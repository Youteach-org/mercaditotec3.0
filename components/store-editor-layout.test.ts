import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const builder = readFileSync(join(here, "store", "StoreBuilderClient.tsx"), "utf8");
const products = readFileSync(join(here, "store", "StoreProductsSection.tsx"), "utf8");
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");

describe("store editor product layout", () => {
  it("places product editing after the storefront preview", () => {
    const previewIndex = builder.indexOf("<StorefrontPreview");
    const productIndex = builder.indexOf('className="store-builder-step store-builder-product-step');
    expect(previewIndex).toBeGreaterThan(-1);
    expect(productIndex).toBeGreaterThan(previewIndex);
    expect(builder).toContain('className="store-builder-side order-2 space-y-5 xl:order-2"');
  });

  it("uses a safe top inset so torn-paper clipping cannot cut product headings", () => {
    expect(products).toContain("store-products-section");
    expect(css).toContain(".store-builder-step > .pt-5 > section");
    expect(css).toContain("padding-top: 3.75rem !important");
    expect(css).toContain(".store-products-section h2");
    expect(css).toContain("overflow: visible !important");
  });

  it("keeps form before preview/product stack on narrow screens", () => {
    expect(css).toContain(".store-builder-form");
    expect(css).toContain("order: 1 !important");
    expect(css).toContain(".store-builder-side");
    expect(css).toContain("order: 2 !important");
  });
});
