import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("./descubre.css", import.meta.url), "utf8");
const focusedStyles = css.slice(css.indexOf("/* Portada con productos prioritarios"));

describe("Descubre: productos visibles sin espacio desperdiciado", () => {
  it("positions the three counters within the search hero instead of a full-width row", () => {
    const hero = page.slice(page.indexOf('<section className="discover-hero"'), page.indexOf('<section className="discover-category-section"'));
    expect(hero).toContain('className="discover-community-stats"');
    expect(hero.indexOf('className="discover-community-stats"')).toBeGreaterThan(hero.indexOf('className="discover-publish"'));
    expect(focusedStyles).toContain("grid-column: 2 / 4");
    expect(focusedStyles).toContain("grid-row: 2");
    expect(focusedStyles).toContain("min-height: 0");
  });

  it("puts Explora in the same row as desktop category icons and does not hide categories", () => {
    expect(focusedStyles).toContain("grid-template-columns: clamp(130px, 12.5vw, 185px) minmax(0, 1fr)");
    expect(focusedStyles).toContain("min-height: 70px");
    expect(page).toContain('className="discover-filters"');
    expect(page).toContain("visibleCategories.map");
  });

  it("removes redundant large heading and reduces navigation before products", () => {
    expect(page).toContain("Productos de la comunidad");
    expect(page).not.toContain("Descubre productos<br />de la comunidad");
    expect(focusedStyles).toContain("min-height: 42px");
    expect(focusedStyles).toContain(".discover-wall { padding-top: 1px; }");
    expect(focusedStyles).toContain(".discover-paper-top { height: 16px; }");
  });

  it("keeps filters scrollable and compact on phones while preserving product photo size", () => {
    expect(focusedStyles).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(focusedStyles).toContain("grid-row: 3");
    expect(focusedStyles).toContain(".discover-category-swipe-hint");
    expect(focusedStyles).not.toContain(".discover-product-photo");
    expect(css).toContain("overflow-x: auto");
  });
});
