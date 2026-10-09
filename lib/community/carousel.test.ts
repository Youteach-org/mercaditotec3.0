import { describe, expect, it } from "vitest";
import { QUICK_NOTICE_ROTATION_INTERVAL_MS, nextQuickNoticeIndex } from "./carousel";

describe("Quick notices automatic rotation", () => {
  it("advances every seven seconds without requesting more data", () => {
    expect(QUICK_NOTICE_ROTATION_INTERVAL_MS).toBe(7_000);
    expect(nextQuickNoticeIndex(0, 4)).toBe(1);
    expect(nextQuickNoticeIndex(1, 4)).toBe(2);
    expect(nextQuickNoticeIndex(2, 4)).toBe(3);
    expect(nextQuickNoticeIndex(3, 4)).toBe(0);
  });

  it("does not move when there are zero or one active notices", () => {
    expect(nextQuickNoticeIndex(0, 0)).toBe(0);
    expect(nextQuickNoticeIndex(0, 1)).toBe(0);
  });

  it("wraps backwards with arrow or swipe navigation", () => {
    expect(nextQuickNoticeIndex(0, 3, -1)).toBe(2);
    expect(nextQuickNoticeIndex(2, 3, 1)).toBe(0);
    expect(nextQuickNoticeIndex(1, 3, -1)).toBe(0);
  });
});
