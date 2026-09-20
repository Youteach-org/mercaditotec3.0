# Cloudflare Workers deployment

Mercadito keeps GitHub as the source of truth and uses Cloudflare Workers as the current deployment target. The application code, Firebase schema, Firebase Admin abstraction, Vercel configuration, and root dependency files remain unchanged.

## Current Cloudflare Worker identity

The GitHub repository remains `youteachtk/mercaditotec3.0`. Cloudflare normalized the Worker/project name by replacing the repository dot with a hyphen:

`mercaditotec3-0`

`wrangler.jsonc` uses that exact Worker name. The public product name remains **Mercadito**.

## Why OpenNext instead of vinext right now

Cloudflare recommends vinext for new Next.js Worker deployments, but the current vinext beta requires React >= 19.2.6. This repository intentionally remains on React 19.2.4. To avoid changing functional application dependencies only for hosting, this deployment path uses the documented OpenNext adapter instead.

Mercadito currently pins `@opennextjs/cloudflare@1.19.4`. A GitHub Actions build check proved that `1.20.6` no longer accepts the application's Next.js `16.2.3` peer dependency: it requires Next.js <16 or >=16.3.3. We therefore keep Next.js unchanged and use the compatible adapter version during this hosting experiment.

## Cloudflare connection

1. GitHub repository: `youteachtk/mercaditotec3.0`.
2. Cloudflare Worker/project: `mercaditotec3-0`.
3. Production branch: `feature/student-stores`.
4. Build command:

```bash
node scripts/cloudflare-build.mjs
```

5. Production deploy command:

```bash
.cloudflare-tools/node_modules/.bin/opennextjs-cloudflare deploy
```

6. Preview deploy command:

```bash
.cloudflare-tools/node_modules/.bin/opennextjs-cloudflare upload
```

7. Configure `FIREBASE_SERVICE_ACCOUNT_JSON` as a **runtime Worker secret** under the Worker's **Settings → Variables & Secrets**. Never commit the secret to GitHub.
8. Build variables/secrets and runtime variables/secrets are separate. The runtime secret is mandatory for Firebase Admin.

Cloudflare Workers Builds should use Node 22.

## What the build does

`scripts/cloudflare-build.mjs` first runs the existing test suite, then creates an isolated `.cloudflare-tools/` directory and installs:

- `@opennextjs/cloudflare@1.19.4`
- `wrangler@4.132.0`

The script then runs the OpenNext build. The Worker entry point is generated at `.open-next/worker.js` and static assets at `.open-next/assets`.

## Runtime validation before relying on Cloudflare

After the first `*.workers.dev` deployment, verify:

1. `/marketplace` anonymously.
2. Sign-in and Firebase client authentication.
3. A Firebase Admin-backed server read.
4. `/orders` or `/notifications` while authenticated.
5. One safe server mutation.
6. Worker logs for Firebase Admin, TLS, crypto, DNS, HTTP, or Node compatibility errors.

Cloudflare is not considered accepted until these runtime checks pass.

## Rollback

If Firebase Admin or another server dependency fails in Workers, stop using the Cloudflare Worker and continue from the same GitHub branch on another Node-compatible host. No data migration is involved.
