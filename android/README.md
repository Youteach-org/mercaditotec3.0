# MercaditoTec Android (realmente nativo)

Cliente Android con **Kotlin + Jetpack Compose**. La interfaz es nativa; **no contiene WebView, Chrome, Trusted Web Activity ni PWA**. El sitio `mercaditotec.store` sigue siendo el backend de producción y no se crean usuarios ni tiendas duplicadas.

## Implementación inicial

- Inicio de sesión institucional con Firebase Identity Toolkit (REST), reutilizando el proyecto Firebase ya existente.
- Comprobación de la cuenta en `POST /api/account/sync` y `GET /api/account/session`. Esta verificación aplica la autorización del servidor, incluidos los criterios de antigüedad institucional y bloqueo.
- Catálogo autenticado de tiendas de `GET /api/marketplace`, con búsqueda local y ficha de tienda nativa.
- Identificación visible de tiendas demostrativas; ninguna se presenta como venta real.
- La sesión solo se conserva en memoria: **no se almacenan tokens en texto plano**. Es un prototipo funcional, no una versión para distribución pública.

El primer build usa Compose BOM 2026.04.01 (Compose 1.11, compatible con SDK 36), porque las librerías 1.12 exigen SDK 37 que no está disponible en el canal estable del runner.\n\n## Compilación y prueba

En el repositorio, el flujo `Build native MercaditoTec Android APK` compila el APK de prueba y lo deja como artifact `mercaditotec-android-nativo-debug`. Android Studio también puede abrir esta carpeta como proyecto Gradle.

## Falta para la app integral

- Acceso de invitados al catálogo con un endpoint de lectura pública auditado.
- Sesión persistente mediante credenciales del SDK nativo de Firebase, con registro de la app Android en Firebase y token refresh.
- Vista Descubre, publicaciones, fotos, catálogo de productos, tienda propia, chat, notificaciones, QR, administración.
- Seguridad, pruebas de integración y accesibilidad de todos los módulos.
- Firma de lanzamiento AAB, ficha y políticas de Google Play.

Las claves del cliente Firebase usadas en la app web son identificadores públicos; **no se integra ni se expone la cuenta de servicio de Firebase**. La autorización siempre se decide en el servidor.
