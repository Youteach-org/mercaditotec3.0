# Cloudflare Workers deployment

Mercadito keeps GitHub as the source of truth and uses Cloudflare Workers as the current deployment target. The application code, Firebase schema, Firebase Admin abstraction, Vercel configuration, and root dependency files remain unchanged.

## Why OpenNext instead of vinext right now

Cloudflare recommends vinext for new Next.js Worker deployments, but the current vinext beta requires React >= 19.2.6. This repository intentionally remains on React 19.2.4. To avoid changing functional application dependencies only for hosting, this deployment path uses the documented OpenNext adapter instead.

Mercadito currently pins `@opennextjs/cloudflare@1.19.4`. A GitHub Actions build check on 2026-09-15 proved that `1.20.6` no longer accepts the application's Next.js `16.2.3` peer dependency: it requires Next.js <16 or >=16.3.3. We therefore keep Next.js unchanged and use the compatible adapter version during this hosting experiment.

## One-time Cloudflare connection

In Cloudflare Dashboard:

1. Open **Workers & Pages** and choose **Create application → Import a repository**.
2. Connect GitHub repository `youteachtk/mercaditotec3.0`.
3. Use branch `feature/student-stores` as the production branch while Mercadito is being finalized.
4. Set the build command to:

```bash
node scripts/cloudflare-build.mjs
```

5. Set the production deploy command to:

```bash
npx wrangler deploy
```

6. For non-production/preview branches, use:

```bash
npx wrangler versions upload
```

7. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` as a **runtime Worker secret** under the Worker's **Settings → Variables & Secrets**. Copy the same JSON value already used by the application on its existing server host. Never paste this secret into GitHub files or ordinary plaintext variables.
8. The repository declares `FIREBASE_SERVICE_ACCOUNT_JSON` under `secrets.required`, so `wrangler deploy` and `wrangler versions upload` will refuse to publish if the runtime secret is missing.
9. **Build variables and secrets are separate from runtime variables and secrets.** Do not rely on a Workers Builds secret as a substitute for the runtime Worker secret. Only add the same value as a Build secret if a future build step explicitly reports that it needs the credential during build time.

Cloudflare Workers Builds should use a current Node.js build image. Node 22 is preferred for the build environment.

## What the build does

`scripts/cloudflare-build.mjs` deliberately does not modify root application dependencies. During the Cloudflare build job it installs only:

- `@opennextjs/cloudflare@1.19.4`
- `wrangler@4.132.0`

using `--no-save --package-lock=false`, then runs the repository's existing Vitest suite and the OpenNext build.

The Worker entry point is generated at `.open-next/worker.js`, and static assets are generated at `.open-next/assets`.

## Runtime validation before relying on Cloudflare

After the first `*.workers.dev` deployment, verify all of these:

1. Open `/marketplace` anonymously and confirm stores/products render.
2. Sign in and confirm Firebase client authentication initializes.
3. Open a route that performs a Firebase Admin-backed server read.
4. Open `/orders` or `/notifications` while authenticated.
5. Perform one safe test operation that reaches a server route backed by Firebase Admin.
6. Check Worker logs for Firebase Admin, TLS, crypto, DNS, HTTP, or Node compatibility errors.

Cloudflare is not considered accepted until these runtime checks pass.

## Rollback

If Firebase Admin or another server dependency fails in Workers, do not rewrite the backend for this experiment. Stop using/disconnect the Cloudflare Worker and continue using the same GitHub branch with Vercel or another Node-compatible host. No data migration is involved, so rollback does not require Firestore changes.

## Commit discipline

Cloudflare and Vercel can both react to Git pushes. Continue grouping related application work into meaningful larger commits rather than committing each file separately.
