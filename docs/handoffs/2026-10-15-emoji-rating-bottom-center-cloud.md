# 2026-10-15 — Badge de calificación al centro inferior de la nube

## Solicitud
Las calificaciones (emoji + número entero, sin /5 ni conteo) estaban superpuestas a los logos de las tiendas al aparecer a la derecha sobre la nube. El usuario pidió explícitamente que estén en el centro de la parte inferior de la nube, sobre ella, sin tapar el logo.

## Cambio
- Solo cambia CSS de la calificación, manteniendo DOM, consultas, votos y Firebase.
- La calificación queda centrada horizontalmente (left:50% y translateX(-50%)).
- Se ancla a la porción inferior de las nubes, un poco por encima del logo:
  bottom 46% en escritorio/tableta y 48% en teléfono. El centro de la nube ocupa la porción inferior del área fotográfica con altura habitual de aproximadamente 69–73% de la tarjeta.
- Logo sigue a la derecha donde ya estaba; no se mueve ni se oculta.
- Funciona tanto para las seis tiendas principales como para tarjetas adicionales.
- No altera el estado de sesión ni el formato emoji + entero.
- Prueba de regresión para CSS de ambas resoluciones.

## Publicación
Integrar a feature/student-stores tras CI; despliegue Cloudflare de producción.
