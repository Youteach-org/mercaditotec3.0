# Resiliencia de requests y acceso — Mercadito (09-10-2026)

Rama base: `feature/student-stores`, no cambiar alta manual ni verificación de correo.

Diagnóstico de código:
- El gate `/api/account/session` muestra el error de la captura. Si recibe 429 reintentaba a los 0.5/1 segundos, amplificando congestión.
- El rate limiter de Cloudflare limita 3000 requests/min por IP pública; los estudiantes del campus comparten NAT.
- Cada API privada comprueba Firebase Authentication y Firestore. Requests simultáneos podían duplicar el mismo lookup a Firebase y varias solicitudes de token OAuth.
- El despliegue de producción más reciente devolvió HTTP 503 en `/__health` después de responder 200 en páginas/APIs. **No está demostrado que esa intermitencia sea causada por los 3000 requests/min**. Requiere observabilidad real de Cloudflare para confirmarlo.

Cambios limitados:
1. Sesión GET tiene bucket Cloudflare independiente por IP (también limitado); otras APIs y mutaciones conservan su bucket original y las mutaciones siguen con presupuesto de 60/min por UID.
2. Gate no reintenta inmediatamente en 429, respeta Retry-After, usa backoff escalonado de una sola repetición rápida para 502/503/504, jitter y como máximo dos reintentos automáticos.
3. Deduplicación solo de solicitudes simultáneas a Firebase Auth para el MISMO token, de intercambios OAuth simultáneos y de lecturas concurrentes del mismo perfil en Firestore. Sin caché persistente de autenticación/revocación: después de completarse la solicitud, cada petición nueva vuelve a comprobar credenciales y perfil.
4. Un 429/5xx de Firebase Auth se devuelve como 503 transitorio y **no** como credenciales inválidas/401, evitando cerrar sesiones válidas.
5. Mantener reglas de Firebase, permisos, registro, avisos, UI de la tienda y contenido sin cambios.

Verificación posterior obligatoria: pruebas Vitest + Cloudflare build, despliegue controlado, mirar Cloudflare Worker status codes 429/503 por ruta, Firebase Authentication quota, Firestore quota y logs en ventana de usuarios simultáneos. No subir el límite global a ciegas ni eliminar comprobaciones de acceso.
