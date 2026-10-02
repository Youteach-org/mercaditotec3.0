# Mercadito security hardening — 2026-10-02

Branch: `security/hardening-2026-10-02`

## Implemented in this branch

- Firebase Authentication's `email_verified` claim is the only source of truth for verified email during server authorization.
- The browser no longer creates or updates privileged `users/{uid}` account fields during registration, login or profile editing.
- Account bootstrap and verified-login synchronization now run server-side from the authenticated Firebase token.
- New accounts receive only safe server-defined defaults: ordinary user role, pending student trust, zero endorsements and no administrative privileges.
- Profile edits are server-restricted to `displayName` and an owned Firebase Storage profile-image URL.
- Administrators may bypass only the student control-number format/window. They still need a verified `@morelia.tecnm.mx` address.
- The two-independent-endorsement verification model is unchanged.
- Production `/__probe` now returns 404. Runtime responses no longer expose stack traces, body samples, console captures or whether a Firebase secret is configured.
- `/__health` now returns only `{"ok":true}`.
- Baseline anti-framing, MIME-sniffing, referrer, permissions and CSP headers are configured.
- Production Cloudflare deployment is manual (`workflow_dispatch`) instead of deploying every push.

## Versioned Firebase rules

`firestore.rules`, `storage.rules`, and `firebase.json` are now part of the repository.

The proposed Firestore rules make `users/{uid}` client read-only. Server code using the Firebase service account owns role, verification, trust and moderation writes. Direct client writes are limited to the user's image-reference subcollection and their own chat reactions.

The proposed Storage rules limit Firebase Storage writes to the signed-in user's own profile-image path, approved image MIME types and 2 MB.

**Important:** committing Firebase rules does not deploy them. They must be deployed through an authorized Firebase/Google account and tested before this boundary is considered closed in production.

## Residual risk / next phase

Supabase is still a separate security boundary. Store/chat media use a public Supabase client and depend on live Storage/RLS policies that are not versioned here. Those policies need a live audit or the uploads need migration behind an authenticated server boundary.

GitHub branch protection/rulesets are repository settings, not application code. This branch removes automatic production deployment, but an owner should still enable protection for `feature/student-stores`.

Rate limiting and abuse controls remain a follow-up layer after the privilege boundary is merged and Firebase rules are deployed.

## Production verification

1. Full Vitest + Next/OpenNext build passes.
2. Unauthenticated `/api/admin/users` remains HTTP 401.
3. Firebase Firestore + Storage rules from this branch are deployed.
4. A normal authenticated student cannot directly write `role`, `emailVerified`, `studentStatus`, `studentEndorsementCount`, `blocked`, `isAdmin`, or `admin`.
5. Registration, verification email, login, profile name/photo and the 2-endorsement flow are retested.
6. `/__probe` returns 404.
7. `/__health` returns only `{"ok":true}`.
8. Cloudflare production deploy is manually dispatched only after the checks above.
