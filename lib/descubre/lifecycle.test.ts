import { describe, expect, it } from "vitest";
import { DEFAULT_LISTING_HOURS, LISTING_DURATIONS_HOURS, listingExpiryMs, listingDurationLabel } from "./lifecycle";

const createdAt = Date.parse("2026-10-16T14:00:00Z");

describe("Autoexpiración de Descubre", () => {
  it("never offers an indefinite listing", () => {
    expect(LISTING_DURATIONS_HOURS).not.toContain(0);
    expect(DEFAULT_LISTING_HOURS).toBe(48);
    expect(LISTING_DURATIONS_HOURS.every((hours) => hours > 0 && hours <= 168)).toBe(true);
    expect(listingDurationLabel(48)).toBe("2 días");
    expect(listingDurationLabel(168)).toBe("7 días");
  });
  it("expires previously open-ended advertisements after 48h too", () => {
    const legacy = { createdAt, expiresAt: null };
    expect(listingExpiryMs(legacy)).toBe(createdAt + 48 * 3_600_000);
    expect(listingExpiryMs({ ...legacy, expiresAt: 0 })).toBe(createdAt + 48 * 3_600_000);
  });
  it("honors time-limited listings even if the owner never marks them sold", () => {
    expect(listingExpiryMs({ createdAt, expiresAt: createdAt + 6 * 3_600_000 })).toBe(createdAt + 6 * 3_600_000);
  });
});
