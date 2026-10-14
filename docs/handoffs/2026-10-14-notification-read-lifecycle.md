# 2026-10-14 — Notificaciones pendientes que no desaparecen

## Síntoma
Las notificaciones leídas seguían mostrándose en /notifications. Al entrar
directamente a la sección correspondiente, sin pasar por la campana, las
notificaciones no se marcaban como atendidas. En Android algunos avisos
podían permanecer en el panel del sistema después de leerlos.

## Comportamiento corregido
- /notifications presenta únicamente notificaciones pendientes (readAt=null).
  El registro de notificaciones leído permanece en Firestore para auditoría;
  no se borra ningún aviso de la base de datos.
- Al tocar un aviso se marca como leído, desaparece de la lista y se navega.
  «Marcar todas» vacía la lista pendiente.
- AppShell reconoce destinos reales (/orders, /mystore/orders, hilos de
  /chat/personal/:uid, tiendas propias, admin/stores, admin/users) y
  solicita a la API que marque como leídos exclusivamente los avisos
  relacionados con el destino abierto directamente.
- Los mensajes privados solo se atienden al entrar al hilo del remitente.
  No se vacían los mensajes ajenos por abrir el listado de conversaciones.
- La API usa el UID verificado por Firebase, filtra el destinatario y
  readAt=null; el cliente nunca puede escoger a quién borrar avisos.
- El contador unreadNotificationCount se sincroniza con los registros
  restantes después de la modificación.
- Se evita mostrar copias heredadas con el mismo dedupeKey; los eventos
  realmente nuevos o distintos no se eliminan.
- Los push de Android reciben notificationId para poder cerrar el aviso
  concreto una vez atendido; los mensajes antiguos sin ID caducarán
  mediante el TTL existente.
- Sin polling periódico adicional del servidor y sin alteraciones al
  diseño del Marketplace.

## Pruebas
- lib/notifications/destination.test.ts
- lib/notifications/read-lifecycle.test.ts
- lib/notifications/read-lifecycle.repository.test.ts
- CI de tests/build de Cloudflare + deploy de rama feature/student-stores.

## Regla
Una petición explícita de cambio se implementa, prueba y publica.
Un reporte consultivo se investiga sin desplegar automáticamente.
