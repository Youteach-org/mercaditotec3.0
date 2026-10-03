# MercaditoTec3 — Firebase data + Supabase images

Date: 2026-10-02

## Correct architecture

Mercadito keeps application data and identity in Firebase.

### Firebase

Firebase remains the source of truth for:

- Firebase Authentication
- user profiles
- admin / subadmin roles
- student verification and endorsements
- stores
- products
- orders
- notifications
- chat messages and reactions
- reports and moderation
- audit records
- marketplace configuration
- shared-image metadata and user image references

Firestore remains the application database.

### Supabase

Supabase is used only for image file storage.

Project ref:

`wfmokinfcypfpdisussw`

Storage bucket:

`chat-images`

The bucket is public for image delivery and restricts files to:

- JPEG
- PNG
- WebP
- GIF
- maximum 1 MB

No Mercadito application tables remain in the Supabase `public` schema.

## Secure upload flow

Browser uploads do not write directly to Supabase Storage.

Uploads go to the Supabase Edge Function:

`upload-image`

The function:

1. receives the Firebase ID token from the current user;
2. validates that token against Firebase Authentication;
3. extracts the Firebase UID;
4. verifies that the requested Storage path belongs to that UID;
5. validates MIME type and 1 MB size limit;
6. uploads the file to the `chat-images` bucket with server-side Supabase credentials;
7. returns the public Storage URL.

Direct client INSERT policies on `storage.objects` are not enabled.

## Storage paths

Chat images:

`chat/<firebase-uid>/<shared-or-product>/<yyyy-mm>/<filename>`

Store logo and cover images:

`stores/<firebase-uid>/<store-id>/<logo-or-cover>/<filename>`

Product images:

`stores/<firebase-uid>/<store-id>/products/<product-id>/<filename>`

This prevents one Firebase user from uploading into another user's image namespace.

## Shared chat image metadata

The former Supabase-table approach for `chat_image_library` was removed.

Shared image metadata is stored in Firestore under the top-level collection:

`chat_image_library`

The browser accesses that metadata through the Firebase-authenticated server API:

`/api/chat/image-library`

The actual image bytes remain in Supabase Storage.

## Correction of earlier migration work

An earlier implementation in this session created Mercadito application tables in Supabase. That was based on a misunderstanding of the intended architecture.

Those application tables and helper database objects were removed. The destination Supabase project is now used only for Storage and the image-upload Edge Function.

Firebase remains the data/authentication platform; Supabase is the image file store.
