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

Application business logic was not changed. Root `package.json` and `package-lock.json` were not changed.

Cloudflare runtime configuration now:
- uses Worker/project name `mercaditotec3-0`, matching Cloudflare's normalized project name for repository `mercaditotec3.0`
- uses compatibility date `2026-09-15`
- keeps the documented OpenNext `nodejs_compat` setting
- declares `FIREBASE_SERVICE_ACCOUNT_JSON` as a required runtime Worker secret
- uses `@opennextjs/cloudflare@1.19.4` and `wrangler@4.132.0` in the isolated Cloudflare build step
- validates the branch with GitHub Actions on pushes to `feature/student-stores`
- keeps Cloudflare-only packages in an isolated `.cloudflare-tools/` directory ignored by Git
- declares `jose` in Next.js `serverExternalPackages`, as required for packages with a Workerd-specific conditional export

Compatibility decisions and CI evidence:
- GitHub Actions run 1 on 2026-09-15 failed before tests/build because OpenNext `1.20.6` requires Next.js <16 or >=16.3.3.
- Mercadito remains on Next.js `16.2.3`.
- To keep application dependencies unchanged, the Cloudflare build path is pinned to OpenNext `1.19.4`, which is used with Next.js `16.2.3`.
- The second and third CI attempts exposed npm 10.9.8 `edgesOut` crashes whenever Cloudflare-only tooling was installed into Mercadito's existing root dependency tree.
- The build script now installs OpenNext and Wrangler into isolated `.cloudflare-tools/`, avoiding any second npm resolution of the application's dependency tree.
- The fourth CI attempt passed all 172 Vitest tests and the full Next.js production build, then failed in OpenNext bundling because `firebase-admin -> jwks-rsa -> jose` reached the Workerd export for `jose` after Next had bundled/traced it without its Workerd entry point.
- OpenNext documents `jose` as a package with Workerd-specific code and requires it in Next.js `serverExternalPackages`; `next.config.js` now applies that documented configuration.
- GitHub Actions run `35058421991` on commit `40de60831e33d5d5faa619a08e44f7e6342911fd` then passed end-to-end: 22 test files / 172 tests, Next.js production compilation and TypeScript, OpenNext bundle generation, and `.open-next/worker.js` verification.

The build compatibility gate is now passed. Cloudflare has created the Worker/project as `mercaditotec3-0`. The remaining external configuration is to ensure `feature/student-stores` is the production branch and add `FIREBASE_SERVICE_ACCOUNT_JSON` under the Worker's runtime **Settings → Variables & Secrets**. Build secrets and runtime secrets are separate in Cloudflare; the runtime secret is mandatory for Firebase Admin.

That external step requires access to the user's Cloudflare account and cannot be performed from the GitHub repository alone.
