import { describe, expect, it } from "vitest";
import { isSummarizedMessage, nextReactionCounts, readReactionCounts } from "./reactionSummary";

describe("chat reaction counters", () => {
  it("only treats newly versioned messages as aggregated", () => {
    expect(isSummarizedMessage({})).toBe(false);
    expect(isSummarizedMessage({ reactionSummaryVersion: 1 })).toBe(true);
    expect(isSummarizedMessage({ reactionSummaryVersion: "1" })).toBe(false);
  });

  it("counts the first reaction and removes it if clicked twice", () => {
    const first = nextReactionCounts({}, undefined, "👍");
    expect(first["👍"]).toBe(1);
    const second = nextReactionCounts(first, "👍", "👍");
    expect(second["👍"]).toBe(0);
  });

  it("switches without losing other users' counts", () => {
    const original = { "👍": 12, "🔥": 6 };
    const next = nextReactionCounts(original, "👍", "🔥");
    expect(next).toMatchObject({ "👍": 11, "🔥": 7 });
    expect(original).toMatchObject({ "👍": 12, "🔥": 6 });
  });

  it("does not allow negative, non-integer or unrecognized counter values", () => {
    expect(readReactionCounts({ "👍": -10, "❤️": Number.NaN, "🔥": 1.25, "😂": "7" })).toMatchObject({
      "👍": 0, "❤️": 0, "🔥": 0, "😂": 0,
    });
    expect(nextReactionCounts({}, "👍", "🔥")).toMatchObject({ "👍": 0, "🔥": 1 });
    expect(() => nextReactionCounts({}, undefined, "🦄")).toThrow();
  });
});
