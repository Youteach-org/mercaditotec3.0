# Caché local de fotografías + Cloudflare/R2 (Mercadito Tec 3)

## Estado

Implementado en la rama \`fix/local-image-cache-r2-20261111\`, basada en la **rama real de producción** \`feature/student-stores\`.
**NO fusionar ni activar R2 en producción sin pruebas.** Ninguna imagen ni URL de Firestore se elimina o reescribe.

La aplicación conserva su sistema de subida de imágenes a Supabase (Firebase valida autorización/propiedad mediante la Edge Function). No cambia la seguridad de los chats ni de la información privada.

## Por qué

En la inspección inicial del 11-nov-2026: Supabase tenía ~90.5 MiB distribuidos en 259 imágenes del bucket \`chat-images\`. En una ventana de 24 horas se observaron ~393.78 MiB de descargas, de los cuales ~319.37 MiB correspondieron a fotos de productos. La cuota crítica es **egress**, no capacidad de almacenamiento.

## Arquitectura

1. La aplicación **conserva** el URL Supabase de la foto en Firestore. \`publicStoreImageSrc()\` solamente transforma la URL de *visualización* cuando corresponde a una foto pública de tienda.
2. El navegador solicita \`/media/stores/<dueño>/<tienda>/products/<producto>/<archivo>\` (o \`logo/\` o \`cover/\`).
3. El Service Worker \`/mercadito-media-sw.js\`, una vez instalado, devuelve fotos previamente guardadas en el dispositivo. Se limita a 160 imágenes y al espacio disponible; evita guardar chats, perfiles, APIs o contenido privado.
4. Si la foto no está guardada, el Worker de Cloudflare comprueba su **caché de borde**. Si hay binding \`STORE_MEDIA_R2\`, consulta R2. Si no está en R2, recupera desde el bucket público original de Supabase.
5. Con un binding R2 activo, una foto pública recuperada de Supabase se **copia progresivamente** a R2 en segundo plano, sin modificar el documento Firestore y sin interrumpir al usuario.

Los nuevos archivos **siguen subiendo inicialmente a Supabase** hasta que se construya y pruebe una ruta de subida directa autorizada para R2. Después de la primera vista, se copian a R2 cuando haya binding. No eliminar Supabase ni sus archivos todavía.

### Seguridad

- Solo se aceptan rutas de **fotografías de tiendas** y extensiones jpg/jpeg/png/webp/gif, con segmentos de ruta restringidos.
- El proxy no maneja chats, fotos de perfiles, archivos privados ni peticiones con parámetros arbitrarios.
- Solo hay GET/HEAD para servir imágenes. No se exponen claves de administrador, tokens ni escrituras públicas.
- La caché local no almacena documentos HTML, respuestas JSON ni información de sesiones.
- Las imágenes cambian de ruta/nombre cuando se reemplazan, evitando devolver una fotografía desactualizada.
- El navegador puede expulsar datos de caché si falta espacio: el sistema recurre a la red.

## Activación gradual de R2 (pendiente de acceso a la cuenta Cloudflare)

**No existe todavía un bucket R2 confirmado por esta implementación.** No se agregó binding a \`wrangler.jsonc\`, porque hacerlo antes de crear el bucket podría romper los despliegues.

1. Entrar a la cuenta Cloudflare que aloja \`mercaditotec3-0\`, abrir R2 Object Storage y verificar si R2 está habilitado y sus condiciones de facturación. Crear un bucket privado, por ejemplo \`mercaditotec-store-media\` (o usar CLI autenticada: \`npx wrangler r2 bucket create mercaditotec-store-media\`).
2. Cuando el bucket exista, agregar al archivo \`wrangler.jsonc\` del Worker de la aplicación:

   \`\`\`json
   "r2_buckets": [
     {
       "binding": "STORE_MEDIA_R2",
       "bucket_name": "mercaditotec-store-media"
     }
   ]
   \`\`\`

3. Desplegar la rama de **pruebas** en un Worker de prueba, no en el Worker de producción. Comprobar una foto desde R2 y otra no migrada desde Supabase. El fallback nunca debe devolver una imagen privada.
4. Copiar en una segunda etapa el inventario restante desde \`storage.objects\` (solo prefijo \`stores/\`) manteniendo claves, MIME y tamaño, contrastando conteo, bytes e imágenes legibles. La copia progresiva cubre solo objetos que se visiten.
5. Verificar que los archivos nuevos subidos a Supabase aparecen en R2 después de su primera consulta. Mantener el respaldo durante el periodo de observación.
6. Comparar **Cached Egress** y egress total de Supabase durante 7-30 días antes de cambiar cualquier infraestructura de subida. La cuota ya consumida este ciclo no desaparece inmediatamente.

Para subir manualmente una imagen (ejemplo, siempre desde una sesión Cloudflare autenticada y verificada):

\`\`\`bash
npx wrangler r2 object put mercaditotec-store-media/stores/owner/store/logo/photo.webp --file ./photo.webp --content-type image/webp --remote
\`\`\`

No poner tokens, URLs privadas o manifiestos con identificadores reales de estudiantes en el repositorio público.

## Pruebas antes de publicar

Ejecutar \`npm ci && npm test && npm run lint\` y la compilación de Cloudflare ya usada por el proyecto. Probar en Chrome Android, Safari iOS y escritorio:

- En primera visita, una foto carga desde el origen.
- Tras cerrar/reabrir la web, la misma URL se sirve localmente y no genera otra descarga de Supabase.
- Una imagen nueva (nombre nuevo) se descarga sin recargar fotos anteriores.
- Después de borrar la caché del navegador, todo vuelve a cargar normalmente.
- Fotografías de chat, perfiles y solicitudes API jamás son almacenadas por este Service Worker.
- En conexiones lentas, imágenes fuera de pantalla no se solicitan antes de desplazar el catálogo.
- Ante error del proxy, las vistas de catálogo vuelven al URL original de Supabase.
- Un bucket R2 vacío deja visibles los productos gracias al fallback.
- Repetir las pruebas de seguridad, ventas, edición de tienda, disponibilidad, moderación y login.

## Reversión

La versión de producción queda sin tocar hasta aprobar el PR. Revertir código de proxy y registro del Service Worker no cambia registros de Firestore, ni elimina archivos de Supabase. Al cambiar la implementación del Service Worker, incrementar su versión de caché para limpiar versiones antiguas. Conservar el origen Supabase disponible hasta completar y verificar la migración.

Referencias técnicas: Cloudflare R2 Workers API, configuración de bindings, Cloudflare Workers Cache API y políticas de almacenamiento de Service Workers.
