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
