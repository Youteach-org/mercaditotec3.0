import { describe, expect, it } from "vitest";
import { buildDiscoverFeed, DISCOVER_LEGACY_CUTOFF_MS, isEligibleForDiscover, type DiscoverSourceProduct } from "./discoverFeed";

const oldDate = Date.parse("2026-10-10T12:00:00Z");
const make = (overrides: Partial<DiscoverSourceProduct> = {}): DiscoverSourceProduct => ({
  id: "a", storeId: "active-store", title: "Televisión", description: "En venta",
  imageUrls: ["https://example.com/tv.jpg"], categoryId: "tech", priceType: "fixed",
  priceAmount: 2000, createdAt: oldDate, updatedAt: oldDate,
  reviewStatus: "legacy", ...overrides,
});
const store = {
  id: "active-store", name: "TecStore", slug: "tecstore", logoUrl: null, deliveryLocation: "Campus",
};

describe("Descubre eligibility and security", () => {
  it("shows only already-published, untouched legacy products or version-matched approvals", () => {
    expect(isEligibleForDiscover(make())).toBe(true);
    expect(isEligibleForDiscover(make({ createdAt: DISCOVER_LEGACY_CUTOFF_MS + 100 }))).toBe(false);
    expect(isEligibleForDiscover(make({ updatedAt: DISCOVER_LEGACY_CUTOFF_MS + 100 }))).toBe(false);
    expect(isEligibleForDiscover(make({ reviewStatus: "pending_review" }))).toBe(false);
    expect(isEligibleForDiscover(make({ reviewStatus: "blocked" }))).toBe(false);
    expect(isEligibleForDiscover(make({ reviewStatus: "approved" }))).toBe(false);
    expect(isEligibleForDiscover(make({ reviewStatus: "approved", contentVersion: 3, approvedVersion: 2 }))).toBe(false);
    expect(isEligibleForDiscover(make({ reviewStatus: "approved", contentVersion: 3, approvedVersion: 3 }))).toBe(true);
  });

  it("never promotes items without photos or approved active stores", () => {
    expect(isEligibleForDiscover(make({ imageUrls: [] }))).toBe(false);
    expect(buildDiscoverFeed([make()], [])).toEqual([]);
    expect(buildDiscoverFeed([make({ storeId: "deleted" })], [store])).toEqual([]);
    expect(buildDiscoverFeed([make()], [store])).toHaveLength(1);
  });

  it("uses original store deep links, honest names and price; no demo products", () => {
    const results = buildDiscoverFeed([make()], [store]);
    expect(results[0]).toMatchObject({
      id: "a", title: "Televisión", storeSlug: "tecstore", storeName: "TecStore", priceAmount: 2000, imageUrl: "https://example.com/tv.jpg",
    });
  });

  it("hides expired flash offers and sorts fresh content ahead", () => {
    const products = [
      make({ id: "older" }),
      make({ id: "expired", flashEndsAt: "2026-10-11T01:00:00Z" }),
      make({ id: "newer", createdAt: oldDate + 1000, updatedAt: oldDate + 1000 }),
    ];
    expect(buildDiscoverFeed(products, [store], Date.parse("2026-10-12T00:00:00Z")).map((x) => x.id)).toEqual(["newer", "older"]);
  });

  it("caps the public feed so shared snapshot remains bounded", () => {
    const products = Array.from({ length: 200 }, (_, i) => make({ id: String(i) }));
    expect(buildDiscoverFeed(products, [store])).toHaveLength(72);
  });
});
