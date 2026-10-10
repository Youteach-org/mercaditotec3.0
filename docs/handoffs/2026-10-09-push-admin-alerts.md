# MercaditoTec — panel pending counters & Android background notifications (2026-10-09)

## Requirements
- In main and mobile navigation show two existing icon types next to the Admin label (person for student, storefront for stores) with corresponding pending counts. No badges inside `/admin*` itself. Never reveal counters to non-admins.
- Notify superadmin/subadmins on new verified student profiles and newly submitted stores.
- Notify owners about administrative decisions on their shops, new orders, private messages, and clicks on the shop's WhatsApp contact button. Order status updates keep existing buyer notices.
- Deliver notifications to an Android tablet even when the site is not open.

## Architecture
- `/api/admin/pending-counts`: server-side `requireAdmin`, indexed aggregate count for `users.studentStatus=pending` and `stores.status=pending_review`, short client polling + focus refresh; no personal user records leave this endpoint.
- Existing notifications collection plus dedupe keys is retained. Server-only `createNotification` creates a record and atomically updates the user's unread count; a first-time event invokes FCM push for the recipient.
- `push_devices/<sha256(token)>` saves Firebase registration tokens associated with authenticated UID only, never exposed to another user. Signup and role claims are never accepted from the caller for recipients or notification text. The endpoint uses `requireFirebaseUser` on every request.
- FCM HTTP v1 calls use existing Firebase service-account OAuth. No new Firebase private key or API credential in frontend. Notifications are **data-only** and are rendered in the service worker to prevent duplicate browser notifications. Push titles are event-specific and push body is deliberately generic for lock-screen privacy; in-app copy contains more detail.
- Opt-in button in `/notifications`: calls Notification.requestPermission following an explicit click, registers the dedicated `/firebase-messaging-sw.js` service worker, retrieves an FCM token and binds it to the session via POST. Disable button unregisters and removes the token from browser.
- Each private message leads to `direct_message` notice. Clicking WhatsApp in a store logs an **attempt only** (it cannot confirm a message was sent); rate-limited to one new notification per visitor/store/hour. New orders and buyer order transitions retain the existing event wiring.
- Admin decisions and store submissions are authoritative, only triggered after committed mutations. Notifications are best effort and cannot reverse a successful store or order operation if Firebase/FCM is temporarily unavailable.

## Important setup
Firebase `mercadito3-1ff3e`, Cloud Messaging > Web Push certificates: create a public VAPID key and configure it as the Cloudflare Workers environment variable `FIREBASE_WEB_PUSH_PUBLIC_KEY` (public value, **not** its private key). Do not commit a private key or an FCM token to GitHub. With no key set, Firebase JavaScript SDK falls back to the default VAPID key; some Chromium push providers require a custom one. Configure and test on the Samsung tablet.
Ensure the Firebase Cloud Messaging API HTTP v1 is enabled in Google Cloud/Firebase project for `fcm.googleapis.com` and the existing service account can send messages. The app will retain in-app notifications if FCM is temporarily unavailable.
To activate Android push: browse `https://mercaditotec.store/notifications` **in the same browser** intended to receive notifications, sign in, tap **Activar avisos** and allow permission in both browser and Android Settings. Android may suppress notifications for battery optimization or browser privacy controls. Service worker supports HTTPS only.
To test, sign into an approved seller account on another device, register push, then create a test order/private message with a different account. For admins, submit a test store for review and verify the Admin numeric icons and the notification while tablet/browser is backgrounded.

## Follow-up
- No FCM registration token is available to the GitHub connector, so real device end-to-end delivery requires browser activation and verification on the tablet. Do not claim Android push tested until this is performed.
- Missing notifications that occur *before* opt-in are retained in app list but cannot be delivered retroactively to the tablet.
- Account owners should disable notifications before handing off shared devices; payloads intentionally do not contain order/chat details.
- Existing Cloudflare `/__health` Firebase Rules permissions issue remains separate; actual Worker deployment can succeed while CI check reports failure.
