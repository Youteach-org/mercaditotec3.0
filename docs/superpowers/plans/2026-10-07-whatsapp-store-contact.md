# WhatsApp Store Contact Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any user optionally save a WhatsApp number in profile, require it only when acting as a seller and submitting a store for review, and expose a safe “Contactar por WhatsApp” action on that user’s active public store.

**Architecture:** Keep the raw normalized number in `users/{uid}` and validate it server-side through the existing profile update path. Public store detail derives only a `whatsappUrl` from the owner profile on the server; public store summaries and owner identity remain unchanged.

**Tech Stack:** Next.js 16.3.8, React 19.2.4, TypeScript, Firebase Auth/Firestore REST wrapper, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-community-notices-whatsapp-design.md`

## Global Constraints

- No new runtime dependency.
- Profile changes continue through `PATCH /api/profile` guarded by `requireUnblockedUser`.
- Do not expose `ownerUid`, email, role, block state, or the complete user profile in public store payloads.
- Store only normalized WhatsApp numbers; an empty value removes the contact for users who are not submitting a store.
- Do not require WhatsApp for account registration or ordinary Mercadito use.
- Require a valid WhatsApp number in both the store editor flow and server-side store submission.
- A 10-digit Mexican number is normalized to `+52XXXXXXXXXX`.
- `52XXXXXXXXXX` and `+52XXXXXXXXXX` normalize to `+52XXXXXXXXXX`.
- Public links use `https://wa.me/<digits-only>`.
- Preserve the current product-request flow and current store page layout.
- Use TDD and make small commits.
- Before integration run `npm test`, `npm run lint`, and `npm run build`.

## Review Focus

1. Formatted Mexican input such as `(443) 123-4567` must normalize exactly like `4431234567`.
2. Empty/whitespace input must clear the stored contact rather than fail validation.
3. Unsupported or malformed raw numbers must fail closed instead of producing a bad WhatsApp URL.
4. Missing owner profile or missing WhatsApp field must produce `whatsappUrl: null`, not a 500.
5. Public store serialization must still omit owner identity after contact support is added.

---

### Task 1: WhatsApp normalization and profile persistence

**Files:**
- Create: `lib/security/whatsapp.ts`
- Create: `lib/security/whatsapp.test.ts`
- Modify: `lib/security/accountProfile.ts`
- Modify: `lib/security/accountProfile.test.ts`
- Modify: `lib/useSession.ts`

**Interfaces:**
- Produces: `normalizeWhatsappNumber(input: unknown): string`
- Produces: `whatsappUrlFromNumber(normalized: string): string | null`
- Extends: `AppUser.whatsappNumber?: string`
- Extends: `updateOwnProfile(uid, input)` to accept `whatsappNumber`

- [ ] **Step 1: Write failing normalization tests in `lib/security/whatsapp.test.ts`**

Cover:
```ts
expect(normalizeWhatsappNumber("4431234567")).toBe("+524431234567");
expect(normalizeWhatsappNumber("(443) 123-4567")).toBe("+524431234567");
expect(normalizeWhatsappNumber("52 443 123 4567")).toBe("+524431234567");
expect(normalizeWhatsappNumber("+52 443 123 4567")).toBe("+524431234567");
expect(normalizeWhatsappNumber("   ")).toBe("");
expect(() => normalizeWhatsappNumber("123")).toThrow();
expect(whatsappUrlFromNumber("+524431234567")).toBe("https://wa.me/524431234567");
expect(whatsappUrlFromNumber("")).toBeNull();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run lib/security/whatsapp.test.ts`  
Expected: FAIL because the module/functions do not exist.

- [ ] **Step 3: Implement `lib/security/whatsapp.ts`**

Rules:
- trim whitespace;
- empty returns `""`;
- strip spaces, `-`, `(`, `)`;
- a raw 10-digit value becomes `+52` + digits;
- a 12-digit value beginning with `52` gains leading `+`;
- a leading `+52` 12-digit payload is preserved in normalized form;
- allow already-E.164 values only when they contain 8–15 digits total after `+`;
- reject alphabetic characters, multiple `+`, embedded `+`, and invalid lengths;
- `whatsappUrlFromNumber` returns only `https://wa.me/` plus digits.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `npx vitest run lib/security/whatsapp.test.ts`  
Expected: PASS.

- [ ] **Step 5: Add profile-update tests**

In `lib/security/accountProfile.test.ts`, add tests around an exported pure helper `buildOwnProfileUpdate(input, now?)` (extracted from `updateOwnProfile`) asserting:
- `{ whatsappNumber: "(443) 123-4567" }` yields `whatsappNumber: "+524431234567"`;
- `{ whatsappNumber: "" }` yields `whatsappNumber: ""`;
- an invalid WhatsApp number throws `AccountProfileError`;
- arbitrary fields without `displayName`, `photoURL`, or `whatsappNumber` still throw “No hay cambios de perfil permitidos.”

- [ ] **Step 6: Run profile tests and verify RED**

Run: `npx vitest run lib/security/accountProfile.test.ts`  
Expected: FAIL until the helper and WhatsApp field are supported.

- [ ] **Step 7: Refactor `accountProfile.ts` minimally**

Add:
```ts
export function buildOwnProfileUpdate(input: unknown, now: Date = new Date()): Record<string, unknown>
```

Make `updateOwnProfile` call the helper, then perform the existing existence check/update. Preserve existing display-name/photo behavior. Add `whatsappNumber: ""` to newly created profiles for predictable shape.

- [ ] **Step 8: Extend `AppUser`**

Add:
```ts
whatsappNumber?: string;
```
to `lib/useSession.ts`.

- [ ] **Step 9: Run focused tests**

Run: `npx vitest run lib/security/whatsapp.test.ts lib/security/accountProfile.test.ts`  
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/security/whatsapp.ts lib/security/whatsapp.test.ts lib/security/accountProfile.ts lib/security/accountProfile.test.ts lib/useSession.ts
git commit -m "feat: add WhatsApp profile contact"
```

### Task 2: Public store contact derivation

**Files:**
- Modify: `lib/store/publicMarketplace.ts`
- Modify: `lib/store/publicMarketplace.test.ts`
- Modify: `lib/store/publicMarketplaceRepository.ts`
- Create: `lib/store/publicMarketplaceRepository.test.ts`

**Interfaces:**
- Consumes: `whatsappUrlFromNumber(normalized: string): string | null`
- Produces: `PublicStoreDetail.whatsappUrl: string | null`
- Keeps: `PublicStoreSummary` free of WhatsApp and owner fields

- [ ] **Step 1: Write a failing public-shape test**

Update `lib/store/publicMarketplace.test.ts` to assert that `serializePublicStore(...)` still has no `ownerUid` and no `whatsappNumber`.

- [ ] **Step 2: Write failing repository tests**

In `lib/store/publicMarketplaceRepository.test.ts`, stub Firestore REST requests and verify:
- active store + owner `whatsappNumber: "+524431234567"` => detail has `whatsappUrl: "https://wa.me/524431234567"`;
- owner exists with no number => `whatsappUrl: null`;
- owner document missing => `whatsappUrl: null`;
- returned detail does not contain `ownerUid`, `whatsappNumber`, email, or role.

- [ ] **Step 3: Run tests and verify RED**

Run: `npx vitest run lib/store/publicMarketplace.test.ts lib/store/publicMarketplaceRepository.test.ts`  
Expected: repository tests FAIL because the detail has no WhatsApp contact yet.

- [ ] **Step 4: Add the detail field**

In `lib/store/publicMarketplace.ts`:
```ts
export interface PublicStoreDetail extends PublicStoreSummary {
  products: PublicProduct[];
  whatsappUrl: string | null;
}
```

Do not add this field to `PublicStoreSummary`.

- [ ] **Step 5: Refactor repository store lookup without widening the public payload**

In `lib/store/publicMarketplaceRepository.ts`:
- add a private active-store source lookup that preserves `ownerUid` internally;
- reuse it from `getPublicStoreBySlug` and `getPublicStoreDetail`;
- add a private owner-contact loader that reads `users/{ownerUid}`;
- return `null` if the owner profile is absent or has no valid stored normalized number;
- derive the URL with `whatsappUrlFromNumber`;
- never spread the owner profile into the response.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npx vitest run lib/store/publicMarketplace.test.ts lib/store/publicMarketplaceRepository.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/store/publicMarketplace.ts lib/store/publicMarketplace.test.ts lib/store/publicMarketplaceRepository.ts lib/store/publicMarketplaceRepository.test.ts
git commit -m "feat: expose safe store WhatsApp link"
```

### Task 3: Profile and public-store UI

**Files:**
- Modify: `app/profile/page.tsx`
- Modify: `app/marketplace/stores/[slug]/page.tsx`

**Interfaces:**
- Consumes: `AppUser.whatsappNumber`
- Sends: `PATCH /api/profile` with optional `whatsappNumber`
- Consumes: `PublicStoreDetail.whatsappUrl`

- [ ] **Step 1: Update profile local state and payload**

In `app/profile/page.tsx`:
- initialize `whatsappNumber` from `appUser?.whatsappNumber ?? ""`;
- extend `saveProfilePatch` payload type with `whatsappNumber?: string`;
- include trimmed `whatsappNumber` in `saveProfile()`.

- [ ] **Step 2: Add the profile field**

Add a “Número de WhatsApp” text/tel input near the visible-name field with helper copy equivalent to:
“Se usará como contacto público en tus tiendas. No uses aquí una contraseña ni otro dato sensible.”

Do not expose it elsewhere in the profile page.

- [ ] **Step 3: Add conditional store CTA**

In `app/marketplace/stores/[slug]/page.tsx`, near the store identity/delivery section:
```tsx
{store.whatsappUrl && (
  <a href={store.whatsappUrl} target="_blank" rel="noopener noreferrer">
    Contactar por WhatsApp
  </a>
)}
```

Style it to fit the current store page without replacing the order button.

- [ ] **Step 4: Verify TypeScript/build catches the contract**

Run: `npx vitest run lib/security/whatsapp.test.ts lib/security/accountProfile.test.ts lib/store/publicMarketplace.test.ts lib/store/publicMarketplaceRepository.test.ts`  
Expected: PASS.

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 5: Manual browser acceptance**

Verify:
1. save `4431234567`;
2. refresh profile and confirm normalized value is reflected by session;
3. open owned active store;
4. confirm WhatsApp CTA appears;
5. clear the number and save;
6. refresh store and confirm CTA disappears;
7. confirm product “Solicitar” still works independently.

- [ ] **Step 6: Commit**

```bash
git add app/profile/page.tsx app/marketplace/stores/[slug]/page.tsx
git commit -m "feat: add WhatsApp contact to store UI"
```

### Task 4: WhatsApp feature verification

**Files:**
- No production file changes expected unless verification finds a defect.

**Interfaces:**
- Consumes all previous task outputs.

- [ ] **Step 1: Run all tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: Commit any verification-only fixes separately**

Use a focused commit message if a defect is found; do not fold unrelated changes into this feature.

### Task 5: Profile edit mode and seller-only WhatsApp requirement

**Decision added 2026-10-07**

- [x] Keep WhatsApp optional for users without a store.
- [x] Add an explicit **Editar perfil** mode.
- [x] Allow changing or removing the profile photo from edit mode.
- [x] Allow adding, changing, or clearing WhatsApp from edit mode.
- [x] Add **WhatsApp de contacto** to the store builder.
- [x] Reuse an existing profile WhatsApp when available.
- [x] Persist a WhatsApp entered during store setup back to the user's profile.
- [x] Block store submission in `submitCompleteStore` when the owner has no valid WhatsApp.
- [x] Add tests covering profile edit controls and the seller WhatsApp requirement.
- [x] Fix the nullable-user TypeScript error in `app/cosas-perdidas/page.tsx` that was blocking the Cloudflare build.
