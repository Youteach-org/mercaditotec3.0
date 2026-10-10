// Broad ingress burst protection supplements the verified per-account Firestore budget.
// Cloudflare supplies cf-connecting-ip; never key on caller-supplied forwarding or JWT claims.
export async function enforceEdgeBudget(request, env) {
  if (!new URL(request.url).pathname.startsWith('/api/')) return null;
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': '60' };
  if (!env.API_RATE_LIMITER || typeof env.API_RATE_LIMITER.limit !== 'function') return new Response(JSON.stringify({ error: 'Servicio temporalmente no disponible.' }), { status: 503, headers });
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  // The session check must not share the same bucket as browsing and media API
  // traffic from hundreds of students behind one campus public IP. Both lanes
  // remain IP limited; write requests still also have a per-account budget.
  const pathname = new URL(request.url).pathname;
  const lane = request.method === 'GET' && pathname === '/api/account/session'
    ? 'session' : 'api';
  const { success } = await env.API_RATE_LIMITER.limit({ key: `mercadito:${lane}:${ip}` });
  return success ? null : new Response(JSON.stringify({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }), { status: 429, headers });
}
