# Community Notices and Lost & Found Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the marketplace lower-left blue block into a live quick-notices feed and add an authenticated Lost & Found page whose found-item posts automatically appear in that same feed.

**Architecture:** Use one server-owned Firestore collection, `community_posts`, with `quick_notice` and `found_item` variants. Reads go through authenticated API routes; writes/resolution require `requireUnblockedUser`. Found-item images reuse the existing Supabase upload pipeline under an owner-bound `community-posts/{uid}/...` prefix.

**Tech Stack:** Next.js 16.3.8, React 19.2.4, TypeScript, Firebase Auth, Firestore REST wrapper, Supabase image upload, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-07-community-notices-whatsapp-design.md`

## Global Constraints

- Keep the existing `mkt-bottom-blue` block and its scrapbook identity; do not replace the marketplace layout with a generic card.
- Use a single `community_posts` collection for both quick notices and found items.
- `found_item` requires an image; `quick_notice` does not.
- `title` length: 1–80 characters.
- `body` length: 1–500 characters.
- `location` length: 0–120 characters.
- Status values are only `active` and `resolved`.
- Only the authenticated author can resolve a post.
- Never trust `authorUid` supplied by the client.
- Read access requires an authenticated institutional session; create/resolve requires an unblocked user.
- No direct client write to Firestore.
- Supabase upload ownership remains server-authorized.
- Reuse the existing 1 MB image limit and JPEG/PNG/WebP/GIF MIME allowlist.
- Add no new runtime dependency.
- Use TDD and small commits.
- Before integration run `npm test`, `npm run lint`, and `npm run build`.

## Review Focus

1. A forged `authorUid` in POST input must be ignored; the token UID owns the post.
2. A valid URL from another user’s `community-posts` prefix must be rejected.
3. A blocked user must still be able to read the feed but must not create or resolve.
4. A resolved post must disappear from active feeds immediately after refresh.
5. Marketplace visual-preview mode must not crash when no authenticated user/feed is available.

---

### Task 1: Community post domain and HTTP contract

**Files:**
- Create: `lib/community/domain.ts`
- Create: `lib/community/domain.test.ts`
- Create: `lib/community/http.ts`
- Create: `lib/community/http.test.ts`

**Interfaces:**
- Produces: `CommunityPostType = "quick_notice" | "found_item"`
- Produces: `CommunityPostStatus = "active" | "resolved"`
- Produces: `CommunityPostCreateInput`
- Produces: `parseCommunityPostCreateInput(input: unknown): CommunityPostCreateInput`
- Produces: `parseCommunityPostListQuery(searchParams: URLSearchParams): { type?: CommunityPostType; limit: number }`
- Produces: `serializeCommunityPost(record): CommunityPostApiRecord`
- Produces: `toCommunityApiError(error): { status: number; message: string }`

- [ ] **Step 1: Write failing domain tests**

Assert:
```ts
parseCommunityPostCreateInput({
  type: "quick_notice",
  title: "Llaves perdidas",
  body: "¿Alguien las vio?",
  location: "Biblioteca",
});
```
passes without `imageUrl`.

Assert:
```ts
expect(() => parseCommunityPostCreateInput({
  type: "found_item",
  title: "Termo",
  body: "Encontrado en laboratorio",
  location: "Edificio A",
  imageUrl: "",
})).toThrow();
```

Also pin 80/500/120 maximums, reject unknown types/status-like client fields, and clamp list `limit` to a safe maximum of 50 with default 20.

- [ ] **Step 2: Run domain tests and verify RED**

Run: `npx vitest run lib/community/domain.test.ts`  
Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement domain validation**

The parser returns only:
```ts
{
  type,
  title,
  body,
  location,
  imageUrl
}
```
and never passes through `authorUid`, `status`, timestamps, or unknown fields.

- [ ] **Step 4: Run domain tests and verify GREEN**

Run: `npx vitest run lib/community/domain.test.ts`  
Expected: PASS.

- [ ] **Step 5: Write HTTP serialization/error tests**

Verify timestamps become ISO strings and repository/domain/auth errors become their intended HTTP status while unknown errors become 500.

- [ ] **Step 6: Implement `http.ts` and verify**

Run: `npx vitest run lib/community/http.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/community/domain.ts lib/community/domain.test.ts lib/community/http.ts lib/community/http.test.ts
git commit -m "feat: define community post domain"
```

### Task 2: Community repository

**Files:**
- Create: `lib/community/repository.ts`
- Create: `lib/community/repository.test.ts`

**Interfaces:**
- Consumes: `CommunityPostCreateInput`
- Produces: `CommunityPostRecord`
- Produces: `createCommunityPost(authorUid: string, input: CommunityPostCreateInput): Promise<CommunityPostRecord>`
- Produces: `listActiveCommunityPosts(options: { type?: CommunityPostType; limit: number }): Promise<CommunityPostRecord[]>`
- Produces: `resolveCommunityPost(authorUid: string, postId: string): Promise<CommunityPostRecord>`
- Produces: `CommunityRepositoryError`

- [ ] **Step 1: Write failing repository tests with Firestore REST stubs**

Pin:
- created record uses token-supplied `authorUid`, `status: "active"`, `resolvedAt: null`;
- active list sorts newest first;
- type filter returns only requested type;
- `limit` is applied after active/type filtering;
- resolving another author’s post throws 404;
- resolving own post sets `status: "resolved"` and `resolvedAt`;
- resolved records are absent from `listActiveCommunityPosts`.

- [ ] **Step 2: Run repository test and verify RED**

Run: `npx vitest run lib/community/repository.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement repository**

Store:
```ts
{
  authorUid,
  type,
  title,
  body,
  location,
  imageUrl,
  status: "active",
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  resolvedAt: null,
}
```

For active feeds:
- query `community_posts` where `status == "active"`;
- fetch at most 100;
- sort in memory by `createdAt` descending;
- filter by optional type in memory;
- slice to requested limit.

This avoids requiring a new Firestore composite index for the first version.

- [ ] **Step 4: Run repository test and verify GREEN**

Run: `npx vitest run lib/community/repository.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/community/repository.ts lib/community/repository.test.ts
git commit -m "feat: add community post repository"
```

### Task 3: Found-item image paths and authorization

**Files:**
- Modify: `lib/store/media.ts`
- Modify: `lib/store/media.test.ts`
- Modify: `lib/security/mediaAuthorization.test.ts`
- Create: `lib/community/media.ts`
- Create: `lib/community/media.test.ts`

**Interfaces:**
- Extends: `parseImageUploadPath(path, ownerUid)` to accept exactly `community-posts/{ownerUid}/{file}`
- Produces: `buildCommunityPostMediaPath(input: { ownerUid: string; nonce: string; mimeType: string }): string`
- Produces: `validateCommunityPostImageUrl(value: string, ownerUid: string): string`

- [ ] **Step 1: Add failing path tests**

In `lib/store/media.test.ts`, import `parseImageUploadPath` and assert:
- `community-posts/user-1/abc.png` is accepted for `user-1`;
- the same path is rejected for `user-2`;
- nested paths such as `community-posts/user-1/other/abc.png` are rejected.

- [ ] **Step 2: Add authorization regression test**

In `lib/security/mediaAuthorization.test.ts` assert `authorizeImageUpload("student-1", "community-posts/student-1/x.png")` resolves without querying a store, while an owner mismatch rejects.

- [ ] **Step 3: Run media tests and verify RED**

Run: `npx vitest run lib/store/media.test.ts lib/security/mediaAuthorization.test.ts`  
Expected: FAIL until the prefix is supported.

- [ ] **Step 4: Extend upload path parser minimally**

Allow only exactly three path segments:
`community-posts/{ownerUid}/{filename.ext}`.

Do not loosen any existing store/chat/profile rules.

- [ ] **Step 5: Add `lib/community/media.ts` with tests**

Tests:
- builder maps JPEG to `.jpg`, PNG to `.png`, WebP to `.webp`, GIF to `.gif`;
- invalid MIME throws;
- URL validator only accepts the configured Supabase origin/bucket and the current user’s `community-posts/{uid}/` prefix;
- another UID’s valid Supabase URL is rejected.

- [ ] **Step 6: Run media tests and verify GREEN**

Run: `npx vitest run lib/store/media.test.ts lib/security/mediaAuthorization.test.ts lib/community/media.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/store/media.ts lib/store/media.test.ts lib/security/mediaAuthorization.test.ts lib/community/media.ts lib/community/media.test.ts
git commit -m "feat: authorize lost item images"
```

### Task 4: Community API and authenticated client

**Files:**
- Create: `app/api/community-posts/route.ts`
- Create: `app/api/community-posts/[postId]/route.ts`
- Create: `lib/community/client.ts`
- Create: `lib/community/client.test.ts`

**Interfaces:**
- GET `/api/community-posts?type=found_item&limit=20`
- POST `/api/community-posts`
- PATCH `/api/community-posts/[postId]` with `{ "status": "resolved" }`
- Produces client functions:
  - `loadCommunityPosts(user, options)`
  - `createCommunityPostRequest(user, input)`
  - `resolveCommunityPostRequest(user, postId)`

- [ ] **Step 1: Write failing client tests**

Mock `fetch`/token behavior and verify:
- GET builds encoded `type` and `limit`;
- POST sends JSON and bearer auth through `storeApiFetch`;
- PATCH sends only `{ status: "resolved" }`;
- non-2xx errors surface API error text.

- [ ] **Step 2: Run client tests and verify RED**

Run: `npx vitest run lib/community/client.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement GET route**

Use `requireFirebaseUser(request)`. Parse query with domain helper. Return serialized active posts and `Cache-Control: no-store`.

- [ ] **Step 4: Implement POST route**

Use `requireUnblockedUser(request)`. Parse body with `parseCommunityPostCreateInput`. For `found_item`, validate `imageUrl` against the authenticated UID before repository creation. Never read `authorUid` from the client.

- [ ] **Step 5: Implement PATCH route**

Use `requireUnblockedUser(request)`. Accept only exact `status: "resolved"`; call `resolveCommunityPost(user.uid, postId)`.

- [ ] **Step 6: Implement client and verify**

Run: `npx vitest run lib/community/client.test.ts lib/community/domain.test.ts lib/community/repository.test.ts`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/community-posts/route.ts app/api/community-posts/[postId]/route.ts lib/community/client.ts lib/community/client.test.ts
git commit -m "feat: add community post API"
```

### Task 5: Lost & Found page and navigation

**Files:**
- Create: `app/cosas-perdidas/page.tsx`
- Modify: `components/AppShell.tsx`
- Modify: `app/globals.css` only for page-specific classes if Tailwind utilities are insufficient

**Interfaces:**
- Consumes: `loadCommunityPosts(user, { type: "found_item", limit: 50 })`
- Consumes: `buildCommunityPostMediaPath`, `uploadImageFile`
- Consumes: `createCommunityPostRequest`, `resolveCommunityPostRequest`

- [ ] **Step 1: Build the protected page shell**

Wrap content in `AuthGuard`. Add title “Cosas perdidas” and an empty/loading/error state.

- [ ] **Step 2: Add found-item form**

Fields:
- photo: required;
- title: required, max 80;
- description/body: required, max 500;
- location: optional, max 120.

Before upload, call the existing media metadata validator for MIME/1 MB size. Build the path with the authenticated UID and `crypto.randomUUID()`, upload through `uploadImageFile`, then POST the resulting URL.

- [ ] **Step 3: Render active found items**

Each card shows:
- image;
- title;
- body;
- location when present;
- created date;
- “Marcar como entregado” only when `post.authorUid === firebaseUser.uid`.

After resolution, reload or remove the record from local active state.

- [ ] **Step 4: Add navigation entry**

Add `{ href: "/cosas-perdidas", label: "Cosas perdidas", icon: "lost" }` to `NAV_ITEMS`; add a simple icon branch in `NavIcon`. Ensure `isCurrentPath` highlights the page.

- [ ] **Step 5: Run lint/build checkpoint**

Run: `npm run lint`  
Expected: PASS.

Run: `npx vitest run lib/community`  
Expected: PASS.

- [ ] **Step 6: Manual acceptance**

Verify:
1. blocked user can open/read the page but cannot successfully publish/resolve;
2. unblocked user can upload a <=1 MB supported image;
3. >1 MB and unsupported MIME fail before upload;
4. new found item appears in the page;
5. only its author sees the resolve action.

- [ ] **Step 7: Commit**

```bash
git add app/cosas-perdidas/page.tsx components/AppShell.tsx app/globals.css
git commit -m "feat: add lost and found page"
```

### Task 6: Marketplace quick-notices panel

**Files:**
- Create: `components/community/QuickNoticesPanel.tsx`
- Modify: `app/marketplace/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: `loadCommunityPosts(user, { limit: 4 })`
- Consumes: `createCommunityPostRequest(user, { type: "quick_notice", ... })`
- Emits links to `/cosas-perdidas` for found-item entries

- [ ] **Step 1: Create the panel component**

Component props:
```ts
{
  user: User | null;
  visualPreview?: boolean;
}
```

Behavior:
- authenticated user: load four newest active posts;
- unauthenticated or visual-preview: do not call authenticated API; render a non-crashing prompt/preview state;
- show “Encontrado” marker on `found_item`;
- truncate body visually, not by mutating stored text;
- found-item rows link to `/cosas-perdidas`.

- [ ] **Step 2: Add quick-notice composer**

“Publicar aviso” opens a compact modal/panel form:
- title;
- message/body;
- optional location;
- no image field.

On success:
- close/reset form;
- reload the four-item feed so the new record can appear chronologically.

- [ ] **Step 3: Replace only the static contents of `mkt-bottom-blue`**

In `app/marketplace/page.tsx`, keep the existing `mkt-bottom-blue` wrapper/placement and render `QuickNoticesPanel` inside it. Do not alter the upper `mkt-blue-note`.

- [ ] **Step 4: Adapt existing CSS without resizing the marketplace composition unnecessarily**

In `app/globals.css`:
- preserve `mkt-bottom-blue` dimensions/position at each breakpoint unless content requires a minimal internal adjustment;
- add scroll/clamp behavior inside the panel rather than growing the blue block over neighboring scrapbook elements;
- keep text contrast readable and avoid changing unrelated marketplace cards.

- [ ] **Step 5: Manual visual regression check**

At desktop and mobile widths verify:
- the blue block remains in its previous lower-left area;
- store cards do not shift or tilt differently;
- no text escapes the blue block;
- quick composer remains usable on mobile;
- visual-preview mode still renders.

- [ ] **Step 6: Commit**

```bash
git add components/community/QuickNoticesPanel.tsx app/marketplace/page.tsx app/globals.css
git commit -m "feat: turn blue panel into quick notices"
```

### Task 7: Cross-feature behavior and verification

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Found-item POST must appear in both `/cosas-perdidas` and the unfiltered marketplace feed because both read `community_posts`.

- [ ] **Step 1: Run complete tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 4: End-to-end acceptance**

Verify in this order:
1. create quick notice from marketplace;
2. confirm it appears in `mkt-bottom-blue`;
3. create found item with photo from `/cosas-perdidas`;
4. confirm it appears on the Lost & Found page;
5. return to marketplace and confirm the same found-item record appears in the blue feed without duplicate creation;
6. resolve the found item as its author;
7. refresh both surfaces and confirm it is absent from active feeds;
8. attempt resolution as a different user and confirm backend rejection;
9. confirm no direct Firestore client write was introduced.

- [ ] **Step 5: Record verification fixes as separate commits**

If no defect is found, no extra commit is required.
