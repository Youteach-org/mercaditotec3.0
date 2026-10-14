# 2026-10-13 — Ajuste real de rango móvil y logos a la derecha

## Hallazgo
El despliegue del PR #127 sí terminó correctamente en GitHub Actions (Cloudflare
production, build y smoke checks), pero el usuario seguía viendo las tiendas
amontonadas. En app/globals.css había constancia de que Brave en su Android
puede reportar cerca de 960px de anchura CSS. El arreglo vertical anterior
solo se activaba para max-width:620px, y la media query 621-980px conservaba
el collage con flex-wrap y anchos/márgenes alternados.

## Correcciones solicitadas
1. En «Más tiendas de la comunidad», ampliar el diseño de columna vertical
   a anchos CSS <=1100px; cada tarjeta ocupa una fila, sin rotaciones, márgenes
   negativos ni scroll horizontal.
2. Para los logos de TODAS las tarjetas/nubes de tiendas (destacadas y
   adicionales), pasar el anclaje del borde izquierdo al derecho con
   right:8% y left:auto. Conservar bottom/top y tamaño actuales; no
   desplazar verticalmente ni alterar el contenido de las tarjetas.
3. Mantener las seis tiendas destacadas, la página de 12 adicionales, los
   enlaces y el diseño de escritorio sin cambios.

## Archivos y validación
- app/globals.css
- app/marketplace/discover-pagination.test.ts
- La compilación CI y las comprobaciones estructurales se usan antes
  de proponer integración.

## Autorización
La modificación fue solicitada, pero se advirtió expresamente al usuario
que **no se publicaría sin aprobación del nuevo cambio**. Conservar PR
abierto sin fusionarlo hasta ese permiso.
