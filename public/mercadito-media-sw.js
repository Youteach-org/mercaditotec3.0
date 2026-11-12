/* Public storefront image cache. No API responses, chat files or private media. */
"use strict";

const CACHE_NAME = "mercaditotec-store-images-v1";
const CACHE_PREFIX = "mercaditotec-store-images-";
const MAX_IMAGES = 160;
const SUPABASE_ORIGIN = "https://wfmokinfcypfpdisussw.supabase.co";
const SUPABASE_STORE_PREFIX = "/storage/v1/object/public/chat-images/stores/";
const LOCAL_STORE_PREFIX = "/media/stores/";
const STORE_KEY = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/(?:(?:logo|cover)\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif)|products\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif))$/i;

function isStoreImageRequest(request) {
  if (!request || request.method !== "GET" || request.destination !== "image") return false;
  let url;
  try { url = new URL(request.url); } catch { return false; }
  if (url.search || url.hash) return false;

  if (url.origin === SUPABASE_ORIGIN && url.pathname.startsWith(SUPABASE_STORE_PREFIX)) {
    return STORE_KEY.test(url.pathname.slice(SUPABASE_STORE_PREFIX.length));
  }
  if (url.origin === self.location.origin && url.pathname.startsWith(LOCAL_STORE_PREFIX)) {
    return STORE_KEY.test(url.pathname.slice(LOCAL_STORE_PREFIX.length));
  }
  return false;
}

async function cacheStoreImage(cache, request, response) {
  try {
    await cache.put(request, response);
    const keys = await cache.keys();
    const overflow = keys.length - MAX_IMAGES;
    if (overflow > 0) {
      for (const key of keys.slice(0, overflow)) await cache.delete(key);
    }
  } catch {
    // Full storage, disabled caching or a private browsing mode must not break images.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((name) =>
        name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
      ).map((name) => caches.delete(name)));
    } catch {
      // Browsers may reject storage operations in restricted contexts.
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (!isStoreImageRequest(event.request)) return;

  event.respondWith((async () => {
    let cache = null;
    try {
      cache = await caches.open(CACHE_NAME);
      const stored = await cache.match(event.request);
      if (stored) return stored;
    } catch {
      // No storage access: still fetch normally.
    }

    const network = await fetch(event.request);
    if (cache && !network.redirected && (network.ok || network.type === "opaque")) {
      const copy = network.clone();
      event.waitUntil(cacheStoreImage(cache, event.request, copy));
    }
    return network;
  })());
});
