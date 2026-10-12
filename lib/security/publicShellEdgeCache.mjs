// Safe edge cache for the statically prerendered public Marketplace document.
// Do not cache authenticated pages, Next.js RSC flight data, or any other route.
const TTL_SECONDS = 120;

export function isCacheablePublicShell(request) {
  const path = new URL(request.url).pathname;
  const accept = request.headers.get("accept") || "";
  return request.method === "GET"
    && path === "/marketplace"
    && accept.includes("text/html")
    && !request.headers.has("authorization")
    && !request.headers.has("cookie")
    && !request.headers.has("rsc")
    && !request.headers.has("next-router-prefetch")
    && !request.headers.has("next-router-state-tree")
    && !request.headers.has("next-url")
    && !request.headers.has("x-nextjs-data");
}

function cacheKey(request, env) {
  const url = new URL("/marketplace", request.url);
  // Never reuse Next.js HTML from an older deployment after its JS assets
  // changed: Worker version IDs are stable within one deployment.
  url.searchParams.set("shell-version", env?.CF_VERSION_METADATA?.id || "fallback");
  return new Request(url.toString(), { method: "GET" });
}

export async function serveCachedPublicShell(request, env, ctx, handle, cacheStore = null) {
  if (!isCacheablePublicShell(request)) return handle();

  const cache = cacheStore ??
    (typeof caches === "undefined" ? null : caches.default ?? null);
  if (!cache) return handle();

  const key = cacheKey(request, env);
  try {
    const hit = await cache.match(key);
    if (hit) {
      const headers = new Headers(hit.headers);
      headers.set("x-mercadito-html-cache", "HIT");
      return new Response(hit.body, { status: hit.status, headers });
    }
  } catch (error) {
    console.warn("PUBLIC_HTML_CACHE_READ_FAILED",
      error instanceof Error ? error.name : "Unknown");
  }

  const response = await handle();
  // OpenNext/Next pre-renders /marketplace as a public static page.
  // Never cache personalized, errored or non-HTML responses.
  if (response.status !== 200 ||
      !response.headers.get("content-type")?.toLowerCase().includes("text/html") ||
      response.headers.has("set-cookie") ||
      (response.headers.get("vary") || "").includes("*")) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control",
    `public, max-age=0, s-maxage=${TTL_SECONDS}, stale-while-revalidate=180`);
  const publicPage = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  // cache.put may finish after the response, so the first visitor does not
  // wait for the cache write.
  const cacheCopy = publicPage.clone();
  const write = Promise.resolve()
    .then(() => cache.put(key, cacheCopy))
    .catch((error) => console.warn("PUBLIC_HTML_CACHE_WRITE_FAILED",
      error instanceof Error ? error.name : "Unknown"));
  if (typeof ctx?.waitUntil === "function") ctx.waitUntil(write);
  else await write;

  const servedHeaders = new Headers(publicPage.headers);
  servedHeaders.set("x-mercadito-html-cache", "MISS");
  return new Response(publicPage.body, {
    status: publicPage.status,
    statusText: publicPage.statusText,
    headers: servedHeaders,
  });
}
