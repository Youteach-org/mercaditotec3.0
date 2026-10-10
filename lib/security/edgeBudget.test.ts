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
