import { describe, expect, it } from "vitest";
import { countDiscoverProducts } from "./homeStats";
import type { DiscoverFeedItem } from "./feed";

const base = {
  id: "product-1",
  storeId: "store-1",
  storeName: "Tienda",
  storeSlug: "tienda",
  storeLogoUrl: null,
  deliveryLocation: "Tec Morelia",
  title: "Control",
  description: "Control de videojuegos",
  imageUrl: "https://example.com/image.png",
  categoryId: "electronics",
  priceType: "fixed" as const,
  priceAmount: 150,
  createdAt: "2026-10-17T18:00:00.000Z",
  flashEndsAt: null,
};

describe("Descubre homepage counts", () => {
  it("counts store goods and unexpired individual listings but never stores", () => {
    const now = Date.parse("2026-10-17T18:00:00.000Z");
    const individual = {
      ...base, id: "personal-1", personal: true as const, sellerUid: "seller",
      expiresAt: now + 60000, linkedStoreId: null,
    };
    const expired = { ...individual, id: "expired", expiresAt: now - 1 };
    const items: DiscoverFeedItem[] = [base, individual, expired];
    expect(countDiscoverProducts(items, now)).toBe(2);
    expect(countDiscoverProducts(items, now + 60001)).toBe(1);
  });

  it("shows zero when no currently available products exist", () => {
    expect(countDiscoverProducts([], 0)).toBe(0);
  });
});
