import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");
const marketplace = readFileSync(join(root, "app/marketplace/page.tsx"), "utf8");
const component = readFileSync(join(root, "components/community/QuickNoticesPanel.tsx"), "utf8");

describe("Avisos rápidos: mobile vertical layout", () => {
  it("keeps one working notices panel, with no duplicate Firebase listeners", () => {
    expect(marketplace.match(/<QuickNoticesPanel /g)).toHaveLength(1);
    expect(component).toContain("QUICK_NOTICE_ROTATION_INTERVAL_MS");
    expect(component).toContain('className="mkt-quick-actions"');
  });

  it("keeps actions and carousel inside the blue paper instead of floating above it", () => {
    const rule = css.slice(css.indexOf("/* AVISOS RÁPIDOS · MÓVIL VERTICAL"));
    expect(rule).toContain("@media (max-width: 620px)");
    expect(rule).toContain("top: auto !important");
    expect(rule).toContain("bottom: 22px !important");
    expect(rule).toContain(".mkt-quick-carousel-bar");
    expect(rule).toContain("position: static !important");
    expect(rule).toContain(".mkt-quick-actions");
    expect(rule).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(rule).toContain("overflow-y: auto !important");
    expect(rule).toContain("white-space: normal !important");
  });
});
