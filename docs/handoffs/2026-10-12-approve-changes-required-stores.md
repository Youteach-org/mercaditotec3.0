# Mercadito — aprobación excepcional de tiendas con cambios solicitados

Fecha: 2026-10-12
Repositorio: `Youteach-org/mercaditotec3.0`
Rama: `feature/approve-stores-requiring-changes-2026-10-12`

## Decisión

1. En `/admin/stores` → **Requieren cambios**, el **superadmin** dispone de **Aprobar de todos modos** directamente en cada tarjeta de tienda.
2. En `/admin/stores/[storeId]`, el superadmin también puede **Aprobar a pesar de requerir cambios** dentro de acciones administrativas.
3. El sistema requiere confirmación antes de publicar una tienda con observaciones pendientes. No es necesario que el vendedor cambie datos ni reenvíe la solicitud.
4. El backend valida el rol de forma independiente del frontend y dentro de la transacción de Firestore. El **subadmin** no tiene esta facultad; sus permisos habituales de moderación no cambian.
5. El paso `changes_required → active` asigna `approvedAt`, reserva un slug/URL pública, reasigna la reserva de nombre si está libre y limpia `reviewMessage`. Si otra tienda ya reservó el nombre, responde 409 para evitar pisar la reserva.
6. Se promocionan las categorías sugeridas al aprobar (tanto desde pendientes como desde cambios solicitados).
7. El registro de auditoría identifica esta excepción como `store.approve_override` y conserva el cambio de estado.
8. No se alteran los criterios de verificación del usuario ni la revisión ordinaria de tiendas pendientes. Tampoco se aprueban tiendas automáticamente.

## Archivos principales

- `app/admin/stores/page.tsx`: botón directo y notificación.
- `app/admin/stores/[storeId]/page.tsx`: botón de detalle con confirmación.
- `lib/store/adminClient.ts`: acción de aprobación excepcional visible solo para superadmin.
- `lib/store/domain.ts`: transición permitida.
- `lib/store/repository.ts`: autorización en transacción, slug, reservas y estado.
- `app/api/admin/stores/[storeId]/status/route.ts`: autorización, categorías y auditoría.
- Pruebas en `lib/store/{adminClient,domain,repository}.test.ts`.

## Comprobación funcional

1. Superadmin: abrir **Requieren cambios** y aprobar una tienda sin volver a enviarla a revisión. Debe pasar a **Activas** y tener URL pública.
2. Subadmin: no debe ver la aprobación excepcional ni poder ejecutar el cambio manipulando una llamada HTTP.
3. Tras cancelar el diálogo de confirmación, el estado debe permanecer intacto.
4. Cuando un nombre esté reservado por otra tienda, la aprobación debe responder con conflicto y no sobrescribirlo.
