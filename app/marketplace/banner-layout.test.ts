import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const marketplace = readFileSync(join(root, "app/marketplace/page.tsx"), "utf8");
const discover = readFileSync(join(root, "app/descubre/page.tsx"), "utf8");
const css = readFileSync(join(root, "app/descubre/descubre.css"), "utf8");

describe("Community figures move from Tiendas to public Descubre", () => {
  it("shows Persons and Products in Descubre without a Tiendas counter", () => {
    expect(discover).toContain('className="discover-community-stats"');
    expect(discover).toContain("<span>Personas</span>");
    expect(discover).toContain("<span>Productos</span>");
    expect(marketplace).not.toContain('className="mkt-community-counts"');
    expect(marketplace).toContain('className="mkt-title-paper"');
  });
  it("preserves the mobile collage and readable counter sizes", () => {
    expect(css).toContain(".discover-community-stats");
    expect(css).toContain(".discover-community-stat");
    expect(css).toContain("@media (max-width: 740px)");
    expect(css).toContain(".discover-community-stat strong");
  });
});
