# 2026-10-14 — Calificaciones por emojis para tiendas

## Decisión de producto (autorizada)
Las tiendas reales se valoran en escala 1–5 con cinco emojis:
1 😡 Mala experiencia; 2 😕 Podría mejorar; 3 🙂 Está bien;
4 😊 Muy buena; 5 😍 ¡Me encantó!

Cada cuenta puede registrar una valoración por tienda y cambiarla. Los
propietarios no pueden autocalificarse. En Marketplace se muestran emoji
predominante, promedio sobre 5 y número de votos; en tienda aparecen también
la distribución y los cinco botones para seleccionar o cambiar reacción.
El frontend y las respuestas públicas nunca muestran el UID del propietario.

## Modelo de datos
- Cada documento `stores/{storeId}` incluye `ratingStats` con
  `count`, `total` y `distribution` (cinco enteros).
- `stores/{storeId}/ratings/{uid}` persiste la única valoración por cuenta,
  UID, tienda, momento original y última actualización.
- POST /api/marketplace/store-ratings/[storeId] exige usuario no bloqueado;
  GET requiere usuario autenticado. La propiedad de la tienda se comprueba
  en servidor, nunca usando datos suministrados por el cliente.
- Transacción Firestore actualiza valoración y agregados en conjunto y marca
  `public_marketplace_cache/catalog-v2` para actualización posterior.
- Misma valoración repetida no añade votos ni provoca escrituras.
- Se muestran resultados en tiempo real en la ficha de la tienda tras votar;
  las tarjetas usan catálogo materializado con breve demora normal de caché.

## Rendimiento y seguridad
- Sin lecturas de valoraciones individuales al listar Marketplace.
- Solo las fichas de tienda consultan la reacción de la cuenta autenticada.
- El catálogo recupera resúmenes del mismo documento de tienda.
- Sin datos de identidad pública ni Firebase client writes directos.
- Se mantienen las tiendas demo como demostraciones (no reciben votos reales).

## Despliegue
Rama de producción: `feature/student-stores`, Cloudflare Worker (no Vercel).
Cambios pedidos explícitamente se implementan y publican tras pruebas;
menciones de problemas sin una solicitud de modificación solo se investigan.
