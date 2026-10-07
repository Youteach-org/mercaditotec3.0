# Mercadito handoff — Perfil y WhatsApp de vendedores

Fecha: 2026-10-07  
Repositorio: `Youteach-org/mercaditotec3.0`  
Rama: `feature/community-notices-whatsapp`  
PR: #54

## Decisiones funcionales

1. Los usuarios sin tienda **no están obligados** a registrar WhatsApp.
2. El perfil normal permanece en modo lectura. Un botón **Editar perfil** habilita:
   - cambiar foto;
   - quitar foto;
   - editar nombre visible;
   - agregar, cambiar o eliminar WhatsApp.
3. El WhatsApp se vuelve obligatorio únicamente cuando el usuario actúa como vendedor y quiere enviar una tienda a revisión.
4. El editor de tienda incluye **WhatsApp de contacto**. Si el usuario ya lo tiene en su perfil, se reutiliza.
5. Si el vendedor captura o cambia el número durante la configuración de la tienda, se guarda en `users/{uid}.whatsappNumber` mediante `PATCH /api/profile`.
6. La obligatoriedad también se valida en backend dentro de `submitCompleteStore`; no depende solo del frontend.
7. La tienda pública continúa exponiendo únicamente `whatsappUrl`, no el número crudo ni otros datos privados del propietario.
8. Se corrigió el error TypeScript de `app/cosas-perdidas/page.tsx` relacionado con `firebaseUser` nullable, que bloqueaba el build anterior de Cloudflare.

## Cambios realizados

- `app/profile/page.tsx`: modo Editar perfil, cambiar/quitar foto y WhatsApp opcional.
- `app/profile/page.test.ts`: cobertura de controles de edición.
- `components/store/StoreBuilderClient.tsx`: WhatsApp obligatorio dentro del flujo de vendedor.
- `components/store/StoreBuilderClient.test.ts`: cobertura del requisito de vendedor.
- `lib/store/submission.ts`: validación server-side de WhatsApp antes de enviar a revisión.
- `lib/store/submission.test.ts`: pruebas de número válido, ausente e inválido.
- `app/cosas-perdidas/page.tsx`: corrección del chequeo nullable.
- Especificación y plan de WhatsApp actualizados con la regla “opcional para usuarios generales / obligatorio para vendedores”.

## Criterio de aceptación relevante

- Crear una cuenta y usar Mercadito sin tienda no exige número.
- Un usuario puede añadir WhatsApp voluntariamente desde Perfil.
- Un vendedor no puede enviar una tienda a revisión sin un número válido.
- La validación no se puede saltar manipulando el frontend.
