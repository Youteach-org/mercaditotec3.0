# Mercadito — horario visual en tienda pública (2026-10-06)

## Petición
En /marketplace/stores/[slug] se mostraba el horario como lista de horas por día, aunque ya existe un editor de timetable visual. El usuario pidió mostrar la cuadrícula real y ocupar el espacio útil de escritorio; conservar la estética existente.

## Implementación
- Reutilizar `StoreScheduleGrid` y `store.schedule`, sin otra fuente de datos ni persistencia adicional.
- Prop opcional `publicView` (solo presentación): días en columnas, horas 07:00–20:00 en filas, bloques de disponibilidad azules y leyenda. La vista es de solo lectura.
- La página pública muestra la cuadrícula también en modo manual, con indicador del estado temporal independiente del horario habitual (nunca sustituirlo por «Control manual»).
- Aumentar el máximo de ancho de la página a 1500px y, en escritorio, usar dos columnas proporcionadas si existe un único producto. Con varios productos, mantener catálogo en rejilla y un lateral legible de 350–440px.
- Adaptar la rejilla horaria a pantalla pequeña con celdas legibles; no degradar a lista de texto en desktop.
- No cambiar encabezado, portadas, superposición del logo, estilo de productos, comportamiento de zoom ni estructura de datos.

## Validación
- `components/store/public-store-visual-schedule.test.ts` protege la presencia de la cuadrícula, el modo manual y el aprovechamiento del espacio.
- Ejecutar CI y build Cloudflare; desplegar a `feature/student-stores` por PR (rama de producción).
- Verificación visual real pendiente desde navegador del usuario. El CI exitoso no demuestra por sí solo los tamaños finales en todos los dispositivos.
