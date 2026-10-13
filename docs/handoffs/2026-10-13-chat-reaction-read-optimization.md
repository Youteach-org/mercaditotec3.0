# Mercadito · Optimización de reacciones del chat (2026-10-13)

PR: #120
Producción: rama `feature/student-stores`, jamás `main`.
Auditoría de escalabilidad: #117.

## Motivo
El chat general tenía un listener global `message_reactions` de 500 documentos **por sesión** que se abría incluso cuando no había mensajes legacy que lo necesitaran. A miles de usuarios su coste inicial multiplica las lecturas de Firestore.

## Implementación compatible
- Mensajes nuevos: `reactionSummaryVersion=1` y `reactionCounts` por emoji en `messages/{id}`, creado directamente en `createGeneralChatMessage`.
- El servidor conserva el documento individual `message_reactions/{sha256(uid,messageId)}`, como fuente de la reacción propia, y actualiza contadores del mensaje con una **transacción única**. Alternar emoji, deshacer y cambiar emoji actualiza ambos de manera coherente.
- La interfaz recibe el contador en el listener existente de `messages` y solo escucha los documentos con `userId == uid` para identificar las reacciones del alumno.
- **Mensajes anteriores:** quedan sin `reactionSummaryVersion` y mantienen su listener global de reacciones. Este listener solo se conecta mientras haya al menos un mensaje legacy visible de los últimos 48h; se desconecta automáticamente después. Así no se borra ni se reescribe información histórica, y los dispositivos con versiones previas continúan recibiendo los registros habituales hasta finalizar su transición.
- Los permisos Firestore/Auth no cambian; los clientes no pueden editar sus propios contadores.
- Pruebas específicas de sumar, cambiar, quitar, normalización de valores, fallos de emoji, legacy y gating UI.

## Consideraciones de operación
- La optimización mayor entra en vigor cuando no quedan mensajes legacy visibles (ventana de retención 48h) y solo los mensajes nuevos versionados dominan el chat.
- Cada reacción nueva escribe un documento adicional (el contador), y el documento de mensaje recibe cambios publicados a todos los observadores. Medir latencia y tasa de contención bajo un mensaje viral; si se vuelve hotspot, migrar a contadores distribuidos o agrupación por intervalos.
- El listener `where(userId == uid)` está limitado a 500 por usuario, suficiente bajo la retención de 48h habitual; observar actividad superior y añadir paginación personal si se alcanza.
- Reducir lecturas iniciales **no garantiza** que Workers Free ni Firestore Free soporten 5,000 usuarios interactivos. Mantener las pruebas de carga y límites de la auditoría #117.

## Publicación
1. Revisar CI Vitest, Next.js/OpenNext, reglas Firebase y verificación Worker.
2. Fusionar #120 solo en `feature/student-stores`.
3. Confirmar Cloudflare `Deploy production Worker` y `Verify production application` ambos exitosos.
4. No ejecutar migraciones destructivas ni limpiar historiales fuera del cron ordinario de retención.

## Próximo cuello de botella
Reducir errores CPU/resource-exceeded 1102, perfilando rutas Next/OpenNext y quitando trabajo duplicado; luego test de 5,000 sesiones sintéticas en entorno controlado.
