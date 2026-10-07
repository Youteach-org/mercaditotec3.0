import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const panelSource = readFileSync(join(currentDirectory, "QuickNoticesPanel.tsx"), "utf8");

describe("Quick notices panel", () => {
  it("loads the four newest active community posts", () => {
    expect(panelSource).toContain("loadCommunityPosts");
    expect(panelSource).toContain("limit: 4");
    expect(panelSource).toContain("Avisos rápidos");
  });

  it("distinguishes found items and links to lost and found", () => {
    expect(panelSource).toContain("Encontrado");
    expect(panelSource).toContain("/cosas-perdidas");
  });

  it("creates quick notices without an image", () => {
    expect(panelSource).toContain("Publicar aviso");
    expect(panelSource).toContain('type: "quick_notice"');
    expect(panelSource).toContain("createCommunityPostRequest");
    expect(panelSource).toContain("imageUrl: null");
  });
});
