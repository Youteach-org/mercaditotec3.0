import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");

describe("mobile store editor control safe area", () => {
  it("stops the paper clip-path from clipping the information panel contents", () => {
    expect(css).toContain("MOBILE STORE EDITOR CONTROL SAFE AREA");
    expect(css).toContain(".store-builder-panel-info");
    expect(css).toContain("clip-path: none !important");
    expect(css).toContain(".store-builder-panel-info::before");
  });

  it("keeps the torn paper only as a background layer", () => {
    expect(css).toContain("z-index: -1");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("background: #fffdf7");
  });

  it("keeps save and other step controls above decorative edges", () => {
    expect(css).toContain(".store-builder-save-button");
    expect(css).toContain("z-index: 5 !important");
    expect(css).toContain(".store-builder-step > .pt-5 > section");
    expect(css).toContain("padding-bottom: 3rem !important");
  });
});
