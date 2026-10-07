# Avisos rápidos — mini board del cuadro azul

Fecha: 2026-10-07

## Decisión de UX

El cuadro azul existente del Marketplace se conserva en su posición, tamaño, forma y estética scrapbook. No se crea un dashboard ni se reemplaza el diseño del Mercadito.

Dentro del cuadro:
- Se muestra **una sola publicación activa a la vez**.
- Avisos rápidos y objetos encontrados comparten el mismo carrusel.
- Se navega con flechas, teclado o swipe horizontal.
- Se muestra un contador `actual/total`.
- Los objetos encontrados pueden mostrar miniatura y enlazan a `/cosas-perdidas`.
- Las acciones compactas son `+ Aviso` y `+ Encontré algo`.
- Ambas acciones abren un modal dentro del Marketplace.
- `+ Encontré algo` permite foto, título, descripción y ubicación; la imagen se optimiza antes de validar el límite final de 1 MB.
- Las publicaciones encontradas continúan apareciendo en Cosas perdidas y en el mini board.

## Implementación

Archivos principales:
- `components/community/QuickNoticesPanel.tsx`
- `components/community/QuickNoticesPanel.test.ts`
- `app/globals.css`

La fuente de producción continúa siendo `feature/student-stores`.
