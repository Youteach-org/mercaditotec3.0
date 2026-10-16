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
  it("keeps Ke-Rollos in the first six whenever an eligible item is available", () => {
    const otherStores = Array.from({ length: 12 }, (_, index) => ({
      ...store, id: "shop-" + index, name: "Tienda " + index, slug: "tienda-" + index,
    }));
    const keRollos = { ...store, id: "ke-rollos-store", name: "Ke-Rollos!", slug: "k-rollos" };
    const rows = [
      ...otherStores.map((shop, i) =>
        make({ id: "regular-" + i, storeId: shop.id, createdAt: oldDate + (i + 1) * 1000, updatedAt: oldDate + (i + 1) * 1000 })),
      make({ id: "ke-rollos-product", storeId: keRollos.id, createdAt: oldDate, updatedAt: oldDate }),
    ];
    for (const timestamp of ["2026-10-16T12:00:00Z", "2026-10-17T12:00:00Z", "2026-10-18T12:00:00Z"]) {
      const result = buildDiscoverFeed(rows, [...otherStores, keRollos], Date.parse(timestamp));
      expect(result).toHaveLength(13);
      expect(result.slice(0, 6).map((entry) => entry.id)).toContain("ke-rollos-product");
      expect(new Set(result.map((entry) => entry.id)).size).toBe(13);
    }
  });

  it("reserves Ke-Rollos and YouTeach simultaneously, without promoting unreviewed products", () => {
    const shops = Array.from({ length: 8 }, (_, i) => ({
      ...store, id: "normal-" + i, name: "Tienda " + i, slug: "normal-" + i,
    }));
    const ke = { ...store, id: "ke", name: "Ke-Rollos", slug: "k-rollos" };
    const youteach = { ...store, id: "yt", name: "YouTeach", slug: "youteach" };
    const rows = [
      ...shops.map((shop, i) =>
        make({ id: "item-" + i, storeId: shop.id, createdAt: oldDate + i * 1000, updatedAt: oldDate + i * 1000 })),
      make({ id: "rollos", storeId: ke.id }),
      make({ id: "yt", storeId: youteach.id }),
      make({ id: "blocked-rollos", storeId: ke.id, reviewStatus: "needs_changes" }),
    ];
    const result = buildDiscoverFeed(rows, [...shops, ke, youteach], Date.parse("2026-10-16T12:00:00Z"));
    const firstSix = result.slice(0, 6).map((entry) => entry.id);
    expect(firstSix).toContain("rollos");
    expect(firstSix).toContain("yt");
    expect(result.map((entry) => entry.id)).not.toContain("blocked-rollos");
  });

});
