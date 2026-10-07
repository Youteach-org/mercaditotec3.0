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
  it("delays a single Marketplace image click so a second click can still be detected", () => {
    expect(viewer).toContain("pendingMarketplaceClickRef");
    expect(viewer).toContain("now - pending.startedAt <= 360");
    expect(viewer).toContain("}, 280)");
  });

  it("navigates to the store on the second click instead of opening the viewer", () => {
    expect(viewer).toContain("window.location.assign(href)");
    expect(viewer).toContain("clearPendingMarketplaceClick()");
  });

  it("annotates both Marketplace cover and logo with their store route", () => {
    expect(cloud).toContain("data-image-double-href");
    expect(marketplace).toContain("storeHref={!previewMode && !demo ? storeHref : undefined}");
    expect(marketplace).toContain("data-image-double-href={!previewMode && !demo ? storeHref : undefined}");
  });

  it("keeps normal card navigation available outside the zoomable image", () => {
    expect(marketplace).toContain("<Link href={storeHref} className={className}>");
  });
});
