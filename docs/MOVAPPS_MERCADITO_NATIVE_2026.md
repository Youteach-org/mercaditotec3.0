# Mercadito — proyecto final MovApps (aplicación móvil nativa)

Fecha de arranque: 2026-11-17  
Rama de trabajo: `feature/movapps-mercadito-native`  
Base de trabajo: `feature/student-stores` (fuente del producto web)

## 1. Objetivo y límites

Desarrollar Mercadito como aplicación móvil Android con pantallas y navegación **nativas**, conservando el Mercadito web existente e incluyendo un camino de compilación para iOS. **No usar WebView ni una PWA como sustitutos de las pantallas de la app.** Los proyectos `android/` e `ios/` previos en la rama base están documentados como contenedores híbridos, por lo que no se consideran la entrega nativa.

No alterar la rama de producción, la configuración de despliegue ni los datos reales durante el desarrollo. Trabajar y probar por etapas, con cambios aislados y sin publicar hasta verificar.

## 2. Plataforma

- Interfaz: React Native + Expo, TypeScript. Usar la versión estable de Expo y fijar dependencias compatibles en una instalación verificable.
- Android: build APK instalable y editable desde entorno de desarrollo compatible con Android Studio.
- iOS: misma base React Native para su posterior build y firma.
- Backend: reutilizar servicios y reglas ya existentes (Firebase Authentication, Firestore, servicios API de la web, almacenamiento de imágenes de Mercadito), sin duplicar usuarios, tiendas, pedidos ni chat.
- Red: acceso a los servicios remotos mediante HTTPS; manejo explícito de modo sin conexión.
- Credenciales y permisos: nunca introducir llaves privadas en la app. Auth, roles y validación de operaciones protegidas deben mantenerse en servidor / reglas de seguridad.

## 3. Paridad de funciones (criterio de terminación)

El objetivo NO es una app simplificada. Debe mantener el alcance funcional y la experiencia de Mercadito.

| Módulo | Funciones requeridas |
| --- | --- |
| Acceso | Registro, inicio de sesión, verificación/activación, sesión persistente y cierre |
| Descubre | Feed, publicaciones, fotos, reacciones, comentarios, interacciones sociales y flujo para publicar |
| Marketplace | Explorar tiendas, productos, categorías, búsqueda, detalles, precios y QR |
| Tiendas | Crear y editar borrador completo, horario, logo/portada, hasta cinco fotos por producto, revisión y estado aprobado/correcciones |
| Pedidos | Pedidos/reservas y sus estados, con autorización de usuarios y tiendas |
| Chat | Conversaciones y mensajería con permisos, imágenes y moderación aplicable |
| Notificaciones | Avisos relevantes y navegación al contenido |
| Perfil | Datos de usuario, información pública y ajustes |
| Administración | Revisión de tiendas, avales, reportes, moderación y permisos por rol |
| Experiencia | Navegación móvil, estados de carga/error, accesibilidad, interacción táctil, compartir, cámara, galería |

Se deben cotejar las funciones exactas con la versión de producción, no asumir que una ruta web equivale a una pantalla móvil implementada.

## 4. Inventario inicial verificado en GitHub

En `feature/student-stores` existen rutas `app/descubre`, `app/marketplace`, `app/mystore`, `app/mystores`, `app/sell`, `app/chat`, `app/orders`, `app/notifications`, `app/profile`, `app/admin`, `app/login` y `app/register`. Existen APIs bajo `app/api/descubre`, `app/api/marketplace`, `app/api/marketplace-v2`, `app/api/community-posts`, `app/api/stores`, `app/api/chat`, `app/api/orders`, `app/api/notifications` y `app/api/admin`. El archivo `android/README.md` confirma que la app Android previa utiliza WebView.

La API existente debe auditarse con contratos, autenticación y permisos antes de conectar el cliente móvil; no inferir formato de respuestas a partir de los nombres de ruta.

## 5. Orden de ejecución

1. **Inventario y contratos:** listar pantallas, operaciones, API, flujos autenticados, campos, paginación y permisos; crear matriz web ↔ móvil.
2. **Base nativa comprobable:** proyecto separado `mobile/`; navegación, tema, configuración de API, manejo de errores, sesión segura y una compilación Android de prueba.
3. **Descubre y Marketplace completos:** lectura/escritura autorizada, fotografías, interacción, perfiles públicos, búsqueda, productos y tiendas.
4. **Sesión, perfil y tiendas:** acceso, registro/activación, edición de tiendas y productos, revisión de avales y archivos.
5. **Pedidos y chat:** operaciones de extremo a extremo, carga de medios, privacidad y notificaciones.
6. **Administración y cierre funcional:** controles de rol, revisión, reportes, moderación, QR y funcionalidades pendientes.
7. **Verificación final:** pruebas automáticas, APK en Android físico, reproducción de flujos reales, revisión de permisos y confirmación de paridad; luego preparación de iOS.

## 6. Criterios de aceptación y seguridad

- App compila e instala en Android; una inspección de pantallas confirma ausencia de WebView para la UI principal.
- La prueba utiliza el backend real de manera segura, sin escribir ni borrar datos de producción sin autorización.
- Cada pantalla tiene estados vacío, cargando, error y respuesta ante pérdida de red.
- Sesiones, roles, rutas privadas, fotos, chat y pedidos funcionan de manera controlada.
- Cada avance se documenta con tareas completadas, problemas reales y comprobaciones reproducibles; no declararlo funcional por una mera revisión estática.
- La web de `feature/student-stores` y su despliegue no se modifican inadvertidamente.

## 7. Estado al crear esta rama

Realizado: investigación del repositorio y creación de esta especificación de trabajo.  
No realizado todavía: aplicación React Native, integración de servicios, APK compilado, pruebas en teléfono o iOS.