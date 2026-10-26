import { describe, expect, it } from "vitest";
import { nextProductReview, isApprovedStoreProduct, needsLegacyProductReview } from "./productReview";

describe("store product review lifecycle", () => {
  it("requires a new review for every published creation or edit", () => {
    expect(nextProductReview("published", 0)).toMatchObject({ reviewStatus: "screening", contentVersion: 1, approvedVersion: null });
    expect(nextProductReview("published", 3)).toMatchObject({ reviewStatus: "screening", contentVersion: 4, approvedVersion: null });
  });

  it("does not publicly show unreviewed, rejected or outdated versions", () => {
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "screening", contentVersion: 1, approvedVersion: null })).toBe(false);
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "blocked", contentVersion: 1, approvedVersion: null })).toBe(false);
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "approved", contentVersion: 2, approvedVersion: 1 })).toBe(false);
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "approved", contentVersion: 2, approvedVersion: 2 })).toBe(true);
  });

  it("preserves legacy approval only for untouched products created before Descubre", () => {
    const old = Date.parse("2026-10-10T12:00:00Z");
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "legacy", createdAt: old, updatedAt: old })).toBe(true);
    expect(isApprovedStoreProduct({ visibility: "published", reviewStatus: "legacy", createdAt: Date.now(), updatedAt: Date.now() })).toBe(false);
  });

  it("queues previously uploaded unscreened products for manual review", () => {
    const recent = Date.parse("2026-10-24T12:00:00Z");
    expect(needsLegacyProductReview({ visibility: "published", reviewStatus: "legacy", createdAt: recent, updatedAt: recent })).toBe(true);
    expect(needsLegacyProductReview({ visibility: "hidden", reviewStatus: "legacy", createdAt: recent, updatedAt: recent })).toBe(false);
    expect(needsLegacyProductReview({ visibility: "published", reviewStatus: "approved", createdAt: recent, updatedAt: recent })).toBe(false);
  });
});
