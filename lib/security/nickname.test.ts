import { describe, expect, it } from "vitest";

import {
  normalizeNickname,
  validateNicknameSyntax,
} from "./nickname";

describe("nickname validation", () => {
  it("normalizes nicknames case-insensitively", () => {
    expect(normalizeNickname("  Luis_26 ")).toBe("luis_26");
  });

  it("accepts letters, numbers and underscore", () => {
    expect(validateNicknameSyntax("luis_26")).toEqual({
      valid: true,
      nickname: "luis_26",
    });
  });

  it("rejects spaces and punctuation", () => {
    expect(validateNicknameSyntax("luis chavez").valid).toBe(false);
    expect(validateNicknameSyntax("luis.chavez").valid).toBe(false);
  });

  it("requires between 3 and 24 characters", () => {
    expect(validateNicknameSyntax("ab").valid).toBe(false);
    expect(validateNicknameSyntax("a".repeat(25)).valid).toBe(false);
  });
});
