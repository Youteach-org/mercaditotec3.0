# MercaditoTec — categorías compactas, tercer contador y avisos móviles
Fecha: 2026-10-17
Destino: feature/student-stores

## Ajustes aprobados
- Descubre mantiene su identidad visual y su papel de portada pública.
- Categorías en computadora: UNA fila horizontal compacta de icono + nombre. Todas las categorías siguen disponibles: cuando hay más que las que caben, la franja se desplaza lateralmente. No se pierden opciones ni se muestran filas adicionales.
- Categorías en celular: franja horizontal con desplazamiento táctil, snap de iconos y señal visible «Desliza para explorar categorías». Se mantiene la etiqueta pequeña debajo de cada icono.
- Contadores: Personas, Productos y Tiendas. Tiendas = realStoreCount (número real de tiendas, excluye ejemplos/demo), expuesto como un agregado en los mismos endpoints del feed Descubre (público reducido y privado). Sin consultas Firebase nuevas.
- En celular los tres contadores se ordenan en una sola fila de tres cifras pequeñas, con legibilidad y sin desbordar la pantalla.
- El panel de Avisos rápidos está en Tiendas; sigue restringido a usuarios con cuenta. Su diseño azul recortado se conserva. Modo vertical: panel separado visualmente de las tiendas, flechas dentro del panel, botones «+ Aviso» y «+ Encontré algo» en su fila propia dentro de la tarjeta. Texto y foto se contienen y el texto largo puede desplazarse dentro del aviso.
- Un único componente QuickNoticesPanel; no se duplica su carga ni rotación ni se agregan llamadas al backend al cambiar avisos. Se conserva la rotación y la interacción de swipe.

## Validación
- Pruebas de categorías horizontales y contadores responsive.
- Pruebas de API de Descubre que verifican realStoreCount tanto en invitado como usuario autenticado, manteniendo la restricción de datos privados.
- Pruebas estáticas del panel móvil y de que QuickNoticesPanel solo se monta una vez.
- Revisión automática de Vitest, Next TypeScript/OpenNext y reglas Firebase en GitHub Actions.

## Observación
El contador Productos usa el feed actual, limitado a 100 elementos; Tiendas sí refleja el total real del materializado. Si se necesita contar todos los productos históricos, eso requiere un agregado diferente, no una lectura masiva por visita.
