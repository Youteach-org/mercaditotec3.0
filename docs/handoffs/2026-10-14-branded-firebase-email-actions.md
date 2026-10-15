# 2026-10-14 — Enlaces de confirmación con dominio MercaditoTec

## Problema
Firebase Authentication usa enlaces de acción bajo mercadito3-1ff3e.firebaseapp.com,
distintos del dominio público https://mercaditotec.store.
El usuario solicita un enlace con el dominio oficial.

## Implementación en Next.js / Cloudflare
- Nueva página https://mercaditotec.store/auth/action
- Acepta `mode=verifyEmail`, `mode=verifyAndChangeEmail`,
  `mode=recoverEmail` y `mode=resetPassword`.
- Aplica códigos de un solo uso usando el SDK Firebase, muestra resultados
  y recuperación de contraseñas. No almacena códigos ni contraseñas.
- URLs de retorno autorizadas configuradas en el registro, reenvío y
  recuperación. Jamás usar `continueUrl` no confiable como redirección.
- No cambiar `lib/firebase.ts` `authDomain`: es un parámetro del SDK,
  no el dominio que se imprime en el correo.
- El resto de la página permanece en Cloudflare Workers.

## ÚLTIMO PASO OBLIGATORIO en Firebase Console (NO se modifica vía GitHub)
1. Entrar a https://console.firebase.google.com/project/mercadito3-1ff3e/authentication/emails
   (o Authentication → Templates / Plantillas).
2. Abrir plantilla «Verificación de dirección de correo electrónico» (lápiz).
3. Elegir «Personalizar URL de acción» / «Customize action URL».
4. Pegar EXACTAMENTE: `https://mercaditotec.store/auth/action`.
5. Guardar. Según Firebase, este ajuste puede aplicarse a todas las
   plantillas del proyecto: por eso también se implementaron resetPassword y
   recoverEmail.
6. Revisar que `mercaditotec.store` esté en Authentication → Settings →
   Authorized domains.
7. Solicitar reenvío de confirmación en login y comprobar que el correo
   muestre `https://mercaditotec.store/auth/action?mode=verifyEmail&...`,
   se verifique correctamente y abra después /login.

IMPORTANTE: pasar `ActionCodeSettings.url` al SDK solo añade un
`continueUrl`; por sí solo NO cambia el hostname principal de los
links de Firebase. Para conseguir el dominio oficial en el mensaje es
necesario guardar el cambio de plantilla anterior. Los enlaces enviados
antes de esa modificación seguirán usando su URL original hasta caducar.

## Diferente: correo remitente
Este cambio afecta el URL del enlace. Para cambiar también el remitente
noreply@...firebaseapp.com por uno de mercaditotec.store, Firebase exige
verificación de dominio y DNS específico; no se ha tocado.

## Seguridad y despliegue
- Nunca aceptar redirects a dominios externos.
- Mantener respuesta genérica para códigos caducados o inválidos.
- CI: tests y build OpenNext en GitHub; deploy en feature/student-stores a
  Cloudflare. No usar Vercel.
- Solo considerar el enlace completamente migrado cuando la plantilla en
  Firebase esté actualizada y llegue una prueba de correo real.
