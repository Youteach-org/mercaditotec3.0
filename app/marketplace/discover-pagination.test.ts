import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "page.tsx"), "utf8");
const css = readFileSync(join(here, "..", "globals.css"), "utf8");

describe("Marketplace discover pagination and store ribbons", () => {
  it("makes Descubre a real pagination action rather than decorative text", () => {
    expect(page).toContain("onClick={showNextStores}");
    expect(page).toContain("const storesPerPage = 12");
    expect(page).toContain("visibleAdditionalStores.map");
    expect(page).toContain('id="more-stores"');
  });

  it("constrains handwritten ribbons to the cloud card", () => {
    expect(css).toContain(".mkt-store-slot .mkt-hand-note");
    expect(css).toContain("max-width: 43%");
    expect(css).toContain("right: 3% !important");
  });

  it("makes mobile community cards swipeable without overlapping the featured layout", () => {
    const mobileCarousel = css.split("/* MOBILE COMMUNITY STORE CAROUSEL")[1];
    expect(mobileCarousel).toBeDefined();
    expect(mobileCarousel).toContain("flex-wrap: nowrap !important");
    expect(mobileCarousel).toContain("overflow-x: auto !important");
    expect(mobileCarousel).toContain("scroll-snap-type: x mandatory");
    expect(mobileCarousel).toContain(".mkt-more-stores > .mkt-more-store:nth-child(n)");
    expect(mobileCarousel).toContain("margin: 0 !important");
    expect(page).toContain("ref={moreStoresRef}");
    expect(page).toContain('moreStoresRef.current?.scrollTo({ left: 0, behavior: "auto" })');
    expect(page).toContain("featuredOrder.slice(0, 6)");
  });

  it("keeps six featured stores and leaves the rest available", () => {
    expect(page).toContain("featuredOrder.slice(0, 6)");
    expect(page).toContain("featuredOrder.slice(6)");
  });
});
