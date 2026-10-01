# Mercadito — marketplace/editor visual integration handoff

Date: 2026-10-01

## Goal

Carry the approved Marketplace collage/scrapbook language through the full Mercadito experience and ensure that Store Editing controls the same fields that are actually rendered on the public Marketplace card.

## Integrated commits

The production promotion includes these existing commits from `main`:

- `d0cff2d` — make the store editor preview use the public Marketplace card primitives.
- `e6d23e0` — carry the Marketplace collage visual language into Store Editing.
- `395e4c2` — extend the collage language across the rest of the Marketplace page, including stores after the first six.
- `d6241c3` — clarify that the logo and cover edited in Store Editing are the images visible in Mercadito.

## Marketplace fields editable from Store Editing

The Store Editing flow persists and previews the same public-card fields consumed by `app/marketplace/page.tsx`:

- Store name
- Description
- Delivery location
- Marketplace ribbon label
- Marketplace post-it text
- Marketplace tags (up to three are shown in the card preview/public card)
- Marketplace cloud/card variant
- Circular logo
- Cover image clipped inside the selected cloud shape

The editor preview uses the same public Marketplace CSS primitives (`mkt-store-card`, `mkt-store-photo`, `mkt-store-ribbon`, `mkt-store-logo`, `mkt-store-copy`, `mkt-tag`, `mkt-store-location`, and `mkt-hand-note`) so the preview is not maintained as a separate visual approximation.

## Visual continuity

Additional stores after the first six continue the editorial collage instead of falling back to a regular ecommerce grid. Desktop, tablet, and mobile layouts keep varied widths, offsets, and rotations while retaining the existing store-card behavior.

## Production branch / deploy

Cloudflare production deploys from `feature/student-stores`. At the time of this handoff that branch was at `f8973a4`, while `main` was a strict fast-forward continuation with no branch divergence. Production promotion should therefore move `feature/student-stores` forward to the documented `main` head with a non-forced ref update.

## Verification expected after promotion

- Cloudflare build check succeeds.
- Production deploy workflow succeeds.
- Runtime smoke confirms the Worker, Marketplace API, browser JS/CSS assets, and hydrated Marketplace page are reachable.
- `/marketplace` renders the continuous collage layout.
- Store Editing exposes and previews the public Marketplace card fields listed above.
