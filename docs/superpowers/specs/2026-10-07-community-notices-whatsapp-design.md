# Mercadito — WhatsApp de vendedores, avisos rápidos y cosas perdidas

Fecha: 2026-10-07  
Repositorio: `Youteach-org/mercaditotec3.0`  
Rama: `feature/community-notices-whatsapp`

## 1. Objetivo

Extender Mercadito con dos capacidades relacionadas con comunicación comunitaria:

1. Permitir que cada usuario capture un número de WhatsApp en su perfil para que, cuando sea dueño de una tienda activa, su tienda pública muestre un botón de contacto por WhatsApp.
2. Convertir el recuadro azul inferior izquierdo del marketplace (`mkt-bottom-blue`) en un panel de avisos rápidos y crear una página de **Cosas perdidas** donde cualquier usuario autorizado pueda publicar objetos encontrados con foto.

Las publicaciones de Cosas perdidas deben alimentar automáticamente el panel de avisos del inicio. No debe existir un flujo duplicado para publicar el mismo contenido dos veces.

## 2. Principios de diseño

- Mantener la estética visual existente del marketplace; el recuadro azul no se sustituye por un diseño genérico.
- Reutilizar el modelo de autenticación actual y la política de acceso institucional de 8 años.
- Toda mutación nueva debe pasar por backend autenticado; no se permitirán escrituras directas desde el cliente a Firestore.
- Los usuarios bloqueados podrán consultar contenido permitido, pero no crear, editar ni resolver publicaciones.
- Minimizar exposición de datos privados: el número de teléfono se almacena en el perfil privado y solo se expone en la tienda pública cuando exista una tienda activa del propietario.
- Evitar duplicar publicaciones entre “Avisos rápidos” y “Cosas perdidas”: ambos usan una misma colección de publicaciones comunitarias con distintos tipos.

## 3. WhatsApp en perfiles y tiendas

### 3.1 Datos de perfil

Agregar al documento `users/{uid}` un campo opcional para usuarios generales:

- `whatsappNumber: string`

Se almacenará normalizado en formato E.164 cuando sea posible. Para números mexicanos:
- si el usuario captura 10 dígitos, por ejemplo `4431234567`, se normaliza a `+524431234567`;
- si captura `52...` o `+52...`, se normaliza a una sola forma `+52...`;
- el valor vacío elimina el número;
- valores no válidos se rechazan con error 400.

No se inferirá un país distinto automáticamente.

**Regla de obligatoriedad:** un usuario que no tenga tienda puede usar Mercadito sin registrar WhatsApp. El número se vuelve obligatorio únicamente para el flujo de vendedor: antes de enviar una tienda a revisión, el backend debe comprobar que el propietario tenga un WhatsApp válido registrado.

### 3.2 Edición del perfil

En `/profile` se agrega un botón **“Editar perfil”**. Solo al entrar en modo edición se muestran los controles para cambiar o quitar la foto, editar el nombre y agregar/cambiar/eliminar el “Número de WhatsApp”.

El formulario debe:
- aceptar números con espacios, guiones, paréntesis o prefijo `+`;
- mostrar una ayuda breve indicando que ese número podrá ser visible en la tienda del usuario;
- permitir eliminarlo dejando el campo vacío cuando el usuario no dependa de él para enviar una tienda;
- guardar por `PATCH /api/profile`.

`lib/security/accountProfile.ts` será la autoridad de validación y normalización.

### 3.2.1 Requisito al crear una tienda

En el editor de tienda se muestra un campo **“WhatsApp de contacto”** dentro de la información del vendedor. Si ya existe en el perfil, se reutiliza. Si no existe, el vendedor debe capturarlo durante la configuración de la tienda.

- No se exige WhatsApp para crear una cuenta ni para usuarios sin tienda.
- Sí se exige un WhatsApp válido para enviar una tienda a revisión.
- El valor capturado en el editor se guarda en `users/{uid}.whatsappNumber` mediante `PATCH /api/profile`.
- `submitCompleteStore` valida nuevamente el número en backend para impedir que el requisito se omita desde el frontend.

### 3.3 Exposición pública

La tienda pública no leerá directamente el documento privado del usuario desde el cliente.

Al construir el detalle público de una tienda:
1. se obtiene `ownerUid` de la tienda;
2. el backend lee `users/{ownerUid}`;
3. si existe un número válido, se agrega al payload público un campo derivado, preferentemente `whatsappUrl`, no el documento completo del usuario.

Ejemplo:
`https://wa.me/524431234567`

El detalle público de tienda podrá incluir:
- `whatsappUrl: string | null`

### 3.4 Botón de WhatsApp

En `/marketplace/stores/[slug]`:
- mostrar “Contactar por WhatsApp” solo si `whatsappUrl` existe;
- abrir WhatsApp en una pestaña o contexto externo;
- usar `rel="noopener noreferrer"`;
- no bloquear el flujo actual de pedidos;
- no mostrar el número como texto si no es necesario.

## 4. Sistema unificado de publicaciones comunitarias

### 4.1 Colección

Crear colección Firestore:

`community_posts/{postId}`

Campos mínimos:

- `id: string`
- `authorUid: string`
- `type: "quick_notice" | "found_item"`
- `title: string`
- `body: string`
- `location: string`
- `imageUrl: string | null`
- `status: "active" | "resolved"`
- `createdAt: Timestamp`
- `updatedAt: Timestamp`
- `resolvedAt: Timestamp | null`

Reglas de contenido:
- `title`: 1–80 caracteres;
- `body`: 1–500 caracteres;
- `location`: 0–120 caracteres;
- `imageUrl`: obligatorio para `found_item`; opcional para `quick_notice`;
- solo el autor puede resolver su publicación;
- una publicación resuelta deja de aparecer en el panel de avisos activos.

### 4.2 Tipos

#### `quick_notice`
Para mensajes breves comunitarios, por ejemplo:
- “Perdí unas llaves cerca de biblioteca.”
- “¿Alguien encontró una calculadora?”
- “Busco al dueño de una chamarra.”

#### `found_item`
Para objetos encontrados. Debe incluir foto y se muestra también en la página de Cosas perdidas.

Toda publicación `found_item` activa forma parte del mismo feed que consume el panel azul.

## 5. Backend

Crear un módulo aislado bajo `lib/community/` con:

- `domain.ts`: tipos, validación y normalización;
- `repository.ts`: acceso Firestore server-side;
- `client.ts`: funciones cliente para invocar APIs;
- pruebas unitarias por módulo.

### 5.1 API principal

`GET /api/community-posts`

Parámetros previstos:
- `type` opcional;
- `status` restringido a valores permitidos;
- `limit` con máximo seguro.

Comportamiento por defecto:
- devuelve publicaciones activas;
- orden descendente por `createdAt`;
- para el panel del inicio se usarán las más recientes.

`POST /api/community-posts`

Requiere:
- usuario autenticado;
- cuenta autorizada por las reglas actuales;
- usuario no bloqueado.

Crea una publicación después de validar el payload.

### 5.2 Resolver publicación

`PATCH /api/community-posts/[postId]`

Operación soportada inicialmente:
- marcar como `resolved`.

Solo el autor podrá resolverla.

No se implementará edición completa de contenido en esta primera versión para reducir superficie de abuso y alcance.

## 6. Imágenes

Las imágenes de `found_item` usarán el flujo actual de Supabase mediante `uploadImageFile`, no Firebase Storage directo.

Nueva ruta autorizada:
`community-posts/{uid}/{uuid}.{ext}`

La autorización de media debe reconocer esta ruta y:
- exigir que el UID de la ruta coincida con el usuario autenticado;
- respetar bloqueo;
- aceptar solo formatos de imagen ya permitidos;
- aplicar el límite de tamaño usado por los flujos actuales o uno equivalente documentado.

La URL final se guarda en `imageUrl`.

## 7. Página “Cosas perdidas”

Ruta:
`/cosas-perdidas`

Debe estar protegida con `AuthGuard`.

Contenido:
- encabezado claro “Cosas perdidas”;
- formulario para publicar un objeto encontrado;
- foto obligatoria;
- título/nombre del objeto;
- descripción;
- lugar donde fue encontrado;
- listado de publicaciones `found_item` activas;
- cada publicación muestra foto, texto, lugar y fecha;
- si el usuario actual es el autor, mostrar acción “Marcar como entregado” o “Resolver”.

No se requiere moderación administrativa específica en esta primera versión; sigue aplicando el sistema general de bloqueo del usuario.

## 8. Panel de avisos rápidos del marketplace

El bloque existente `mkt-bottom-blue` se mantiene en la misma zona y conserva su identidad visual.

Se reemplaza el contenido estático por:
- título “Avisos rápidos”;
- 2–4 publicaciones activas recientes según espacio disponible;
- texto truncado de forma legible;
- distintivo visual para publicaciones de tipo `found_item`;
- enlace a `/cosas-perdidas` cuando corresponda;
- acceso a una acción para publicar un aviso rápido.

La adaptación responsive debe respetar las posiciones actuales definidas en `app/globals.css`.

El panel consume la misma colección `community_posts`; una publicación de Cosas perdidas no se duplica en otra colección.

## 9. Flujo de aviso rápido

Desde el panel azul se ofrecerá una acción “Publicar aviso”.

La primera versión puede abrir un modal dentro de `/marketplace` con:
- título;
- mensaje;
- ubicación opcional.

El tipo enviado será `quick_notice`.

No requiere imagen.

Al publicar correctamente:
- se refresca el feed;
- el aviso recién creado puede aparecer en el panel según orden cronológico.

## 10. Seguridad y permisos

- Firestore mantiene política deny-by-default para escrituras directas.
- `community_posts` no tendrá escritura cliente directa.
- Las APIs usarán los helpers de autenticación del proyecto, incluido `requireUnblockedUser`.
- Las lecturas del feed se realizarán server-side mediante API.
- No se expondrán email, rol, bloqueos u otros campos del propietario de una tienda al construir el enlace de WhatsApp.
- El número de WhatsApp solo se deriva hacia una URL pública cuando el usuario tenga una tienda pública activa que lo consuma.
- El backend valida autoría antes de resolver publicaciones.
- No se confiará en `authorUid` enviado por el cliente; se toma del token autenticado.

## 11. Archivos y áreas que probablemente cambiarán

Existentes:
- `app/profile/page.tsx`
- `app/api/profile/route.ts`
- `lib/security/accountProfile.ts`
- `app/marketplace/page.tsx`
- `app/marketplace/stores/[slug]/page.tsx`
- `lib/store/publicMarketplace.ts`
- `lib/store/publicMarketplaceRepository.ts`
- `app/globals.css`
- `lib/security/mediaAuthorization.ts` o el módulo equivalente que autoriza rutas de imagen

Nuevos:
- `app/cosas-perdidas/page.tsx`
- `app/api/community-posts/route.ts`
- `app/api/community-posts/[postId]/route.ts`
- `lib/community/domain.ts`
- `lib/community/repository.ts`
- `lib/community/client.ts`
- pruebas asociadas

## 12. Pruebas

Se aplicará TDD.

Cobertura mínima:

### Perfil / WhatsApp
- acepta 10 dígitos mexicanos;
- acepta `+52`;
- elimina espacios/guiones/paréntesis;
- rechaza valores demasiado cortos/largos;
- permite limpiar el campo;
- el API de perfil no permite escribir campos arbitrarios.

### Tienda pública
- tienda con propietario con WhatsApp devuelve `whatsappUrl`;
- tienda cuyo propietario no tiene WhatsApp devuelve `null`;
- no se filtran campos privados del perfil.

### Publicaciones comunitarias
- valida longitudes;
- `found_item` exige imagen;
- `quick_notice` permite no tener imagen;
- crea con `authorUid` del usuario autenticado;
- usuario bloqueado no puede crear;
- otro usuario no puede resolver una publicación;
- autor sí puede resolverla;
- publicaciones resueltas no aparecen en el feed activo;
- feed ordena por fecha descendente.

### UI
- perfil envía el número al API;
- tienda muestra botón solo cuando existe URL;
- panel azul renderiza avisos;
- página de Cosas perdidas filtra `found_item`;
- publicación encontrada aparece también en el panel del inicio.

## 13. Verificación

Antes de integrar:
- `npm test`
- `npm run lint`
- `npm run build`

También se comprobará el flujo completo:
1. editar WhatsApp en perfil;
2. abrir una tienda activa y verificar botón de WhatsApp;
3. publicar un aviso rápido;
4. verificarlo en el panel azul;
5. publicar un objeto encontrado con foto;
6. verificarlo en `/cosas-perdidas`;
7. verificar que el mismo objeto aparezca en el panel azul;
8. marcarlo como resuelto;
9. verificar que desaparezca de los feeds activos.

## 14. Criterios de aceptación

La función se considera terminada cuando:

- un usuario sin tienda puede guardar, cambiar o eliminar su número de WhatsApp de forma opcional;
- el perfil permite cambiar o quitar la foto únicamente desde el modo “Editar perfil”;
- un vendedor debe registrar un WhatsApp válido antes de enviar su tienda a revisión, con validación también en backend;
- el número se valida y normaliza en backend;
- una tienda pública muestra el botón de WhatsApp solo cuando corresponde;
- el recuadro `mkt-bottom-blue` funciona como panel de avisos reales;
- un usuario puede crear un aviso rápido;
- existe la página `/cosas-perdidas`;
- cualquier usuario autorizado puede publicar un objeto encontrado con foto;
- las publicaciones `found_item` aparecen automáticamente en el panel de avisos;
- el autor puede resolver una publicación;
- las publicaciones resueltas no aparecen en el feed activo;
- no existen escrituras directas cliente a Firestore para estas funciones;
- las pruebas, lint y build pasan antes de integrar.
