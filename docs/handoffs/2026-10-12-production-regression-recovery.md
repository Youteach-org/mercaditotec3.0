# Incidente: despliegue de rama equivocada y recuperación de Mercadito

Fecha: 2026-10-12

## Causa
El 12 de octubre a las 19:32 UTC aproximadamente, producción se desplegó correctamente desde `feature/student-stores` (SHA `d56f3869b0692e20377d6616b3e7c26fd8981c2d`). Una ejecución manual posterior, iniciada desde `main` en la madrugada UTC del 13 de octubre, desplegó SHA `e2136ca88eef86539eb8bb08bf540d90bd1a68e8`. La rama `main` estaba considerablemente atrasada frente a la fuente real de producción (>500 commits), por lo que esa publicación reemplazó funciones más recientes. Esta es una regresión de despliegue, no una eliminación intencional de datos.

## Recuperación
1. Mantener como punto de partida la última rama de producción verificada: `feature/student-stores`. No fusionar ni desplegar `main` directamente.
2. Añadir aprobación excepcional de tiendas desde `changes_required` solamente al superadmin, conservando funcionalidades más recientes (revisión administrativa completa, avisos, esquema de permisos, cache de catálogo y optimizaciones de tráfico).
3. Una vez superadas las pruebas, integrar el hotfix en `feature/student-stores` para activar su flujo de despliegue automático a Cloudflare.
4. Comprobar mediante Actions el éxito del despliegue y que en producción funcionen la navegación, la API administrativa protegida y el marketplace.
5. Prevenir recurrencias: no ofrecer despliegues manuales de `main` sin verificar antes la paridad con la rama efectiva de producción; reconciliar ramas con una revisión planificada, nunca sustituyendo una rama avanzada por otra antigua.

## Aprobación excepcional
- Admin → Stores → Requieren cambios: botón «Aprobar de todos modos» solo visible para superadmin.
- Detalle de tienda: acción «Aprobar a pesar de requerir cambios» con confirmación.
- API: exige `approveAsIs: true` y rol de superadmin para `changes_required → active`.
- Repositorio: impide que un actor no autorizado eluda el control mediante una llamada distinta; asigna slug, reserva el nombre con verificación de colisión, elimina el mensaje previo, asigna la fecha de aprobación, invalida la caché y notifica al vendedor.
- Auditoría: `store.approve-override`; conserva la distinción de `store.approve-as-is` para pendientes.

## Regla persistente
**La rama de código usada para desplegar producción es la única fuente válida para arreglos urgentes.** Antes de desplegar comprobar el SHA live, compararlo con la rama seleccionada y usar CI + rollback verificado.
