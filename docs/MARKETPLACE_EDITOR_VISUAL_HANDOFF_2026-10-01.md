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


## Scope correction — full Mercadito visual system

The earlier integration was too narrow: it extended the collage treatment mainly to Store Editing and the `mkt-more-*` section, which only appears after the first six Marketplace stores. With six active stores, that Marketplace change was not visible at all.

The corrected implementation applies the approved Marketplace visual language across the whole non-admin Mercadito application.

### Global shell

`components/AppShell.tsx` now uses the Marketplace-style MercaditoTec header and navigation on every non-admin route instead of switching back to a separate white dashboard header.

Admin routes intentionally keep their existing utility-oriented shell.

### Application-wide theme

`app/mercadito-theme.css` is loaded after `globals.css` from `app/layout.tsx` and scopes the visual system under `.mercadito-app-shell` / `.mercadito-app-content`.

It extends the Marketplace language to user-facing surfaces including:

- Marketplace and public store pages
- My Stores / Store Editing
- Orders
- Notifications
- Profile
- Chat
- Other non-admin authenticated Mercadito screens

The shared language includes warm paper backgrounds, torn/cut paper heroes, collage cards, sticker-like actions, handwritten/marker heading treatment, irregular labels, organic image masks, subtle rotations, and Marketplace blue/orange/yellow/pink/sky palette.

### Behavioral constraint

This pass changes presentation only. Existing data flow, routes, API calls, store editing fields, order actions, chat behavior, authentication and moderation logic remain unchanged.


## Admin visual integration

Admin is now part of the same Mercadito visual system, including all current subpages:

- `/admin`
- `/admin/users`
- `/admin/stores`
- `/admin/stores/[storeId]`
- `/admin/marketplace`
- `/admin/categories`
- `/admin/reports`
- `/admin/reports/[reportId]`
- `/admin/audit`
- `/admin/chat`

`components/AppShell.tsx` no longer excludes `/admin` from the Mercadito shell. Admin routes receive the same branded header/navigation and are explicitly marked with `data-admin-surface="true"` / `.mercadito-admin-shell`.

`app/mercadito-theme.css` contains an Admin-specific layer that applies the paper/collage language to mastheads, navigation cards, controls, action buttons and status surfaces while deliberately keeping dense administrative tables, filter bars, moderation context, audit data and ID/code blocks rectangular and highly legible.

No administrative permissions, API calls, moderation behavior, routing, store actions, user actions, or data logic were changed in this pass.


## Admin users — student card role action correction

Removed the **Hacer Subadmin** action from every regular student/user card in `/admin/users`.

Existing subadmins still expose **Quitar Subadmin** to Superadmin, so current administrative accounts can still be demoted from their card. This change only removes promotion from ordinary student cards; backend role APIs and permission rules were not changed.

A regression test in `app/admin/users/page.test.ts` verifies that the promotion label/call are absent while the existing-subadmin removal action remains present.


## Admin users — reveal promotion on card selection

The **Hacer Subadmin** action is hidden by default on ordinary user/student cards in `/admin/users`.

For Superadmin only, pressing/clicking an eligible ordinary user card selects that card and reveals **Hacer Subadmin** inside it. Pressing the same card again hides the action. Promotion still requires a separate explicit button press; selecting the card alone never changes the user's role.

Existing subadmins continue to expose **Quitar Subadmin**. The selected card receives a visible focus/ring state, and keyboard Enter/Space can also toggle selection for eligible cards.
