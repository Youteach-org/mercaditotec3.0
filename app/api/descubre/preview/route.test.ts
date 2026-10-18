import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("@/lib/descubre/feed", () => ({
  mergeDiscoverListings: (stores: unknown[]) => stores,
}));
vi.mock("@/lib/descubre/publicPreview", async () =>
  import("../../../../lib/descubre/publicPreview")
);
vi.mock("@/lib/store/publicMarketplaceSnapshot", () => ({
  getPublicMarketplaceSnapshot: mocks.snapshot,
}));

import { GET } from "./route";

beforeEach(() => {
  mocks.snapshot.mockReset();
  mocks.snapshot.mockResolvedValue({
    discoverProducts: [{
      id: "shop-product",
      storeId: "internal-shop",
      storeName: "Tienda privada",
      storeSlug: "tienda-privada",
      storeLogoUrl: null,
      deliveryLocation: "Ubicación personal",
      title: "Control de videojuegos",
      description: "Contactarme al número privado",
      imageUrl: "https://example.com/control.jpg",
      categoryId: "electronica",
      priceType: "fixed",
      priceAmount: 300,
      createdAt: "2026-10-17T18:00:00Z",
      flashEndsAt: null,
    }],
    discoverListings: [],
    categories: [{ id: "electronica", name: "Electrónica", iconKey: "electronics" }],
  });
});

describe("Public Descubre preview", () => {
  it("shares only basic product cards without leaking contact or store detail", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.products[0].title).toBe("Control de videojuegos");
    expect(data.products[0].priceAmount).toBe(300);
    expect(data.products[0].storeName).toBe("");
    expect(data.products[0].description).toBe("");
    expect(JSON.stringify(data)).not.toContain("Tienda privada");
    expect(JSON.stringify(data)).not.toContain("tienda-privada");
    expect(JSON.stringify(data)).not.toContain("Ubicación personal");
    expect(JSON.stringify(data)).not.toContain("número privado");
    expect(response.headers.get("Cache-Control")).toContain("public");
  });

  it("does not leak catalogue errors into public preview", async () => {
    mocks.snapshot.mockRejectedValue(new Error("secret private Firestore error"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).error).not.toContain("secret");
  });
});
