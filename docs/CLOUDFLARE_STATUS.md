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


## Editable marketplace decorations + store image layering — 2026-09-30

Marketplace decorative text is now editable from `/admin/marketplace`.

Editable content includes:

- main title and highlighted word;
- subtitle;
- pink, blue, and orange post-its;
- campus note and student note;
- featured-store heading;
- bottom blue note;
- "DESCUBRE" label;
- lower-right post-it;
- search placeholder and button label;
- category labels;
- additional-store section heading.

Configuration is persisted in Firestore at `site_config/marketplace` and returned with the public marketplace API. The approved composition/layout is unchanged.

Store-cover rendering was also corrected:

- cover media now sits above the collage base;
- information paper remains in front of the image;
- logo, ribbon, and post-it retain higher layers;
- uploaded cover images use `object-fit: contain` so the full image is visible instead of being cropped by `cover`;
- the store editor card preview uses the same full-image behavior.

Implementation:
- `lib/store/marketplaceContent.ts`
- `lib/store/marketplaceContentRepository.ts`
- `app/api/admin/marketplace-content/route.ts`
- `app/admin/marketplace/page.tsx`
- `app/api/marketplace/route.ts`
- `app/marketplace/page.tsx`
- `components/store/MarketplaceCardEditorPreview.tsx`
- `app/globals.css`


## Android marketplace cloud fallback — 2026-09-30

Android browsers can be inconsistent with SVG `clip-path: url(#...)` references. The marketplace now has a mobile/tablet fallback that uses explicit CSS polygon silhouettes for all six store variants.

- Store cards no longer fall back to oval inherited border radii on Android.
- Each of the six variants keeps a distinct irregular cloud silhouette.
- Cover images remain fully visible with `object-fit: contain`.
- The information paper, logo, ribbon and post-it remain layered above the image in the approved order.
- The fallback applies at widths up to 980 px and includes `-webkit-clip-path` for Android Chromium compatibility.

Marketplace content persistence was also split into a client-safe model and a server-only Firestore repository:
- `lib/store/marketplaceContent.ts`
- `lib/store/marketplaceContentRepository.ts`


## Brave on Android native SVG cloud fix — 2026-09-30

The Android-specific issue in Brave/Chromium where store clouds could render as ovals has been removed at the source.

- Store photo clouds are now rendered by an inline native SVG component instead of CSS/SVG `clip-path` references.
- The same native SVG cloud is used in the live marketplace and in the store editor preview.
- Legacy cloud masks, border radii and clip paths are explicitly disabled around the SVG cloud container.
- This avoids Brave/Chromium Android fallback behavior that was turning organic cloud shapes into ovals.
- Store photos continue using full-image fitting inside the cloud silhouette.

Implementation:
- `components/store/MarketplaceCloudMedia.tsx`
- `app/marketplace/page.tsx`
- `components/store/MarketplaceCardEditorPreview.tsx`
- `app/globals.css`


## Android organic cloud fidelity fix — 2026-09-30

The Brave/Android store-image treatment was corrected again to preserve the canonical approved collage look instead of falling back to a stiff box-like silhouette.

- The store image now uses inline SVG cloud construction made from overlapping ellipses plus a central body, matching the earlier approved cloud refinement.
- The shape is rendered as a true organic blob/cloud, not a rectangle with clipped corners and not a simple oval.
- The implementation uses native inline SVG clip paths, avoiding CSS `clip-path: url(...)` browser inconsistencies on Brave/Android.
- The white outer rim and inner image follow the same organic cloud silhouette.
- Existing collage layers remain unchanged: image cloud < information paper < logo < ribbon < post-it.

Implementation:
- `components/store/MarketplaceCloudMedia.tsx`


## Final Android cloud correction — 2026-09-30

The Android store-card cloud was corrected after visual review.

- Removed the box-like ellipse/rectangle construction.
- Store covers now use a single smooth organic SVG path filled directly with the store image.
- The implementation does not rely on CSS clip-path, SVG clipPath, or masks for the store cover, avoiding Brave/Chromium Android fallback failures.
- The white rim follows the same organic path.
- The collage layer order remains: store photo cloud, information paper, logo, ribbon, post-it.
- Mobile visual validation was captured at 412×2200 in workflow run `36763893002`; the store covers render as irregular organic clouds rather than rectangles or ovals.
- Production build/deploy for commit `504e70e3a9fe0e4f882b1c6a2ef0da9fc24d9d77` completed successfully in run `36763487377`.

Implementation:
- `components/store/MarketplaceCloudMedia.tsx`


## Android canonical collage placement — 2026-09-30

The Android/mobile marketplace no longer collapses the six featured stores into a normal centered one-column list.

- Category stickers remain scattered rather than a regular grid.
- Featured stores use the same asymmetric editorial rhythm as the approved reference: different widths/heights, alternating left/right placement, rotations, overlap, and a partially cropped right-edge store.
- Organic SVG store clouds remain unchanged.
- The mobile composition was visually validated at 412×2200 in workflow run `36765487611`.
- Production deploy run `36765483657` completed successfully for commit `6915ff36ae2653aa0c7be13bdc59a30186adcf04`.

Implementation:
- `app/globals.css`
- `.github/workflows/marketplace-preview-screenshot.yml`


## Android card image + collage fix — 2026-09-30

A real-store screenshot exposed two separate issues that were not covered by the demo capture:

- The circular store logo lived inside the clipped information-paper element, so the paper clip-path physically cut the top of the logo. The logo is now a sibling layer above the paper.
- Store logo images now use `object-fit: contain` both in the public card and the store media editor, so uploaded artwork is not cropped to fill the badge.
- Store cover previews also use `object-fit: contain`.
- Store cover media inside the organic SVG cloud uses a safer inner image area to keep the complete uploaded artwork visible.
- Mobile featured stores now use a compact two-column stagger with different widths and rotations instead of the original rigid 92%-wide single-column stack.
- The canonical mobile capture for commit `977dd7ab92e8ade1692ced93b6889f244be6b08a` passed in workflow run `36768962415`.

Implementation:
- `app/marketplace/page.tsx`
- `components/store/StoreMediaSection.tsx`
- `components/store/MarketplaceCloudMedia.tsx`
- `app/globals.css`


## Temporary example stores for layout review — 2026-09-30

To make the marketplace composition easier to review while production only has a small number of active stores, the public marketplace temporarily fills the featured area up to six stores with demo entries.

- Real active stores always stay first.
- Demo stores are added only to fill empty featured slots.
- Demo entries are UI-only; they are not written to Firestore and do not affect store/admin data.
- Clicking a demo store opens the existing preview modal instead of navigating to a nonexistent store route.
- Removal is intentionally simple: disable `SHOW_TEMPORARY_EXAMPLE_STORES` in `app/marketplace/page.tsx` once enough real stores exist or after visual review is complete.

Implementation:
- `app/marketplace/page.tsx`

