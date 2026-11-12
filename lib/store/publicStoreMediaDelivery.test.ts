import { describe, expect, it, vi } from "vitest";
import { servePublicStoreMedia, storeMediaKeyFromUrl } from "./publicStoreMediaDelivery.mjs";

const base = "https://mercaditotec.store/media/stores/owner/store";
const imageUrl = base + "/products/product-1/photo.webp";

function memoryCache() {
  const values = new Map<string, Response>();
  return {
    match: vi.fn(async (request: Request) => values.get(request.url)?.clone()),
    put: vi.fn(async (request: Request, response: Response) => {
      values.set(request.url, response.clone());
    }),
  };
}

function makeContext() {
  const promises: Promise<unknown>[] = [];
  return {
    ctx: { waitUntil: (promise: Promise<unknown>) => { promises.push(promise); } },
    flush: () => Promise.all(promises),
  };
}

describe("Cloudflare/R2 public store photos", () => {
  it("rejects private, malformed, encoded and query-variant photo keys", () => {
    expect(storeMediaKeyFromUrl(imageUrl))
      .toBe("stores/owner/store/products/product-1/photo.webp");
    expect(storeMediaKeyFromUrl(base + "/logo/photo.png"))
      .toBe("stores/owner/store/logo/photo.png");
    for (const url of [
      base + "/products/product-1/%2e%2e.png",
      base + "/products/product-1/photo.webp?token=abc",
      base + "/products/product-1/more/photo.webp",
      base + "/../../chat/photo.png",
    ]) {
      expect(storeMediaKeyFromUrl(url)).toBeNull();
    }
    expect(storeMediaKeyFromUrl("https://mercaditotec.store/api/chat")).toBeNull();
  });

  it("delivers a legacy Supabase photo, stores it in the edge cache, and does not fetch it twice", async () => {
    const cache = memoryCache();
    const fetcher = vi.fn(async (_url: string) => new Response("image bytes", {
      status: 200,
      headers: { "content-type": "image/webp" },
    }));
    const tasks = makeContext();
    const request = new Request(imageUrl);

    const first = await servePublicStoreMedia(request, {}, tasks.ctx, { cache, fetch: fetcher });
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toContain("immutable");
    expect(await first.text()).toBe("image bytes");
    await tasks.flush();

    const second = await servePublicStoreMedia(request, {}, tasks.ctx, { cache, fetch: fetcher });
    expect(await second.text()).toBe("image bytes");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toContain("/storage/v1/object/public/chat-images/stores/owner/store/");
  });

  it("prefers an available R2 object without contacting Supabase", async () => {
    const fetcher = vi.fn();
    const get = vi.fn(async () => ({
      body: new Response("R2 bytes").body,
      writeHttpMetadata(headers: Headers) { headers.set("content-type", "image/webp"); },
      httpEtag: '"etag123"',
    }));
    const response = await servePublicStoreMedia(
      new Request(imageUrl),
      { STORE_MEDIA_R2: { get } },
      makeContext().ctx,
      { cache: memoryCache(), fetch: fetcher },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("R2 bytes");
    expect(get).toHaveBeenCalledWith("stores/owner/store/products/product-1/photo.webp");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("mirrors a public legacy image into R2 after a miss without changing its URL", async () => {
    const put = vi.fn(async (_key: string, _body: ReadableStream<Uint8Array> | null, _options: unknown) => ({}));
    const get = vi.fn(async () => null);
    const fetcher = vi.fn(async (_url: string) => new Response("legacy image", {
      status: 200,
      headers: { "content-type": "image/webp", "content-length": "12" },
    }));
    const tasks = makeContext();
    const response = await servePublicStoreMedia(
      new Request(imageUrl),
      { STORE_MEDIA_R2: { get, put } },
      tasks.ctx,
      { cache: memoryCache(), fetch: fetcher },
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("legacy image");
    await tasks.flush();
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.calls[0][0]).toBe("stores/owner/store/products/product-1/photo.webp");
  });

  it("keeps private routes untouched and rejects unsupported methods", async () => {
    expect(await servePublicStoreMedia(
      new Request("https://mercaditotec.store/api/chat"), {}, makeContext().ctx,
    )).toBeNull();
    const response = await servePublicStoreMedia(
      new Request(imageUrl, { method: "POST" }), {}, makeContext().ctx,
    );
    expect(response.status).toBe(405);
  });

  it("does not cache an upstream failure", async () => {
    const cache = memoryCache();
    const fetcher = vi.fn(async () => new Response(null, { status: 404 }));
    const response = await servePublicStoreMedia(
      new Request(imageUrl), {}, makeContext().ctx, { cache, fetch: fetcher },
    );
    expect(response.status).toBe(404);
    expect(cache.put).not.toHaveBeenCalled();
  });
});
