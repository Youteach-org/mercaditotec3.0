# MercaditoTec — Compartir QR en Windows (2026-10-19)

## Reporte
En Windows, el botón «Compartir QR» del popup no funcionaba. El componente dependía exclusivamente de `navigator.share({ files })` y de `navigator.canShare({ files })`, ausentes o limitados en Windows/Brave/Chrome de escritorio. El botón solo mostraba un mensaje sin ejecutar ninguna acción alternativa.

## Comportamiento corregido
- **Android o navegador compatible**: enviar el PNG con logo a la hoja nativa de compartir (`navigator.share({ files: [png] })`) como antes, sin generar el canvas durante el clic.
- **Windows/desktop sin Web Share para archivos**: copiar el PNG real del QR al portapapeles de imágenes mediante `navigator.clipboard.write([new ClipboardItem({ "image/png": file })])`. Mostrar «QR copiado como imagen» e indicar pegarlo en WhatsApp Desktop, correo o mensajería con **Ctrl+V**.
- **Clipboard API bloqueada o no disponible**: disparar la descarga del PNG mediante un enlace Blob local, con mensaje explicativo. No se queda en un botón que simplemente avisa que no funciona.
- **Cancelación nativa**: no descargar/copiar contra la voluntad del usuario si canceló el diálogo.
- **WhatsApp (enlace)** sigue enviando únicamente la URL, como claramente indica su botón; no se anuncia falsamente que adjunta la imagen.
- Conserva el popup accesible montado en `document.body`, QR independiente para la portada y cada tienda, logotipo central (de tienda o el oficial del sitio), botón Descargar PNG y Copiar enlace.

## Rendimiento y seguridad
Sin backend, servicio de pago, imagen adicional en Supabase/Firebase ni llamadas a API para compartir. El PNG se prepara al abrir el popup, para conservar la activación de usuario cuando se hace clic en Compartir. Revocación de URL temporal tras 30 s, dando margen al navegador de escritorio para iniciar la descarga.

## Pruebas
`lib/qr/shareQrImage.test.ts`: compartir nativo, Windows sin compartir archivos (clipboard), clipboard denegado (descarga), sin API de compartir (descarga), cancelación por usuario y `canShare` defectuoso. Luego compilación Next/OpenNext y verificación Firebase CI.
