import { describe, expect, it, vi } from "vitest";
import { serveCachedPublicCatalogue, affectsPublicCatalogue, evictPublicCatalogueCache } from "./publicCatalogueEdgeCache.mjs";

function memoryCache() {
  const cache = new Map<string, Response>();
  return {
    match: vi.fn(async (request: Request) => cache.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => {
      cache.set(request.url, response.clone());
    }),
  };
}

function catalogue() {
  return new Response(JSON.stringify({ stores: [{ id: "public-demo" }] }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0, s-maxage=300",
    },
  });
}

describe("Cloudflare public catalogue cache", () => {
  it("reuses the successful public response across requests and query variations", async () => {
    const cache = memoryCache();
    const waits: Promise<unknown>[] = [];
    const context = { waitUntil: (p: Promise<unknown>) => { waits.push(p); } };
    const handle = vi.fn(async () => catalogue());
    const first = await serveCachedPublicCatalogue(
      new Request("https://mercaditotec.store/api/marketplace-v2?foo=1"), context, handle, cache,
    );
    expect(first.status).toBe(200);
    await Promise.all(waits);
    const second = await serveCachedPublicCatalogue(
      new Request("https://mercaditotec.store/api/marketplace-v2?foo=2"), context, handle, cache,
    );
    expect((await second.json()).stores[0].id).toBe("public-demo");
    expect(handle).toHaveBeenCalledTimes(1);
    expect(cache.match).toHaveBeenCalledTimes(2);
    expect(cache.put).toHaveBeenCalledTimes(1);
  });

  it("never caches failure responses", async () => {
    const cache = memoryCache();
    const handle = vi.fn(async () => new Response("Unavailable", {
      status: 503, headers: { "Cache-Control": "no-store" },
    }));
    for (let i = 0; i < 2; i++) {
      const result = await serveCachedPublicCatalogue(
        new Request("https://mercaditotec.store/api/marketplace-v2"), {}, handle, cache,
      );
      expect(result.status).toBe(503);
    }
    expect(handle).toHaveBeenCalledTimes(2);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("never caches private, credentialed or mutated requests", async () => {
    const cache = memoryCache();
    const handle = vi.fn(async () => catalogue());
    const paths = [
      new Request("https://mercaditotec.store/api/account/session"),
      new Request("https://mercaditotec.store/api/admin/users"),
      new Request("https://mercaditotec.store/api/marketplace-v2", { headers: { Authorization: "Bearer a" } }),
      new Request("https://mercaditotec.store/api/marketplace-v2", { headers: { Cookie: "session=x" } }),
      new Request("https://mercaditotec.store/api/marketplace-v2", { method: "POST" }),
    ];
    for (const request of paths) {
      const response = await serveCachedPublicCatalogue(request, {}, handle, cache);
      expect(response.ok).toBe(true);
    }
    expect(handle).toHaveBeenCalledTimes(paths.length);
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });
  it("detects only authorized successful catalogue-changing mutations", () => {
    const successful = new Response(null, { status: 200 });
    const created = new Response(null, { status: 201 });
    const rejected = new Response(null, { status: 403 });
    const changed = [
      ["POST", "/api/admin/stores/s1/status"],
      ["PATCH", "/api/stores/s1"],
      ["PATCH", "/api/stores/s1/media"],
      ["PATCH", "/api/stores/s1/schedule"],
      ["POST", "/api/stores/s1/submit"],
      ["POST", "/api/stores/s1/withdraw"],
      ["POST", "/api/stores/s1/products"],
      ["PATCH", "/api/stores/s1/products/p2"],
      ["DELETE", "/api/stores/s1/products/p2"],
      ["POST", "/api/admin/categories"],
      ["PATCH", "/api/admin/categories/c3"],
      ["PATCH", "/api/admin/marketplace-content"],
    ];
    for (const [method, path] of changed) {
      const request = new Request("https://mercaditotec.store" + path, { method });
      expect(affectsPublicCatalogue(request, successful)).toBe(true);
      expect(affectsPublicCatalogue(request, rejected)).toBe(false);
    }
    expect(affectsPublicCatalogue(new Request("https://mercaditotec.store/api/orders", { method: "POST" }), created)).toBe(false);
    expect(affectsPublicCatalogue(new Request("https://mercaditotec.store/api/marketplace-v2"), successful)).toBe(false);
  });

  it("evicts both public paths and no private endpoints after refresh", async () => {
    const deleted: string[] = [];
    const fakeCache = { delete: vi.fn(async (key: Request) => { deleted.push(new URL(key.url).pathname); return true; }) };
    await evictPublicCatalogueCache(
      new Request("https://mercaditotec.store/api/admin/categories", { method: "POST" }),
      fakeCache,
    );
    expect(deleted.sort()).toEqual(["/api/marketplace", "/api/marketplace-v2"].sort());
  });

});
