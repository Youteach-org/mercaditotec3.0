// Broad ingress burst protection supplements the verified per-account Firestore budget.
// Cloudflare supplies cf-connecting-ip; never key on caller-supplied forwarding or JWT claims.
export async function enforceEdgeBudget(request, env) {
  if (!new URL(request.url).pathname.startsWith('/api/')) return null;
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': '60' };
  if (!env.API_RATE_LIMITER || typeof env.API_RATE_LIMITER.limit !== 'function') return new Response(JSON.stringify({ error: 'Servicio temporalmente no disponible.' }), { status: 503, headers });
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const { success } = await env.API_RATE_LIMITER.limit({ key: `mercadito:api:${ip}` });
  return success ? null : new Response(JSON.stringify({ error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' }), { status: 429, headers });
}
