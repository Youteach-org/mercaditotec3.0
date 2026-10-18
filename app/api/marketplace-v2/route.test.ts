import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/store/auth", () => ({
  requireFirebaseUser: mocks.auth,
  ApiAuthError: class ApiAuthError extends Error { constructor(public status: number, message: string) { super(message); } },
}));
vi.mock("@/lib/store/publicMarketplaceSnapshot", () => ({
  getPublicMarketplaceSnapshot: mocks.snapshot,
}));
vi.mock("@/lib/firestoreRest", () => ({
  FirestoreRestError: class FirestoreRestError extends Error { constructor(public status: number) { super("quota"); } },
}));

import { GET } from "./route";

describe("Private Tiendas response", () => {
  it("requires an account before querying shop data", async () => {
    mocks.auth.mockRejectedValueOnce(new (await import("@/lib/store/auth")).ApiAuthError(401, "Inicia sesión"));
    const response = await GET(new Request("https://mercaditotec.store/api/marketplace-v2"));
    expect(response.status).toBe(401);
    expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it("does not leak the signed-in Descubre product feed", async () => {
    mocks.snapshot.mockResolvedValue({
      stores: [{ id: "live-shop", name: "Store" }],
      categories: [],
      content: { heroTitle: "Mercadito" },
      realStoreCount: 1,
      discoverProducts: [{ id: "private-product", title: "Visible solo tras iniciar sesión" }],
    });
    mocks.auth.mockResolvedValue({ uid: "member" });
    const response = await GET(new Request("https://mercaditotec.store/api/marketplace-v2", { headers: { Authorization: "Bearer token" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const data = await response.json();
    expect(data.stores).toEqual([{ id: "live-shop", name: "Store" }]);
    expect(data).not.toHaveProperty("discoverProducts");
    expect(JSON.stringify(data)).not.toContain("private-product");
  });
});
