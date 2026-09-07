# Global Notifications Design

## Goal

Add an internal notification system that works globally across MercaditoTec and informs signed-in users about important order events without requiring email, browser push, or direct Firestore reads from the client.

## Scope

This phase includes only internal app notifications tied to order activity. It does not include email, browser push, chat notifications, admin broadcast notifications, inventory alerts, or payment events.

## Global App Shell

`app/layout.tsx` will wrap the application with a client-side `AppShell` component.

For authenticated users, the AppShell shows a compact global top bar containing a notification bell. The bell is available across Marketplace, Chat, Orders, My Store, and Admin pages.

The bell displays a numeric badge when unread notifications exist. Selecting the bell navigates to `/notifications`.

Anonymous users do not see the notification bell.

## Notification Data Model

Firestore collection: `notifications`

Each document contains:

- `recipientUid`: UID of the user who receives the notification.
- `type`: notification type.
- `title`: short user-facing title.
- `message`: short user-facing description.
- `href`: internal application route to open when the user selects the notification.
- `readAt`: Firestore Timestamp when read, or `null` while unread.
- `createdAt`: Firestore Timestamp.
- `dedupeKey`: deterministic unique event key used to prevent duplicate notifications.

The client never supplies `recipientUid`, event content, or `dedupeKey` for order notifications.

## Supported Order Events

Notification events are created server-side from authoritative order operations.

- New order created -> seller receives a notification.
- Order accepted -> buyer receives a notification.
- Order rejected -> buyer receives a notification.
- Order marked ready -> buyer receives a notification.
- Order completed/delivered -> buyer receives a notification.
- Order cancelled by buyer -> seller receives a notification.

The notification link points to the relevant order area:

- Buyer-facing order events -> `/orders`.
- Seller-facing order events -> `/mystore/orders`.

## Deduplication

Each order event uses a deterministic key such as:

`order:{orderId}:{event}`

Examples:

- `order:abc123:created`
- `order:abc123:accepted`
- `order:abc123:cancelled`

The repository writes notifications using a document identity derived from the dedupe key or an equivalent transactional/idempotent strategy so repeated handling of the same event cannot create duplicate user notifications.

## Backend Boundaries

Notification creation is server-only and lives in a dedicated notification repository/service rather than being spread through UI components.

The order repository remains authoritative for order state transitions. After a valid order creation or status transition is committed, the server records the corresponding notification exactly once.

Mutating notification endpoints require an authenticated user and only allow that user to modify notifications whose `recipientUid` matches their own UID.

## API

### `GET /api/notifications`

Returns the authenticated user's notifications ordered newest first, plus unread count information needed by the global bell.

The response does not expose internal user identifiers belonging to other users.

### `PATCH /api/notifications/[notificationId]/read`

Marks one notification as read only when it belongs to the authenticated user.

The operation is idempotent: marking an already-read notification again succeeds without creating a new timestamp requirement.

### `PATCH /api/notifications/read-all`

Marks all unread notifications belonging to the authenticated user as read.

## Client Layer

A notification client module will use the existing authenticated API fetch pattern.

It exposes functions for:

- loading notifications,
- loading unread count,
- marking one notification read,
- marking all notifications read.

The global AppShell uses this client instead of reading Firestore directly.

## Notifications Page

Route: `/notifications`

The page requires authentication.

It shows notifications newest first. Each item includes title, message, timestamp, and visual read/unread state.

Selecting an unread notification marks it as read before navigating to its `href`.

The page includes a `Marcar todas como leídas` action when unread notifications exist.

An empty state is shown when the user has no notifications.

## Global Bell Behavior

The AppShell loads unread count for authenticated users.

The badge is hidden when the unread count is zero.

The badge refreshes after the user marks notifications as read and when the route changes after normal in-app activity. Real-time Firestore listeners are intentionally out of scope for this phase.

## Security and Privacy

- All notification reads and writes go through authenticated server APIs.
- Users can only read or mark their own notifications.
- Order notifications are generated from server-resolved order data.
- No seller or buyer email is stored in notification documents.
- No private order data beyond the minimal user-facing notification copy is exposed.
- Existing blocked-user rules continue to govern order mutations; notification read actions require authentication but do not create new marketplace actions.

## Testing

Tests cover:

- deterministic dedupe keys,
- event-to-recipient mapping,
- event copy/link mapping,
- serialization without leaking internal identifiers,
- per-user ownership enforcement for read operations,
- unread count behavior,
- read-all behavior,
- order creation notification,
- order status notification generation,
- global UI states for zero and nonzero unread counts where practical.

The existing project build remains `vitest run && next build --webpack`; completion requires fresh test and build evidence before claiming success.
