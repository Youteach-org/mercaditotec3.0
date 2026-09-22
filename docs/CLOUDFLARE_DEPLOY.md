# Cloudflare Workers deployment

Mercadito keeps GitHub as the source of truth and uses Cloudflare Workers as the current deployment target.

## Repository and public identity

- GitHub repository: `Youteach-org/mercaditotec3.0`
- Active production branch: `feature/student-stores`
- Application Worker: `mercaditotec3-0`
- Application runtime: `https://mercaditotec3-0.youteach-tk.workers.dev`
- Stable public alias: `https://mercaditotec.youteach-tk.workers.dev`

The stable alias is intentionally decoupled from the repository/Worker implementation name. It redirects every path and query string with HTTP 308 to the healthy application Worker. Moving the GitHub repository or renaming the application Worker must not silently change Mercadito's public address again.

## Cloudflare connection

Cloudflare Workers Builds is connected to `Youteach-org/mercaditotec3.0` and deploys `feature/student-stores`.

Application build command:

```bash
node scripts/cloudflare-build.mjs
```

The application Worker requires `FIREBASE_SERVICE_ACCOUNT_JSON` as a runtime Worker secret. Never commit that secret to GitHub.

The stable `mercaditotec` alias is a separate minimal redirect Worker deployed by `.github/workflows/cloudflare-legacy-alias.yml`. It intentionally contains no Firebase credentials.

## Runtime implementation

Mercadito remains a full-stack Next.js application adapted to Cloudflare Workers through OpenNext. The Cloudflare build currently pins its runtime-only compatibility toolchain inside `scripts/cloudflare-build.mjs`; normal application dependencies remain separate.

The generated application Worker is `.open-next/worker.js`; static assets are served from `.open-next/assets`.

## Required production verification

The permanent smoke test `.github/workflows/cloudflare-runtime-smoke.yml` verifies:

1. Worker wrapper health and Firebase runtime secret presence.
2. `/`, `/marketplace`, and `/api/marketplace`.
3. All JavaScript and CSS referenced by the marketplace HTML.
4. Real browser hydration in headless Chrome.
5. The marketplace UI actually renders instead of remaining in its client-side loading shell.

The stable-alias workflow separately verifies that `mercaditotec.youteach-tk.workers.dev` redirects to the healthy application Worker.

## Vercel

Vercel is no longer the Mercadito deployment target. Old Vercel URLs are historical only and must not be used as production health indicators.

## Rollback

If a future application deployment is bad, rollback the application Worker/version without changing the stable public alias. The alias must continue to point only at the verified healthy Worker.
