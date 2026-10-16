# 2026-10-15 — Calificación al borde inferior real de la nube

## Solicitud
La corrección anterior dejó la calificación aproximadamente a media altura de la nube. El usuario aclaró que debe aparecer **abajo**, centrada sobre el borde inferior de la nube sin tapar el logo de la tienda.

## Corrección
- Antes: bottom 46% en escritorio y 48% en teléfono, equivalentes a 54% y 52% del alto de la tarjeta.
- Ahora: bottom 32% en escritorio y 31% en teléfono, equivalentes a 68% y 69% del alto, correspondientes al borde inferior de las nubes, cuya área gráfica mide aproximadamente 69–73% de la tarjeta.
- Se mantiene left 50% con translateX(-50%) para alineación horizontal central.
- El logo se mantiene a la derecha en su lugar, con z-index 95 por encima del badge z-index 90; nunca debe quedar tapado.
- Las seis tarjetas destacadas y las adicionales comparten el mismo ajuste.
- No se cambia el formato emoji + entero, el sistema de valoraciones, Firebase ni el login.
- Test de regresión para anclajes desktop/móvil y prioridad visual del logo.

## Entrega
Rama feature/student-stores, despliegue Cloudflare automático tras CI y merge.
