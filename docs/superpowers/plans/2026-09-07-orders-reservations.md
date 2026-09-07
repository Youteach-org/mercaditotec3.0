# Pedidos y reservas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un flujo completo de solicitudes/pedidos entre comprador y tienda, sin pagos.

**Architecture:** La colección `orders` se escribe y lee únicamente mediante APIs autenticadas en Node.js. La creación toma tienda/producto desde Firestore y guarda snapshots; las transiciones de estado se validan en dominio y se aplican según actor comprador/vendedor. La UI pública solo dispara la solicitud; las bandejas `/orders` y `/mystores/orders` gestionan cada lado.

**Tech Stack:** Next.js 16 App Router, React 19, Firebase Auth, Firestore Admin SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-07-orders-reservations.md`

## Global Constraints
- Sin pagos ni inventario en esta fase.
- No exponer correos de comprador o vendedor.
- Toda mutación exige usuario autenticado y no bloqueado.
- Solo tiendas `active` y productos `published` pueden originar pedidos.
- Cantidad 1–20; nota máximo 500 caracteres.

---

### Task 1: Dominio de pedidos

**Files:**
- Create: `lib/orders/domain.test.ts`
- Create: `lib/orders/domain.ts`

**Interfaces:**
- Produces: `OrderStatus`, `OrderActor`, `parseCreateOrderInput`, `assertOrderTransition`, `orderStatusLabel`.

- [ ] Escribir pruebas para cantidad, nota y transiciones permitidas/prohibidas.
- [ ] Ejecutar `npm test -- lib/orders/domain.test.ts` y confirmar fallo inicial por módulo ausente.
- [ ] Implementar validación y máquina de estados mínima.
- [ ] Ejecutar la prueba y confirmar PASS.

### Task 2: Repositorio y serialización

**Files:**
- Create: `lib/orders/repository.ts`
- Create: `lib/orders/http.ts`

**Interfaces:**
- Consumes: dominio de Task 1 y repositorios/datos `stores`, `products`, `users`.
- Produces: `createOrder`, `listOrdersForBuyer`, `listOrdersForSeller`, `setOrderStatus`, `serializeOrder`.

- [ ] Crear pedido resolviendo tienda/producto del servidor y rechazando tienda inactiva, producto oculto o auto-compra.
- [ ] Guardar snapshots de producto/tienda y nombre visible del comprador, nunca correo.
- [ ] Listar por comprador y vendedor autenticados.
- [ ] Aplicar transiciones dentro de transacción Firestore verificando actor.

### Task 3: APIs autenticadas

**Files:**
- Create: `app/api/orders/route.ts`
- Create: `app/api/orders/[orderId]/status/route.ts`

**Interfaces:**
- `POST /api/orders` `{ storeId, productId, quantity, note? }`
- `GET /api/orders?role=buyer|seller`
- `POST /api/orders/[orderId]/status` `{ status }`

- [ ] Usar `requireUnblockedUser` en POST/status y `requireFirebaseUser` en GET.
- [ ] Sanitizar errores mediante helper de pedidos.

### Task 4: Cliente y acción desde catálogo

**Files:**
- Create: `lib/orders/client.ts`
- Modify: `app/marketplace/stores/[slug]/page.tsx`

**Interfaces:**
- Produces: `createOrderRequest`, `loadOrders`, `changeOrderStatus`.

- [ ] Añadir selector 1–20 y botón `Solicitar` a cada producto.
- [ ] Si no hay sesión, dirigir a `/login`.
- [ ] Mostrar confirmación/error sin alterar la navegación pública.

### Task 5: Bandeja del comprador

**Files:**
- Create: `app/orders/page.tsx`
- Modify: `app/marketplace/page.tsx`

- [ ] Cargar `role=buyer`.
- [ ] Mostrar tienda, producto, cantidad, precio snapshot, fecha y estado.
- [ ] Permitir cancelar solo `pending|accepted`.
- [ ] Añadir acceso `Mis pedidos` desde Marketplace.

### Task 6: Bandeja del vendedor

**Files:**
- Create: `app/mystores/orders/page.tsx`
- Modify: `app/mystores/page.tsx`

- [ ] Cargar `role=seller`.
- [ ] Mostrar comprador por nombre visible, tienda, producto, cantidad, nota y ubicación de entrega.
- [ ] Acciones: aceptar/rechazar pendiente; marcar listo aceptado; marcar entregado listo.
- [ ] Añadir acceso `Pedidos recibidos` desde Mis tiendas.

### Task 7: Verificación

- [ ] Ejecutar `npm test`.
- [ ] Ejecutar `npm run lint`.
- [ ] Ejecutar `npm run build`.
- [ ] Corregir cualquier error antes de declarar el bloque completo.
