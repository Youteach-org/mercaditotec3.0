// Isolated edge cache for anonymous PUBLIC catalogue responses only.
// Authentication, administration, storefront detail and all mutations bypass it.
const CACHEABLE_PATHS = new Set(["/api/marketplace", "/api/marketplace-v2"]);

// Bump the cache key when the public-catalogue schema changes, so Cloudflare
// cannot reuse an old production response after a new Worker is deployed.
function publicCacheKey(url) {
  const key = new URL(url.pathname, url.origin);
  if (url.pathname === "/api/marketplace-v2") key.searchParams.set("catalogue", "v2");
  return new Request(key, { method: "GET" });
}

/**
 * @param {Request} request
 * @param {{waitUntil?: (promise: Promise<unknown>) => void}} context
 * @param {() => Promise<Response>} handle
 * @param {any} cacheStore
 */
export async function serveCachedPublicCatalogue(request, context, handle, cacheStore = null) {
  const url = new URL(request.url);
  const eligible =
    request.method === "GET" &&
    CACHEABLE_PATHS.has(url.pathname) &&
    !request.headers.has("authorization") &&
    !request.headers.has("cookie");

  if (!eligible) return handle();

  // In Cloudflare the Cache API is shared by isolates in the same data centre;
  // it is not a globally replicated cache.
  const store = cacheStore ??
    (typeof caches === "undefined" ? null : caches.default ?? null);
  if (!store) return handle();

  // These two public APIs ignore query parameters. Normalizing the key avoids
  // duplicating reads when health checks append ?verify=... to bypass caches.
  const key = publicCacheKey(url);
  try {
    const cached = await store.match(key);
    if (cached) return cached;
  } catch (error) {
    console.warn("PUBLIC_CATALOGUE_CACHE_READ_FAILED", error instanceof Error ? error.name : "Unknown");
  }

  const response = await handle();
  const control = response.headers.get("cache-control")?.toLowerCase() ?? "";
  if (
    response.status === 200 &&
    control.includes("public") &&
    !control.includes("no-store") &&
    !control.includes("private") &&
    !response.headers.has("set-cookie")
  ) {
    const save = Promise.resolve()
      .then(() => store.put(key, response.clone()))
      .catch((error) => {
        console.warn("PUBLIC_CATALOGUE_CACHE_WRITE_FAILED", error instanceof Error ? error.name : "Unknown");
      });
    if (typeof context?.waitUntil === "function") context.waitUntil(save);
    else await save;
  }
  return response;
}

/**
 * Public-catalogue mutations originate only from authenticated server APIs.
 * Do not refresh for rejected writes, orders, chat, or unrelated requests.
 * @param {Request} request
 * @param {Response} response
 */
export function affectsPublicCatalogue(request, response) {
  if (!response.ok || !["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) return false;
  const path = new URL(request.url).pathname;
  return [
    /^\/api\/stores\/[^/]+(?:\/(?:media|schedule|submit|withdraw))?$/,
    /^\/api\/stores\/[^/]+\/products(?:\/[^/]+)?$/,
    /^\/api\/admin\/stores\/[^/]+\/status$/,
    /^\/api\/admin\/categories(?:\/[^/]+)?$/,
    /^\/api\/admin\/marketplace-content$/,
  ].some((pattern) => pattern.test(path));
}

/**
 * @param {Request} request
 * @param {any} cacheStore
 */
export async function evictPublicCatalogueCache(request, cacheStore = null) {
  const store = cacheStore ??
    (typeof caches === "undefined" ? null : caches.default ?? null);
  if (!store) return;
  const origin = new URL(request.url).origin;
  for (const path of CACHEABLE_PATHS) {
    try {
      await store.delete(publicCacheKey(new URL(path, origin)));
    } catch (error) {
      console.warn("PUBLIC_CATALOGUE_CACHE_EVICTION_FAILED",
        error instanceof Error ? error.name : "UnknownError");
    }
  }
}
