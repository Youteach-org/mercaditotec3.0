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

  it("keeps community stores in a vertical, non-overlapping mobile column", () => {
    const mobileList = css.split("@media (max-width: 1100px) {" + String.fromCharCode(10) + "  .mkt-more-stores {")[1]?.split("/* Store editor:")[0];
    expect(mobileList).toBeDefined();
    expect(mobileList).toContain("flex-direction: column !important");
    expect(mobileList).toContain("flex-wrap: nowrap !important");
    expect(mobileList).toContain("gap: 56px !important");
    expect(mobileList).toContain(".mkt-more-stores > .mkt-more-store:nth-child(n)");
    expect(mobileList).toContain("width: 100% !important");
    expect(mobileList).toContain("margin: 0 !important");
    expect(mobileList).toContain("transform: none !important");
    expect(mobileList).not.toContain("overflow-x: auto");
    expect(mobileList).not.toContain("scroll-snap-type: x");
    expect(page).not.toContain("moreStoresRef");
    expect(page).not.toContain("desliza horizontalmente");
  });

  it("applies the vertical layout to Android's wide mobile CSS viewport", () => {
    const mobileList = css.split("@media (max-width: 1100px) {" + String.fromCharCode(10) + "  .mkt-more-stores {")[1]?.split("/* Store editor:")[0];
    expect(mobileList).toBeDefined();
    expect(mobileList).toContain("flex-direction: column !important");
    expect(mobileList).toContain("width: 100% !important");
    expect(mobileList).toContain("margin: 0 !important");
    expect(mobileList).toContain("transform: none !important");
    expect(mobileList).not.toContain("overflow-x: auto");
  });

  it("moves every cloud logo right without changing its vertical position or size", () => {
    const logoRule = css.split("/* COMMUNITY AND FEATURED STORE LOGOS — 2026-10-13")[1];
    expect(logoRule).toBeDefined();
    expect(logoRule).toContain(".mkt-store-card > .mkt-store-logo");
    expect(logoRule).toContain("left: auto !important");
    expect(logoRule).toContain("right: 8% !important");
    expect(logoRule).not.toContain("bottom:");
    expect(logoRule).not.toContain("top:");
    expect(logoRule).not.toContain("width:");
    expect(logoRule).not.toContain("height:");
  });

  it("keeps six featured stores and leaves the rest available", () => {
    expect(page).toContain("featuredOrder.slice(0, 6)");
    expect(page).toContain("featuredOrder.slice(6)");
  });
});
