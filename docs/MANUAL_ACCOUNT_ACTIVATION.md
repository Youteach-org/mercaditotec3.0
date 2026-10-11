# Alta manual de usuarios sin correos

**Menú:** Administración → Usuarios → **+ Agregar usuario** (Superadmin).

1. Comprobar físicamente la identidad del alumno, número de control y correo institucional.
2. Escribir su nombre y correo institucional; confirmar la identidad. El servidor valida número de control y restricciones de ocho años.
3. El sistema crea la identidad Firebase sin verificar correo y un perfil ordinario pendiente de dos avales.
4. El servidor genera un código de 256 bits de un solo uso; únicamente se conserva su SHA-256 en Firestore. Se muestra una sola vez al Superadmin, para entrega presencial.
5. El alumno abre /activate, introduce correo, código y contraseña propia. No necesita recibir ningún mensaje.
6. El servidor comprueba el código (máximo cinco intentos, vigencia de 48 horas), cambia su contraseña usando Identity Toolkit con credencial de servicio y marca la activación presencial. El email_verified de Firebase **no se falsea**.
7. El acceso de cuentas sin email verificado únicamente se permite cuando el perfil protegido contiene registrationSource=manual_admin, manualActivationStatus=activated, manualIdentityVerifiedAt, manualIdentityVerifiedBy y coincide el correo firmado por Firebase. No concede rol administrativo ni avales.
8. Si se pierde el código, el Superadmin puede emitir otro desde la tarjeta: invalida el anterior.
9. Se registra en auditoría el alta, reemisión y activación, sin almacenar códigos ni contraseñas en el log.

**Seguridad:** los campos de cuenta y confianza están protegidos en Firestore. Todas las mutaciones administrativas requieren requireSuperadmin en el servidor. Las reglas de Firestore y Storage contienen la excepción limitada de activación manual, manteniendo la validación de correo institucional y número de control. No existen correos automáticos en este flujo.

**Recuperación:** si Identity Toolkit acepta el cambio de contraseña pero Firestore falla al registrar la activación, la cuenta no gana acceso; transcurrido el bloqueo de 2 minutos se puede repetir con el mismo código o regenerarlo desde Administración. Si falla la creación del perfil después de crear la identidad, se intenta eliminar la identidad.

**Verificación:** ejecutar vitest, revisar que el nuevo flujo no afecte registros normales y desplegar firestore.rules y storage.rules antes de habilitar la excepción en producción.

**Precaución de roles:** una cuenta presencial con correo todavía no verificado no puede recibir rol Subadmin. Para permisos elevados se conserva la comprobación de correo firmada por Firebase.

**Recuperación sin correo:** el Superadmin puede revalidar personalmente la identidad y seleccionar «Restablecer acceso con código». Esto desactiva temporalmente el acceso hasta que se utilice un código nuevo; nunca se reutiliza la contraseña anterior.

**Alcance estricto:** esta alternativa solo se permite para usuarios nuevos creados desde Administración → Usuarios. Si el correo ya existe en Firebase, el alta responde que ya existe y no modifica esa cuenta. Ninguna cuenta creada mediante registro normal podrá recibir códigos ni convertirse a alta manual. La verificación habitual por correo y los dos avales no cambian.

**Protección de despliegue:** si Cloudflare todavía no puede sincronizar las reglas de Firestore y Storage (por permisos IAM de Firebase), el alta manual y la reemisión devuelven 503 **antes de modificar ninguna cuenta**. Los registros normales no dependen de esta condición. Una vez corregidos los permisos, el servicio valida/publica las reglas antes de habilitar cada nueva alta manual.
