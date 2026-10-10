import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { directChatId } from "./directRepository";

describe("directChatId", () => {
  it("is stable regardless of participant order", () => {
    expect(directChatId("alice", "victim")).toBe(
      directChatId("victim", "alice"),
    );
  });

  it("changes when a participant changes", () => {
    expect(directChatId("alice", "victim")).not.toBe(
      directChatId("alice", "other"),
    );
  });
});

describe("private chat read budget", () => {
  it("filters Firestore conversations by current user instead of scanning all users' chats", () => {
    const source = readFileSync(new URL("./directRepository.ts", import.meta.url), "utf8");
    expect(source).toContain('.where("participantUids", "array-contains", actorUid)');
    expect(source).not.toContain('db.collection("direct_chats").list(250)');
  });
});
