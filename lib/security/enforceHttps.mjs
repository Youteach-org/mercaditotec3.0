/**
 * The public Mercadito storefront must never serve plaintext HTTP.
 * Keep loopback URLs working for local Worker emulators.
 */
export function enforceHttps(request) {
  const url = new URL(request.url);
  if (url.protocol !== "http:") return null;

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]") {
    return null;
  }

  url.protocol = "https:";
  return Response.redirect(url.toString(), 308);
}
