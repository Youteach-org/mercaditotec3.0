# 2026-10-13 — Carrusel móvil de tiendas no destacadas

## Problema
En /marketplace, la sección «Más tiendas de la comunidad» aplicaba en teléfonos
un flex en columna junto con anchos y márgenes alternados por nth-child. Esto
amontonaba las tarjetas bajo el collage de seis tiendas destacadas y dificultaba
recorrerlas con el dedo.

## Cambios
- En <=620px, el contenedor de tiendas adicionales ahora es una fila horizontal
  desplazable mediante gestos táctiles (overflow-x: auto).
- scroll-snap presenta una tarjeta por desplazamiento y deja asomar la siguiente.
- Una regla más específica anula los tamaños variables, giros y márgenes negativos
  heredados de las seis posiciones del collage, solo en las tiendas adicionales.
- El contenedor es accesible mediante teclado y está identificado para lectores
  de pantalla.
- Al cambiar de página, búsqueda o categoría, se restablece la posición horizontal.
- Se conserva el límite de 12 tiendas por página, los enlaces/fotos y las seis
  tiendas destacadas; no hay cambios a la vista de escritorio/tablet.
- Se agregó cobertura en app/marketplace/discover-pagination.test.ts.

## Archivos
- app/globals.css
- app/marketplace/page.tsx
- app/marketplace/discover-pagination.test.ts

## Publicación
Rama de trabajo: fix/mobile-community-stores-swipe-20261013
Rama objetivo/Cloudflare: feature/student-stores.
No desplegar desde main.
