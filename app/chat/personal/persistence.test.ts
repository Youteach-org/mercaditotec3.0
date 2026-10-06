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
    expect(detailSource).toContain("setInterval");
    expect(detailSource).not.toContain("onSnapshot");
    expect(messagesRoute).toContain("listDirectMessages");
  });

  it("keeps sent messages visible immediately", () => {
    expect(detailSource).toContain("setMessages((current)");
    expect(detailSource).toContain("await loadMessages()");
  });

  it("provides a persistent conversation inbox", () => {
    expect(inboxSource).toContain("Chats privados");
    expect(inboxSource).toContain("/api/chat/direct/conversations");
    expect(conversationRoute).toContain("listDirectConversations");
  });
});
