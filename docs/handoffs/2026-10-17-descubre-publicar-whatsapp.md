# Mercadito — Publicar, contacto directo por WhatsApp
Fecha: 2026-10-17
Rama base: `feature/student-stores`

## Decisiones
1. Encabezado aprobado: **PON TUS IDEAS A LA VENTA**. Se conserva la estética y línea descriptiva de Publicar.
2. El formulario usa `users/{uid}.whatsappNumber` cuando ya existe. Si falta, solicita el número y lo guarda mediante el endpoint existente `PATCH /api/profile` antes de subir la foto.
3. El servidor rechaza nuevas publicaciones personales sin WhatsApp válido, incluso si se omite el control del navegador.
4. Solo un usuario autenticado puede consultar un anuncio personal. En el detalle de un anuncio aprobado y vigente perteneciente a otra persona, el servidor consulta el WhatsApp actual del perfil y devuelve exclusivamente la URL `wa.me` para abrir el contacto.
5. No se almacena el teléfono en la publicación ni se añade al catálogo materializado que también se usa para visitantes. La lectura extra de Firestore ocurre **solo al abrir el detalle**, nunca por tarjeta, refresco periódico o catálogo.
6. La acción de contacto desaparece al vencer o marcar vendido el anuncio. El propietario puede cambiar el número en Perfil. Los anuncios antiguos sin número muestran contacto no disponible hasta que el publicador registre uno.

## Archivos principales
- `app/descubre/publicar/page.tsx`, `publicar.css`
- `app/descubre/anuncios/[id]/page.tsx`
- `app/api/descubre/anuncios/[id]/route.ts`
- `lib/descubre/listings.ts`, `lib/descubre/contact.ts`
- Pruebas: `app/descubre/publicar/page.test.ts`, `lib/descubre/contact.test.ts`.
