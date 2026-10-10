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

**Cuentas ya existentes sin correo de verificación:** si Firebase ya contiene el correo, el Superadmin puede recuperarlas mediante el alta (el sistema encuentra su UID) o desde su tarjeta «Activar sin correo». La identidad se consulta en Firebase y se rechazan cuentas ya verificadas, cuentas administrativas, inactivas y correos no institucionales. No se borra el perfil ni se pierden sus datos y avales.
