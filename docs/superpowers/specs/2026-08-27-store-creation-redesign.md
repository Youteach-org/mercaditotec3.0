# Store creation redesign — approved 2026-08-27

## Lifecycle
- `Crear mi tienda` opens the full builder immediately.
- Construction uses an internal draft only. No public URL and no slug reservation exist while drafting or reviewing.
- Draft changes persist silently. There are no separate `Guardar información` or `Guardar horario` buttons.
- Products remain independently editable.
- One final `Guardar` validates the complete store and submits it to `pending_review`.
- Only admin approval generates a unique slug and public `/tienda/<slug>` URL.

## Slug
A slug is the readable URL identifier, e.g. `electronica-alex` in `/tienda/electronica-alex`.
Before approval, `slug` is null and there is no slug reservation.

## Name
Store names can change freely while drafting. At final submission, the name must be globally unique and may then be reserved so two pending stores cannot claim it. Slug reservation still waits for approval.

## Builder
Sections: Información, Imagen, Horario, Productos, final Guardar.
During creation there are no controls for pausing, manual activation, or returning to automatic schedule. Those controls belong only to already-approved active stores.

## Schedule
Monday–Sunday, one-hour clickable/touch blocks from 07:00 to 21:00. Selected cells illuminate. Desktop is compact; mobile maximizes width with large touch targets and abbreviated day labels.

## Initial categories
- Comida y bebidas
- Dulces, postres y snacks
- Ropa y accesorios
- Tecnología y accesorios
- Componentes electrónicos
- Papelería y material escolar
- Libros y apuntes
- Belleza y cuidado personal
- Arte, manualidades y personalizados
- Coleccionables y hobbies
- Deportes
- Servicios
- Otros

## Suggested categories
The selector ends with `+ Sugerir categoría…`. Selecting it reveals an inline text field, not a popup. The suggestion can be used by products in that same draft but is not globally visible. When admin approves the store, normalize the suggestion; reuse an existing equivalent global category or create it as active. Future stores then see it normally.

## Storefront preview
Use one reusable storefront component for both the live builder preview and the eventual public store page. Default layout: panoramic cover, overlapping logo, store name, seller nickname, description, hours/status, product cards. Changes to name, description, images, schedule and products update the preview immediately. Desktop uses a compact/sticky side preview where practical; mobile uses a full-width `Vista previa de mi tienda` section.

## Performance
Opening the builder must not scan/reserve slugs. Avoid immediately refetching a just-created draft when its data is already available. Load noncritical categories/products in parallel and show the editor shell immediately.

## Approval transaction
Final `Guardar`: validate completeness, reserve unique store name, set `pending_review`, keep `slug = null`.
Admin approval: approve/promote suggested categories, remap product category references if necessary, generate and reserve unique slug, set store active and approved timestamp, then expose it publicly.

## Acceptance
- full builder opens directly
- no slug/public URL before approval
- no section-specific save buttons
- no operational controls during creation
- compact desktop schedule and large-touch mobile schedule
- `Componentes electrónicos` included
- inline category suggestions
- suggested category becomes global only on approval
- live storefront preview while creating
- single final `Guardar`
- public URL generated only after approval
