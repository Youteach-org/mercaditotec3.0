import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "app", "globals.css"), "utf8");
const builder = readFileSync(
  join(here, "store", "StoreBuilderClient.tsx"),
  "utf8",
);

describe("mobile marketplace visual fixes", () => {
  it("keeps store ribbon text outside the torn-paper clipping mask", () => {
    expect(css).toContain(".mkt-store-ribbon::before");
    expect(css).toContain("clip-path: none !important");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("line-height: 1.12");
  });

  it("gives the mobile store save button explicit high contrast", () => {
    expect(builder).toContain("store-builder-save-button");
    expect(css).toContain(".store-builder-save-button");
    expect(css).toContain("background: #123d82 !important");
    expect(css).toContain("color: #ffffff !important");
    expect(css).toContain(".store-builder-save-button:disabled");
  });
});
