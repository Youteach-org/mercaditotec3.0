# Mercadito · mitigación de carga CPU y duplicación de trabajo (2026-10-13)

Incidente: #117. Rama producción: `feature/student-stores`. Trabajo: PR de la rama `perf/worker-cpu-rebuild-liveness-20261013`.

## Hallazgos
- Diagnóstico de Cloudflare del 2026-10-12 reportó estado `exceededResources` en 21 ejecuciones de la ventana analizada de cuatro horas. La métrica `workersInvocationsAdaptive` del diagnóstico previo mostraba datos agregados, **no identifica ruta exacta** ni verifica el plan facturado.
- Las actualizaciones de tiendas y productos pueden disparar simultáneamente llamadas a `rebuildPublicMarketplaceSnapshot`, que consulta hasta 50 tiendas, 300 productos, categorías y configuración; cada llamada lee muchos documentos y escribe un snapshot. `getPublicMarketplaceSnapshot` ya deduplicaba lecturas, pero el refresco interno invocaba `rebuildPublicMarketplaceSnapshot` sin deduplicar.
- Solicitudes simultáneas a las API anónimas del catálogo en un centro de datos sin caché podían desencadenar varias llamadas idénticas a OpenNext/Firestore antes del primer `cache.put`.
- `/__health` realiza sincronización de reglas Firebase. No es una comprobación económica apta para consultas periódicas frecuentes de disponibilidad.

## Implementado
1. `rebuildPublicMarketplaceSnapshot` coalescea reconstrucciones simultáneas dentro de un mismo isolate: lectura y escritura única para el grupo de peticiones, sin ocultar revisiones nuevas. Si falla, la siguiente solicitud puede reintentar. No comparte estado entre distintos centros de datos.
2. `serveCachedPublicCatalogue` comparte las respuestas GET públicas anónimas de catálogo que llegan simultáneamente en cold cache dentro del mismo isolate. Conserva límites: no almacenar respuestas de error, credenciales, cookies, escrituras o API privada.
3. `/__live` es una comprobación pública ligera sin llamadas a Next.js ni Firebase. `/__health` conserva la sincronización de reglas para la verificación de despliegue; CI prueba ambos endpoints.
4. Se registra una muestra del 5% de respuestas API cuyo tiempo total supera 2 segundos, agrupada por dos segmentos de ruta (`/api/chat`, `/api/stores`, etc.), solo duración y status. No registrar tokens, IDs, datos privados ni cuerpo. **El tiempo de pared incluye red; NO es CPU**. Comprobar junto a CPU y status de Cloudflare Analytics.

## Qué no está demostrado
- Estas optimizaciones atacan trabajo duplicado, no prueban el fin de 1102 ni garantizan 5,000 usuarios simultáneos; medición CPU real y pruebas de carga en staging siguen pendientes.
- Firestore Free mantiene cuotas; límites de Cloudflare según plan de cuenta.
- Los snapshots actuales tienen topes de 50 tiendas, 300 productos y 700 kB por documento, a resolver con paginación/esquema en un PR aparte.

## Validaciones requeridas
- Vitest de deduplicación (concurrencia, control de revisiones, fallo/reintento), cache público (concurrente, auth y errores), liveness.
- Compilación Next/OpenNext, emuladores Firebase, reglas de seguridad, artefacto Worker.
- Publicar **solo** desde `feature/student-stores` con pipeline automático, y verificar `Deploy production Worker` + `Verify production application`.
- Antes/después con Cloudflare Analytics (mismo rango horario): `exceededResources`, CPU p50/p99, solicitudes, porcentaje de 429, errores de Firestore; no afirmar mejora cuantitativa sin muestra comparable.
