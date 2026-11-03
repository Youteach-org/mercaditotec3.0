# MercaditoTec Android: seguridad y criterios de publicación

Estado: preparación técnica, **NO APROBADO PARA DISTRIBUCIÓN PÚBLICA**.
El sitio y la aplicación Android deben aprobarse por separado. Compilar una APK no significa que Play Protect la considere segura.

## Implementación que ya existe
- Proyecto Kotlin/WebView en `android/`, no TWA.
- Paquete `com.mercaditotec.android`; minSdk 26, targetSdk 35.
- Solo permiso de Internet en el manifiesto fuente; comprobar permisos finales tras la fusión del manifiesto.
- `android:allowBackup=false`, HTTPS exclusivo, errores TLS cancelados, WebView Safe Browsing activo.
- Acceso local de WebView deshabilitado, JavaScript habilitado únicamente porque la web necesita ejecutarlo, sin interfaces JavaScript nativas.
- Enlaces externos restringidos a protocolos esperados; `intent:` exclusivo de WhatsApp.
- Descargas limitadas a la web y al host de almacenamiento configurado, sin enviar cookies a servidores de terceros ni descargar paquetes ejecutables desde la app.
- APK de debug solo para pruebas; la versión de producción debe ir firmada con una clave privada distinta.

## Firma de producción: obligatorio antes de compartir
1. Crear una clave de firma **propia, permanente y respaldada** en un dispositivo controlado por el responsable. Nunca subir archivos `.jks` ni claves al repositorio, chat o capturas.
2. Configurar en GitHub Actions cuatro secrets: `MERCADITOTEC_RELEASE_KEYSTORE_BASE64` (archivo JKS codificado en Base64), `MERCADITOTEC_RELEASE_STORE_PASSWORD`, `MERCADITOTEC_RELEASE_KEY_ALIAS` y `MERCADITOTEC_RELEASE_KEY_PASSWORD`.
3. Lanzar manualmente `Build signed MercaditoTec Android release`. No publica ni instala automáticamente. El flujo solo genera artifact si las credenciales existen y `apksigner verify` aprueba la firma.
4. Guardar la firma SHA-256 del certificado, el hash SHA-256 del archivo, el archivo JKS y contraseñas en lugares seguros y separados. Conservar la misma clave para futuras actualizaciones.
5. No distribuir el archivo `app-debug.apk`, APK sin firma o versiones generadas con claves distintas; no pedir a los usuarios que desactiven Play Protect.
6. Distribuir posteriormente solo el APK de producción desde un origen HTTPS oficial y mostrar su versión y SHA-256. Evitar acortadores o mirrors no controlados.

## Verificación del desarrollador fuera de Google Play
- La verificación en Android Developer Console es independiente de publicar en Google Play.
- Para distribución amplia, revisar la cuenta de distribución completa, los requisitos de identidad, cuota y registro del paquete y certificado. No asumir que una cuenta gratuita de distribución limitada sirve para toda la comunidad.
- El despliegue de requisitos de verificación inició el 30-sep-2026 en cuatro países y se expande globalmente en 2027. Consultar siempre https://developer.android.com/developer-verification antes de publicar.
- Incluso con firma y verificación puede aparecer la advertencia normal de instalar fuera de una tienda. Nunca se puede prometer ausencia de alertas de Play Protect.

## Integración web de privacidad (incorporada en esta PR)
- Página pública `/aviso-de-privacidad`, accesible desde registro, inicio de sesión, términos, perfil y configuración.
- La página de derechos ARCO **ya existía** en `/configuracion/privacidad`; usa el API de solicitudes existente y una bandeja de superadministración. La PR añade enlaces más visibles, no reemplaza ni duplica esos procesos.
- La dirección proporcionada es el domicilio particular del responsable: NO publicarla ni utilizarla en la aplicación. Se eliminaron los datos personales del árbol de trabajo público. Buscar y validar con asesoría jurídica un domicilio profesional o administrativo real para cumplir el artículo 15 LFPDPPP. No inventar un domicilio.
- `scripts/check-android-release-readiness.mjs` interrumpe la compilación firmada si no hay responsable legal o aprobación explícita. El script valida campos, **no sustituye la revisión legal ni la auditoría de producción**.
- La identificación y el domicilio legal público siguen pendientes; `reviewedForPublication` debe continuar en false. No aprobar ni distribuir APK hasta definir solución legal válida, verificar la operación del aviso y firmar la aplicación.
- El flujo `workflow_dispatch` debe estar disponible en la rama predeterminada de GitHub para activarse manualmente; al moverlo a la rama predeterminada, seleccionar el código revisado y garantizar que el certificado correcto y secrets estén configurados.

## Bloqueos de publicación aún abiertos
- **Aviso de privacidad público:** borrador sin información residencial. Es imprescindible disponer de una identidad y domicilio legal válidos antes de publicarlo. También faltan revisión de transferencias, plazos de conservación efectivos, contratos con proveedores y atención real de derechos ARCO.
- **Condiciones de uso:** revisar que correspondan al catálogo moderado, chat y compraventa real; conservar el enlace accesible a usuarios sin sesión.
- **APK compatible con Android 16:** targetSdk=35 por compatibilidad actual; Google Play exige targetSdk 36 para nuevas publicaciones desde el 31-ago-2026. Antes de considerar Play Store, actualizar a 36 y comprobar recortes de interfaz y navegación edge-to-edge en teléfonos y tablets. Para APK descargada directamente no se aplica esa fecha como regla de Play.
- **Pruebas físicas:** Android 8, 12, 14, 15 y 16 si hay dispositivos; login y sesión Firebase; contraseña/recuperación; fotos por selector y cámara; chat y enlaces WhatsApp; reportes, pedidos y pedidos cancelados; volver con Atrás; pérdida de red; TLS inválido; intentos de enlaces `javascript:`, `file:`, `content:`, `http:`, `intent:` de terceros; descargas de imágenes.
- **Prueba de seguridad de la versión firmada:** revisar `apksigner verify --verbose --print-certs`, `aapt dump permissions`, análisis estático, dependencia actualizada, hash SHA-256, escaneo Play Protect y comportamiento en teléfono limpio.
- **Comprobar producción web:** HTTPS, certificados, no mixed-content, ausencia de tokens en URLs, controles backend de acceso y moderación, acceso/cancelación de datos. Código revisado no equivale a servicios efectivamente desplegados.

## Fuente de referencia
- https://developer.android.com/developer-verification
- https://developer.android.com/studio/publish/app-signing
- https://developer.android.com/privacy-and-security/security-best-practices
- https://developer.android.com/google/play/requirements/target-sdk

Ninguna etapa de esta propuesta despliega cambios en la web ni genera una APK lista para usuarios. La validación final requiere resultado de CI y pruebas reales.
