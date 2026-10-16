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

  it("keeps extra shops tilted and staggered while scrolling vertically on phones", () => {
    const scrapbook = css.split("/* RESPONSIVE COMMUNITY SCRAPBOOK — 2026-10-16")[1]?.split("/* Store editor:")[0];
    expect(scrapbook).toBeDefined();
    const phone = scrapbook.split("@media (max-width: 620px) {")[1];
    expect(phone).toBeDefined();
    expect(phone).toContain("display: grid !important");
    expect(phone).toContain("grid-template-columns: minmax(0, 1fr) !important");
    expect(phone).toContain("row-gap: clamp(52px, 11vw, 70px) !important");
    expect(phone).toContain("height: clamp(360px, 120vw, 490px) !important");
    expect(phone).toContain("width: 88% !important");
    expect(phone).toContain("width: 79% !important");
    expect(phone).toContain("justify-self: start");
    expect(phone).toContain("justify-self: end");
    expect(phone).toContain("transform: rotate(-3deg) !important");
    expect(phone).toContain("transform: rotate(2.8deg) !important");
    expect(phone).not.toContain("transform: none !important");
    expect(phone).not.toContain("overflow-x: auto");
    expect(phone).not.toContain("flex-direction: column");
    expect(page).not.toContain("moreStoresRef");
  });

  it("arranges landscape Android and tablet shops in two separated tilted columns", () => {
    const scrapbook = css.split("/* RESPONSIVE COMMUNITY SCRAPBOOK — 2026-10-16")[1]?.split("/* Store editor:")[0];
    expect(scrapbook).toBeDefined();
    const landscape = scrapbook.split("@media (min-width: 621px) and (max-width: 1100px) {")[1]?.split("@media (max-width: 620px) {")[0];
    expect(landscape).toBeDefined();
    expect(landscape).toContain("display: grid !important");
    expect(landscape).toContain("grid-template-columns: repeat(2, minmax(0, 1fr)) !important");
    expect(landscape).toContain("row-gap: clamp(48px, 6vw, 72px) !important");
    expect(landscape).toContain("height: clamp(330px, 39vw, 440px) !important");
    expect(landscape).toContain("transform: rotate(-2.7deg) !important");
    expect(landscape).toContain("transform: rotate(2.4deg) !important");
    expect(landscape).toContain("width: 85% !important");
    expect(landscape).toContain("justify-self: end");
    expect(landscape).not.toContain("flex-direction: column");
    expect(landscape).not.toContain("transform: none !important");
    expect(landscape).not.toContain("margin-top: -");
    expect(page).not.toContain("desliza horizontalmente");
  });

  it("moves every cloud logo right without changing its vertical position or size", () => {
    const logoRule = css.split("/* COMMUNITY AND FEATURED STORE LOGOS — 2026-10-13")[1]?.split("/* STORE EMOJI RATINGS — 2026-10-14")[0];
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
