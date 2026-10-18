import { describe, expect, it } from "vitest";
import { publicDiscoverPreview } from "./publicPreview";
import type { DiscoverFeedItem } from "./feed";

const example: DiscoverFeedItem = {
  id: "listing-one", title: "Control de videojuegos", description: "Entrego en el Tec",
  categoryId: "electronica", imageUrl: "https://example.com/controller.jpg",
  priceType: "fixed", priceAmount: 220, createdAt: "2026-10-17T18:00:00Z",
  flashEndsAt: null, storeId: "private-shop", storeName: "Nombre privado",
  storeSlug: "tienda-privada", storeLogoUrl: null, deliveryLocation: "Punto de entrega",
  personal: true, expiresAt: 1792281600000, sellerUid: "secret-uid", linkedStoreId: null,
};

describe("public Descubre previews", () => {
  it("preserves visible product details but never publishes contact or identity", () => {
    const [preview] = publicDiscoverPreview([example]);
    expect(preview).toMatchObject({ title: "Control de videojuegos", priceAmount: 220, personal: true });
    expect(preview.description).toBe("");
    expect(preview.storeName).toBe("");
    expect(preview.deliveryLocation).toBe("");
    expect(JSON.stringify(preview)).not.toContain("secret-uid");
    expect(JSON.stringify(preview)).not.toContain("Nombre privado");
    expect(JSON.stringify(preview)).not.toContain("Punto de entrega");
    expect(JSON.stringify(preview)).not.toContain("tienda-privada");
  });
});
