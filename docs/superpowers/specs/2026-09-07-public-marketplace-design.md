# Public Store Marketplace Design

## Goal

Replace the legacy product-only marketplace with the approved student-store marketplace already modeled in `feature/student-stores`.

## Product decision

`/marketplace` becomes the canonical public browsing surface for approved stores. The old direct `products` feed and `/sell` entry point are removed from that surface.

## Public visibility rules

- Only stores with `status: active` appear publicly.
- Only products with `visibility: published` from an active store appear publicly.
- Seller email and owner UID are never exposed by public marketplace responses.
- Suspended, pending, draft, and changes-required stores return as unavailable/not found publicly.
- Product drafts are never exposed publicly.

## Marketplace list

`/marketplace` shows active stores, not loose products. Each card may show:

- store name
- logo and cover when present
- description
- delivery location
- open/closed state based on the existing schedule/manual mode
- link to the store public page through its approved slug

The page keeps links to the user-facing Mercadito areas (for example My Stores) but does not offer the legacy `/sell` product flow.

## Store public page

`/marketplace/stores/[slug]` shows the selected active store with:

- cover/logo/name
- description
- delivery location
- operating state and configured hours
- published products with image, title, description, category reference, and price information

This phase is browse-only. Ordering/reservation/payment is intentionally out of scope and can be layered on later without changing the public store model.

## API architecture

Create read-only public endpoints under `/api/marketplace`:

- `GET /api/marketplace` -> active store summaries
- `GET /api/marketplace/stores/[slug]` -> one active store plus published products

The endpoints use Firebase Admin server-side repository functions. Client code must not query Firestore directly for public marketplace data.

## Repository boundaries

A focused public marketplace repository/serializer owns:

- active-store filtering
- slug lookup
- published-product filtering
- removal of private owner fields
- open/closed calculation using the existing schedule helper and `America/Mexico_City`

It reuses the existing store/product records instead of creating parallel collections or data models.

## Error handling

- Unknown/non-active slug returns 404 without revealing whether an unpublished store exists.
- Empty marketplace returns an empty list, not an error.
- Missing product images render a neutral placeholder in the UI.

## Testing

Tests cover:

- public serializers omit owner UID/email-like private data
- only active stores qualify for marketplace visibility
- only published products qualify for public output
- open/closed state uses the existing schedule/manual settings
- API-facing DTOs contain the fields required by the list/detail pages

The phase is complete when the legacy `/marketplace` Firestore `products` feed is gone and active approved stores can be browsed through the new public list/detail flow.