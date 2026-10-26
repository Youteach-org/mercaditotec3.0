import { describe, expect, it, vi } from "vitest";

const writes: Array<{ collection: string; document: string; data: Record<string, unknown> }> = [];
vi.mock("../firestoreRest", () => ({
  getAdminDb: () => ({ collection: (name: string) => ({
    doc: (id: string) => ({ set: async (data: Record<string, unknown>) => {
      writes.push({ collection: name, document: id, data });
    } }),
  }) }),
}));

import { markPublicMarketplaceChanged } from "./publicMarketplaceRevision";

describe("public catalogue invalidation", () => {
  it("invalidates the v3 materialization used by Descubre after changes", async () => {
    writes.length = 0;
    await markPublicMarketplaceChanged();
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      collection: "public_marketplace_cache", document: "catalog-v3",
      data: { revision: expect.any(String) },
    });
  });
});
