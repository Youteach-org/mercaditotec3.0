# 2026-10-16 — Calificación arriba de la nube y collage inclinado para tiendas adicionales

## Solicitud
- En orientación horizontal, el indicador de valoración, que estaba en la parte inferior de la nube, se superponía al texto de descripción. Debe quedar **centrado arriba, completamente dentro de la nube**, sin alterar logo ni descripción.
- Una corrección previa había convertido las tiendas adicionales en una lista recta de ancho completo, sin inclinaciones. El usuario quiere conservar la disposición editorial irregular y la rotación de las tarjetas destacadas, pero que todas las tiendas sean visibles al desplazarse verticalmente, sin amontonamientos.

## Causa
- `app/globals.css`: `@media (max-width: 1100px)` obligaba `flex-direction:column`, `width:100%` y `transform:none`, que eliminaban la composición scrapbook, también en Android con viewport CSS ancho.
- Badge centrado pero `bottom:32%` / `bottom:31%`: se situaba cerca del texto de la tarjeta en orientación horizontal.

## Corrección
- Rating: `left:50%`, `transform:translateX(-50%)`, `top:11%` en escritorio/horizontal y `top:12%` en teléfonos estrechos, con `bottom:auto`; dentro del área fotográfica SVG de la nube de aproximadamente 69–73% de altura. No aparece en el área de texto de descripción.
- Zona `mkt-more-stores` 621–1100 px: cuadrícula de dos columnas con tarjetas de anchuras variadas (85–95%), rotadas ~1.5–2.8°, alineación alternada y offsets verticales **positivos**, dejando separación mediante el grid.
- Zona `mkt-more-stores` hasta 620 px: una tarjeta por nivel vertical por legibilidad, pero con anchuras variables (78–88%), alternancia izquierda/derecha/centro y rotaciones ±1.7–3°; NO una columna recta de tarjetas iguales.
- Espaciado vertical reservado (`row-gap`) y alturas estables: las tarjetas se pueden recorrer hacia abajo sin un carrusel horizontal y sin superponer sus cajas.
- Se conservan las seis destacadas, sus nubes originales, logos a la derecha, privacidad de valoraciones para usuarios conectados, votos y paginación de 12 para tiendas adicionales.
- No hay consultas periódicas ni cambios de datos.

## Archivos y pruebas
- `app/globals.css`
- `app/marketplace/discover-pagination.test.ts`
- `components/store/compact-card-ratings.test.ts`

Asegurar build CI, revisión de reglas y publicación Cloudflare desde `feature/student-stores`.
