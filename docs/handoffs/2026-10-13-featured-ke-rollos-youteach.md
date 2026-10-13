# Mercadito: seis tiendas destacadas — Ke-Rollos! y YouTeach
13 de octubre de 2026

## Regla exigida
- `Ke-Rollos!` (tienda pública actual: `k-rollos`) ocupa **siempre una de las seis posiciones destacadas** al estar activa y visible en el catálogo. Su posición no es fija: rota a diario.
- `YouTeach` tiene **la misma prioridad configurada desde ahora**, aunque aún no esté terminada. Cuando esté aprobada y publicada, entra automáticamente entre las seis sin otra edición ni permiso manual.
- No se publican borradores ni tiendas pendientes de aprobación; no se muestra una tienda falsa de YouTeach.
- Las demás tiendas continúan visibles en la sección adicional y buscables; ninguna se elimina. Las tiendas de demostración solo ocupan posiciones principales cuando no hay suficientes tiendas reales para completar seis.
- Los cambios diarios de posiciones usan el día local `America/Mexico_City`, sin fluctuaciones en cada refresco; búsqueda y filtros muestran solamente sus coincidencias.

## Por qué fallaba
- La rama de producción `feature/student-stores` aún usaba `filteredStores.slice(0, 6)`: las seis primeras por orden del catálogo (alfabético), sin preferencias.
- El PR #100, que intentó recuperar la regla, **no se había fusionado**. No aplicar aquel PR desactualizado completo: contiene cambios visuales ajenos que podrían revertir mejoras de producción.
- Los logs públicos de verificación del despliegue de Cloudflare del 13/oct (`run 38444932530`) muestran la tienda activa `Ke-Rollos! [k-rollos]` detrás de siete tiendas; YouTeach no figura entre las tiendas públicas.

## Implementación
- `lib/store/featuredMarketplace.ts`: ordenamiento puro y predecible, con dos reservas, preferencia real antes que demo y rotación diaria de seis posiciones.
- `app/marketplace/page.tsx`: aplica el orden nuevo **antes** de separar los primeros seis de las tiendas adicionales, manteniendo la UI, tarjetas, imágenes y funcionalidades.
- Pruebas cubren 30 fechas, coincidencias de nombres/slugs, YouTeach aún no publicada, alta futura automática, prioridad de tiendas reales, ninguna pérdida/duplicación, variación diaria y respeto a filtros.

## Publicación
- Integrar solo mediante PR revisado con CI exitoso en `feature/student-stores` y comprobar el despliegue Cloudflare. Nunca desplegar de `main`.
- No ejecutar escrituras manuales en Firebase ni cambiar estados de revisión de tiendas.
