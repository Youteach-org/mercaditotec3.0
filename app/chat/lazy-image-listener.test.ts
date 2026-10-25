import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = readFileSync(join(root, "app", "chat", "page.tsx"), "utf8");

describe("chat image gallery read budget", () => {
  const imageListener = source.slice(
    source.indexOf("const watchImages = () => {") - 180,
    source.indexOf("const watchImages = () => {") + 1050,
  );

  it("does not attach the user's 100-image subscription before the gallery opens", () => {
    expect(imageListener).toContain("if (!firebaseUser || !galleryOpen) return;");
    expect(imageListener).toContain('collection(db, "users", firebaseUser.uid, "images")');
    expect(imageListener).toContain("limit(100)");
  });

  it("subscribes only when the gallery is open and resumes after extended background inactivity", () => {
    expect(imageListener).toContain("unsubscribe?.()");
    expect(source).toContain("}, [firebaseUser?.uid, galleryOpen, liveChatPaused]);");
    expect(imageListener).toContain("liveChatPaused");
  });
});
