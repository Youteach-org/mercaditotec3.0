import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("./descubre.css", import.meta.url), "utf8");

describe("Descubre follows the original Marketplace's categories", () => {
  it("draws category icons over small separate captions, not text pills", () => {
    expect(source).toContain('className="discover-category-icon"');
    expect(source).toContain('className="discover-category-label"');
    expect(source).toContain("<CategoryIcon id={category.iconKey} />");
    expect(source).toContain("aria-pressed={filter === category.id}");
    expect(styles).toContain("flex-direction: column");
    expect(styles).toContain("display: flex;");
    expect(styles).toContain("scroll-snap-type: x proximity");
    expect(styles).toContain(".discover-filters .discover-category-button");
    expect(styles).toContain("flex: 0 0 68px");
  });

  it("keeps categories on one horizontal row on desktop and mobile", () => {
    expect(styles).toContain("flex-wrap: nowrap");
    expect(styles).toContain("overflow-x: auto");
    expect(source).toContain('tabIndex={0}');
    expect(source).toContain("Desliza para explorar categorías");
  });

  it("shows every real category from the catalogue instead of only categories with products", () => {
    expect(source).toContain('categories.filter((cat) => cat.id && cat.name)');
    expect(source).not.toContain('products.some((product) => product.categoryId === cat.id)');
  });

  it("prevents the right-side banner from covering Explora", () => {
    expect(source).not.toContain("discover-hero-note");
    expect(styles).not.toContain(".discover-hero-note");
    expect(styles).toContain("isolation: isolate");
  });
});
