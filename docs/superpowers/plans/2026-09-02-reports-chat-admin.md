# Reports and General Chat Moderation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add student reporting plus an auditable admin queue that moderates users, stores, and messages from MercaditoTec3's single general chat room.

**Architecture:** A pure moderation domain module owns validation, state transitions, action permissions, block expiry, labels, and context-window selection. A Firebase Admin repository owns immutable snapshots, duplicate-open-report keys, transactional resolution, moderation updates, and audit records; thin Next.js 16 route handlers authorize requests and expose sanitized JSON. Client pages use those routes, while the existing general chat gains report controls, hidden-message placeholders, and server-authorized message sending.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Firebase client/Admin Firestore, Vitest 4, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-08-31-reports-chat-admin.md`

**Status:** Implemented and verified on `feature/student-stores` on 2026-09-03.

## Global Constraints

- Chat is one general room; there are no private conversations or conversation IDs.
- Admin context contains the reported message plus at most five earlier and five later general-room messages.
- Report counts never trigger automatic sanctions.
- All actor identity, role, timestamps, snapshots, moderation mutations, and audit writes are server-controlled.
- Every moderation action requires a non-empty reason and visibility-changing actions require client confirmation.
- Report resolution and its moderation/audit writes occur in one Firestore transaction.
- Legacy `admin` and `administrator` profiles retain effective `superadmin` privileges.

---

### Task 1: Moderation domain rules

**Files:**
- Create: `lib/moderation/domain.ts`
- Test: `lib/moderation/domain.test.ts`

**Interfaces:**
- Produces: `parseReportInput(input): ReportInput`, `parseResolutionInput(input): ResolutionInput`, `allowedActionsForTarget(type)`, `isBlockActive(blocked, blockedUntil, now)`, `selectGeneralChatContext(messages, targetId, radius)`, and report/action types used by repository and UI.

- [ ] **Step 1: Write failing validation, transition, block-expiry, action, and context tests**

```ts
expect(parseReportInput({ targetType: "message", targetId: "m1", reasonCode: "harassment" }))
  .toMatchObject({ targetType: "message", targetId: "m1" });
expect(() => parseReportInput({ targetType: "message", targetId: "m1", reasonCode: "fraud" })).toThrow();
expect(isBlockActive(true, "2026-09-03T00:00:00.000Z", new Date("2026-09-02T00:00:00Z"))).toBe(true);
expect(selectGeneralChatContext(messages, "m6", 5).map((item) => item.id))
  .toEqual(["m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","m11"]);
```

- [ ] **Step 2: Run `npx vitest run lib/moderation/domain.test.ts` and verify failure because the module is absent**

- [ ] **Step 3: Implement strict controlled reason lists, 500-character detail/reason bounds, allowed actions by target, report transitions, ISO/millisecond block expiry support, and stable chronological context selection**

```ts
export type TargetType = "user" | "store" | "message";
export type ReportStatus = "open" | "in_review" | "resolved" | "dismissed";
export type ModerationAction =
  | "dismiss" | "message_hide" | "message_restore"
  | "user_block" | "user_unblock" | "trust_revoke" | "trust_restore"
  | "store_request_changes" | "store_suspend" | "store_reactivate";
```

- [ ] **Step 4: Re-run the focused test and then `npm test`**

- [ ] **Step 5: Commit with `git commit -m "feat: add report moderation rules"`**

### Task 2: Transactional report repository

**Files:**
- Create: `lib/moderation/repository.ts`
- Create: `lib/moderation/http.ts`
- Create: `lib/moderation/client.ts`
- Test: `lib/moderation/http.test.ts`
- Test: `lib/moderation/client.test.ts`

**Interfaces:**
- Consumes: Task 1 domain types and rules; `getAdminDb()`; effective admin roles.
- Produces: `createReport`, `listReportsForAdmin`, `getReportForAdmin`, `startReportReview`, `resolveReport`, `listReportedMessages`, `createGeneralChatMessage`, serializers, API error mapping, and authenticated client fetch helpers.

- [ ] **Step 1: Write failing tests for sanitization, action labels, status filters, and hidden-message serialization**

```ts
expect(reportStatusOptions.map((item) => item.value)).toEqual(["open","in_review","resolved","dismissed"]);
expect(moderationActionLabel("message_hide")).toBe("Ocultar mensaje");
expect(serializePublicMessage(hiddenMessage).text).toBe("");
expect(serializePublicMessage(hiddenMessage).hidden).toBe(true);
```

- [ ] **Step 2: Run the two focused test files and verify expected missing-module failures**

- [ ] **Step 3: Implement server snapshots and duplicate-open-report prevention using transactionally maintained deterministic `open_report_keys` documents**

```ts
export async function createReport(reporterUid: string, input: ReportInput): Promise<ReportRecord>;
export async function resolveReport(
  actor: { uid: string; role: AdminRole },
  reportId: string,
  input: ResolutionInput,
): Promise<ReportDetail>;
```

- [ ] **Step 4: In `resolveReport`, transactionally re-read the report, reject terminal states, mutate the specific target, close the report, delete its open key, and create an `admin_audit_logs` document**

- [ ] **Step 5: Query message context only around the reported global message timestamp and return no more than eleven chronological messages**

- [ ] **Step 6: Implement client helpers through `storeApiFetch` and re-run focused plus full tests**

- [ ] **Step 7: Commit with `git commit -m "feat: add transactional report repository"`**

### Task 3: Public report and server-side chat APIs

**Files:**
- Create: `app/api/reports/route.ts`
- Create: `app/api/chat/messages/route.ts`
- Modify: `lib/store/auth.ts`
- Test: `lib/store/auth.test.ts`

**Interfaces:**
- Consumes: repository creation methods and Firebase bearer authentication.
- Produces: `requireUnblockedUser(request)`, `POST /api/reports`, and `POST /api/chat/messages`.

- [ ] **Step 1: Write failing tests for active, expired, and missing administrative blocks**

```ts
expect(isAdministrativeBlockActive({ blocked: true, blockedUntil: future }, now)).toBe(true);
expect(isAdministrativeBlockActive({ blocked: true, blockedUntil: past }, now)).toBe(false);
```

- [ ] **Step 2: Run `npx vitest run lib/store/auth.test.ts` and verify failure for the missing helper**

- [ ] **Step 3: Implement profile-backed block enforcement and both Node.js route handlers with malformed-JSON and typed-error responses**

- [ ] **Step 4: Re-run focused and full tests**

- [ ] **Step 5: Commit with `git commit -m "feat: expose reports and moderated chat writes"`**

### Task 4: Administrative report and chat APIs

**Files:**
- Create: `app/api/admin/reports/route.ts`
- Create: `app/api/admin/reports/[reportId]/route.ts`
- Create: `app/api/admin/reports/[reportId]/resolve/route.ts`
- Create: `app/api/admin/chat/reported/route.ts`
- Create: `app/api/admin/messages/[messageId]/visibility/route.ts`
- Create: `app/api/admin/users/[uid]/block/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `getAuthenticatedAdminRole`, and Task 2 repository functions.
- Produces: authenticated JSON endpoints from the approved spec; visibility and block routes resolve through the same audited report transaction when `reportId` is supplied.

- [ ] **Step 1: Add pure request-parser tests for required reason, duration, report/action compatibility, and malformed filters**

- [ ] **Step 2: Run focused tests and verify they fail on the new cases**

- [ ] **Step 3: Implement thin Next.js 16 handlers using awaited dynamic-route params and no client-supplied actor fields**

- [ ] **Step 4: Re-run focused tests, `npm test`, and `npm run build`**

- [ ] **Step 5: Commit with `git commit -m "feat: add admin moderation APIs"`**

### Task 5: Report controls and hidden state in the general chat

**Files:**
- Modify: `app/chat/page.tsx`
- Create: `components/moderation/ReportDialog.tsx`
- Test: `lib/moderation/client.test.ts`

**Interfaces:**
- Consumes: `POST /api/reports`, `POST /api/chat/messages`, controlled message reasons, and hidden message fields.
- Produces: a `Reportar` action per message, confirmation dialog, success/error feedback, server-authorized sends, and the public placeholder “Mensaje retirado por moderación.”

- [ ] **Step 1: Add failing client-copy and payload-builder tests**

- [ ] **Step 2: Run the focused tests and verify RED**

- [ ] **Step 3: Build the accessible dialog and wire it into the existing ellipsis menu without changing the general-room layout**

- [ ] **Step 4: Replace all direct message `addDoc` send paths with one server API helper; retain client reads/reactions**

- [ ] **Step 5: Render hidden messages as a placeholder without text, images, reply excerpt, or admin reason**

- [ ] **Step 6: Run focused tests, full tests, lint, and build**

- [ ] **Step 7: Commit with `git commit -m "feat: add reporting to general chat"`**

### Task 6: Admin queue, report detail, and reported-chat pages

**Files:**
- Create: `app/admin/reports/page.tsx`
- Create: `app/admin/reports/[reportId]/page.tsx`
- Create: `app/admin/chat/page.tsx`
- Create: `components/moderation/AdminResolutionPanel.tsx`
- Modify: `app/admin/page.tsx`
- Test: `lib/moderation/client.test.ts`

**Interfaces:**
- Consumes: Task 4 APIs and Task 2 UI metadata.
- Produces: status counts, filters, search, assignment display, target detail/history, target-specific actions, confirmations, and reported-message cards with bounded global context.

- [ ] **Step 1: Add failing tests proving Spanish labels, target-specific action lists, and four status filters**

- [ ] **Step 2: Run focused tests and verify RED**

- [ ] **Step 3: Implement responsive report list and preserve query filters after refresh/action**

- [ ] **Step 4: Implement report detail with mandatory reason, optional block-until input for `user_block`, confirmation for target-changing actions, and terminal-state handling**

- [ ] **Step 5: Implement reported-chat cards showing exactly the bounded context returned by the server**

- [ ] **Step 6: Activate `/admin/reports` and `/admin/chat` cards and remove “Siguiente fase” for both**

- [ ] **Step 7: Run focused tests, full tests, lint, and build**

- [ ] **Step 8: Commit with `git commit -m "feat: add reports and chat moderation UI"`**

### Task 7: Enforce blocks on store mutations and complete verification

**Files:**
- Modify: `app/api/stores/route.ts`
- Modify: `app/api/stores/[storeId]/route.ts`
- Modify: `app/api/stores/[storeId]/media/route.ts`
- Modify: `app/api/stores/[storeId]/products/route.ts`
- Modify: `app/api/stores/[storeId]/products/[productId]/route.ts`
- Modify: `app/api/stores/[storeId]/schedule/route.ts`
- Modify: `app/api/stores/[storeId]/submit/route.ts`
- Modify: `app/api/stores/[storeId]/withdraw/route.ts`

**Interfaces:**
- Consumes: `requireUnblockedUser`.
- Produces: consistent 403 responses for active blocks across every store-creation or mutation route; read-only access remains available.

- [ ] **Step 1: Extend auth tests with the exact active-block error message expected by every mutating route**

- [ ] **Step 2: Run the focused test and verify RED**

- [ ] **Step 3: Replace `requireFirebaseUser` with `requireUnblockedUser` only in mutation handlers, leaving GET handlers readable**

- [ ] **Step 4: Run `npm test`, `npm run lint`, and `npm run build`; fix only feature-related failures**

- [ ] **Step 5: Inspect `git diff --check`, confirm no secret/config files entered the diff, and review the final file list**

- [ ] **Step 6: Commit with `git commit -m "feat: enforce temporary moderation blocks"`**
