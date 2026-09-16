# Cloudflare Workers Hosting Implementation Status

This hosting block was intentionally grouped to reduce deployment churn.

Prepared in repository:
- `wrangler.jsonc`
- `open-next.config.ts`
- `scripts/cloudflare-build.mjs`
- `.github/workflows/cloudflare-build-check.yml`
- `docs/CLOUDFLARE_DEPLOY.md`
- updated `.gitignore`
- updated hosting design and implementation plan

Application code was not changed. Root `package.json` and `package-lock.json` were not changed.

Cloudflare runtime configuration now:
- uses compatibility date `2026-09-15`
- keeps the documented OpenNext `nodejs_compat` setting
- declares `FIREBASE_SERVICE_ACCOUNT_JSON` as a required runtime Worker secret
- uses `@opennextjs/cloudflare@1.19.4` and `wrangler@4.132.0` in the isolated Cloudflare build step
- validates the branch with GitHub Actions on pushes to `feature/student-stores`
- keeps Cloudflare-only packages in an isolated `.cloudflare-tools/` directory ignored by Git

Compatibility decision:
- GitHub Actions run 1 on 2026-09-15 failed before tests/build because OpenNext `1.20.6` requires Next.js <16 or >=16.3.3.
- Mercadito remains on Next.js `16.2.3`.
- To keep application dependencies unchanged, the Cloudflare build path is pinned to OpenNext `1.19.4`, which is used with Next.js `16.2.3`.
- The second and third CI attempts exposed npm 10.9.8 `edgesOut` crashes whenever Cloudflare-only tooling was installed into Mercadito's existing root dependency tree.
- The build script now installs OpenNext and Wrangler into isolated `.cloudflare-tools/`, avoiding any second npm resolution of the application's dependency tree.

The remaining external step is to connect the GitHub repository to Cloudflare Workers Builds, configure `feature/student-stores` as the production branch, and add `FIREBASE_SERVICE_ACCOUNT_JSON` under the Worker's runtime **Settings → Variables & Secrets**. Build secrets and runtime secrets are separate in Cloudflare; the runtime secret is mandatory for Firebase Admin.

That external step requires access to the user's Cloudflare account and cannot be performed from the GitHub repository alone.
