# 2026-10-13 — Reparación de tiendas adicionales en móvil

## Decisión aprobada por el usuario
En pantallas móviles, las tiendas de «Más tiendas de la comunidad» se deben
recorrer **verticalmente al bajar la página**. El desplazamiento horizontal
introducido en PR #126 fue incorrecto y el usuario lo rechazó explícitamente.

## Implementación
- Retirar el carrusel horizontal, el scroll-snap y el estado/ref asociados.
- En <=620px, una tarjeta de tienda por fila, en flujo normal del documento.
- Sobrescribir anchos alternados, márgenes negativos y rotaciones por
  nth-child que causaban montones y solapamientos.
- Reservar alto suficiente por tarjeta y separación vertical.
- Mantener diseño editorial, fotos, enlaces, seis tiendas destacadas,
  paginación de 12, escritorio y tablet sin modificaciones.
- Añadir test de regresión en discover-pagination.test.ts.

## Restricción de publicación
Cambios únicamente propuestos en una rama con PR, **sin integración
a feature/student-stores ni despliegue hasta recibir permiso expreso**.

Rama: fix/mobile-community-stores-vertical-20261013
