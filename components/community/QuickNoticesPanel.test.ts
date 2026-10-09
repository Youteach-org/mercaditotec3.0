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
  it("automatically rotates every seven seconds but does not refetch posts for each slide", () => {
    expect(panelSource).toContain("QUICK_NOTICE_ROTATION_INTERVAL_MS");
    expect(panelSource).toContain("window.setInterval");
    expect(panelSource).toContain("window.clearInterval");
    expect(panelSource).toContain("nextQuickNoticeIndex(current, posts.length)");
    expect(panelSource).toContain('document.visibilityState === "hidden"');
    expect(panelSource).toContain("posts.length <= 1");
    expect(panelSource).toContain("rotationPaused || isHovered || hasFocus");
    const intervalBody = panelSource.split("const timer = window.setInterval(")[1]?.split("}, QUICK_NOTICE_ROTATION_INTERVAL_MS)")[0];
    expect(intervalBody).toBeDefined();
    expect(intervalBody).not.toContain("refresh(");
  });

  it("lets people pause, swipe or use arrows and animates the active notice", () => {
    expect(panelSource).toContain("Pausar rotación de avisos");
    expect(panelSource).toContain("Reanudar rotación de avisos");
    expect(panelSource).toContain("mkt-quick-card-anim-");
    expect(panelSource).toContain("setManualNavigationVersion");
    expect(panelSource).toContain("onPointerEnter");
    expect(panelSource).toContain('event.pointerType === "mouse"');
    expect(panelSource).toContain(':focus-visible');
    expect(panelSource).toContain("onFocus");
  });

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
