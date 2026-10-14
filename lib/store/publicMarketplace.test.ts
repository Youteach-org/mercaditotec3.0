import { describe, expect, it } from "vitest";

import {
  isPublicProductVisibility,
  isPublicStoreStatus,
  serializePublicProduct,
  serializePublicStore,
} from "./publicMarketplace";
import { createEmptyStoreSchedule } from "./schedule";

describe("public marketplace visibility", () => {
  it("only exposes active stores", () => {
    expect(isPublicStoreStatus("active")).toBe(true);
    expect(isPublicStoreStatus("draft")).toBe(false);
    expect(isPublicStoreStatus("pending_review")).toBe(false);
    expect(isPublicStoreStatus("changes_required")).toBe(false);
    expect(isPublicStoreStatus("suspended")).toBe(false);
  });

  it("only exposes published products", () => {
    expect(isPublicProductVisibility("published")).toBe(true);
    expect(isPublicProductVisibility("hidden")).toBe(false);
  });

  it("omits owner identity from public store output", () => {
    const value = serializePublicStore({
      id: "store-1",
      ownerUid: "private-owner",
      name: "Tienda Uno",
      slug: "tienda-uno",
      description: "Descripción",
      deliveryLocation: "Patio central",
      logoUrl: null,
      coverUrl: null,
      schedule: createEmptyStoreSchedule(),
      operationalMode: "manual",
      manualOpen: true,
      marketplaceLabel: "TORTAS EL PUNTO",
      marketplaceNote: "BUENAS TORTAS, MEJORES PLÁTICAS",
      marketplaceTags: ["Comida", "Tortas"],
      marketplaceVariant: "cloud-3",
      ratingStats: { count: 2, total: 9, distribution: [0, 0, 0, 1, 1] },
    });

    expect(value).toMatchObject({
      id: "store-1",
      slug: "tienda-uno",
      openNow: true,
      marketplaceLabel: "TORTAS EL PUNTO",
      marketplaceNote: "BUENAS TORTAS, MEJORES PLÁTICAS",
      marketplaceTags: ["Comida", "Tortas"],
      marketplaceVariant: "cloud-3",
      ratingAverage: 4.5,
      ratingCount: 2,
      ratingDistribution: [0, 0, 0, 1, 1],
    });
    expect(value).not.toHaveProperty("ownerUid");
  });

  it("omits owner identity from public product output", () => {
    const value = serializePublicProduct({
      id: "product-1",
      ownerUid: "private-owner",
      storeId: "store-1",
      title: "Brownie",
      description: "Chocolate",
      imageUrls: ["https://example.com/brownie.jpg"],
      categoryId: "food",
      suggestedCategoryName: null,
      priceType: "fixed",
      priceAmount: 25,
    });

    expect(value).toMatchObject({ id: "product-1", title: "Brownie", priceAmount: 25 });
    expect(value).not.toHaveProperty("ownerUid");
    expect(value).not.toHaveProperty("storeId");
  });
});
