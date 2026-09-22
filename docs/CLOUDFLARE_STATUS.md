# Cloudflare Workers Hosting Implementation Status

> **Hosting source of truth:** GitHub is `Youteach-org/mercaditotec3.0`; active branch is `feature/student-stores`; Mercadito is hosted on Cloudflare Workers, not Vercel.

## Current production topology

- Full application Worker: `mercaditotec3-0`
- Verified runtime: `https://mercaditotec3-0.youteach-tk.workers.dev`
- Stable public alias: `https://mercaditotec.youteach-tk.workers.dev`
- Required runtime secret on the full application Worker: `FIREBASE_SERVICE_ACCOUNT_JSON`

## Recovery history

- **2026-09-21:** Cloudflare Git integration was reconnected to `Youteach-org/mercaditotec3.0`.
- **2026-09-21:** The HTTP 500 runtime failure was repaired. Firebase Admin/Firestore code that was incompatible with Workers was replaced at the Worker boundary with Worker-safe REST/Web Crypto access, and the Firebase client session shell was isolated to the browser.
- **2026-09-22:** The application Worker was verified again: wrapper health, `/`, `/marketplace`, and `/api/marketplace` all returned HTTP 200; the Firebase runtime secret was present.
- **2026-09-22:** A stronger production smoke test was added. It verified all marketplace JS/CSS assets and then rendered the deployed marketplace in headless Chrome. The page hydrated successfully and displayed “Tiendas de la comunidad”.
- **2026-09-22:** The remaining public-access failure was identified. The Worker had been named `mercaditotec` through 2026-09-16, but commit `d85c595a` on 2026-09-20 changed it to `mercaditotec3-0`. The old stable URL then returned HTTP 404 / Cloudflare error 1042 even though the new Worker was healthy.
- **2026-09-22:** Recovery strategy: keep the healthy `mercaditotec3-0` application Worker and restore `mercaditotec` as a separate permanent HTTP 308 alias. This avoids moving application secrets or coupling the public URL to a repository-derived Worker name again.

## Permanent regression protection

`.github/workflows/cloudflare-runtime-smoke.yml` now rejects deployments where:
- the Worker/API is down;
- Firebase runtime configuration is absent;
- browser JS/CSS assets are unavailable;
- the app stays stuck in the client-side loading shell;
- the marketplace fails to hydrate in a real browser.

`.github/workflows/cloudflare-legacy-alias.yml` owns the stable public alias and verifies its redirect target after deployment.


## Current external blocker

- **2026-09-22:** Attempted automatic restoration of the `mercaditotec` alias from GitHub Actions. The deployment correctly stopped before touching Cloudflare because `CLOUDFLARE_API_TOKEN` is not available in the moved repository `Youteach-org/mercaditotec3.0`.
- The main Cloudflare Git integration is independent and remains healthy; it can continue deploying `mercaditotec3-0`.
- The alias workflow is intentionally manual-only until the missing GitHub Actions secret is restored. This prevents every source-code push from producing a false red deployment check.
- Once `CLOUDFLARE_API_TOKEN` is restored in the organization repository, run **Restore Mercadito stable URL** once. It will deploy the minimal redirect Worker and verify the HTTP 308 redirect end-to-end.
