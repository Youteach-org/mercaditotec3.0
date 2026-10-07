import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { shouldOpenStoreFromImageInteraction } from "./marketplaceImageGesture";

describe("Marketplace image tap navigation", () => {
  it("keeps the first touch/click for image zoom, not store navigation", () => {
    expect(shouldOpenStoreFromImageInteraction(1, null, "/marketplace/stores/k-rollos")).toBe(false);
    expect(shouldOpenStoreFromImageInteraction(0, null, "/marketplace/stores/k-rollos")).toBe(false);
  });

  it("opens a store on a second tap even if mobile reports detail=1 twice", () => {
    expect(shouldOpenStoreFromImageInteraction(1, "/marketplace/stores/k-rollos", "/marketplace/stores/k-rollos")).toBe(true);
  });

  it("opens a store on native desktop double-click", () => {
    expect(shouldOpenStoreFromImageInteraction(2, null, "/marketplace/stores/k-rollos")).toBe(true);
  });

  it("does not open another store when tapping different images consecutively", () => {
    expect(shouldOpenStoreFromImageInteraction(1, "/marketplace/stores/one", "/marketplace/stores/two")).toBe(false);
  });

  it("handles image click in CAPTURE, before the parent Next Link onClick", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const viewer = readFileSync(join(here, "..", "..", "components", "GlobalImageViewer.tsx"), "utf8");
    expect(viewer).toContain('document.addEventListener("click", captureMarketplaceImageClick, true)');
    expect(viewer).toContain('document.removeEventListener("click", captureMarketplaceImageClick, true)');
    expect(viewer.indexOf('document.addEventListener("click", captureMarketplaceImageClick, true)'))
      .toBeLessThan(viewer.indexOf('document.addEventListener("click", openFromContentImage)'));
    expect(viewer).toContain("event.preventDefault()");
    expect(viewer).toContain("event.stopPropagation()");
    expect(viewer).toContain("pendingMarketplaceClickRef");
    expect(viewer).toContain("}, 550)");
  });
});
