import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const inboxSource = readFileSync(join(here, "page.tsx"), "utf8");
const threadSource = readFileSync(join(here, "[uid]", "page.tsx"), "utf8");

describe("private message unread UX", () => {
  it("never downloads inbox or active-thread histories on a timer", () => {
    expect(inboxSource).not.toContain("setInterval");
    expect(threadSource).not.toContain("setInterval");
    expect(inboxSource).toContain("appUser?.unreadNotificationCount");
    expect(inboxSource).toContain('window.addEventListener("notifications:changed", refresh)');
    expect(threadSource).toContain("onSnapshot(recent");
    expect(threadSource).toContain('window.dispatchEvent(new Event("direct-chat:changed"))');
    expect(threadSource).toContain("Ver mensajes anteriores");
  });

  it("renders unread badges in the private inbox", () => {
    expect(inboxSource).toContain("conversation.unreadCount");
    expect(inboxSource).toContain("bg-red-600");
  });

  it("marks incoming messages read when the thread is open", () => {
    expect(threadSource).toContain("/api/chat/direct/read");
    expect(threadSource).toContain("lastMarkedIncomingRef");
  });
});
