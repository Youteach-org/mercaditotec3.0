# Descubre — referencia visual aprobada

**Aprobación explícita:** 16 de octubre de 2026, propietario: «si, esta chido ya lo aprobé».  
**Estado:** maqueta aprobada; módulo aún NO implementado; no desplegar publicaciones sin revisión automática previa.
**Issue de seguimiento:** https://github.com/Youteach-org/mercaditotec3.0/issues/125

## Imagen aprobada (en el hilo de conversación, no subida al repositorio)

- Archivo: `mercadito_tec_descubre_grandes_hallazgos.png`
- Dimensiones: **1448 × 1086 píxeles**.
- SHA-256: `5f233d55467840456a42b3ce08ca541133da8945d19be838756d4863612c3d10`.
- El PNG original permanece en la conversación. **No está todavía en GitHub**; al implementar, recuperar o cargar exactamente esta imagen y cotejar a tamaño completo, no reemplazar con una versión aproximada.
- Marketplace clásico mantiene como su propia referencia `docs/design/marketplace-approved-reference.png`; no rediseñarlo.

## Composición aprobada

1. **Marca Mercadito Tec:** encabezado azul eléctrico y recorte amarillo con logotipo/tipografía manuscrita y menú existente. Página «Descubre» marcada como inicio autenticado; «Tiendas» enlaza a `/marketplace`. Conservar chat, notificaciones, perfil y navegación actual. No inventar módulos «Mis compras» si no existen.
2. **Héroe compacto:** «Descubre» grande en lettering azul, subtítulo de comunidad; buscador central blanco redondeado con cinta azul; botón naranja prominente `+ Publicar`. Notas laterales, flechas y garabatos.
3. **Categorías:** adhesivos pequeños con iconos para «Todos», «Ofertas» y categorías reales (comida, electrónica, ropa, hogar, libros, accesorios, arte). No fabricar categorías inexistentes.
4. **Muro principal:** composición scrapbook/collage de artículos en **cuatro columnas a 1448 px**, con fotografías grandes en papeles rotos ligeramente girados, cinta adhesiva, precios sobre recortes llamativos y etiquetas manuales de oferta/nuevo. Mantener márgenes mínimos, fotos íntegras, irregularidad y alta ocupación; **no tarjetas ecommerce rígidas**.
5. **Ficha de producto:** foto, título legible, precio claro, descripción breve, vendedor/tienda verificados, ubicación y, solo si hay datos reales, puntuación. No simular calificaciones ni inventar publicaciones reales. Etiqueta «Flash» únicamente para oferta temporal verificada.
6. **Color y atmósfera:** conservar exactamente la paleta de Mercadito y la maqueta: azul eléctrico/intenso, amarillo, naranja, rosa y papel claro; tipografía manuscrita y flechas, estrellas, corazones dibujados, bordes rasgados. No añadir paletas nuevas ni mosaicos genéricos.
7. **Continuidad:** botón «Ver más productos» tipo papel y carga progresiva paginada; cada bloque conserva estética de collage.
8. **Responsive:** móvil con tarjetas legibles y abundante imagen sin 4 columnas microscópicas; precio, título y clic accesibles. Evitar capas que tapen botones, fotos o texto.

## Comportamiento del producto

- **Visitantes:** seguirán entrando al Marketplace actual de tiendas.
- **Usuarios autenticados:** a «Descubre», con productos como protagonistas, y podrán visitar Marketplace como «Tiendas».
- Tiendas activas y artículos ocasionales sin tienda se mezclarán en Descubre sin eliminar funcionalidades previas.
- Profundos de tiendas/artículos/chat no deben redirigirse incorrectamente al inicio.

## Seguridad obligatoria, distinta de la aprobación estética

- **Revisión 100% automática de texto e imágenes ANTES de publicar**, para cada artículo nuevo y cualquier edición, tanto para tiendas como para vendedores ocasionales.
- Detectar y rechazar **alcohol, drogas y vapeadores/cigarrillos electrónicos**; no investigar ni evaluar procedencia robada de bienes comunes, ni restringir a unas pocas categorías (TV, computadora, muebles y demás bienes lícitos permitidos).
- No hay aprobación por moderadores humanos. El sistema debe **fallar cerrado** si está inseguro o indisponible; pedir corrección/reintento sin hacer visible el anuncio.
- La moderación genérica no constituye detector fiable de objetos prohibidos; validar un clasificador multimodal específico y presupuesto antes de habilitar publicaciones. Mantener datos privados hasta aprobación.
- Evitar lecturas de Firebase excesivas; usar consultas paginadas y caché.

## Estado de implementación y aceptación

- **Esta aprobación permite diseñar e implementar la interfaz, pero NO autoriza habilitar publicaciones inseguras ni cambiar el enrutamiento de inicio antes de cumplir la revisión preventiva.**
- Antes de considerar terminada la vista: comparar render de 1448×1086 con imagen aprobada y verificar versión móvil. No presentar la maqueta generada como código desplegado.
