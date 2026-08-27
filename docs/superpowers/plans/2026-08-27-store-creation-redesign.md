# Store Creation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild store creation so drafting has no public URL, saving is unified, categories can be suggested, approval assigns the public URL, and the builder includes a live storefront preview.

**Architecture:** Keep Firestore-backed internal drafts, but make `slug` nullable and delay URL reservation until admin approval. Persist builder changes silently through draft APIs, preserve product-level editing, and use one final `Guardar` action to validate and submit. Reuse a storefront preview component for both builder preview and the future public store route.

**Tech Stack:** Next.js 16, React 19, TypeScript, Firebase Admin/Firestore, Supabase Storage, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-08-27-store-creation-redesign.md`

## Global Constraints
- Work only on `feature/student-stores`; do not modify `main`.
- No public URL or slug reservation before admin approval.
- Final creation action is labeled `Guardar`.
- No operational pause/manual controls during creation.
- Schedule remains Monday-Sunday, hourly 07:00-21:00.
- Product images continue using existing Supabase media flow.
- User-facing Spanish remains natural; `slug` may remain an internal code term.

---

### Task 1: Draft lifecycle without URL reservation

**Files:**
- Modify: `lib/store/repository.ts`
- Modify: `lib/store/http.ts`
- Modify: `lib/store/client.ts`
- Modify: `lib/store/repository.test.ts`
- Modify: `app/api/stores/route.ts`

**Interfaces:**
- Produces `StoreRecord.slug: string | null`.
- Produces draft creation that does not write `store_slug_reservations` or `store_name_reservations`.
- Final submission reserves the unique store name but leaves slug null.

- [ ] Add failing repository tests asserting a draft has `slug === null` and no URL reservation intent.
- [ ] Add failing tests asserting submission keeps slug null while requiring a unique name.
- [ ] Change draft record types and serializers to accept nullable slug.
- [ ] Change draft creation to create only the store document and no reservation documents.
- [ ] Change submission transaction to reserve the finalized name only.
- [ ] Verify affected tests and TypeScript build.

### Task 2: Admin approval assigns URL and publishes suggested categories

**Files:**
- Modify: `lib/store/repository.ts`
- Modify: `lib/store/categoryRepository.ts`
- Modify: `lib/store/productRepository.ts`
- Modify: `lib/store/repository.test.ts`
- Modify: `app/api/admin/stores/[storeId]/status/route.ts`

**Interfaces:**
- Admin transition `pending_review -> active` generates/reserves unique slug.
- Suggested categories are normalized, reused if already global, or created active on approval.
- Product references to suggested categories are remapped to the approved global category ID.

- [ ] Add failing tests for slug assignment only on approval.
- [ ] Add failing tests for suggested-category promotion/reuse semantics.
- [ ] Implement approval transaction helpers.
- [ ] Remap product category references during approval.
- [ ] Verify tests and build.

### Task 3: Seed initial categories and support inline suggestions

**Files:**
- Create: `lib/store/defaultCategories.ts`
- Modify: `lib/store/categoryRepository.ts`
- Modify: `app/api/categories/route.ts`
- Modify: `components/store/StoreProductsSection.tsx`
- Add/modify category tests as appropriate.

**Interfaces:**
- Public category API ensures the approved initial set exists, including `Componentes electrónicos`.
- Product editor exposes `+ Sugerir categoría…` inline.
- Draft products may carry a draft-local suggested category value without making it globally visible.

- [ ] Add failing tests for initial category normalization/deduplication.
- [ ] Implement idempotent seeding for the initial list.
- [ ] Extend product input model to accept a suggested category representation during draft creation.
- [ ] Add inline suggestion UI and draft-local reuse inside the same store.
- [ ] Verify tests/build.

### Task 4: Unified builder persistence and final Guardar

**Files:**
- Modify: `app/mystore/[storeId]/page.tsx`
- Modify: `components/store/StoreScheduleSection.tsx`
- Modify: `components/store/StoreMediaSection.tsx`
- Modify: `app/api/stores/[storeId]/schedule/route.ts`
- Modify: `app/api/stores/[storeId]/submit/route.ts`
- Modify: `lib/store/completeness.ts`

**Interfaces:**
- Information and schedule changes persist silently without section-specific save buttons.
- Creation mode contains no pause/manual operational controls.
- Final button is `Guardar`; it persists current information/schedule and submits if complete.

- [ ] Add failing tests for completeness rules and final submission behavior.
- [ ] Remove `Guardar información` UI and autosave information changes with debounce/on-blur.
- [ ] Remove `Guardar horario` and autosave schedule changes after cell toggles with debounce.
- [ ] Hide operational controls unless store is approved/active.
- [ ] Replace review CTA with single `Guardar` and approved confirmation copy.
- [ ] Verify build and runtime API behavior.

### Task 5: Responsive schedule sizing

**Files:**
- Modify: `components/store/StoreScheduleGrid.tsx`
- Modify: `components/store/StoreScheduleSection.tsx`

**Interfaces:**
- Desktop grid is visually compact.
- Mobile grid expands to available width with large touch targets and abbreviated day labels.

- [ ] Add/adjust pure layout constants/tests where practical.
- [ ] Compact desktop rows/cells and surrounding padding.
- [ ] Increase mobile cell height/touch area while preserving width fit.
- [ ] Verify responsive build and visual preview.

### Task 6: Reusable live storefront preview

**Files:**
- Create: `components/store/StorefrontPreview.tsx`
- Modify: `app/mystore/[storeId]/page.tsx`
- Modify: `components/store/StoreProductsSection.tsx`
- Modify: `components/store/StoreMediaSection.tsx`

**Interfaces:**
- Preview accepts store name, seller nickname, description, cover/logo, schedule and products.
- Desktop builder shows sticky compact preview beside editor where space allows.
- Mobile shows full-width `Vista previa de mi tienda`.

- [ ] Create static component test/pure view-model helpers where practical.
- [ ] Implement panoramic cover + overlapping logo + store details + hours + product cards.
- [ ] Wire live state from builder sections without waiting for final submission.
- [ ] Verify build and mobile/desktop rendering.

### Task 7: Faster builder opening and cleanup

**Files:**
- Modify: `app/mystore/page.tsx`
- Modify: `app/mystore/[storeId]/page.tsx`
- Modify: `app/api/stores/route.ts`
- Remove obsolete bootstrap/reset code if no longer needed: `lib/store/bootstrap.ts`, legacy reset UI/helpers as appropriate.

**Interfaces:**
- Clicking `Crear mi tienda` creates only a lightweight internal draft and navigates immediately.
- Editor shell renders immediately; categories/products load in parallel.
- No slug/name reservation work occurs on opening.

- [ ] Remove legacy reset-on-visit and bootstrap naming behavior.
- [ ] Create lightweight draft with placeholder internal values that are not publicly reserved.
- [ ] Avoid unnecessary immediate refetch when navigation state already provides initial draft data where feasible.
- [ ] Verify opening latency through Vercel runtime logs and successful build.

### Task 8: Final verification

**Files:**
- Review all changed files.

- [ ] Run the complete Vitest suite where execution is available.
- [ ] Run production build and confirm TypeScript success.
- [ ] Verify Vercel deployment reaches READY.
- [ ] Verify no public URL appears before approval.
- [ ] Verify final `Guardar` moves complete store to review.
- [ ] Verify approval generates slug/public URL and promotes suggested categories.
- [ ] Verify builder preview and responsive schedule on desktop/mobile.
