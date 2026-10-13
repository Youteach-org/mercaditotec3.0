// Cloudflare ingress protection. Campus/mobile NAT may put thousands of
// distinct signed-in people behind the same public IP. Do not make that IP
// their sole quota. Server endpoints still verify every Firebase token.
const JSON_HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'retry-after': '60',
};

function reject(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

function jwtFromAuthorization(authorization) {
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  // Only plausible Firebase ID tokens use a per-token limit. Missing,
  // malformed and oversized credentials stay under the stricter IP limiter.
  if (token.length < 100 || token.length > 8192) return null;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  return token;
}

async function tokenFingerprint(token) {
  // Never store the raw bearer token in the rate-limit key or diagnostics.
  // A fingerprint identifies one signed-in browser session for throttling;
  // it does NOT authenticate the request (the API must still verify the JWT).
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest).slice(0, 16), byte =>
    byte.toString(16).padStart(2, '0')).join('');
}

function isPublicCatalogue(request, pathname) {
  return request.method === 'GET' &&
    (pathname === '/api/marketplace' || pathname === '/api/marketplace-v2') &&
    !request.headers.has('authorization') &&
    !request.headers.has('cookie');
}

export async function enforceEdgeBudget(request, env) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith('/api/')) return null;
  // Only public, anonymous catalogue reads may bypass the limiter. No
  // privileged API or authenticated page receives a blanket exemption.
  if (isPublicCatalogue(request, pathname)) return null;

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const credential = jwtFromAuthorization(request.headers.get('authorization') || '');

  if (!credential) {
    // Missing/invalid-looking credentials and unauthenticated requests retain
    // the original tighter per-IP protection against random credential floods.
    if (!env.API_RATE_LIMITER || typeof env.API_RATE_LIMITER.limit !== 'function') {
      return reject(503, 'Servicio temporalmente no disponible.');
    }
    const lane = request.method === 'GET' && pathname === '/api/account/session'
      ? 'session' : 'api';
    const { success } = await env.API_RATE_LIMITER.limit({
      key: `mercadito:${lane}:${ip}`,
    });
    return success ? null : reject(429, 'Demasiadas peticiones. Intenta de nuevo en un minuto.');
  }

  // Signed-in clients get separate budgets even on the same campus Wi-Fi.
  // A separate, higher IP ceiling still limits attacks that rotate forged JWTs.
  if (!env.AUTH_API_RATE_LIMITER ||
      typeof env.AUTH_API_RATE_LIMITER.limit !== 'function' ||
      !env.API_IP_SAFETY_LIMITER ||
      typeof env.API_IP_SAFETY_LIMITER.limit !== 'function') {
    return reject(503, 'Servicio temporalmente no disponible.');
  }

  const { success: ipSafe } = await env.API_IP_SAFETY_LIMITER.limit({
    key: `mercadito:authenticated-ip:${ip}`,
  });
  if (!ipSafe) return reject(429, 'Demasiadas peticiones desde esta red. Intenta de nuevo en un minuto.');

  const fingerprint = await tokenFingerprint(credential);
  const { success } = await env.AUTH_API_RATE_LIMITER.limit({
    key: `mercadito:session:${fingerprint}`,
  });
  return success ? null : reject(429, 'Demasiadas peticiones de tu sesión. Intenta de nuevo en un minuto.');
}
