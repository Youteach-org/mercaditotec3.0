# Marketplace approved-preview handoff

Last updated: 2026-09-28

## Purpose

This branch is the isolated implementation/review lane for the approved Mercadito marketplace reference. It must stay separate from production until the rendered page is explicitly approved.

## Canonical visual source

- Reference: `docs/design/marketplace-approved-reference.png`
- Contract: `docs/superpowers/specs/2026-09-27-marketplace-approved-visual-objective.md`
- Original reference dimensions: `1448 × 1086`
- Original SHA-256: `62933f7da5a80370b7d7584486b121747ba7c9da33c8b2395bfc2d524e40a4de`

The reference image wins over prior layout guesses.

## Branches

- Preview implementation: `preview/marketplace-approved-reference`
- Production: `feature/student-stores`
- Production Worker: `mercaditotec3-0`
- Production remains untouched during preview review.

## Preview deployment

- Preview Worker: `mercaditotec-preview`
- Config: `wrangler.preview.jsonc`
- Workflow: `.github/workflows/cloudflare-marketplace-preview.yml`
- Review path: `/marketplace?visual=1`
- Expected account URL: `https://mercaditotec-preview.youteach-tk.workers.dev/marketplace?visual=1`

The workflow builds the real OpenNext application, deploys it to the isolated Worker, resolves the account `workers.dev` subdomain, and verifies the review route over HTTP.

## Visual-preview behavior

When `?visual=1` is present, the marketplace uses the deterministic demo stores and skips the live `/api/marketplace` request. This keeps visual review isolated from production Firebase data.

## 2026-09-28 canonical alignment pass

Changes made after comparing the running capture with the approved reference:

- restored cream category sticker/island treatments instead of a conventional category band;
- moved the middle/right store islands upward to overlap the editorial composition like the reference;
- enlarged the first featured store and the Artesanías island;
- narrowed/repositioned Papelería to match the approved lower-right composition;
- removed the invented cobalt circle behind Café del Campus;
- removed the generic whole-card shell so cover image and white paper copy read as separate collage pieces;
- added a real `DESCUBRE →` annotation in markup;
- changed the lower edge to a full-width campus panorama with the cobalt paint panel layered over it;
- preserved the app header + 1448×1018 marketplace canvas relationship so the complete captured viewport remains 1448×1086;
- made forced visual mode skip the live API request.

## Verified deployment — 2026-09-28

Latest verified user-review deployment:

- Source commit: `7955acf999cd0bdda7a66ee55a0ef77d3e5e4d4f`
- Canonical visual capture run: `36516460712` — success
- Cloudflare build-check run: `36516460701` — success
- Cloudflare preview deploy run: `36516460751` — success
- Worker version: `b7d27f19-763e-4eac-8587-80ae73f522df`
- Verified review URL: `https://mercaditotec-preview.youteach-tk.workers.dev/marketplace?visual=1`
- HTTP verification from the deploy workflow: `200`
- Latest 1448×1086 capture artifact: `11011097703`

The deployed preview is the isolated Worker, not the production `mercaditotec3-0` Worker.

## User review pass — organic cutouts

Feedback applied after the first navigable preview review:

- store cover islands changed from smooth oval shapes to irregular cloud/torn-paper silhouettes;
- white information papers under the stores changed from rounded cards to irregular paper scraps;
- the marketplace top navigation gained an organic torn-paper lower edge instead of reading as a rigid rectangle;
- the large yellow "Tiendas de la comunidad" announcement was rebuilt from overlapping irregular paper pieces instead of a clipped rectangular box;
- the changes remain isolated to `preview/marketplace-approved-reference`; production is still untouched.

Implementation commits for this pass:
- `795e5b67f91890a1ca27032653f80434df54ddef` — organic marketplace header hook;
- `1a88aea3daebaef9b516e27929801d79f8bc9db6` — first organic title/store cutout pass;
- `056b05dd6328e8659ecee83a6a47d9e560623212` — attempted rounded mask treatment; capture showed rectangular fallback in Chromium;
- `7955acf999cd0bdda7a66ee55a0ef77d3e5e4d4f` — browser-stable soft asymmetric cloud silhouettes, verified by capture and deployed.

## Final collage-card reconstruction — 2026-09-28

User-requested corrections completed in the navigable preview:

- store cover islands rebuilt with SVG object-bounding-box clip paths so each shop uses a true irregular cloud/collage silhouette rather than an oval or rounded card;
- store labels moved outside the clipped photo so they overlap the image like independent collage paper;
- white store information areas use torn-paper vector cuts instead of rounded rectangles;
- the yellow "Tiendas de la comunidad" announcement uses one irregular torn-paper vector cutout;
- the marketplace top navigation keeps an irregular paper lower edge instead of a rigid rectangular bar;
- store scales, rotations, overlaps, and top/bottom-row placement were preserved as separate editorial pieces rather than normalized ecommerce cards.

Implementation commits:
- `0ef8ee793591b3db389ca7bb3d15239c35f51061` — vector clip definitions and collage card markup;
- `c5111292d1befc64255e5076d7f42b091ea330de` — final cloud-card, paper-copy, header, and title styling;
- `26b0dc747ba88b7f87c8489918417aeb70dd3f5a` — yellow title cutout refined from rounded blob to torn-paper silhouette.

Verification:
- canonical capture run: `36518201425` — success;
- Cloudflare build check: `36518201418` — success;
- preview deploy run: `36518201466` — success;
- deployed Worker version: `fc750d80-c7d5-4016-b397-8de71b89f90a`;
- preview URL: `https://mercaditotec-preview.youteach-tk.workers.dev/marketplace?visual=1`;
- HTTP verification: `200`;
- latest capture artifact: `11012385117`.

## Scalable store collage and editable card content — 2026-09-29

The marketplace collage is no longer limited to six hard-coded demo cards.

### Reusable shapes

- Six reusable persisted variants are available: `cloud-1` through `cloud-6`.
- A store can select a shape in the store builder.
- If no shape is selected, the application assigns a stable automatic variant from the store ID.
- New stores therefore receive the same visual system automatically instead of falling back to a generic ecommerce card.

### Editable store-card information

The owner-facing store builder now persists the information used by the marketplace collage:

- store name;
- description;
- delivery location;
- logo;
- cover image;
- collage photo label (`marketplaceLabel`);
- loose-paper note (`marketplaceNote`);
- up to three collage tags (`marketplaceTags`);
- visual cloud variant (`marketplaceVariant`).

The public marketplace API serializes these presentation fields. Existing stores that predate the fields remain compatible: missing values fall back to the store name/category and automatic cloud assignment.

### More than six stores

- The first six matching stores retain the approved editorial composition.
- Stores after the first six render in a continuation section below the canonical board.
- The continuation section reuses the same six cloud/vector silhouettes, torn information papers, rotations, and collage treatment.
- The variant is attached to the store data, not to its position, so a store keeps its chosen shape even when ordering changes.

### Layering correction

All store information papers, logos, ribbons, and loose notes are explicitly layered above the image cloud. The image cloud can overlap visually, but it can no longer cover the store information card.

Implementation files:
- `lib/store/domain.ts`
- `lib/store/repository.ts`
- `lib/store/http.ts`
- `lib/store/client.ts`
- `lib/store/publicMarketplace.ts`
- `lib/store/publicMarketplaceRepository.ts`
- `lib/store/marketplacePresentation.ts`
- `components/store/StoreBuilderClient.tsx`
- `app/marketplace/page.tsx`
- `app/globals.css`

## Review rule

Do not merge or deploy this redesign to the production Worker until the user explicitly approves the navigable preview.
