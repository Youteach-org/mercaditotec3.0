# Admin shell fail-closed hardening — 2026-10-07

A regression after restoring the production branch allowed the global shell to decide whether to show the Admin link from the local Firestore profile snapshot alone. A stale local Firebase/profile state could therefore expose the Admin navigation even when the server no longer considered the session valid.

Fix:
- The global AppShell now calls authenticated `/api/admin/session` before rendering the Admin link.
- The Admin link remains hidden while checking and on every error, 401, 403, or unavailable backend state.
- Existing `/admin/*` layout remains fail-closed and independently checks the same server endpoint before mounting admin pages.
- All `/api/admin/*` routes were reviewed: every route uses `requireAdmin` or `requireSuperadmin`.
- Added regression coverage for the global shell.

Production source remains `feature/student-stores`.
