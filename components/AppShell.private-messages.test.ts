import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "AppShell.tsx"), "utf8");

describe("private message navigation", () => {
  it("avoids high-frequency Firestore polling and suspends checks in background tabs", () => {
    expect(source).not.toContain("}, 8000);");
    expect(source).toContain("120_000");
    expect(source).toContain("if (fetching || document.hidden) return");
    expect(source).toContain('document.addEventListener("visibilitychange", onVisible)');
    expect(source).toContain('window.addEventListener("notifications:changed", onFocus)');
    expect(source).toContain('document.removeEventListener("visibilitychange", onVisible)');
    expect(source).toContain('window.removeEventListener("notifications:changed", onFocus)');
  });

  it("routes the chat navigation item to the private inbox", () => {
    expect(source).toContain('{ href: "/chat/personal", label: "Mensajes", icon: "chat" }');
  });

  it("shows a real unread count instead of a decorative chat dot", () => {
    expect(source).toContain("privateUnreadCount");
    expect(source).toContain("totalUnread");
    expect(source).toContain('href="/chat/personal"');
    expect(source).not.toContain('item.href === "/chat"');
  });

  it("surfaces an on-page alert when private unread count grows", () => {
    expect(source).toContain("Tienes 1 mensaje privado sin leer");
    expect(source).toContain("messageAlert");
  });
});
