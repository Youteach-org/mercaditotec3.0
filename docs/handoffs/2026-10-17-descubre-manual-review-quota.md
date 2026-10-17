# Mercadito — revisión manual de respaldo por cuota gratuita agotada
Fecha: 2026-10-17
Rama de destino: `feature/student-stores`

## Reglas aprobadas
1. Fotos: `prepareImageForUpload` y `uploadImageFile` aseguran **máximo 1 MiB** por foto (1,048,576 bytes) antes de subirla a Supabase. La imagen no reside en Firebase. Las imágenes que ya caben no necesitan volver a comprimirse.
2. La inferencia multimodal `screenListing` está conectada únicamente al POST autenticado `/api/descubre/anuncios` en el runtime Cloudflare, después de guardar un borrador privado. No se ejecuta en aperturas de páginas, consultas de tarjetas, notificaciones o render de productos.
3. Solo un fallo **3036 / cuota diaria gratuita agotada** pasa a `manual_review`. Fallos de imagen, desconexión, saturación 3040, salida ambigua o productos prohibidos NO se aprueban ni se derivan automáticamente como producto permitido.
4. El anuncio sigue invisible para los usuarios mientras esté en `manual_review`; `isVisibleListing` exige `approved`.
5. Se crea una alerta únicamente a perfiles con permisos efectivos **superadmin**, con destino `/admin/descubre`. La búsqueda es por roles indexables, **nunca escanea los primeros 250 usuarios**. No hay polling.
6. En `/admin/descubre` hay fotografía ampliable, título, descripción, precio, ubicación y aprobar/rechazar. Backend protege la lectura y ambas acciones con `requireSuperadmin`; los rechazos requieren motivo. Los cambios de estado se realizan en transacción y no pueden repetirse.
7. Se registra una entrada de auditoría y se avisa al vendedor. La duración de su anuncio se comienza a contar en la aprobación, no en el momento del fallo de cuota; el catálogo se invalida y refresca tras una aprobación manual.
8. El usuario que publica recibe `manual_review` como resultado exitoso del envío y puede consultar el estado desde Mis anuncios, sin volver a cargar su imagen.
9. **Limitación preexistente:** el backend de productos internos de tiendas guarda nuevos productos sin conectar aún el clasificador multimodal. El catálogo Descubre excluye productos recientes sin aprobación. Esta PR solo cambia el envío de anuncios independientes, el flujo afectado por el incidente del control de videojuegos. No declarar cobertura multimodal completa para productos de tienda hasta que se implemente.

## Verificaciones
- Pruebas: cuota -> revisión manual; saturación/error ordinario -> no aprobación; protección de ruta /api/admin/descubre, decisión y notificación; controles ya existentes de prohibiciones.
- El mecanismo de notificación existente intenta enviar push y actualiza `unreadNotificationCount` del perfil sin consultar periódicamente Firebase.
- No requiere Cloudflare Blaze ni plan pagado, no agrega lecturas al abrir Descubre, no expone imágenes a usuarios no autenticados.
