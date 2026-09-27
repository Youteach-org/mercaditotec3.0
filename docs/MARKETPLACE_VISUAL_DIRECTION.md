# Marketplace visual direction

Status: **approved direction / implementation in progress**

## Goal

The main `/marketplace` page must feel younger, more expressive and more distinctive than a generic marketplace template while remaining usable on desktop and mobile.

The approved direction is a **student-community collage** rather than a rigid dashboard or a uniform ecommerce grid.

## Non-negotiable visual rules

- Do not return to a uniform grid of identical rectangular cards.
- Do not fake youthfulness by only swapping photos or accent colors.
- Use genuinely different silhouettes: torn-paper polygons, organic rounded masks, overlapping layers and uneven visual rhythm.
- Keep the page asymmetric on desktop while preserving clear reading order.
- Use store cover/logo data already provided by the application; do not depend on a fixed external campus photo.
- The primary palette is cream, deep blue, orange/coral, yellow and occasional pink/light blue accents.
- Green must not be the dominant identity color.
- Handwritten/doodle accents are secondary decoration, not the primary information font.
- Store names, descriptions, open/closed state and delivery location remain readable and functional.

## Implemented structure

- Hero collage built from live store cover images.
- Torn/organic yellow title paper.
- Secondary floating notes and doodles.
- Search bar crosses the hero composition.
- Real filters only: all stores / open stores.
- Store mosaic uses varying spans and six different irregular masks.
- First store in each six-card cycle receives a larger feature treatment.
- Store logos use organic blob masks rather than square avatars.
- Marketplace-home navigation uses the same blue/orange/cream language without altering the default navigation treatment on other routes.
- Mobile simplifies overlaps and rotations but keeps the collage identity.

## Functional constraints retained

- Data still comes from `/api/marketplace`.
- Store links still route to `/marketplace/stores/[slug]`.
- Search filters store name, description and delivery location.
- No marketplace data model, ordering, approvals or order logic changed.
- The production smoke-test phrase `Tiendas de la comunidad` remains present.

## Main implementation files

- `app/marketplace/page.tsx`
- `app/globals.css`
- `components/AppShell.tsx`
