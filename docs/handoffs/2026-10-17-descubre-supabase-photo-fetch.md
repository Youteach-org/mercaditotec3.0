# Descubre — fallo al recuperar imagen de Supabase (17 de octubre de 2026)

## Incidente observado
Al intentar publicar un control de videojuegos, luego de que la foto ya estaba subida al bucket público de Supabase, el usuario vio: «No se pudo descargar la fotografía para revisarla. Intenta de nuevo más tarde.» La falla ocurrió antes de llamar a Workers AI. No es evidencia de agotamiento de Neurons.

## Configuración comprobada
- Proyecto de Supabase: `wfmokinfcypfpdisussw`.
- Bucket `chat-images`: `public = true`, `file_size_limit = 1048576` bytes (1 MiB).
- La aplicación sube las fotos desde el cliente al storage antes del `POST /api/descubre/anuncios`.
- El Worker hacía un `fetch` de esa URL con `redirect: "error"` y un timeout de 12 segundos, que podía fallar antes del análisis.
- La causa final exacta de la excepción histórica no está confirmada. Los logs originales no registraban el tipo de fallo de transporte de forma diferenciada.

## Cambios
1. Mantener la verificación estricta de origen y ruta de la foto antes de tocar la red.
2. Usar `redirect: "follow"` en el GET de Supabase sin pasar claves, tokens, cookies ni Authorization; permite el CDN del proveedor.
3. Aumentar el tiempo permitido a 20 segundos por intento. Reintentar **solo una vez** ante fallos de conexión y HTTP temporales. Una publicación normal que funciona a la primera sigue efectuando exactamente **una descarga** y **una invocación de IA**.
4. Limitar por cabecera y bytes reales la imagen de revisión a máximo 1 MiB; rechazar archivos inválidos, falsos y fotos faltantes (403/404). No aprobar de forma automática un producto sin analizar su foto.
5. Si persiste un problema de transporte (tras reintento) con una ruta Supabase permitida, guardar como `manual_review`, sin mostrar en Descubre, y notificar a superadministradores mediante la cola ya existente. Su revisión es humana sin consumir Neurons; el plazo del anuncio comienza tras aprobación.
6. Ajustar el motivo mostrado a publicador, administrador y la notificación para que no diga «agotamiento de IA» cuando el problema fue recuperar la fotografía.
7. No ejecutar IA en navegación, búsquedas, apertura de productos ni páginas de administración. No añadir un servicio de pago ni escrituras/polling recurrentes.

## Validación
- Pruebas unitarias: descarga con redirección admitida, ausencia de credenciales, error de red transitorio con un solo reintento, red caída que deriva a manual sin invocar IA, 403/404 y archivo grande rechazados.
- El build GitHub Actions de Cloudflare comprueba proyecto, reglas Firebase y Worker; una prueba real de publicación autenticada sigue siendo necesaria para verificar el trayecto entre proveedores tras el despliegue.
