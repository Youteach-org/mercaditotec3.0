# Cloudflare Workers Hosting Implementation Status

> **Hosting source of truth:** GitHub is `Youteach-org/mercaditotec3.0`; active branch is `feature/student-stores`; Mercadito is hosted on Cloudflare Workers, not Vercel.

## Current production topology

- Full application Worker: `mercaditotec3-0`
- Verified runtime: `https://mercaditotec3-0.youteach-tk.workers.dev`
- Stable public alias: `https://mercaditotec.youteach-tk.workers.dev`
- Required runtime secret on the full application Worker: `FIREBASE_SERVICE_ACCOUNT_JSON`
- GitHub Actions deploy secret: repository-scoped `CLOUDFLARE_API_TOKEN` in `Youteach-org/mercaditotec3.0`

## Recovery history

- **2026-09-21:** Cloudflare Git integration was reconnected to `Youteach-org/mercaditotec3.0`.
- **2026-09-21:** The HTTP 500 runtime failure was repaired. Firebase Admin/Firestore code that was incompatible with Workers was replaced at the Worker boundary with Worker-safe REST/Web Crypto access, and the Firebase client session shell was isolated to the browser.
- **2026-09-22:** The application Worker was verified again: wrapper health, `/`, `/marketplace`, and `/api/marketplace` all returned HTTP 200; the Firebase runtime secret was present.
- **2026-09-22:** A stronger production smoke test was added. It verified all marketplace JS/CSS assets and then rendered the deployed marketplace in headless Chrome. The page hydrated successfully and displayed “Tiendas de la comunidad”.
- **2026-09-22:** The remaining public-access failure was identified. The Worker had been named `mercaditotec` through 2026-09-16, but commit `d85c595a` on 2026-09-20 changed it to `mercaditotec3-0`. The old stable URL then returned HTTP 404 / Cloudflare error 1042 even though the new Worker was healthy.
- **2026-09-22:** Recovery strategy: keep the healthy `mercaditotec3-0` application Worker and restore `mercaditotec` as a separate permanent HTTP 308 alias. This avoids moving application secrets or coupling the public URL to a repository-derived Worker name again.
- **2026-09-24:** `CLOUDFLARE_API_TOKEN` was restored as a repository Actions secret after the repository move to `Youteach-org`.
- **2026-09-24:** The alias deploy was isolated from the OpenNext application config with `wrangler.legacy-alias.jsonc`, preventing Wrangler from incorrectly requiring `.open-next/assets` for the redirect Worker.
- **2026-09-24:** Run `36079459897` deployed Worker `mercaditotec` successfully. Verification returned HTTP 308 from `https://mercaditotec.youteach-tk.workers.dev/marketplace` to `https://mercaditotec3-0.youteach-tk.workers.dev/marketplace`, then HTTP 200 after following the redirect. Stable public access is restored.

## Permanent regression protection

`.github/workflows/cloudflare-runtime-smoke.yml` rejects deployments where:
- the Worker/API is down;
- Firebase runtime configuration is absent;
- browser JS/CSS assets are unavailable;
- the app stays stuck in the client-side loading shell;
- the marketplace fails to hydrate in a real browser.

`.github/workflows/cloudflare-legacy-alias.yml` owns the stable public alias and verifies its redirect target after deployment. It is intentionally manual-only because the alias normally does not need to be redeployed when application code changes.

The alias Worker uses `wrangler.legacy-alias.jsonc` so its deployment is independent of the main OpenNext `wrangler.jsonc`.

## Current state

- Main application Worker: healthy.
- Stable alias Worker: restored and verified.
- GitHub Actions Cloudflare token: available to this repository.
- Vercel: legacy only; do not restore it as the deployment target.
- No remaining Cloudflare hosting blocker is known for Mercadito.

## Marketplace integration status

The marketplace redesign was explicitly approved for integration on 2026-09-29 so authenticated flows and real store data can be tested end to end.

Branches integrated from the approved marketplace implementation:

- `main`
- `feature/student-stores`
- `preview/marketplace-approved-reference`

Production deployment:

- Worker: `mercaditotec3-0`
- Runtime: `https://mercaditotec3-0.youteach-tk.workers.dev`
- Deploy workflow: `.github/workflows/cloudflare-production-deploy.yml`
- Deploy run: `36626622592` — success
- Worker version: `dbc450a4-93b6-4d08-9402-c7648a6332b5`
- `/`: HTTP `200`
- `/marketplace`: HTTP `200`
- `/api/marketplace`: HTTP `200`
- `/icon.svg`: HTTP `200`
- `/__health`: HTTP `200`
- `FIREBASE_SERVICE_ACCOUNT_JSON`: present

Browser verification after the deployment settled:

- Verification workflow: `.github/workflows/cloudflare-production-recheck.yml`
- Run: `36627264465` — success
- All 10 marketplace JS/CSS assets returned HTTP `200`
- Headless Chrome rendered the marketplace without the loading state or the data-load error state.

The isolated preview Worker remains available for visual-only checks, but real functional testing should now use the production Worker because it has the production Firebase runtime secret and live API/data path.

### Browser icon branding — 2026-09-29

- Legacy Vercel-era favicon removed from the preview branch.
- MercaditoTec SVG app icon added and referenced explicitly in root metadata.
- Unused `public/vercel.svg` removed.
- Build check `36618625759`: success.
- Preview deploy `36618546517`: success.
- Worker version: `8cbf3236-ed73-4c3d-b003-2cef70125b25`.
- Review route: HTTP `200`.

## Student verification and admin users — 2026-09-29

The store-approval gate remains tied to the student trust system: a store owner must have `studentStatus: "verified"` before an admin can approve the store.

The admin path no longer allows manual verification of a pending student. Verification is obtained only through the existing two-endorsement flow. The admin users screen is limited to viewing trust state/endorsement count and revoking an already verified account when needed.

To improve reliability of the users screen, `/api/admin/users` now lists the `users` collection through the Firestore REST document-list endpoint instead of a generic no-filter query.

Production deploy verification now also checks:

- `/admin/users` exists and returns a normal page response;
- `/api/admin/users` exists and returns HTTP `401` when called without authentication.

Verified deployment:

- production deploy run: `36629372791` — success;
- build check run: `36629372512` — success;
- test suite: `24` files / `181` tests passed;
- Worker version: `892fafb3-2a5d-4ca7-ba58-f68487e208bd`;
- `/admin/users`: HTTP `200`;
- unauthenticated `/api/admin/users`: HTTP `401`;
- Firebase runtime secret present.


## Store editor collage controls — 2026-09-29

The store create/edit flow now exposes the informational collage elements used on the marketplace home card.

- A live **Marketplace card preview** was added inside the store editor.
- The preview shows the selected cloud silhouette, cover image, over-photo label, torn information paper, logo, tags, delivery location, and post-it.
- The previous "Nota del papelito" field is now labeled **Texto del post-it** and explains that it controls the post-it shown on the marketplace home card.
- Changes are reflected live in the preview while the owner edits the store.
- The same editor is used for both newly created stores and existing editable stores, so these controls are available in both flows.

Implementation:
- `components/store/MarketplaceCardEditorPreview.tsx`
- `components/store/StoreBuilderClient.tsx`


## Mobile marketplace navigation — 2026-09-29

The public marketplace header now renders on mobile even when no user is signed in.

- Logged-out mobile users can see **Mercadito**, **Iniciar sesión**, and **Crear cuenta**.
- Logged-in mobile users continue to see **Mercadito**, **Pedidos**, **Mis tiendas**, **Chat**, **Perfil**, and **Admin** when applicable.
- The desktop public marketplace now also exposes **Iniciar sesión** and **Crear cuenta** instead of hiding the entire shell.
- The marketplace logo width was relaxed on small screens so the account actions are not pushed out of view.

Implementation:
- `components/AppShell.tsx`


## Explicit store save control — 2026-09-29

The store editor keeps autosave, but now also includes a visible **Guardar cambios** button for the store-information and marketplace-card fields.

- Manual save uses the same validated PATCH path as autosave.
- The button is disabled while saving or when the store is not editable.
- Successful manual saves display **Cambios guardados.**
- The button is full width on mobile and compact on larger screens.

Implementation:
- `components/store/StoreBuilderClient.tsx`

