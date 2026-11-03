# MercaditoTec — diagnóstico legal y de calidad antes de publicar apps

Fecha del diagnóstico: 22 de octubre de 2026. El proyecto es un marketplace social para estudiantes con chat, imágenes, tiendas, WhatsApp, moderación y registro institucional.

## Lo que SÍ existe ya
- /terms contiene reglas de comunidad, productos prohibidos, tienda, precio, pedidos, chat y moderación. Es una base de reglas, **no una política de privacidad integral ni unos términos comerciales completos**.
- /notifications, /configuracion y /profile permiten ver avisos internos, perfil y preferencias web.
- Reportes de contenido y moderación administrativa (inspeccionar cobertura real para cuentas, chat, productos).
- Protección de acceso con correo institucional y verificación.
- Contacto con tiendas por WhatsApp; los pedidos antiguos deben conservarse aunque deje de verse su enlace en el menú.
- HTTPS y seguridad de autenticación en código; la revisión de seguridad debe ser independiente.

## Prioridad ALTA: imprescindibles antes de las tiendas
1. **Aviso de privacidad integral real** bajo LFPDPPP de 2025, no la versión obsoleta de 2010; identidad/domicilio real del responsable, datos tratados, finalidades y, cuando aplique, distinción de secundarias, procedimientos ARCO, limitación, cambios, encargados/transferencias y retención. El borrador está en `docs/legal/AVISO-PRIVACIDAD-BORRADOR-NO-PUBLICAR.md`.
2. **Aviso simplificado durante registro, antes de la recogida** con acceso al aviso integral. Confirmar decisiones de consentimiento y registrar versión informada de la política sin condicionar ilegalmente el ejercicio de derechos.
3. **Eliminación real de cuentas y datos**. Google Play exige acceso dentro de la app y URL web pública para solicitar eliminación. Apple exige iniciar eliminación dentro de la app. No reemplazar la eliminación por bloquear/desactivar, ni crear botón «Eliminar» sin backend seguro y revisión de dependencias. Definir borrado de cuenta Firebase, perfil, tiendas, productos, imágenes Supabase, publicaciones, mensajes, tokens push, tokens en dispositivos y datos de otros usuarios que dependan de operaciones; conservación legal justificable de ciertos datos.
4. **Canal de contacto operativo** visible sin iniciar sesión: soporte, abuso, privacidad y solicitudes ARCO. No usar correo imaginario. Responsable debe confirmarlo.
5. **Cumplimiento de contenido generado por usuarios**: reglas públicas; reportar publicaciones/usuarios; bloqueo de abusadores; revisión efectiva de reportes; administración atiende incidentes. Apple App Review Guideline 1.2 exige filtrado, reporte, posibilidad de bloquear usuarios y contacto.
6. **Declaraciones de tienda**: Google Play Data safety completo (Firebase, Supabase, Cloudflare, WhatsApp, terceros/analítica, fotos); Apple App Privacy. Capturas reales, soporte, política pública permanente, cuenta de revisión y comprobación de permisos.
7. **No engañar sobre relación con el Tecnológico**: solo afirmar autorización/colaboración/uso de marcas y logos si existe. Aclarar quién opera y que las tiendas son de terceros.
8. **Menores**: definir si pueden usar la plataforma y cómo se tratan datos personales y se obtienen autorizaciones cuando corresponda; correo institucional no demuestra edad.

## Prioridad MEDIA: confiabilidad y transparencia comercial
9. Ampliar /terms con: quién administra la plataforma; reglas de uso de fotografías y derechos de autor; vendedores como responsables de descripción/entrega/cobro; las ventas físicas se acuerdan directamente; qué significa tocar WhatsApp (contacto intentado, no garantiza conversación, pago, entrega ni calidad); moderación con criterios y reportes; suspensión, reclamaciones, conflictos, contenidos y revisión de términos; soporte y versiones.
10. **Política de cookies / almacenamiento local**: inventariar Firebase Auth/session, almacenamiento web, herramientas de medición y publicidad; informar y obtener consentimientos adicionales solo cuando resulten jurídicamente exigibles. No implementar banner ornamental que acepte todo sin efecto.
11. Accesibilidad: contraste, navegación teclado, tamaños táctiles, textos legibles, estado de carga, errores claros, buenas prácticas WCAG 2.2 AA cuando sea viable.
12. Rendimiento y seguridad: carga de fotografías, autenticación, límites de frecuencia, rotación de credenciales, revisión de permisos por rol, mensajes/retención, reporte de incidentes, auditoría por navegador Android/iPhone.
13. Reglas sobre productos restringidos y reportes de tiendas: permisos/sanciones con cumplimiento efectivo. No prometer «venta segura» ni protección de compra que no existe.
14. Licencias/marcas/derechos de imagen: logos subidos por usuarios, fotos de productos, tipografía/recursos, y marca MercaditoTec.
15. Actualizaciones de privacidad/condiciones: enlaces permanentes accesibles desde pie de página y durante registro; fecha y control de versiones.

## No hacer
- No afirmar que el aviso está aprobado, que es '100% legal', o que la app está lista para Apple/Google sin finalizar responsable, eliminación y registro de proveedores.
- No mostrar en producción identidad legal, dirección, correo o un consentimiento inventados.
- No retirar datos de pedidos ni su API al ocultar el botón Pedidos del menú.
- No instalar trackers de marketing sin evaluación y aviso/consentimiento aplicables.
- No confundir reportar usuario, bloquear usuario para todos, y bloquear un contacto a nivel particular: verificar cobertura de cada caso.

## Información que debe confirmar quien operará el sitio
1. Nombre completo o razón social **del responsable legal** y domicilio para el aviso.
2. Correo de privacidad/ARCO y soporte que tenga funcionamiento probado.
3. Relación legal real con institución, uso de marca, elegibilidad y política sobre menores.
4. Tiempos de conservación y datos que realmente deben retenerse para controversias/incidentes.
5. Si habrá patrocinadores, anuncios, membresías Plus o monetización adicional, y si se usarán datos de usuarios para ello.

## Fuentes oficiales
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares publicada el 20 de marzo de 2025: https://sidof.segob.gob.mx/notas/docFuente/5752569
- Google Play, requisitos de eliminación de cuentas: https://support.google.com/googleplay/android-developer/answer/13327111
- Google Play, sección Seguridad de datos: https://support.google.com/googleplay/android-developer/answer/10787469
- Apple, App Review Guidelines 1.2 y 5.1.1: https://developer.apple.com/app-store/review/guidelines/
- Apple, eliminación de cuentas: https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion/

La validación jurídica definitiva corresponde a un profesional competente; este documento es un diagnóstico técnico-operativo.
