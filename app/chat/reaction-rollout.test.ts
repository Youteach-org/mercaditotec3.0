import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/chat/page.tsx", "utf8");
const server = readFileSync("lib/moderation/repository.ts", "utf8");

describe("chat reaction rollout preserves existing records", () => {
  it("does not load a global 500-reaction feed for new-only chat timelines", () => {
    expect(source).toContain("const hasLegacyMessages = messages.some");
    expect(source).toContain("!isSummarizedMessage(message)");
    expect(source).toContain("if (!firebaseUser || !hasLegacyMessages)");
    expect(source).toContain("setLegacyReactions([])");
  });

  it("limits new chat subscriptions to the user's own reaction documents", () => {
    expect(source).toContain('where("userId", "==", firebaseUser.uid)');
    expect(source).toContain("const counts = readReactionCounts(message.reactionCounts)");
    expect(source).toContain("const groupedReactions = reactionsForMessage(msg)");
  });

  it("marks only newly created messages as summarized", () => {
    expect(server).toContain("reactionSummaryVersion: 1");
    expect(server).toContain('reactionCounts: { "👍": 0');
  });
});
