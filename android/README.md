# MercaditoTec — aplicación Android completa (contenedor híbrido)

> IMPORTANTE: la aplicación Android **no es una interfaz reimplementada en Kotlin**. Abre el MercaditoTec web real en `https://mercaditotec.store/descubre` dentro del componente Android WebView, sin interfaz de Chrome. Por tanto conserva todas las rutas y la lógica del sitio que esté desplegada: Descubre, Marketplace, productos, publicar, chat, tiendas, órdenes, perfil, administración, categorías y QR. La interfaz **no es 100 % nativa** y requiere conexión.

## Integraciones nativas
- Navegación completa del sitio; enlaces internos en la app y externos (WhatsApp, mailto, otras webs) al sistema
- Historial con botón Atrás de Android
- Selector de documentos/fotos, con cámara opcional mediante `FileProvider`
- Descargas al sistema
- Cookies y DOM storage persistentes para el login Firebase desde el mismo origen
- HTTPS exclusivo, navegación principal limitada al dominio, errores TLS bloqueados y pantalla offline con reintento
- Sin credenciales hardcodeadas ni acceso directo a Firestore; el servidor web sigue validando permisos

## APK
`Build complete MercaditoTec Android app` produce el artifact `mercaditotec-completo-android-debug`. Es un APK de prueba y no está publicado en Google Play.

## iOS
La implementación homóloga está en `ios/` (WKWebView, historial por gestos, selección de archivos/cámara, descargar/compartir, enlaces externos, reintentar). Requiere Xcode/macOS y firma Apple para un dispositivo físico.

## Validación pendiente en dispositivos reales
Comprobar login institucional, sesión después de cerrar/abrir, chat en vivo, selección de fotos, QR, flujos de pedidos y permisos por rol. No declarar entrega final hasta probar estas funciones. El código reutiliza TODA la web, pero eso no implica que cada interacción esté ya validada en WebView/WKWebView. Publicar iOS exige respetar la política 4.2 de Apple (una app debe aportar valor superior a una web empaquetada).
