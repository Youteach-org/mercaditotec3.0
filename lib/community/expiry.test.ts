import { describe, expect, it } from "vitest";
import { isCommunityPostVisible, QUICK_NOTICE_LIFETIME_MS } from "./expiry";

const anchor = new Date("2026-10-13T18:00:00Z");
const make = (createdAt: string, type: "quick_notice" | "found_item" = "quick_notice",
              status: "active" | "resolved" = "active") => ({ createdAt, type, status });

describe("community notice expiry", () => {
  it("uses 48 hours, not seven days", () => {
    expect(QUICK_NOTICE_LIFETIME_MS).toBe(48 * 60 * 60 * 1000);
    expect(isCommunityPostVisible(make("2026-10-11T18:00:01Z"), anchor.getTime())).toBe(true);
    expect(isCommunityPostVisible(make("2026-10-11T18:00:00Z"), anchor.getTime())).toBe(false);
    expect(isCommunityPostVisible(make("2026-10-10T18:00:00Z"), anchor.getTime())).toBe(false);
  });

  it("does not expire found items before they are resolved", () => {
    expect(isCommunityPostVisible(make("2026-01-01T00:00:00Z", "found_item"), anchor.getTime())).toBe(true);
    expect(isCommunityPostVisible(make("2026-10-13T16:00:00Z", "found_item", "resolved"), anchor.getTime())).toBe(false);
  });

  it("rejects resolved, malformed and future dated quick notices", () => {
    expect(isCommunityPostVisible(make("2026-10-13T17:00:00Z", "quick_notice", "resolved"), anchor.getTime())).toBe(false);
    expect(isCommunityPostVisible(make("invalid"), anchor.getTime())).toBe(false);
    expect(isCommunityPostVisible(make("2026-10-13T18:00:01Z"), anchor.getTime())).toBe(false);
  });
});
