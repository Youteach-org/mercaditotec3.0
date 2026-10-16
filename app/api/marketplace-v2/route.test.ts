import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ snapshot: vi.fn() }));
vi.mock("@/lib/store/publicMarketplaceSnapshot", () => ({
  getPublicMarketplaceSnapshot: mocks.snapshot,
}));

import { GET } from "./route";

describe("Guest marketplace response", () => {
  it("does not leak the signed-in Descubre product feed", async () => {
    mocks.snapshot.mockResolvedValue({
      stores: [{ id: "live-shop", name: "Store" }],
      categories: [],
      content: { heroTitle: "Mercadito" },
      realStoreCount: 1,
      discoverProducts: [{ id: "private-product", title: "Visible solo tras iniciar sesión" }],
    });
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.stores).toEqual([{ id: "live-shop", name: "Store" }]);
    expect(data).not.toHaveProperty("discoverProducts");
    expect(JSON.stringify(data)).not.toContain("private-product");
  });
});
