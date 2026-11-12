import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const script = readFileSync(join(process.cwd(), "public/mercadito-media-sw.js"), "utf8");
const prefix = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/";
const storePhoto = prefix + "stores/owner/store/products/item/photo-1.webp";

function createWorker(status = 200) {
  const listeners = new Map<string, (event: any) => void>();
  const saved = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (request: { url: string }) => saved.get(request.url)?.clone()),
    put: vi.fn(async (request: { url: string }, response: Response) => {
      saved.set(request.url, response.clone());
    }),
    keys: vi.fn(async () => [...saved.keys()].map((url) => ({ url }))),
    delete: vi.fn(async (request: { url: string }) => saved.delete(request.url)),
  };
  const fetcher = vi.fn(async (_request: { url: string }) =>
    new Response(status === 200 ? "photo bytes" : "", {
      status,
      headers: { "content-type": "image/webp" },
    }),
  );
  const worker = {
    location: { origin: "https://mercaditotec.store" },
    addEventListener(name: string, callback: (event: any) => void) {
      listeners.set(name, callback);
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const context = createContext({
    self: worker, URL, Response, Request, Promise,
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: fetcher,
  });
  runInContext(script, context);
  const isImage = runInContext("isStoreImageRequest", context) as (request: any) => boolean;

  async function requestImage(url: string): Promise<Response | null> {
    let responsePromise: Promise<Response> | undefined;
    const background: Promise<unknown>[] = [];
    listeners.get("fetch")!({
      request: { url, method: "GET", destination: "image" },
      respondWith(promise: Promise<Response>) { responsePromise = promise; },
      waitUntil(promise: Promise<unknown>) { background.push(promise); },
    });
    if (!responsePromise) return null;
    const response = await responsePromise;
    await Promise.all(background);
    return response;
  }
  return { isImage, fetcher, saved, requestImage };
}

describe("store-only browser photo cache", () => {
  it("caches store images but never chats, profiles, APIs or non-images", () => {
    const worker = createWorker();
    expect(worker.isImage({ url: storePhoto, method: "GET", destination: "image" })).toBe(true);
    expect(worker.isImage({
      url: "https://mercaditotec.store/media/stores/owner/store/logo/photo.png",
      method: "GET",
      destination: "image",
    })).toBe(true);
    expect(worker.isImage({ url: prefix + "chat/owner/shared/2026-11/photo.webp", method: "GET", destination: "image" })).toBe(false);
    expect(worker.isImage({ url: prefix + "profile-images/owner/p.webp", method: "GET", destination: "image" })).toBe(false);
    expect(worker.isImage({ url: storePhoto, method: "GET", destination: "document" })).toBe(false);
    expect(worker.isImage({ url: storePhoto, method: "POST", destination: "image" })).toBe(false);
    expect(worker.isImage({ url: storePhoto + "?v=2", method: "GET", destination: "image" })).toBe(false);
  });

  it("downloads once, serves the next visit locally and downloads changed paths", async () => {
    const worker = createWorker();
    expect(await (await worker.requestImage(storePhoto))?.text()).toBe("photo bytes");
    expect(await (await worker.requestImage(storePhoto))?.text()).toBe("photo bytes");
    expect(worker.fetcher).toHaveBeenCalledTimes(1);
    await worker.requestImage(storePhoto.replace("photo-1", "photo-2"));
    expect(worker.fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not save error responses", async () => {
    const worker = createWorker(404);
    await worker.requestImage(storePhoto);
    await worker.requestImage(storePhoto);
    expect(worker.saved.size).toBe(0);
    expect(worker.fetcher).toHaveBeenCalledTimes(2);
  });

  it("bounds local photo storage without deleting the newest photos", async () => {
    const worker = createWorker();
    for (let i = 0; i < 163; i++) {
      await worker.requestImage(storePhoto.replace("photo-1", "photo-" + i));
    }
    expect(worker.saved.size).toBe(160);
    expect(worker.saved.has(storePhoto.replace("photo-1", "photo-0"))).toBe(false);
    expect(worker.saved.has(storePhoto.replace("photo-1", "photo-162"))).toBe(true);
  });
});
