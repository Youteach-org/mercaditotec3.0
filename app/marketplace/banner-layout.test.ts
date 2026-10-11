import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const page = readFileSync(join(root, "app/marketplace/page.tsx"), "utf8");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

describe("marketplace yellow banner and mobile subtitle", () => {
  it("nests the illustrated community figures inside the yellow paper", () => {
    const titleIndex = page.indexOf('<div className="mkt-title-paper">');
    const countersIndex = page.indexOf('className="mkt-community-counts"');
    const closeTitleIndex = page.indexOf('<div className="mkt-pink-note">');
    expect(titleIndex).toBeGreaterThan(0);
    expect(countersIndex).toBeGreaterThan(titleIndex);
    expect(countersIndex).toBeLessThan(closeTitleIndex);
    expect(page.slice(countersIndex, closeTitleIndex)).toContain('</div>');
  });
  it("reserves centered space for the icon counts and wraps the subtitle on small screens", () => {
    expect(css).toContain('HERO BANNER LAYOUT');
    expect(css).toContain('.mkt-approved-canvas .mkt-title-paper .mkt-community-counts');
    expect(css).toContain('white-space: normal !important;');
    expect(css).toContain('font-size: clamp(12px, 3.25vw, 15px) !important;');
  });
});
