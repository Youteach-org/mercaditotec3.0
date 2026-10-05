import { it, expect, vi } from 'vitest';
import { enforceEdgeBudget } from './edgeBudget.mjs';
async function budget() { return enforceEdgeBudget; }
it('rejects excess API traffic before handling and ignores spoofed forwarding and token identities', async()=>{ const run=await budget(); const limit=vi.fn(async()=>({success:false})); const r=await run(new Request('https://example.com/api/chat/reactions',{headers:{'cf-connecting-ip':'1.2.3.4','x-forwarded-for':'evil','authorization':'Bearer fake'}}),{API_RATE_LIMITER:{limit}}); expect(r?.status).toBe(429); expect(r?.headers.get('retry-after')).toBe('60'); expect(limit).toHaveBeenCalledWith({key:'mercadito:api:1.2.3.4'}); });
it('allows pages without requiring the API binding and fails closed for missing binding',async()=>{ const run=await budget(); expect(await run(new Request('https://example.com/chat'),{})).toBeNull(); expect((await run(new Request('https://example.com/api/chat'),{}))?.status).toBe(503); });
