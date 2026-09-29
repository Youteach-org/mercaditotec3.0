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

- Source commit: `69a07c8fd32c31a2e2b63fb486a57d6401dd4674`
- Canonical visual capture run: `36508518457` — success
- Cloudflare build-check run: `36508518135` — success
- Cloudflare preview deploy run: `36508518261` — success
- Worker version: `40919960-3a35-4fb7-83d2-7093343ed2c7`
- Verified review URL: `https://mercaditotec-preview.youteach-tk.workers.dev/marketplace?visual=1`
- HTTP verification from the deploy workflow: `200`
- Latest 1448×1086 capture artifact: `11008700022`

The deployed preview is the isolated Worker, not the production `mercaditotec3-0` Worker.

## Review rule

Do not merge or deploy this redesign to the production Worker until the user explicitly approves the navigable preview.
