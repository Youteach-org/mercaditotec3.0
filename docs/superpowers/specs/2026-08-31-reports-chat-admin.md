# MercaditoTec3 Reports and Chat Administration Design

## Goal

Complete the MercaditoTec3 administration center with functional Reports and Chat moderation while preserving student privacy, preventing automatic punishment by report count, and recording every sensitive administrative decision.

This design extends the existing security, trust, store-administration, and audit foundation on `feature/student-stores`.

## Scope

The phase adds:

- A unified report action and report model for users, stores, and chat messages.
- A central administrative report queue.
- A report detail view with the reported item, reason, reporter, relevant history, and limited context.
- Chat moderation limited to reported messages and their immediate context in the single general chat room.
- Moderation actions for dismissing a report, hiding a message, requesting store changes, suspending a store, temporarily blocking a user, and revoking student verification.
- Immutable server-side audit records for report and moderation actions.
- Functional links for Reports and Chat in the administration center.

The phase does not add automatic content detection, automatic sanctions based on report counts, unrestricted administrator access to private conversations, or permanent deletion of audit history.

## Roles and permissions

### Superadmin

May:

- View and resolve all reports.
- Moderate reported chat messages.
- Suspend or reactivate stores.
- Temporarily block or unblock users.
- Revoke or restore student verification.
- Assign or remove subadmins through the existing administration tools.

### Subadmin

May:

- View and resolve all reports.
- Moderate reported chat messages.
- Request store changes or suspend/reactivate stores.
- Temporarily block/unblock users.
- Revoke or restore student verification.

A subadmin may not assign administrative privileges.

Legacy `admin` profiles continue to behave as superadmin until explicitly migrated.

## Report model

Reports are stored in a server-managed `reports` collection.

Each report contains:

- `reporterUid`
- `targetType`: `user`, `store`, or `message`
- `targetId`
- `reasonCode`
- `details`
- `status`: `open`, `in_review`, `resolved`, or `dismissed`
- `assignedAdminUid`, nullable
- `createdAt`
- `updatedAt`
- `resolvedAt`, nullable
- `resolutionAction`, nullable
- `resolutionNote`, nullable

The report stores a small immutable target snapshot required for later review. It does not copy an entire conversation.

A signed-in user may not submit the same target and reason repeatedly while an equivalent open report from that user already exists.

## Report creation

The public interface uses one `Reportar` action. Context determines whether the target is a user, store, or message.

The form requires:

- A reason selected from a controlled list appropriate to the target type.
- Optional explanatory text with a bounded length.
- Confirmation before submission.

Creating a report does not block the reported person automatically and does not change the target's public state.

Blocking another user remains a separate personal action and does not require a report.

## Administrative report queue

The `/admin/reports` page provides:

- Counts for open, in-review, resolved, and dismissed reports.
- Filters by status, target type, reason, and date.
- Search by report ID or visible target identity.
- Cards or rows showing report type, reason, age, target, and current assignment.
- Mobile and desktop layouts consistent with the existing administration center.

Opening a report marks it `in_review` and may assign it to the current administrator. Another administrator can still view it, but the interface shows who is reviewing it.

## Report detail and moderation actions

The `/admin/reports/[reportId]` page shows:

- Reporter identity available to administrators only.
- Report reason and explanation.
- Current target information.
- Existing moderation state.
- Previous reports and relevant audit events for the same target.
- The available actions allowed for that target type.

Actions by target:

### User report

- Dismiss report.
- Temporarily block user.
- Unblock user.
- Revoke student verification.
- Restore student verification.

### Store report

- Dismiss report.
- Request changes.
- Suspend store.
- Reactivate store.

### Message report

- Dismiss report.
- Hide message.
- Restore message.
- Temporarily block or unblock the message author.
- Revoke or restore the author's student verification.

Every action requires a non-empty administrative reason. Destructive or visibility-changing actions require confirmation.

Resolving a report and applying a moderation action occur in one server-side operation so a report cannot claim success when the moderation action failed.

## Chat moderation and privacy

MercaditoTec3 has one general chat room; there are no private conversations or per-user rooms. The `/admin/chat` page lists reported messages from that general room only. It is a moderation queue, not an unrestricted chat browser.

For a reported message, the administrator may see:

- The reported message.
- Its author and timestamp.
- The limited immediate context required to understand it: up to five messages before and five messages after in chronological order from the general room.
- Whether any displayed message is hidden.

The system must not expose messages outside that eleven-message context window or allow arbitrary general-room searches from the admin interface.

Hiding a message is a reversible soft-hide. The stored message and audit history remain available to authorized administrators. Normal users see that the message was removed by moderation, without seeing the administrative reason.

## User blocking

Administrative user blocking is temporary and includes:

- `blocked`
- `blockedUntil`
- `blockedReason`
- `blockedBy`

A blocked user may sign in and view their account status but may not send chat messages, create or modify stores, submit stores for review, or create new reports while the block is active.

Expired blocks are treated as inactive without requiring a manual database edit. An administrator may unblock earlier with a recorded reason.

## API boundaries

All administrative routes verify a Firebase ID token and effective admin role server-side.

Planned endpoints:

- `POST /api/reports`
- `GET /api/admin/reports`
- `GET /api/admin/reports/[reportId]`
- `POST /api/admin/reports/[reportId]/resolve`
- `GET /api/admin/chat/reported`
- `POST /api/admin/messages/[messageId]/visibility`
- `POST /api/admin/users/[uid]/block`

Client input never supplies trusted actor identity, role, audit timestamps, or target snapshots.

## Audit

Server-side audit actions include:

- `report.review.start`
- `report.dismiss`
- `report.resolve`
- `message.hide`
- `message.restore`
- `user.block`
- `user.unblock`

Existing store and trust audit actions remain in use.

Each audit entry records actor, effective role, action, target, timestamp, report ID when applicable, and the administrative reason. Audit entries remain immutable and are not written by client code.

## Error handling and concurrency

- Missing or inaccessible targets return a clear error without exposing unrelated data.
- Invalid state transitions are rejected server-side.
- Report resolution uses a Firestore transaction or equivalent atomic operation.
- If two administrators act on the same open report, only the first valid resolution succeeds; the second receives the final report state.
- The interface preserves filter state after an action and clearly confirms the resulting moderation state.
- A failed moderation action leaves the report unresolved.

## Testing

Unit tests cover:

- Target-specific reason validation.
- Duplicate open-report prevention.
- Role and permission rules.
- Allowed report-state transitions.
- Target-specific moderation actions.
- Temporary-block expiration.
- Limited general-room chat-context selection.
- Audit action mapping.

Repository and API tests cover:

- Authentication and admin authorization.
- Atomic report resolution.
- Concurrent resolution rejection.
- Message soft-hide and restore.
- User block and unblock.
- Store and trust action integration.
- Sanitized report responses.

UI tests cover core labels, filters, available actions by target type, confirmation states, and handling of already-resolved reports.

The phase is complete when all tests and the production build pass, Reports and Chat are functional from `/admin`, and the full Student -> Report -> Admin review -> moderation -> Audit flow can be exercised while exposing no messages outside the permitted general-room context window.
