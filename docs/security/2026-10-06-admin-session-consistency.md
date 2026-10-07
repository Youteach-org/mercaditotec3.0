# Consistencia y bloqueo preventivo de administración (2026-10-06)

## Incidencia observada

Mercadito mostraba “La sesión no es válida o ha expirado” cuando `/api/account/sync` fallaba por saturación de Firestore (HTTP 429). El login mediante Firebase ya había terminado correctamente y Firebase almacenaba su sesión de forma persistente. El usuario podía regresar a las pantallas administrativas con la identidad anterior o recién autenticada, aunque la pantalla de inicio de sesión mostrara un fallo.

Un fallo de sincronización de perfil **no demuestra** expiración del token Firebase; por sí solo tampoco demuestra acceso administrativo no autorizado. La interfaz, sin embargo, no puede asumir permisos privilegiados basándose únicamente en una sesión local o en un perfil en caché.

## Corrección

1. Cada nuevo intento de inicio de sesión comienza cerrando la sesión Firebase anterior. Si un inicio de sesión falla después de autenticar, se cierra también la sesión parcial. La ruta “reenviar verificación” hace lo mismo.
2. El guard `app/admin/layout.tsx` no monta **ninguna** pantalla administrativa hasta que `GET /api/admin/session` confirme, en servidor, token válido y rol vigente. El permiso queda vinculado al UID y a la ruta comprobada; se revalida al cambiar de ruta y al recuperar el foco.
3. Si el servidor responde 401, se cierra sesión y se vuelve al login. Un 403 impide acceso a administración. Para 429, 503, errores de red u otra imposibilidad de verificar, se bloquea preventivamente el panel, con opción para reintentar, sin exponer las herramientas.
4. `requireAdmin` y `requireSuperadmin` exigen perfil administrativo vigente en Firestore: un registro inexistente jamás se sustituye por un antiguo claim del token. `requireFirebaseUser` carga el perfil una vez y lo comparte con la verificación de rol; se evitan lecturas Firestore duplicadas en cada llamada.
5. Durante una sincronización diferida de cuenta, el enlace “Admin” no se anuncia hasta recuperar la verificación.

Los endpoints de administración continúan verificando autenticación y autorización en servidor para **cada solicitud**, independientemente del guard visual. El login público con sincronización de perfil diferida no concede autorización de admin.

## Validación requerida

- Sin bearer o con token inválido: `/api/admin/session` devuelve 401 y no muestra el panel.
- Perfil ausente, sin rol, suspendido o degradado: devuelve 403.
- Administrador válido con perfil vigente: devuelve 200; rutas y acciones admin mantienen comprobación de servidor.
- Firestore saturado/HTTP 429: devuelve 503 y el guard oculta completamente el panel.
- Inicio de sesión erróneo tras una sesión administrativa anterior: no conserva acceso administrativo.
- Usuario Firebase válido con `/api/account/sync` diferido: puede navegar contenido público, pero no saltar el guard administrativo.

Comprobar el despliegue real antes de declarar corregida la incidencia en producción; una compilación satisfactoria no demuestra por sí sola la recuperación de Firestore.


## Ajuste de disponibilidad del login (2026-10-07)

La política de cierre preventivo se mantiene para todas las rutas privadas y administrativas, pero un HTTP 503 marcado explícitamente como `retryable` por `/api/account/sync` ya no se presenta como credenciales inválidas ni destruye la sesión Firebase recién autenticada. En ese único caso, el usuario puede continuar al marketplace público con la sincronización marcada como pendiente.

Esto no concede acceso privado: `AccountAccessGate` continúa exigiendo `/api/account/session` antes de montar rutas protegidas y el enlace de administración permanece oculto mientras la sincronización está pendiente. Los errores permanentes de elegibilidad (401/403, correo no verificado, dominio incorrecto o número de control fuera de la ventana permitida) siguen cerrando la sesión.
