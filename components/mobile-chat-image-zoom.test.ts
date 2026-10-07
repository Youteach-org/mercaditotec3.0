import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const shell = readFileSync(join(root, "components", "AppShell.tsx"), "utf8");
const viewer = readFileSync(join(root, "components", "GlobalImageViewer.tsx"), "utf8");
const chat = readFileSync(join(root, "app", "chat", "page.tsx"), "utf8");
const privateChat = readFileSync(
  join(root, "app", "chat", "personal", "[uid]", "page.tsx"),
  "utf8",
);
const cloud = readFileSync(
  join(root, "components", "store", "MarketplaceCloudMedia.tsx"),
  "utf8",
);

describe("mobile chat composer", () => {
  it("gives the general chat input two of three mobile columns", () => {
    expect(chat).toContain("max-[620px]:grid-cols-3");
    expect(chat).toContain("max-[620px]:col-span-2");
    expect(chat).toContain("max-[620px]:col-span-3");
  });

  it("keeps private chat as input plus compact send column", () => {
    expect(privateChat).toContain("grid-cols-[minmax(0,1fr)_auto]");
    expect(privateChat).toContain("max-[420px]:px-3");
  });
});

describe("global image zoom", () => {
  it("is mounted once in the application shell", () => {
    expect(shell).toContain('import GlobalImageViewer from "@/components/GlobalImageViewer"');
    expect(shell).toContain("<GlobalImageViewer />");
  });

  it("supports zoom controls, pinch pointers, pan and escape", () => {
    expect(viewer).toContain("MAX_SCALE = 6");
    expect(viewer).toContain("onPointerDown");
    expect(viewer).toContain("onPointerMove");
    expect(viewer).toContain("pointerDistance");
    expect(viewer).toContain('event.key === "Escape"');
    expect(viewer).toContain("onDoubleClick");
  });

  it("can open clipped SVG cloud covers at their original URL", () => {
    expect(cloud).toContain("data-image-zoom-src={imageUrl || undefined}");
    expect(viewer).toContain('target.closest("[data-image-zoom-src]")');
  });

  it("uses the global viewer for general-chat message images", () => {
    expect(chat).toContain('data-force-image-zoom="true"');
    expect(chat).not.toContain("zoomImageUrl");
  });
});
