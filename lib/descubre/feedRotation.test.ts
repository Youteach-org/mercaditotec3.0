import { describe, expect, it } from "vitest";
import { orderDiscoverProducts } from "./feed";
import type { DiscoverProduct } from "../store/discoverFeed";
import { publicDiscoverPreview } from "./publicPreview";

const make = (id: string, storeName = "Tienda regular"): DiscoverProduct => ({
  id, storeId: id, storeName, storeSlug: id, storeLogoUrl: null,
  deliveryLocation: "", title: id, description: "", imageUrl: "https://example.com/a.jpg",
  categoryId: "food", priceType: "fixed", priceAmount: 1,
  createdAt: "2026-10-25T00:00:00Z", flashEndsAt: null,
});

describe("Discover product rotation", () => {
  const items = [make("rollos", "Ke-Rollos"), make("youteach", "YouTeach"),
    ...Array.from({ length: 25 }, (_, i) => make(`ordinary-${i}`))];

  it("places featured brands within the first nine without losing products", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const ordered = orderDiscoverProducts(items, seed);
      expect(ordered).toHaveLength(items.length);
      expect(new Set(ordered.map((item) => item.id)).size).toBe(items.length);
      expect(ordered.findIndex((item) => item.id === "rollos")).toBeLessThan(9);
      expect(ordered.findIndex((item) => item.id === "youteach")).toBeLessThan(9);
    }
  });

  it("rotates all products across visits and remains stable for one seed", () => {
    expect(orderDiscoverProducts(items, 7)).toEqual(orderDiscoverProducts(items, 7));
    const permutations = new Set(Array.from({ length: 12 }, (_, i) =>
      orderDiscoverProducts(items, i).map((item) => item.id).join(",")));
    expect(permutations.size).toBeGreaterThan(8);
    expect(new Set(Array.from({ length: 30 }, (_, i) =>
      orderDiscoverProducts(items, i).findIndex((item) => item.id === "rollos"))).size).toBeGreaterThan(3);
  });

  it("keeps approved independent listings in the same rotation", () => {
    const independent = { ...make("independent"), personal: true as const,
      sellerUid: "user", expiresAt: Date.now() + 10000, linkedStoreId: null };
    const ordered = orderDiscoverProducts([...items, independent], 99);
    expect(ordered.some((item) => item.id === "independent")).toBe(true);
  });

  it("reserves the brand even in the identity-restricted visitor preview", () => {
    const preview = publicDiscoverPreview(items);
    for (let seed = 1; seed <= 50; seed++) {
      const ordered = orderDiscoverProducts(preview, seed);
      expect(ordered.findIndex((item) => item.id === "rollos")).toBeLessThan(9);
      expect(ordered.findIndex((item) => item.id === "youteach")).toBeLessThan(9);
    }
  });
});
