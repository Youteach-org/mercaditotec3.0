import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const panelSource = readFileSync(
  join(currentDirectory, "QuickNoticesPanel.tsx"),
  "utf8",
);

describe("Quick notices mini board", () => {
  it("loads recent community posts and shows only the current post", () => {
    expect(panelSource).toContain("loadCommunityPosts");
    expect(panelSource).toContain("limit: 12");
    expect(panelSource).toContain("currentIndex");
    expect(panelSource).toContain("currentPost = posts[currentIndex]");
    expect(panelSource).not.toContain("posts.map((post)");
  });

  it("lets the user move one notice at a time with arrows or swipe", () => {
    expect(panelSource).toContain("moveNotice(-1)");
    expect(panelSource).toContain("moveNotice(1)");
    expect(panelSource).toContain("Aviso anterior");
    expect(panelSource).toContain("Aviso siguiente");
    expect(panelSource).toContain("handleTouchStart");
    expect(panelSource).toContain("handleTouchEnd");
    expect(panelSource).toContain("Desliza o usa las flechas");
  });

  it("keeps found items in the same mini board and links to Lost & Found", () => {
    expect(panelSource).toContain("Encontrado");
    expect(panelSource).toContain("mkt-quick-kind-found");
    expect(panelSource).toContain("Ver en Cosas perdidas");
    expect(panelSource).toContain('href="/cosas-perdidas"');
  });

  it("opens a quick notice composer instead of navigating away", () => {
    expect(panelSource).toContain('setComposerMode("notice")');
    expect(panelSource).toContain("Publicar aviso rápido");
    expect(panelSource).toContain('type: composerMode === "found" ? "found_item" : "quick_notice"');
  });

  it("opens a found-item composer with photo upload inside the marketplace", () => {
    expect(panelSource).toContain('setComposerMode("found")');
    expect(panelSource).toContain("Publicar objeto encontrado");
    expect(panelSource).toContain("prepareImageForUpload");
    expect(panelSource).toContain("validateMediaFileMeta(preparedPhoto)");
    expect(panelSource).toContain("buildCommunityPostMediaPath");
    expect(panelSource).toContain("uploadImageFile");
  });

  it("uses two compact actions inside the existing blue panel", () => {
    expect(panelSource).toContain("+ Aviso");
    expect(panelSource).toContain("+ Encontré algo");
    expect(panelSource).toContain('className="mkt-quick-actions"');
  });
});
