import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "AppShell.tsx"), "utf8");

describe("private message navigation", () => {
  it("keeps private-message counters event-driven with no timed polling", () => {
    expect(source).not.toContain("}, 8000);");
    expect(source).not.toContain("120_000");
    expect(source).toContain("if (fetching || document.hidden) return");
    expect(source).toContain("appUser?.unreadNotificationCount");
    expect(source).toContain('document.addEventListener("visibilitychange", onVisible)');
    expect(source).toContain('window.addEventListener("notifications:changed", onFocus)');
    expect(source).toContain('window.addEventListener("direct-chat:changed", onFocus)');
    expect(source).toContain('window.removeEventListener("direct-chat:changed", onFocus)');
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
