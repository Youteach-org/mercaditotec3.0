# Cloudflare Workers Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Cloudflare Workers hosting path for Mercadito without changing application behavior, Firebase schemas, or the existing Vercel build path.

**Architecture:** Keep the existing Next.js 16 application behavior untouched and adapt its normal `next build` output for Cloudflare using OpenNext. OpenNext is used as the conservative fallback because the current vinext beta requires React >= 19.2.6 while this project intentionally remains on React 19.2.4. Cloudflare-specific tooling is isolated from the root dependency tree, so root application dependencies and lockfiles remain unchanged.

**Tech Stack:** Next.js 16.2.3, React 19.2.4, Firebase/Firebase Admin, OpenNext for Cloudflare 1.19.4, Wrangler 4.132.0, Cloudflare Workers.

**Compatibility note:** GitHub Actions verified on 2026-09-15 that OpenNext 1.20.6 rejects Next.js 16.2.3 because its peer range requires Next.js <16 or >=16.3.3. The hosting path therefore pins OpenNext 1.19.4 instead of upgrading the application solely for deployment. OpenNext also documents `jose` as having a Workerd-specific conditional export, so Next.js must keep `jose` external on the server build.

**Spec:** `docs/superpowers/specs/2026-09-08-cloudflare-workers-hosting.md`

## Global Constraints

- GitHub remains the source of truth.
- Active branch remains `feature/student-stores`.
- Do not remove or modify Vercel configuration.
- Do not migrate data or change Firebase schemas.
- Do not rewrite Firebase Admin solely for Cloudflare.
- Do not commit `FIREBASE_SERVICE_ACCOUNT_JSON` or any other secret.
- Keep root `package.json` and `package-lock.json` unchanged during this hosting experiment.
- Group implementation into one meaningful commit whenever practical.

---

### Task 1: Add Cloudflare Worker configuration

**Files:**
- Create: `wrangler.jsonc`
- Create: `open-next.config.ts`
- Modify: `next.config.js`

- [x] Configure Worker name, OpenNext worker entry, static assets, observability, and `compatibility_date` 2026-09-15.
- [x] Keep `nodejs_compat` enabled as required by the OpenNext Cloudflare adapter documentation.
- [x] Use the default OpenNext Cloudflare configuration with no application-specific cache or data changes.
- [x] Add `jose` to Next.js `serverExternalPackages` so OpenNext can select its Workerd-specific export.

### Task 2: Add isolated Cloudflare build script

**Files:**
- Create: `scripts/cloudflare-build.mjs`

- [x] Install `@opennextjs/cloudflare@1.19.4` and `wrangler@4.132.0` inside isolated `.cloudflare-tools/` with `--no-save`.
- [x] Run the full existing Vitest suite before adaptation.
- [x] Run `opennextjs-cloudflare build` to execute the existing Next.js build and create `.open-next/worker.js`.
- [x] Expose the isolated adapter through a temporary `node_modules/@opennextjs/cloudflare` symlink so the existing OpenNext config can resolve it.
- [x] Fail immediately if any command fails.

### Task 3: Protect generated and secret files

**Files:**
- Modify: `.gitignore`

- [x] Ignore `.open-next/`, `.wrangler/`, `.cloudflare-tools/`, and `.dev.vars*` while allowing a future `.dev.vars.example`.

### Task 4: Document the one-time Cloudflare dashboard connection

**Files:**
- Create: `docs/CLOUDFLARE_DEPLOY.md`

- [x] Document GitHub repository and branch selection.
- [x] Document build, production deploy, and preview deploy commands.
- [x] Document `FIREBASE_SERVICE_ACCOUNT_JSON` as a Cloudflare secret, not a plain variable.
- [x] Document runtime checks for marketplace, auth, Firebase Admin, orders, and notifications.
- [x] Document rollback by disconnecting/ignoring the Worker without changing application data.

### Task 5: Verification

- [x] Add a GitHub Actions build check for `feature/student-stores`.
- [ ] Confirm the GitHub Actions build check passes with the compatible OpenNext pin and Workerd package configuration.
- [ ] Connect the repository in Cloudflare Workers Builds.
- [ ] Run the first Cloudflare build using `node scripts/cloudflare-build.mjs`.
- [ ] Confirm OpenNext build succeeds and `.open-next/worker.js` is produced.
- [ ] Deploy through the isolated OpenNext Cloudflare CLI and obtain a `*.workers.dev` URL.
- [ ] Verify public marketplace rendering.
- [ ] Verify authenticated Firebase session.
- [ ] Verify a Firebase Admin-backed read.
- [ ] Verify orders or notifications.
- [ ] Reject Cloudflare without backend rewrites if Firebase Admin fails at runtime.
