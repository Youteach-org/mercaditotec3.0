# MercaditoTec – Firestore read/write quota optimization (2026-10-25)

## Why this change

The owner observed **approximately 28k Firestore document reads, 755 writes, and 0 deletes** for the period labeled Oct 21–22 in the Firebase console, despite about 123 registered users. These are actual Firestore operations, **not human page visits**. The official Firebase usage graph does not attribute operations to individual source-code calls; the suspects below are code-based hypotheses, not a measured causal breakdown.

**Constraints:** Keep Spark/free plan; do not require Cloud Monitoring paid API access; do not store extra per-visit data in Firestore; preserve existing authentication, moderation, chat reactions, message retention, and published UI.

## Verified expensive paths in code

- `lib/security/accountProfile.ts`: `syncVerifiedAccountProfile()` ran `users/{uid}.update(..., updatedAt)` on **every successful login**, even when `email`, `emailLocalPart`, and `emailVerified` had not changed. The existing-nickname branch of `bootstrapAccountProfile()` did likewise.
- `app/chat/page.tsx`: four active realtime Firestore subscriptions (last 100 messages, up to 500 personal reactions, legacy reactions up to 500, and personal images up to 100 *when gallery is open*) were **forcefully unsubscribed and re-subscribed on each visibility event**. Firestore may charge for re-read documents on initial/reconnected snapshots; this depends on SDK cache and network behavior. New chat events still have ordinary Firestore read costs.
- Materialized catalog snapshots and admin APIs also read Firestore but were *not modified* in this change.

## Implemented changes

1. **Write elimination for no-op account sync:** `accountIdentityChanges()` computes a field diff; both login sync and existing-account bootstrap only issue a Firestore update if a relevant field actually changes. On a real change, `updatedAt` remains set. The original security/eligibility and email verification checks still run on every attempt. On first registration, all existing writes/notifications remain.
2. **Chat lifecycle:** One visibility observer delays pause until a tab has been hidden continuously for **five minutes**; shorter switches retain the existing Firestore listeners instead of issuing new subscriptions. After five minutes hidden, subscriptions are cleaned up via React effects; on return, they re-open once. Gallery and legacy-reaction guards remain in force.
3. **Regression tests:** no-op vs changed profile fields; listener guards and absence of focus-driven restart events; existing gallery and reaction migration tests updated as necessary.

## How to verify results safely

- Run all unit tests, Firebase authorization rules tests, and the Cloudflare Worker build **before** deployment.
- Confirm Cloudflare Worker deployed with original Firebase and Analytics **secret bindings** and static assets.
- Verify login with verified student/admin; changing/confirming an email updates when needed; existing nickname and approval state remain intact.
- Open general chat, send/receive messages and reactions, switch away for several seconds and back, and verify real-time updates without a visual reset; after being hidden >5 min, return and check it catches up.
- Compare Firestore **daily reads and writes**, same day-of-week and roughly same active user volume, over several days. The day cutoff used by Firebase is Pacific time. A single daily total cannot prove exact savings.
- Continue investigating other sources if total reads remain high; **do not equate recorded reads with visitors**.

## Status/limitations

This change reduces needless account writes and listener recreation. Actual Firestore billing savings are **not yet measured**. It does not directly obtain Spark usage inside `/admin/usage`, where Cloud Monitoring returns HTTP 403 in the no-billing project. It does not alter any pricing plan, Cloudflare secrets, or IAM permissions.
