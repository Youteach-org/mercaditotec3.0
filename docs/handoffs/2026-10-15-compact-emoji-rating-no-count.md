# 2026-10-15 — Calificaciones con emoji y entero, sin conteo

## Problema reportado
En la tarjeta del Marketplace la calificación aparecía, por ejemplo, como
«😍 5.0/5 · 1». El usuario pidió eliminar expresamente el número de
votantes y evitar fracciones o decimales. La tarjeta debe ser discreta.

## Implementación
- Tarjetas de tienda con sesión iniciada: «😍 5» (o emoji y número
  entero correspondiente). Sin «/5», decimales ni número de votantes.
- Resumen en ficha de tienda: exactamente el mismo formato compacto.
- La calificación pública se redondea al entero más cercano entre 1 y 5;
  el emoji corresponde a ese entero para evitar contradicciones visibles.
- Tiendas sin votos: se mantiene «Calificar» en tarjetas y
  «Sin valoraciones» en ficha, sin inventar datos.
- Internamente Firebase conserva promedio preciso, número y distribución
  para futuras estadísticas y para permitir cambios de valoración.
- Sin cambios en estructura de datos, autorización, votos existentes,
  navegación, ni disponibilidad del botón solo a usuarios autenticados.
- Pruebas de regresión de formato y redondeo.

## Archivos
- lib/store/storeRating.ts
- components/store/StoreEmojiRating.tsx
- lib/store/storeRating.test.ts
- components/store/compact-card-ratings.test.ts

Se integra tras CI a feature/student-stores con despliegue Cloudflare.
