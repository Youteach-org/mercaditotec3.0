# Global Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated global in-app notifications for order activity, including a global bell, unread badge, notification center, and server-generated idempotent order notifications.

**Architecture:** A dedicated `lib/notifications` module owns event mapping, Firestore persistence, serialization, and client API calls. Order mutations call the notification repository after successful authoritative order writes. A client `AppShell` wraps the root layout, reads notification APIs, and renders the global bell without direct notification Firestore access.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Firebase Auth, Firebase Admin/Firestore, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-09-07-global-notifications.md`

## Global Constraints

- Work only on `feature/student-stores`; do not modify `main`.
- Notification creation is server-only.
- No email, browser push, chat notifications, admin broadcasts, inventory alerts, or payment events in this phase.
- No buyer/seller email in notification documents or API output.
- No direct client Firestore reads for notifications.
- Notification deduplication must be deterministic and idempotent.
- Existing blocked-user rules remain authoritative for order mutations.
- Completion requires fresh `vitest run && next build --webpack` evidence.

---

### Task 1: Notification domain mapping

**Files:**
- Create: `lib/notifications/domain.test.ts`
- Create: `lib/notifications/domain.ts`

**Interfaces:**
- Produces: `NotificationType`, `OrderNotificationEvent`, `NotificationDraft`, `notificationDedupeKey(orderId,event)`, and `buildOrderNotification(order,event)`.

- [ ] Write failing tests for deterministic keys, recipient mapping, copy, and links.
- [ ] Run the focused test and confirm RED.
- [ ] Implement minimal pure mapping functions.
- [ ] Run the focused test and confirm GREEN.

### Task 2: Notification persistence and serialization

**Files:**
- Create: `lib/notifications/repository.ts`
- Create: `lib/notifications/http.ts`

**Interfaces:**
- Produces: `createOrderNotification`, `listNotificationsForUser`, `markNotificationRead`, `markAllNotificationsRead`, `serializeNotification`.

- [ ] Persist notifications under deterministic document IDs derived from dedupe keys.
- [ ] Query only by authenticated recipient UID and sort newest first.
- [ ] Enforce ownership on single-read operations.
- [ ] Make single-read and read-all idempotent.
- [ ] Serialize timestamps to ISO strings and omit recipient UID/dedupe key from client output.

### Task 3: Notification APIs

**Files:**
- Create: `app/api/notifications/route.ts`
- Create: `app/api/notifications/[notificationId]/read/route.ts`
- Create: `app/api/notifications/read-all/route.ts`

**Interfaces:**
- `GET /api/notifications` -> `{ notifications, unreadCount }`
- `PATCH /api/notifications/[notificationId]/read` -> `{ notification }`
- `PATCH /api/notifications/read-all` -> `{ updatedCount }`

- [ ] Require Firebase authentication for every endpoint.
- [ ] Convert repository failures to appropriate JSON errors.

### Task 4: Generate notifications from order mutations

**Files:**
- Modify: `lib/orders/repository.ts`

**Interfaces:**
- Uses: `createOrderNotification(order,event)`.

- [ ] After successful order creation, create the seller `created` notification.
- [ ] After successful status transaction, create exactly one notification for `accepted`, `rejected`, `ready`, `completed`, or buyer `cancelled`.
- [ ] Preserve the existing order state machine and API behavior.

### Task 5: Notification client and global AppShell

**Files:**
- Create: `lib/notifications/client.ts`
- Create: `components/AppShell.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Client functions: `loadNotifications`, `markNotificationRead`, `markAllNotificationsRead`.

- [ ] Wrap all pages in AppShell.
- [ ] Show the bell only for authenticated users.
- [ ] Hide the badge at zero; show numeric unread count otherwise.
- [ ] Refresh unread count on route changes and after notification read mutations.
- [ ] Do not add direct Firestore notification listeners.

### Task 6: Notification center

**Files:**
- Create: `app/notifications/page.tsx`

- [ ] Require authentication and redirect anonymous users to `/login`.
- [ ] Display newest notifications first with distinct unread/read styling.
- [ ] Mark unread notification as read before navigating to its `href`.
- [ ] Add `Marcar todas como leídas` when unread items exist.
- [ ] Show a clear empty state.

### Task 7: Verification

- [ ] Run the full project build script (`vitest run && next build --webpack`).
- [ ] Confirm all notification routes and `/notifications` are present in Next route output.
- [ ] Confirm TypeScript compilation succeeds.
- [ ] Only then report the feature complete.
