# Mercadito · Mitigación de bloqueos 429 en Wi-Fi compartido

Fecha: 2026-10-13
Rama de producción: `feature/student-stores`.
Incidencia de capacidad: #117. Implementación: PR #119.

## Hallazgo comprobado
El limitador de entrada original (`lib/security/edgeBudget.mjs`) agrupaba la mayoría de las operaciones API por `cf-connecting-ip`, 3000 solicitudes/60 segundos. Miles de clientes legítimos pueden compartir esa IP tras el NAT de la universidad. Cloudflare desaconseja la IP como único identificador para los límites de una aplicación multiusuario: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Cambio
1. Se mantiene el presupuesto anónimo `API_RATE_LIMITER`: 3000/60s/IP, con su carril de sesión para llamadas no autenticadas.
2. Las llamadas que llevan un JWT plausible usan `AUTH_API_RATE_LIMITER`: 180/60s por hash SHA-256 del token; el token sin procesar no se escribe en registros o claves.
3. Para no levantar completamente el límite frente a tokens inventados, se aplica **además** `API_IP_SAFETY_LIMITER`: 20000/60s/IP a ese tráfico. Sigue siendo posible alcanzar el límite agregado durante un pico extremo: **no se garantiza capacidad de 5000 clientes activos mediante esta corrección sola**.
4. Validación real de token, bloqueo de usuarios, roles, requisitos escolares y cuotas de mutación por cuenta **se mantienen en los controladores del servidor**. La apariencia de un JWT no se trata como autorización.
5. Solicitudes sin token o con credencial malformada conservan el limitador por IP antiguo. El catálogo público anónimo mantiene su ruta en caché sin llamada al rate-limiter.
6. Falta medir el consumo real y ajustar límites sobre datos de los alumnos, alertas 429 y carga sostenida.

## Pruebas / publicación
- Vitest protege aislamiento de 2 clientes del mismo IP, reutilización de clave por sesión, claves sin token sin procesar, techo global por IP, fallos de bindings, solicitudes anónimas y no saltarse el control en rutas privilegiadas.
- El PR debe pasar compilación Next/OpenNext y emuladores de reglas antes de fusionarse a `feature/student-stores`.
- Se debe comprobar después de desplegar que la verificación de producción finalizó con éxito.
- Nunca desplegar desde `main` atrasada.

## Siguiente tarea
Eliminar la lectura global de hasta 500 reacciones en el chat general conservando historial y contadores de reacciones. Debe diseñarse migración compatible y verificar seguridad de Firestore, ya que simplemente bajar el límite borraría reacciones visibles.
