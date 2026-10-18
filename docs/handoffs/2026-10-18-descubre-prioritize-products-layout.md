# Descubre — reorganización para mostrar productos antes (2026-10-18)

## Motivación
Captura del usuario en Brave, escritorio: un gran espacio vacío entre buscador y categorías, un título «Explora» en su propia fila, contadores en otra fila separada y otro bloque grande «Descubre productos de la comunidad» antes del muro. El usuario exige priorizar productos, no reducir aún más su foto.

## Distribución implementada
- La banda azul decorativa superior se reduce de 28 a 16 px (11 px en móvil) sin cambiar identidad.
- En escritorio el título manuscrito queda a la izquierda mientras buscador y botón Publicar comparten la primera fila a la derecha. Los **tres contadores de solo icono y cifra** ocupan ahora el espacio directamente **debajo del buscador**, no una franja de ancho completo bajo el título. Se reduce el mínimo artificial de 165 px del hero.
- El encabezado «Explora» se coloca en la **misma fila** que los iconos de categorías. Se mantienen todas las categorías y el scroll horizontal cuando no caben.
- El rótulo redundante «Descubre productos de la comunidad» se acorta a «Productos de la comunidad», ocupando una barra de aproximadamente 42 px junto a «Ver tiendas». El catálogo empieza inmediatamente después.
- En tablet y celular el hero ocupa tres filas naturales: título, buscador/Publicar, cifras; las categorías siguen en una sola franja deslizable, con «Desliza ↔» integrado en el encabezado, sin una línea extra. Encabezado de productos compacto.
- Se conservan el estilo scrapbook, el orden y tamaño de las fotografías, los colores, Tiendas privado/Descubre público y las rutas existentes.
- Sin cambios en Firebase, API, IA, gastos, categorías ni forma de contar usuarios, tiendas y productos.

## Verificación
- Prueba `app/descubre/vertical-space.test.ts`: confirma filas y prioridad del catálogo, las categorías presentes y la ausencia de alteraciones de las fotografías.
- Build Cloudflare/Next y reglas Firebase mediante CI.
