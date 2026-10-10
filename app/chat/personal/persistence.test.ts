import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const detailSource = readFileSync(join(here, "[uid]", "page.tsx"), "utf8");
const inboxSource = readFileSync(join(here, "page.tsx"), "utf8");
const messagesRoute = readFileSync(
  join(here, "..", "..", "api", "chat", "direct", "messages", "route.ts"),
  "utf8",
);
const conversationRoute = readFileSync(
  join(here, "..", "..", "api", "chat", "direct", "conversations", "route.ts"),
  "utf8",
);

describe("private chat persistence", () => {
  it("loads message history through authenticated server API", () => {
    expect(detailSource).toContain("/api/chat/direct/messages?targetUid=");
    expect(detailSource).not.toContain("setInterval");
    expect(detailSource).toContain("onSnapshot(recent");
    expect(detailSource).toContain("limit(40)");
    expect(detailSource).toContain('document.addEventListener("visibilitychange", watch)');
    expect(messagesRoute).toContain("listDirectMessages");
  });

  it("keeps sent messages visible immediately", () => {
    expect(detailSource).toContain("setMessages((current)");
    expect(detailSource).toContain("setMessages((current)");
    expect(detailSource).toContain("active Firestore listener delivers");
  });

  it("provides a persistent conversation inbox", () => {
    expect(inboxSource).toContain("Chats privados");
    expect(inboxSource).toContain("/api/chat/direct/conversations");
    expect(conversationRoute).toContain("listDirectConversations");
  });
});
