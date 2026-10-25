import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/chat/page.tsx", "utf8");

describe("chat Firestore listener read budget", () => {
  it("uses one visibility handler with a five-minute idle delay", () => {
    expect(source).toContain("const CHAT_BACKGROUND_IDLE_MS = 5 * 60_000");
    expect(source.match(/document\.addEventListener\("visibilitychange"/g)).toHaveLength(2);
    expect(source).toContain("setLiveChatPaused(true)");
    expect(source).toContain("setLiveChatPaused(false)");
  });

  it("does not unsubscribe and re-subscribe on every foreground or background event", () => {
    for (const name of ["watchMessages", "watchImages", "watchMyReactions", "watchLegacyReactions"]) {
      expect(source).not.toContain(`document.addEventListener("visibilitychange", ${name})`);
    }
    expect(source).toContain("}, [firebaseUser?.uid, liveChatPaused]);");
    expect(source).toContain("}, [firebaseUser?.uid, hasLegacyMessages, liveChatPaused]);");
  });

  it("still protects the image gallery and the legacy reaction migration", () => {
    expect(source).toContain("if (!firebaseUser || !galleryOpen || liveChatPaused) return;");
    expect(source).toContain("if (!firebaseUser || !hasLegacyMessages || liveChatPaused)");
    expect(source).toContain("limit(100)");
    expect(source).toContain("limit(500)");
    expect(source).toContain("return () => unsubscribe?.();");
  });
});
