import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const text = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("Mercadito monitoring and efficient chat", () => {
  it("only reads usage when admin opens or manually refreshes the page", () => {
    const page = text("../../app/admin/usage/page.tsx");
    const api = text("../../app/api/admin/usage/route.ts");
    expect(page).toContain('"/api/admin/usage"');
    expect(page).not.toContain("setInterval");
    expect(page).toContain("Actualizar");
    expect(api).toContain("await requireAdmin(request)");
    expect(api).toContain('"Cache-Control": "private, no-store"');
    const source = text("./usage.ts");
    expect(source).not.toContain('collection("');
    expect(source).toContain("120_000");
  });

  it("never performs periodic API cleanup or reconnects the chat listener every minute", () => {
    const chat = text("../../app/chat/page.tsx");
    expect(chat).not.toContain('moderationApiFetch(firebaseUser, "/api/chat/messages", {\n          method: "GET"');
    expect(chat).toContain("const watchMessages = () =>");
    expect(chat).toContain('document.addEventListener("visibilitychange", watchMessages)');
    expect(chat).toContain('document.addEventListener("visibilitychange", watchImages)');
    expect(chat).toContain('document.addEventListener("visibilitychange", watchReactions)');
    expect(chat).toContain("}, [firebaseUser?.uid]);");
    expect(chat).not.toContain("}, [firebaseUser?.uid, retentionNow]);");
    expect(chat).toContain("isGeneralChatMessageCurrent(Number(msg.createdAt), retentionNow)");
  });

  it("schedules limited daily cleanup, blocked from external requests", () => {
    const wrangler = text("../../wrangler.jsonc");
    const worker = text("../../cloudflare-runtime-entry.mjs");
    const endpoint = text("../../app/api/internal/chat-retention/route.ts");
    const messageApi = text("../../app/api/chat/messages/route.ts");
    const moderation = text("../moderation/repository.ts");
    expect(wrangler).toContain('"crons": ["0 10 * * *"]');
    expect(worker).toContain("async scheduled(");
    expect(worker).toContain('url.pathname === "/api/internal/chat-retention"');
    expect(endpoint).toContain('request.headers.get("x-mercadito-internal-runtime")');
    expect(messageApi).not.toContain("export async function GET");
    expect(moderation).not.toContain("await pruneExpiredGeneralChatMessages(now)");
    expect(moderation).toContain("pass < 4");
  });
});
