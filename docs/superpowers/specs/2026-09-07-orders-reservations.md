# Pedidos y reservas — diseño aprobado

## Objetivo
Permitir que un usuario autenticado solicite uno o más ejemplares de un producto publicado de una tienda activa y que el propietario de la tienda gestione el pedido hasta su entrega, sin integrar pagos en esta fase.

## Alcance
- Crear pedidos desde el catálogo público de una tienda.
- Consultar `Mis pedidos` como comprador.
- Consultar pedidos recibidos como vendedor.
- Aceptar o rechazar pedidos pendientes.
- Marcar pedidos aceptados como listos y posteriormente como entregados/completados.
- Permitir al comprador cancelar mientras el pedido esté pendiente o aceptado.
- Respetar bloqueos administrativos existentes para toda mutación.
- No implementar pagos, inventario, envíos externos ni chat privado en esta fase.

## Modelo
Colección `orders` con snapshots mínimos para conservar el contexto histórico aunque el producto o tienda cambien después:
- `buyerUid`
- `buyerDisplayName`
- `sellerUid`
- `storeId`, `storeSlug`, `storeName`
- `productId`, `productTitle`, `productImageUrl`
- `priceType`, `priceAmount`
- `quantity`
- `note`
- `deliveryLocation`
- `status`: `pending | accepted | rejected | ready | completed | cancelled`
- `createdAt`, `updatedAt`

No se guarda ni se expone correo del comprador o vendedor en el pedido.

## Reglas
- Solo se puede crear un pedido para una tienda `active` y un producto `published` que pertenezca a esa tienda.
- Un usuario no puede pedir productos de su propia tienda.
- Cantidad permitida: 1–20.
- Nota opcional: máximo 500 caracteres.
- Vendedor: `pending -> accepted|rejected`, `accepted -> ready`, `ready -> completed`.
- Comprador: `pending|accepted -> cancelled`.
- Estados terminales (`rejected`, `completed`, `cancelled`) no cambian.
- Las mutaciones usan `requireUnblockedUser`.

## UI
- En cada producto publicado se muestra control de cantidad y botón `Solicitar`.
- Si no hay sesión, la acción lleva a `/login`.
- `/orders` muestra pedidos realizados y su estado.
- `/mystores/orders` muestra pedidos recibidos y las acciones disponibles según estado.
- El catálogo conserva su función pública de exploración; iniciar sesión solo es obligatorio al crear/gestionar pedidos.

## Seguridad
- Las APIs nunca confían en `buyerUid`, `sellerUid`, precio, título o tienda enviados por el cliente; todos esos datos se resuelven del servidor.
- Las consultas de comprador filtran por `buyerUid` autenticado y las de vendedor por `sellerUid` autenticado.
- Un pedido ajeno responde como no encontrado/no autorizado sin exponer datos del pedido.
