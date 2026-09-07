# Public Store Marketplace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy loose-product marketplace with a server-backed public catalog of approved stores and their published products.

**Architecture:** Add a small public marketplace domain/repository layer that reads existing `stores` and `products`, exposes privacy-safe DTOs through read-only Next.js route handlers, and render those DTOs in `/marketplace` plus `/marketplace/stores/[slug]`. No new Firestore collections are introduced.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Firebase Admin Firestore, Vitest 4, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-09-07-public-marketplace-design.md`

## Global Constraints

- Only `active` stores are public.
- Only `published` products from active stores are public.
- Public API responses never expose owner UID or seller email.
- Marketplace reads go through server APIs, not direct client Firestore queries.
- Store open state uses `America/Mexico_City` and the existing schedule helper.
- Ordering/payment is out of scope.

---

### Task 1: Public marketplace DTO and visibility rules

**Files:**
- Create: `lib/store/publicMarketplace.ts`
- Create: `lib/store/publicMarketplace.test.ts`

**Interfaces:**
- Produces: `PublicStoreSummary`, `PublicStoreDetail`, `PublicProduct`, `isPublicStoreStatus`, `isPublicProductVisibility`, serializer helpers.

- [ ] Write tests proving inactive stores and draft products are rejected and private owner fields never appear in serialized DTOs.
- [ ] Implement the minimal pure helpers and DTO serializers.
- [ ] Run the focused test.

### Task 2: Server-side public repository and APIs

**Files:**
- Modify: `lib/store/repository.ts`
- Modify: `lib/store/productRepository.ts`
- Create: `app/api/marketplace/route.ts`
- Create: `app/api/marketplace/stores/[slug]/route.ts`

**Interfaces:**
- Produces: `listActiveStoresPublic()`, `getActiveStoreBySlugPublic(slug)`, `listPublishedProductsPublic(storeId)`.

- [ ] Add repository methods that enforce active/published filtering server-side.
- [ ] Add read-only route handlers that serialize public DTOs and map missing stores to 404.
- [ ] Verify existing owner/admin methods remain unchanged.

### Task 3: Replace marketplace list UI

**Files:**
- Replace: `app/marketplace/page.tsx`

- [ ] Remove direct Firestore product subscription and `/sell` CTA.
- [ ] Fetch `/api/marketplace` and render store cards with media, description, delivery location, and open/closed state.
- [ ] Link each store by its slug and keep access to the user's store-management flow.

### Task 4: Public store detail UI

**Files:**
- Create: `app/marketplace/stores/[slug]/page.tsx`

- [ ] Fetch the public detail endpoint.
- [ ] Render store identity, delivery info, schedule/open state, and published product cards.
- [ ] Render useful empty and 404/error states.

### Task 5: Verification

- [ ] Run focused marketplace tests.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Confirm no legacy seller email appears in `/marketplace` code and no direct Firestore product query remains there.
