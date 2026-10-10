# MercaditoTec: approved stores missing from public catalogue — 2026-10-09

## Report
Admin screenshot shows four `active` stores with valid public slugs:
- Leo Streaming (`leo-streaming`)
- COSITAS CULS (`cositas-culs`)
- Kratex (`kratex`)
- alfa_Rios 3D (`alfarios-3d`)

Only alfa_Rios 3D was visible on the public marketplace. Admin status and public visibility can diverge without changing the real store records.

## Code-level cause and corrections
1. The public API serves a materialized Firestore snapshot (`public_marketplace_cache/catalog-v1`) that is considered fresh for **24 hours**. It relies on a background Cloudflare `waitUntil` rebuild after approval. If that background refresh fails, newly approved stores can be absent for many hours. This mechanism is confirmed in source; direct inspection of live Firestore snapshot was not available in the GitHub connection.
2. Approval, reactivation and suspension now atomically change `revision` in `public_marketplace_cache/catalog-v2` in the **same Firestore transaction** as the store status. The public snapshot detects `revision != processedRevision` and rebuilds even when its timestamp is within 24 hours.
3. Rebuilds read the starting revision before fetching stores and save `processedRevision` using merge. If a second approval arrives during rebuild, the later revision is preserved; a following read rebuilds again.
4. v2 catalogue migration forces a fresh snapshot of existing active stores. If the refresh fails, it falls back to the previous cached public snapshot to avoid taking the storefront down.
5. Isolate cache freshness becomes 1 minute. Public v2 Cache-Control is 60 seconds with a 120-second stale allowance; frontend browser fetch is `no-store`. This reduces persistence of stale public data while retaining Cloudflare shared cache.
6. Regression tests cover missing approvals, a concurrent approval while rebuilding, and the legacy fallback on provider failure.

## Operational checks
- GitHub remains source of truth, `feature/student-stores` is deployment branch, Cloudflare Workers is production (no Vercel).
- After deployment, verify `/api/marketplace-v2` includes all three slugs above and `alfarios-3d`. Check public frontend with filter `Todas`, empty search and the “Más tiendas” section.
- If any are still missing, the remaining possible causes are Firestore query/available products/HTML or API failure; compare live `stores` state and materialized `public_marketplace_cache/catalog-v2` in a secured admin backend, without exposing user documents.
- Previously diagnosed `/__health` Firebase Rules IAM permission-denied is a separate CI post-deploy verification failure and does not prove public store disappearance.
- Do not re-approve or reset store statuses to repair the public catalogue.
