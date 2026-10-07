import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const viewer = readFileSync(join(root, "components", "GlobalImageViewer.tsx"), "utf8");
const marketplace = readFileSync(join(root, "app", "marketplace", "page.tsx"), "utf8");
const cloud = readFileSync(
  join(root, "components", "store", "MarketplaceCloudMedia.tsx"),
  "utf8",
);

describe("Marketplace image click behavior", () => {
  it("keeps a single image click pending long enough for a real double click", () => {
    expect(viewer).toContain("pendingMarketplaceClickRef");
    expect(viewer).toContain("shouldOpenStoreFromImageInteraction");
    expect(viewer).toContain("}, 550)");
  });

  it("uses the browser dblclick event and cancels pending zoom before navigation", () => {
    expect(viewer).toContain('document.addEventListener("dblclick", openMarketplaceStoreFromDoubleClick, true)');
    expect(viewer).toContain("clearPendingMarketplaceClick()");
    expect(viewer).toContain("window.location.assign(href)");
  });

  it("annotates both Marketplace cover and logo with their store route", () => {
    expect(cloud).toContain("data-image-double-href");
    expect(marketplace).toContain("storeHref={!previewMode && !demo ? storeHref : undefined}");
    expect(marketplace).toContain("data-image-double-href={!previewMode && !demo ? storeHref : undefined}");
  });

  it("keeps normal card navigation available outside the zoomable image", () => {
    expect(marketplace).toContain("href={storeHref}");
    expect(marketplace).toContain("onClickCapture={(event) => {");
    expect(marketplace).toContain('target.closest(".mkt-store-photo, .mkt-store-logo")');
  });
});
