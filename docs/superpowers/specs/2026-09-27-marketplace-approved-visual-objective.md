# MercaditoTec marketplace — approved visual objective

**Status:** APPROVED / CANONICAL / NON-NEGOTIABLE

## Source of truth

The exact approved visual reference is:

`docs/design/marketplace-approved-reference.png`

Original approved upload:
- dimensions: **1448 × 1086**
- SHA-256: **62933f7da5a80370b7d7584486b121747ba7c9da33c8b2395bfc2d524e40a4de**

This image is the **implementation objective**, not a moodboard, suggestion, inspiration, loose direction, or style reference.

## Implementation contract

The `/marketplace` interface must reproduce the approved reference's actual visual structure and hierarchy.

Do **not**:
- invent a different arrangement;
- add a hero banner;
- add a conventional horizontal category row;
- introduce a featured-store grid;
- replace the composition with generic ecommerce cards;
- reinterpret the approved composition as a dashboard;
- move elements merely because another layout is easier to implement;
- substitute a different generated mockup as the reference.

The implementation must preserve the reference's defining structure:
- large staggered **TIENDAS DE LA COMUNIDAD** typography on the left;
- small floating search control integrated into the canvas;
- category labels distributed as stickers/annotations rather than a navigation band;
- asymmetric store composition with materially different silhouettes and scales;
- large vertical store island, circular/oval store image, wide horizontal store treatment, compact organic/squircle treatment, and a partial/cropped store toward the viewport edge;
- store cover imagery with overlapping circular logos;
- hand-drawn arrows/annotations and the **DESCUBRE** directional treatment;
- strong cobalt/electric blue, coral/orange, cream/off-white, black/navy, yellow/pink accents;
- one continuous editorial/collage canvas with negative space and cross-boundary composition;
- no obvious hero/search/categories/cards horizontal bands.

Functional controls may be implemented as real HTML/React components, but their **placement, scale, hierarchy, silhouette and visual relationships must follow the canonical image**.

## Validation rule

Before any marketplace visual implementation is called complete, compare the rendered desktop page directly against `docs/design/marketplace-approved-reference.png`.

If a change conflicts with the image, **the image wins** unless the user explicitly approves a new reference.

## Production rule

Do not replace the active production marketplace with a new visual implementation until the user explicitly approves the rendered implementation.
