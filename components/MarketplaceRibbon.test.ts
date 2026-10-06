import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");
const marketplace = readFileSync(join(here, "..", "app", "marketplace", "page.tsx"), "utf8");
const editor = readFileSync(join(here, "store", "MarketplaceCardEditorPreview.tsx"), "utf8");
const ribbon = readFileSync(join(here, "store", "MarketplaceRibbon.tsx"), "utf8");

describe("shared marketplace ribbon", () => {
  it("uses the same ribbon component in marketplace and store editor", () => {
    expect(marketplace).toContain("MarketplaceRibbon");
    expect(editor).toContain("MarketplaceRibbon");
    expect(ribbon).toContain("mkt-store-ribbon-text");
  });

  it("allows names to wrap without clipping on every surface", () => {
    expect(css).toContain("RIBBON TEXT SAFETY");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("text-overflow: clip");
    expect(css).toContain(".mkt-editor-card-stage .mkt-store-ribbon");
    expect(css).toContain("max-width: 92% !important");
  });
});
