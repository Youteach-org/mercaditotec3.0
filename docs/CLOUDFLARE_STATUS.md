# Cloudflare Workers Hosting Implementation Status

This hosting block was intentionally grouped to reduce deployment churn.

Prepared in repository:
- `wrangler.jsonc`
- `open-next.config.ts`
- `scripts/cloudflare-build.mjs`
- `docs/CLOUDFLARE_DEPLOY.md`
- updated `.gitignore`
- updated hosting design and implementation plan

Application code was not changed. Root `package.json` and `package-lock.json` were not changed.

Cloudflare runtime configuration now:
- uses compatibility date `2026-09-15`
- keeps the documented OpenNext `nodejs_compat` setting
- declares `FIREBASE_SERVICE_ACCOUNT_JSON` as a required runtime Worker secret
- uses `@opennextjs/cloudflare@1.20.6` and `wrangler@4.132.0` in the isolated Cloudflare build step

The remaining external step is to connect the GitHub repository to Cloudflare Workers Builds, configure `feature/student-stores` as the production branch, and add `FIREBASE_SERVICE_ACCOUNT_JSON` under the Worker's runtime **Settings → Variables & Secrets**. Build secrets and runtime secrets are separate in Cloudflare; the runtime secret is mandatory for Firebase Admin.

That external step requires access to the user's Cloudflare account and cannot be performed from the GitHub repository alone.
