# Mercadito Android PWA Design

**Date:** 2026-10-21  
**Status:** Awaiting review

## Goal

Make the existing MercaditoTec site installable on Android as an app, using the current Next.js application, Firebase authentication, Supabase media, Cloudflare deployment, and `mercaditotec.store` domain.

## User intent and constraints

- The user approved starting with an installable PWA, then preparing Google Play distribution.
- Keep the current website and accounts as the source of truth; do not rebuild the marketplace as a separate Android client.
- Preserve Mercadito's existing visual identity and use its current icon as the starting asset.
- Keep marketplace data, account/session data, store management, and other private or changing responses online-only.
- Do not deploy or publish to Google Play as part of the first milestone.

## Current repository findings

- The app is Next.js App Router, deployed to Cloudflare Workers through OpenNext.
- Firebase Authentication and Firestore are initialized in the web client.
- The root layout exposes `app/icon.svg` as the favicon.
- The current app has no web app manifest, service worker, Capacitor project, or Android project.
- Store APIs and authenticated pages are part of the same Next.js app.

## Approaches considered

1. **PWA first, then Trusted Web Activity (recommended):** add installation support to the existing site; once tested, package the verified site in a small Android app for Google Play.
2. **Capacitor shell:** wrap the site in a WebView. This adds native project maintenance without a current requirement for native-only features.
3. **Separate native Android app:** reimplement screens and connect them to existing services. This duplicates work and creates a second client to maintain.

## First milestone: installable PWA

### Manifest and branding

- Add a Next.js App Router manifest with the name `MercaditoTec`, short name, Spanish language, `/marketplace` start URL, root scope, `standalone` display mode, and existing brand colors.
- Supply install icons at 192×192 and 512×512, including a maskable variant, derived from the current `app/icon.svg` without changing its artwork.
- Add an offline fallback page with a clear Spanish message and a retry action.

### Service worker and data safety

- Register a same-origin service worker.
- Cache only the offline fallback and safe, versioned static assets.
- Do not cache HTML navigations, API responses, Firebase requests, authenticated pages, user or store data, uploaded media, or POST/PUT/PATCH/DELETE requests.
- Network-dependent marketplace and account actions remain online-only. If offline, show the fallback instead of stale or private data.

### Installation and validation

- Make Chrome on Android offer installation from the browser menu; do not add an intrusive install prompt.
- Validate the production domain over HTTPS, manifest fields and icon responses, service worker scope, install and launch, navigation, sign-in, store browsing, and create/edit flows on Android.
- Check that requests to API and Firebase are never served from the service worker cache.
- Keep all PWA work in a reviewable GitHub branch and do not deploy until the user reviews the result.

## Second milestone: Google Play package

After the PWA is tested, create a Trusted Web Activity package for `https://mercaditotec.store`. Associate the Android package and website with Digital Asset Links, build and sign the app, test the signed build, then prepare Play Store listing assets and the privacy disclosures. Keep signing credentials out of the repository. This milestone is not included in the first implementation.

## Acceptance criteria for milestone one

1. Chrome's manifest inspection shows the correct app name, start URL, scope, standalone display, and all required icons.
2. A user can install and open Mercadito in its own app window on Android.
3. Existing sign-in and marketplace features still use the live site and current data.
4. The service worker never serves authenticated or mutable marketplace data from cache.
5. An offline navigation shows the offline fallback and does not expose a previously viewed private page.
6. The project build and relevant tests pass before requesting review.

## Decision requested

Review and approve this design for the first milestone. After approval, prepare the detailed implementation plan, then implement and verify the PWA in a branch.