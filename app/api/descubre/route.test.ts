import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  catalogue: vi.fn(),
}));
vi.mock("@/lib/store/auth", () => ({
  requireFirebaseUser: mocks.auth,
  ApiAuthError: class ApiAuthError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
vi.mock("@/lib/store/publicMarketplaceSnapshot", () => ({
  getPublicMarketplaceSnapshot: mocks.catalogue,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ uid: "member-1" });
  mocks.catalogue.mockResolvedValue({
    discoverProducts: [{ id: "p1", title: "Televisión" }],
    categories: [{ id: "tech", name: "Electrónica" }],
  });
});

describe("Descubre API", () => {
  it("requires authentication before touching shared Firestore catalog", async () => {
    mocks.auth.mockRejectedValue(new (await import("@/lib/store/auth")).ApiAuthError(401, "Inicia sesión"));
    const response = await GET(new Request("https://example.com/api/descubre"));
    expect(response.status).toBe(401);
    expect(mocks.catalogue).not.toHaveBeenCalled();
  });

  it("returns only projected public discovery content privately", async () => {
    const response = await GET(new Request("https://example.com/api/descubre", {
      headers: { Authorization: "Bearer valid" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      products: [{ id: "p1", title: "Televisión" }],
      categories: [{ id: "tech", name: "Electrónica" }],
    });
  });

  it("fails closed instead of returning a stale or invented feed", async () => {
    mocks.catalogue.mockRejectedValue(new Error("quota"));
    const response = await GET(new Request("https://example.com/api/descubre"));
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
