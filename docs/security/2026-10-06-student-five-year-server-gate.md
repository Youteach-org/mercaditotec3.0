# Bloqueo de cuentas con número de control fuera de los últimos cinco años

## Incidencia y causa

El formulario de registro comprueba la antigüedad del número de control en el navegador, pero esa comprobación no constituye autorización: una persona puede intentar usar directamente la API de Firebase Authentication, conservar una sesión previa o llamar a los endpoints fuera de la interfaz. El código previo permitía mantener una sesión Firebase si la sincronización de perfil fallaba con HTTP 503, y el guard visual de las páginas privadas solo comprobaba la existencia de `firebaseUser`.

## Regla efectiva

La elegibilidad se verifica en **cada petición privada** con el ID token Firebase firmado, no con un email o rol proporcionado por el navegador. El backend exige:

1. Token válido, vigente y no revocado, correo institucional `@morelia.tecnm.mx` y correo verificado en Firebase.
2. Documento de perfil existente en Firestore y cuenta activa.
3. Para estudiantes ordinarios, parte local formada por una o más letras y exactamente ocho cifras de control. Los primeros dos dígitos representan el año de ingreso 20XX. El año debe estar entre `año del servidor - 5` y el año actual, **ambos incluidos**. En 2026, el rango aceptado es **2021–2026**.
4. Solo el perfil administrativo **ya existente y registrado en Firestore** mantiene la excepción previa al formato/rango de control. No bastan flags del navegador ni claims antiguos en el token. Un estudiante que figure como `role: "user"` nunca recibe dicha excepción.

Si no existe perfil o falla la consulta de Firestore: **denegar o suspender**, nunca conceder acceso por disponibilidad de una sesión en el navegador.

## Cambios implementados

- `lib/store/auth.ts`: no hay fallback a claims antiguos ni entrada sin documento; todas las APIs protegidas usan `requireFirebaseUser`, `requireUnblockedUser`, `requireAdmin` o `requireSuperadmin`.
- `app/login/page.tsx`: retirar la autorización diferida cuando falla `/api/account/sync` con 503; cerrar la sesión Firebase parcial ante cualquier rechazo.
- `app/api/account/session/route.ts`: comprobación de autorización autenticada, con `Cache-Control: no-store`.
- `components/AccountAccessGate.tsx`: permite solo páginas públicas sin pasar la verificación y bloquea **todas las páginas privadas** cuando el backend devuelve 401/403/429/503 o la conexión falla. Ante un rechazo 401/403 elimina la sesión local.
- `firestore.rules`: lectura del propio perfil sujeta a elegibilidad; los mensajes y chats ya comprobaban `studentMayEnter`.
- `storage.rules`: las lecturas de perfil en Firebase Storage (almacenamiento heredado) también exigen una cuenta elegible, no solo un token Firebase.
- Pruebas de límite de antigüedad, perfil inexistente, claims de administrador obsoletos y acceso directo por Firebase REST/código cliente.

## Límites y operaciones

Firebase Authentication puede seguir validando técnicamente el par correo/contraseña si la cuenta aún existe en ese proveedor: el filtrado real se implementa en Mercadito, su backend y las reglas de Firestore/Storage. No afirmar que este filtro impide que Firebase emita un token; lo que bloquea es la **entrada y acceso a recursos privados del sistema**.

Las reglas `firestore.rules` y `storage.rules` requieren despliegue **independiente** a Firebase; el despliegue del Worker a Cloudflare por sí solo no publica reglas de Firebase.

Verificar también en producción:

- estudiante verificado de 2020 o anterior (en 2026): acceso **403** en `/api/account/session`, `/api/profile`, `/api/orders` y demás APIs privadas; Firestore rechaza lectura de perfil y chat;
- estudiante de 2021: permitido en 2026;
- administrador existente con rol real: permitido si el resto de requisitos se cumple;
- perfil inexistente o email verificado falso: acceso rechazado;
- Firestore 429: el login falla cerrado, páginas privadas bloqueadas, nada de fallback.
