# MercaditoTec: revisión IA — formato de respuesta y anuncios inciertos
Fecha: 2026-10-17
Destino: `feature/student-stores`

## Incidente
El usuario intentó publicar un **control de videojuegos**. Tras reparar descarga de Supabase el formulario mostró «No pudimos identificar con seguridad el producto. Cambia la foto o la descripción.» Sin embargo, ese mensaje se aplicaba tanto a `UNCERTAIN` como a respuestas JSON que el parser no lograba reconocer. No hay registro del contenido exacto de la respuesta histórica: no es correcto afirmar que el modelo no reconoció el control.

## Correcciones
- El parser acepta exclusivamente un objeto JSON completo: `choices[0].message.content` de la salida nativa de Gemma 4 (ver https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/), `choices[0].message.parsed`, `{ response }` en formato cadena u objeto y un solo bloque Markdown ```json` cerrado, así como un único elemento de texto de contenido multimodal.
- Mantiene validación estricta para autoaprobar: `decision=APPROVE`, `matchesText=true`, `containsProhibited=false`, `item` reconocible y `confidence>=0.90`; `finish_reason=stop` si fue informado.
- Bloquear directamente por IA exige `decision=BLOCK` y `containsProhibited=true`; las coincidencias prohibidas por texto siguen bloqueadas antes de llamar a IA.
- Si el modelo devuelve `UNCERTAIN`, salida inválida, inconclusa o truncada, el anuncio privado pasa a `manual_review`, no a `needs_changes`. La notificación de superadmin y la cola de administración ya existentes manejan ese estado; nunca se publica automáticamente contenido no verificado.
- Registro diagnóstico seguro: categoría `invalid-model-response` (o `uncertain-model-decision`) y `finish_reason` de enumeración fija, sin texto del usuario, fotos, URL de foto, cuentas ni respuesta de IA.
- Pruebas específicas para control de videojuegos, JSON nativo de Cloudflare, bloque ```json`, respuesta preparseada, salida incierta, truncada, confianza baja y decisión de bloqueo.
- No modifica compresión, límite 1 MiB, Supabase, modo gratis, número de inferencias ni el disparador exclusivo de IA al publicar un anuncio independiente.

## Pendientes
- Confirmar con un anuncio autenticado real: las pruebas unitarias utilizan respuestas simuladas y el build no realiza inferencias facturables de Workers AI.
- La verificación multimodal de publicaciones recientes de tiendas sigue siendo una tarea separada y no debe proclamarse implementada.
