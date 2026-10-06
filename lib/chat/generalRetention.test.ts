import { describe, expect, it } from "vitest";

import {
  GENERAL_CHAT_RESET_AT,
  GENERAL_CHAT_RETENTION_MS,
  generalChatCutoff,
  isGeneralChatMessageCurrent,
} from "./generalRetention";

describe("general chat retention", () => {
  it("uses a rolling 48-hour cutoff after the reset", () => {
    const now = GENERAL_CHAT_RESET_AT + GENERAL_CHAT_RETENTION_MS + 60_000;
    expect(generalChatCutoff(now)).toBe(now - GENERAL_CHAT_RETENTION_MS);
    expect(isGeneralChatMessageCurrent(now - GENERAL_CHAT_RETENTION_MS, now)).toBe(true);
    expect(isGeneralChatMessageCurrent(now - GENERAL_CHAT_RETENTION_MS - 1, now)).toBe(false);
  });

  it("hides every message from before the general chat reset", () => {
    expect(generalChatCutoff(GENERAL_CHAT_RESET_AT + 1_000)).toBe(
      GENERAL_CHAT_RESET_AT,
    );
    expect(
      isGeneralChatMessageCurrent(GENERAL_CHAT_RESET_AT - 1, GENERAL_CHAT_RESET_AT + 1_000),
    ).toBe(false);
  });
});
