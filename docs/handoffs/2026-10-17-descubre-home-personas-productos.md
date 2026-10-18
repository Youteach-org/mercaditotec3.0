# MercaditoTec — Descubre como inicio y contadores de comunidad
Fecha: 17 de octubre de 2026
Rama base: `feature/student-stores`

## Requerimiento aprobado
- Descubre es la página principal para **usuarios autenticados**.
- Tiendas permanece accesible desde su apartado de navegación y `/marketplace`, pero deja de ser el destino de inicio del usuario con sesión.
- Mover los contadores de la antigua portada Tiendas a Descubre y mostrar **Personas** y **Productos**, nunca cantidad de tiendas en esa zona.
- Conservar exactamente el estilo actual de Descubre: tipografía, papeles recortados, colores y categorías.

## Implementación y privacidad
- El Worker de Cloudflare tenía un `307 /` -> `/marketplace` incondicional, que nunca consultaba sesión y además podía guardarse hasta 5 minutos en caché compartida. Se retira esa redirección para permitir que `app/page.tsx` tome la decisión existente usando `useSession`.
- Con Firebase autenticado: `/` -> `/descubre`. Sin sesión: `/` -> `/marketplace` (única sección pública autorizada por la regla vigente); `/api/descubre` sigue privada. Ni catálogo privado ni teléfonos quedan visibles al público. `/marketplace` sigue funcionando para todos.
- **Personas** reusa `GET /api/community-stats`, que hace el mismo agregado de usuarios que antes solicitaba Tiendas, cacheado en memoria 5 minutos por instancia y sin escanear perfiles desde el cliente. Se retira esa consulta de Tiendas para no duplicar lecturas entre páginas.
- **Productos** cuenta los elementos del feed de `/api/descubre` que el usuario **realmente puede consultar** (productos de tiendas y publicaciones individuales aprobadas/vigentes); excluye los que ya vencieron según reloj local, sin solicitar otro endpoint ni usar inferencia. La API limita su feed a un máximo de 100 elementos, por lo que este contador describe el muro visible y **no pretende contar toda la base histórica** cuando hay más de 100. No incluye tiendas como entidad.
- Los contadores no dependen de las opciones de búsqueda o filtros. Un fallo de consulta de personas no interrumpe la carga de productos.
- El estilo son dos notas compactas de Mercadito, adaptadas a móvil, entre la cabecera de búsqueda/publicación y las categorías; se elimina el bloque de contadores de `/marketplace`.

## Pruebas
- `lib/descubre/homeStats.test.ts`: contabiliza productos de tienda y anuncios personales vigentes, excluye caducados.
- `app/page.test.ts`: protege la redirección por sesión y evita reintroducir un 307 global en Cloudflare.
- Las pruebas de compilación incluyen TypeScript, Vitest, OpenNext y reglas de Firebase.
