# Mercadito security hardening — 2026-10-02

## Changes

Firebase token claims are the only email verification source. Account creation, roles, trust, and moderation are server-owned. Institutional verification, student eligibility, account activity and administrative blocks are enforced at API and direct Firebase boundaries. Profile edits accept only safe fields and owned image URLs. Administrators still need institutional verification.

Supabase upload-image now calls the application authorization endpoint before using its service role. It checks store/product ownership, canonical paths, actual multipart size, image signatures and a 1 MB file limit. Authorization failure denies upload. The function is versioned under supabase/functions/upload-image; Firebase bearer tokens require verify_jwt=false.

Cloudflare API requests are bounded to 64 KiB. Server API mutations share a transactional budget of 60 actions per account per minute. REST resource segments reject traversal/query injection. Sensitive runtime diagnostics are removed; health returns only {"ok":true}. Browser security headers are configured and production deployment is manual.

Next.js, Firebase and Supabase dependencies are updated. Cloudflare packaging retains the locked application Next.js version instead of downgrading it.

## Validation and limitations

260 Vitest tests passed. Next.js compilation passed. Firebase authorization emulator tests and OpenNext packaging must also pass before deployment; GitHub Actions now runs both. Production npm dependencies have zero reported vulnerabilities; five high advisories remain in the development-only ESLint dependency chain (braces has no patched version reported by npm).

The API budget does not cover direct Firebase chat reactions, image metadata or profile Storage traffic. These retain ownership/eligibility/block rules but require additional abuse controls. Anonymous authentication traffic needs edge rate limits. Public image URLs remain public by design. No claim of complete protection against attacks is made.

## Activation order

1. Review and merge the PR into feature/student-stores after CI passes.
2. Deploy the application authorization endpoint and verify anonymous requests return 401.
3. Deploy upload-image to Supabase project wfmokinfcypfpdisussw. The endpoint must be live first or uploads fail closed.
4. Deploy firestore.rules and storage.rules to Firebase project mercadito3-1ff3e using an authorized Google/Firebase account. Cross-service Storage rules require permission to read Firestore during deployment.
5. Verify student registration/login, profile photo, chat reactions, two-endorsement trust, store/product uploads and blocked-account denial in production.
6. Enable GitHub branch protection and edge abuse limits through their respective infrastructure settings.

Code changes and local tests do not activate production rules or the Supabase function. Until these deployments are verified, production retains its previous boundaries.
