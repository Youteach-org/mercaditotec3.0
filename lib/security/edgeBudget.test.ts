import { it, expect, vi } from 'vitest';
import { enforceEdgeBudget } from './edgeBudget.mjs';
async function budget() { return enforceEdgeBudget; }
it('rejects excess API traffic before handling and ignores spoofed forwarding and token identities', async()=>{ const run=await budget(); const limit=vi.fn(async()=>({success:false})); const r=await run(new Request('https://example.com/api/chat/reactions',{headers:{'cf-connecting-ip':'1.2.3.4','x-forwarded-for':'evil','authorization':'Bearer fake'}}),{API_RATE_LIMITER:{limit}}); expect(r?.status).toBe(429); expect(r?.headers.get('retry-after')).toBe('60'); expect(limit).toHaveBeenCalledWith({key:'mercadito:api:1.2.3.4'}); });
it('allows pages without requiring the API binding and fails closed for missing binding',async()=>{ const run=await budget(); expect(await run(new Request('https://example.com/chat'),{})).toBeNull(); expect((await run(new Request('https://example.com/api/chat'),{}))?.status).toBe(503); });

it('keeps the required account session check isolated from shared campus browsing traffic', async () => {
  const limit = vi.fn(async ({ key }) => ({ success: key !== 'mercadito:api:1.2.3.4' }));
  const env = { API_RATE_LIMITER: { limit } };
  const session = await enforceEdgeBudget(
    new Request('https://example.com/api/account/session', { headers: { 'cf-connecting-ip': '1.2.3.4' } }), env,
  );
  const browsing = await enforceEdgeBudget(
    new Request('https://example.com/api/stores', { headers: { 'cf-connecting-ip': '1.2.3.4' } }), env,
  );
  expect(session).toBeNull();
  expect(browsing?.status).toBe(429);
  expect(limit).toHaveBeenNthCalledWith(1, { key: 'mercadito:session:1.2.3.4' });
  expect(limit).toHaveBeenNthCalledWith(2, { key: 'mercadito:api:1.2.3.4' });
});

it('does not bypass the ordinary IP budget for a write to the session endpoint', async () => {
  const limit = vi.fn(async () => ({ success: false }));
  const denied = await enforceEdgeBudget(
    new Request('https://example.com/api/account/session', { method: 'POST', headers: { 'cf-connecting-ip': '1.2.3.4' } }),
    { API_RATE_LIMITER: { limit } },
  );
  expect(denied?.status).toBe(429);
  expect(limit).toHaveBeenCalledWith({ key: 'mercadito:api:1.2.3.4' });
});


function jwt(id: string) {
  return `Bearer ${"a".repeat(120)}.${"b".repeat(140)}.${"c".repeat(100)}${id}`;
}
function requestWithJwt(id: string) {
  return new Request("https://mercaditotec.store/api/account/session", {
    headers: { "cf-connecting-ip": "198.51.100.42", authorization: jwt(id) },
  });
}
function authLimits() {
  return {
    API_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    AUTH_API_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    API_IP_SAFETY_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
  };
}

it("gives each signed-in session its own limit even behind the same campus NAT", async () => {
  const limits = authLimits();
  expect(await enforceEdgeBudget(requestWithJwt("userA"), limits)).toBeNull();
  expect(await enforceEdgeBudget(requestWithJwt("userA"), limits)).toBeNull();
  expect(await enforceEdgeBudget(requestWithJwt("userB"), limits)).toBeNull();

  const sessions = limits.AUTH_API_RATE_LIMITER.limit.mock.calls.map(([arg]) => arg.key);
  expect(sessions[0]).toEqual(sessions[1]);
  expect(sessions[0]).not.toEqual(sessions[2]);
  expect(sessions[0]).not.toContain("userA");
  expect(sessions[0]).not.toContain("Bearer");

  const networks = limits.API_IP_SAFETY_LIMITER.limit.mock.calls.map(([arg]) => arg.key);
  expect(new Set(networks).size).toBe(1);
  expect(limits.API_RATE_LIMITER.limit).not.toHaveBeenCalled();
});

it("keeps unauthenticated and fake-short bearer requests under the stricter IP budget", async () => {
  const limits = authLimits();
  expect(await enforceEdgeBudget(new Request("https://mercaditotec.store/api/chat/reactions", {
    headers: { "cf-connecting-ip": "198.51.100.42", authorization: "Bearer a.b.c" },
  }), limits)).toBeNull();
  expect(limits.API_RATE_LIMITER.limit).toHaveBeenCalledWith({ key: "mercadito:api:198.51.100.42" });
  expect(limits.AUTH_API_RATE_LIMITER.limit).not.toHaveBeenCalled();
});

it("rejects unknown authenticated bindings without permitting API access", async () => {
  const limits = authLimits();
  const result = await enforceEdgeBudget(requestWithJwt("userA"), { API_RATE_LIMITER: limits.API_RATE_LIMITER });
  expect(result?.status).toBe(503);
  expect(limits.API_RATE_LIMITER.limit).not.toHaveBeenCalled();
});

it("enforces both the per-session limit and shared IP safety ceiling", async () => {
  const limits = authLimits();
  limits.AUTH_API_RATE_LIMITER.limit.mockResolvedValue({ success: false });
  const sessionResponse = await enforceEdgeBudget(requestWithJwt("userA"), limits);
  expect(sessionResponse?.status).toBe(429);
  expect(sessionResponse?.headers.get("retry-after")).toBe("60");

  limits.API_IP_SAFETY_LIMITER.limit.mockResolvedValue({ success: false });
  const networkResponse = await enforceEdgeBudget(requestWithJwt("userB"), limits);
  expect(networkResponse?.status).toBe(429);
  expect(limits.AUTH_API_RATE_LIMITER.limit).toHaveBeenCalledTimes(1);
});

it("does not bypass the limiter for a credentialed catalogue request", async () => {
  const limits = authLimits();
  expect(await enforceEdgeBudget(new Request("https://mercaditotec.store/api/marketplace", {
    headers: { authorization: jwt("userA"), "cf-connecting-ip": "198.51.100.42" },
  }), limits)).toBeNull();
  expect(limits.AUTH_API_RATE_LIMITER.limit).toHaveBeenCalledTimes(1);
});
