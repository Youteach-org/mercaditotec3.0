# Cloudflare Workers Hosting Design

## Goal

Add Cloudflare Workers as an alternate hosting target for Mercadito Tec 3 while preserving the existing application behavior, Firebase data model, Firebase Admin usage, order flow, moderation, marketplace, and notifications.

## Scope

This work changes hosting and build/deploy configuration only. It does not redesign application features or migrate data.

Included:
- Add a Cloudflare Workers deployment path for the existing Next.js 16 application.
- Keep GitHub as the source of truth.
- Preserve `feature/student-stores` as the active working branch.
- Preserve Vercel compatibility while Cloudflare is tested.
- Use a recent Cloudflare Workers compatibility date (`2026-09-08` or later) so current Node.js compatibility behavior is enabled.
- Use the current recommended Cloudflare path for existing Next.js 16 applications: vinext, subject to compatibility checks.
- Keep Firebase Admin credentials as server-side secrets/environment variables only.
- Validate critical server routes at runtime before treating Cloudflare as usable.

Out of scope:
- Rewriting Firebase Admin to REST APIs.
- Migrating Firestore data.
- Changing order, report, chat, store, marketplace, or notification business logic.
- Removing Vercel.
- Switching to Cloudflare Pages static export.
- Custom domain work in this phase.

## Architecture

Mercadito Tec 3 remains a full-stack Next.js application. Cloudflare Workers is an alternate runtime target only.

The existing application source under `app/`, `lib/`, and `components/` remains authoritative. Cloudflare-specific changes should be limited to package scripts/dependencies and deployment configuration required by vinext/Workers.

The deployment target is a `*.workers.dev` preview URL first. Cloudflare is considered viable only after both build compatibility and runtime Firebase Admin behavior are verified.

## Compatibility Strategy

Cloudflare's current Workers documentation recommends vinext for Next.js applications. Because vinext is still beta, compatibility must be checked before relying on it for this project.

The migration must therefore follow two gates:

1. Build compatibility gate
   - Run the vinext compatibility check.
   - Build the app for Cloudflare.
   - Existing Vitest tests must still pass.
   - Existing Next.js/Vercel build scripts must remain available.

2. Runtime compatibility gate
   - Open the deployed app.
   - Verify at least one anonymous marketplace route.
   - Verify authenticated session behavior.
   - Verify a Firebase Admin-backed read endpoint.
   - Verify an authenticated Firebase Admin-backed route such as orders or notifications.
   - Confirm there are no runtime crashes caused by Firebase Admin, Node built-ins, or Worker restrictions.

If either gate fails due to runtime incompatibility, Cloudflare is rejected as a hosting target without changing the application's backend architecture.

## Node.js Compatibility

Use `compatibility_date = "2026-09-08"` or a later date supported at implementation time. Cloudflare enables its current Node.js compatibility behavior by default for compatibility dates on or after `2026-08-04`.

Do not add unnecessary Node polyfills manually unless the compatibility check or runtime logs prove they are needed.

## Firebase Admin

Firebase Admin remains server-only.

No Firebase service-account secret may be committed to GitHub. Any existing server credentials must be recreated in Cloudflare as encrypted Worker secrets/environment configuration.

The existing `lib/firebaseAdmin` abstraction should remain unchanged unless a concrete runtime incompatibility is demonstrated. Hosting work should not proactively rewrite Firebase access.

## Deployment Configuration

The repository may add the files/dependencies/scripts required by the Cloudflare Workers deployment path, including a Wrangler configuration and vinext-related package configuration.

The Cloudflare project should target the existing GitHub repository and branch `feature/student-stores` during this preview phase.

Automatic deployments should be configured conservatively. The development workflow should continue grouping meaningful changes before pushing to GitHub rather than committing each file separately.

## Vercel

Do not remove or modify the existing Vercel projects as part of this work.

Cloudflare is an alternate preview/runtime path while Vercel rests. If Cloudflare proves stable, later work may decide whether Vercel remains primary, Cloudflare becomes primary, or both remain available.

## Rollback

Rollback must be trivial:
- Do not migrate data.
- Do not change Firebase schemas.
- Do not replace Firebase Admin abstractions solely for Cloudflare.
- If Workers fails runtime validation, stop using the Cloudflare deployment target and continue from the same GitHub branch on another Node-compatible host.

## Verification

Cloudflare hosting is considered successful only when all of the following are true:
- Existing Vitest suite passes.
- Existing Next.js/Vercel build path remains intact.
- Cloudflare build completes.
- The Worker deployment reaches a usable `*.workers.dev` URL.
- Public marketplace pages render.
- Authentication initializes.
- Firebase Admin-backed reads succeed.
- Orders/notifications or another authenticated server route succeeds.
- No Firebase credentials or sensitive values are committed to the repository.

## Commit Discipline

To conserve deployment quota, implementation changes should be grouped into a single meaningful hosting commit whenever practical. Do not use one GitHub commit per configuration file.