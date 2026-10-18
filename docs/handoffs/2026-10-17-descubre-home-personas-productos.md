# MercaditoTec — Descubre portada pública; Tiendas privada
Fecha: 2026-10-17. Base: feature/student-stores.

## Decisión aprobada
- Descubre es la portada en / y /descubre para todos, tengan cuenta o no.
- Sin cuenta se puede ver el muro: fotos, títulos, precios, categorías y ofertas; para consultar ficha, publicar, contactar o comprar debe iniciarse sesión.
- Tiendas (/marketplace) es secundaria y solamente accesible con cuenta, al igual que sus fichas.
- Contadores en Descubre: Personas (solo agregado público cacheado) y Productos (elementos aprobados y vigentes del feed, actualmente acotado a 100), no Tiendas.
- Mantener el diseño actual de Descubre, sin alterar sus categorías ni la identidad visual.

## Implementación técnica
- Se eliminó el 307 del Worker que enviaba todas las sesiones a Tiendas; / redirige a /descubre.
- /api/descubre/preview sirve tarjetas reducidas desde el materializado existente, sin UID, WhatsApp, vendedor, tienda, lugar de entrega ni descripción privada. Nunca incluye anuncios pendientes/caducados.
- /api/descubre sigue protegido con Firebase. Los detalles personales y las fichas de tienda también exigen token.
- /api/marketplace y /api/marketplace-v2 ahora exigen token de Firebase; Tiendas lo envía en su petición y el servidor responde private, no-store.
- Cloudflare cachea solamente el shell de Descubre sin cookies y el endpoint público /api/descubre/preview. Desactiva caché de datos Tiendas, incluidos documentos almacenados por despliegues anteriores.
- Los visitantes que pulsen sobre un producto, Publicar o Ver tiendas van a iniciar sesión. AppShell también apunta a Descubre.
- Contador Personas reutiliza agregado 5 minutos y no expone registros. Productos se calcula del feed ya cargado sin lecturas adicionales.

## Pruebas
- API Tiendas sin token no lee catálogo; consulta autorizada es privada.
- Vista pública elimina datos personales.
- Caché pública de Cloudflare sirve únicamente preview Descubre.
- Contador de productos excluye anuncios caducados y / redirige a Descubre.
