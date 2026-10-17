# Descubre: fallos en revisión automática de anuncios
Fecha: 2026-10-17
Rama de destino: `feature/student-stores`

## Incidente reportado
En Publicar, un usuario obtuvo: «La revisión automática no está disponible. Intenta de nuevo más tarde.» al anunciar un control de videojuegos. Sucedió antes del cambio «PON TUS IDEAS A LA VENTA / WhatsApp»; no es una regresión atribuible a ese cambio.

## Diagnóstico responsable
1. `lib/descubre/automaticReview.mjs` capturaba indiscriminadamente excepciones provenientes de la descarga de Supabase o del modelo `@cf/google/gemma-4-26b-a4b-it`, reemplazándolas con el mismo texto. El error concreto del incidente no quedó registrado.
2. La IA estaba invocada con `max_tokens: 180` sin desactivar el modo de razonamiento de Gemma 4; la guía actual de Cloudflare enseña `chat_template_kwargs: { enable_thinking: false }` para respuestas directas.
3. Cloudflare tiene un límite gratuito de 10,000 Neurons diarios; los códigos `3036` (cuota agotada) y `3040` (capacidad saturada) requieren comportamientos distintos, sin contratar un plan de pago.

## Mitigaciones aplicadas
1. Desactivar razonamiento de Gemma 4 e incrementar ligeramente el presupuesto de salida a 240 tokens.
2. Distinguir y registrar **solo la categoría** del error: cuota diaria, saturación, límite temporal, permisos del modelo, foto inaccesible, tamaño excesivo, timeout o salida inválida. No guardar información confidencial, mensajes brutos del proveedor, URLs, identificadores ni fotografías en logs.
3. Comunicar al vendedor un error concreto y acción adecuada. Nunca publicar si el modelo no confirma la coincidencia fotografía/texto y objeto permitido.
4. Añadir pruebas automatizadas de los modos de fallo; conservar los controles existentes sobre alcohol, drogas y vapeadores.

## Límite de confirmación
El incidente histórico no permite demostrar el código exacto que devolvió Cloudflare. Estas correcciones preparan los próximos intentos para identificarlo sin debilitar la moderación. El build no sustituye una prueba de inferencia real con sesión autenticada y fotografía enviada.

## Referencias
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- https://developers.cloudflare.com/workers-ai/platform/errors/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
