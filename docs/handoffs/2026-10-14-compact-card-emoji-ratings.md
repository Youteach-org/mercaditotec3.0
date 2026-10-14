# 2026-10-14 — Calificaciones discretas sobre tarjetas del Mercado

## Corrección solicitada después del sistema de cinco emojis (PR #129)
El usuario proporcionó captura de una página de tienda con un panel rosa de
calificaciones que ocupa demasiado espacio. Pidió quitar el panel grande,
conservar solo el resumen o estadísticas en esa página y trasladar la
interacción con emojis a las tarjetas del Mercado, exclusivamente cuando el
visitante haya iniciado sesión.

## Resultado
- Ficha de tienda: chip discreto con emoji predominante y promedio/recuento
  reales, o «Sin valoraciones». No muestra selector ni barras de distribución.
- Tarjetas de Marketplace: chip compacto visible **solo para usuario
  autenticado, tiendas reales**; pulsarlo abre un selector pequeño de cinco
  emojis (😡 😕 🙂 😊 😍). Es posible votar y modificar el voto.
- Tiendas de demostración y visitantes sin iniciar sesión: no se muestra
  ningún botón ni calificaciones falsas.
- El botón se renderiza como hermano del enlace de cada tienda, nunca dentro
  del enlace, manteniendo la navegación y el visor de fotos.
- La consulta personalizada de la calificación se realiza solo al pulsar
  el botón; no se lanzan decenas de solicitudes al abrir Marketplace.
- Se conserva el sistema existente de valoración atómica por UID, un voto
  por tienda y la prohibición de autocalificarse; no modifica el backend.

## Archivos
- components/store/StoreEmojiRating.tsx
- app/marketplace/page.tsx
- app/marketplace/stores/[slug]/page.tsx
- app/globals.css
- components/store/compact-card-ratings.test.ts

## Publicación
Rama de integración y producción: feature/student-stores en Cloudflare.
Petición explícita de cambio: publicar tras validar compilación.
