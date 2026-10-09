# Admin user-list failure / 2026-10-09

- User screenshot on `/admin/users` showed `Unexpected token '<', '<!DOCTYPE' ... is not valid JSON`, followed by misleading counts of zero administrators and “No se encontraron usuarios”.
- Direct navigation to `https://mercaditotec.store/api/admin/users` returned the expected unauthenticated JSON error `{"error":"Debes iniciar sesión."}`, confirming that the API route exists and is JSON-capable without a Firebase ID token. Navigating directly does not send the Authorization header used by the in-app fetch.
- The authenticated response could not be reproduced from the GitHub connection without the user's Firebase session. The source of the transient HTML response remains unconfirmed (e.g. an upstream error page). Do **not** interpret this symptom as user records being deleted.
- Separate finding: production deploy jobs on 2026-10-09 completed the Worker deployment successfully but failed verification at `/__health` with HTTP 503 `firebaseRulesReason=permission-denied` (`setIamPolicy=false`, `enableServices=false`). This permission failure is confirmed but is not demonstrated to be the source of the authenticated HTML response.
- Frontend fix: validate the response media type and payload schema, report HTTP status and optional Cloudflare ray instead of raw JSON parser syntax, distinguish fetch failure from an actually empty users collection, and expose a Reintentar button.
- Verification: `app/admin/users/response.test.ts` covers successful JSON, HTTP 403 JSON, upstream HTML, incomplete JSON, and malformed JSON.

Follow up: if the authenticated panel still fails, inspect the failing `/api/admin/users` request's Network status and Content-Type in the browser, then correlate the Cloudflare Ray ID with Worker request logs. Do not disclose Firebase ID tokens in logs/screenshots.
