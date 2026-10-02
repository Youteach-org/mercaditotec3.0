# MercaditoTec3 — Supabase migration status

Date: 2026-10-02

## Destination project

Supabase project ref: `wfmokinfcypfpdisussw`

Project URL: `https://wfmokinfcypfpdisussw.supabase.co`

The project was restored and verified as `ACTIVE_HEALTHY`.

## What is already migrated

The destination database schema is now created with RLS enabled for all application tables.

Created tables:

- `users`
- `store_categories`
- `stores`
- `products`
- `orders`
- `notifications`
- `messages`
- `reports`
- `admin_audit_logs`
- `student_endorsements`
- `trust_counters`
- `site_config`

The default marketplace categories were seeded and the marketplace site-config row was created.

Private tables were explicitly removed from anonymous grants. Public anonymous access remains only on the marketplace surfaces that need it: active stores, published products, active categories and public marketplace configuration, all still constrained by RLS.

Foreign-key support indexes identified by the Supabase performance advisor were added.

## Authentication strategy

Firebase Auth remains the authentication provider during the database migration.

The application Supabase client is now configured for the destination project and obtains the current Firebase ID token through the Supabase `accessToken` callback.

Supabase documentation supports Firebase Auth as a third-party authentication provider. The Supabase dashboard integration for Firebase project `mercadito3-1ff3e` still needs to be enabled before authenticated Data API calls can be cut over.

## What is NOT migrated yet

Production Firestore records have not yet been copied into Postgres.

This includes existing:

- user profiles and admin roles
- stores and products
- orders and notifications
- chat messages
- reports and audit history
- student endorsements and trust counters
- marketplace configuration

No Firestore data has been deleted or modified as part of this preparation.

## Cutover rule

Do not switch repository implementations from Firestore to Supabase until:

1. Firebase third-party authentication is enabled in the destination Supabase project.
2. Existing Firestore production data is copied and row counts / key relationships are verified.
3. Read-only parity checks pass for users, marketplace, stores, products and orders.
4. Write-path tests pass for trust, stores, orders, moderation and notifications.
5. The Cloudflare production build and health checks pass.

Firebase remains the current source of truth until those checks are complete.
