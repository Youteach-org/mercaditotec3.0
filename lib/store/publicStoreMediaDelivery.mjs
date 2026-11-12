// Public store photos only: Cloudflare cache -> optional R2 -> legacy Supabase.
const SUPABASE_PUBLIC_STORES = "https://wfmokinfcypfpdisussw.supabase.co/storage/v1/object/public/chat-images/";
const MEDIA_ROUTE_PREFIX = "/media/stores/";
const STORE_PATH = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/(?:(?:logo|cover)\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif)|products\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:png|jpe?g|webp|gif))$/i;
const MEDIA_HEADERS = { "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" };

function contentTypeFor(key) {
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.webp$/i.test(key)) return "image/webp";
  if (/\.gif$/i.test(key)) return "image/gif";
  return "image/jpeg";
}

export function storeMediaKeyFromUrl(requestUrl) {
  let url;
  try { url = new URL(requestUrl); } catch { return null; }
  if (!url.pathname.startsWith(MEDIA_ROUTE_PREFIX) || url.search || url.hash || url.pathname.length > 630) return null;
  const suffix = url.pathname.slice(MEDIA_ROUTE_PREFIX.length);
  if (!STORE_PATH.test(suffix)) return null;
  return "stores/" + suffix;
}

function responseFromR2(object, key, method) {
  const headers = new Headers(MEDIA_HEADERS);
  if (object.writeHttpMetadata) object.writeHttpMetadata(headers);
  if (!headers.get("content-type")) headers.set("content-type", contentTypeFor(key));
  headers.set("cache-control", MEDIA_HEADERS["cache-control"]);
  headers.set("x-content-type-options", "nosniff");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(method === "HEAD" ? null : object.body, { status: 200, headers });
}

function responseFromSupabase(upstream, key, method) {
  if (!upstream.ok) {
    return new Response(null, {
      status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502,
      headers: { "cache-control": "no-store" },
    });
  }
  const type = (upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (type && type !== contentTypeFor(key)) {
    return new Response(null, { status: 502, headers: { "cache-control": "no-store" } });
  }
  const headers = new Headers(MEDIA_HEADERS);
  headers.set("content-type", type || contentTypeFor(key));
  return new Response(method === "HEAD" ? null : upstream.body, { status: 200, headers });
}

/**
 * Serves immutable public images without changing stored Firebase URLs.
 * R2 migration is optional: missing R2 objects are fetched from Supabase.
 * The Cloudflare cache is only an optimization, never a hard dependency.
 */
export async function servePublicStoreMedia(request, env, ctx, options = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(MEDIA_ROUTE_PREFIX)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD", "cache-control": "no-store" } });
  }

  const key = storeMediaKeyFromUrl(request.url);
  if (!key) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

  const edgeCache = options.cache ?? globalThis.caches?.default;
  const cacheKey = new Request(url.origin + url.pathname, { method: "GET" });
  if (request.method === "GET" && edgeCache) {
    try {
      const hit = await edgeCache.match(cacheKey);
      if (hit) return hit;
    } catch {
      // Cache API is not available on every Cloudflare preview hostname.
    }
  }

  let response;
  const r2 = env?.STORE_MEDIA_R2;
  const object = r2
    ? await (request.method === "HEAD" ? r2.head(key) : r2.get(key))
    : null;

  if (object) {
    response = responseFromR2(object, key, request.method);
  } else {
    const upstream = await (options.fetch ?? fetch)(SUPABASE_PUBLIC_STORES + key, {
      method: request.method,
      redirect: "error",
    });
    response = responseFromSupabase(upstream, key, request.method);
  }

  if (request.method === "GET" && response.ok && edgeCache && ctx?.waitUntil) {
    ctx.waitUntil(
      edgeCache.put(cacheKey, response.clone()).catch(() => {
        // Image delivery must keep working when Cloudflare caching is disabled.
      }),
    );
  }
  return response;
}
