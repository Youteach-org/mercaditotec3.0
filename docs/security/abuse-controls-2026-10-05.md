# Cierre de controles contra abuso (2026-10-05)

Reacciones y referencias personales de imágenes se escriben únicamente mediante POST autenticado. Ambas operaciones comparten el presupuesto persistente de 60 mutaciones por cuenta/minuto y rechazan cuentas bloqueadas, inactivas o sin elegibilidad institucional.

Las reacciones usan SHA-256 de [uid,messageId] como ID, con lectura y cambio transaccional. El servidor determina identidad y fecha. Las referencias usan SHA-256 de la URL y exigen una ruta propia canónica o coincidencia exacta con la biblioteca compartida del servidor. No se aceptan URLs externas ni propietario declarado por el cliente.

Cloudflare aplica antes del procesamiento 3000 solicitudes de API/minuto por IP de entrada y ubicación Cloudflare. Es un límite amplio para redes del campus; no sustituye al presupuesto global de la cuenta. Las claves no usan X-Forwarded-For ni identidad de tokens sin verificar. Una configuración sin el binding falla con 503 para la API.

Las fotos de perfil usan el bucket Supabase existente, propiedad verificada y máximo 1 MB. Firebase Storage no está configurado en producción y ya no se usa para las fotos nuevas.

## Secuencia de activación

1. CI y revisión de código.
2. Publicar reglas Firestore que niegan las escrituras directas de reacciones y users/images.
3. Respaldar y migrar completamente las reacciones existentes mediante reactionMigrationPlan, preservando la selección más reciente por usuario/mensaje. Verificar IDs estables y ausencia de duplicados.
4. Desplegar Cloudflare desde feature/student-stores con el binding API_RATE_LIMITER.
5. Comprobar endpoints públicos y rechazo de sesiones falsas, y comparar las reglas publicadas con las probadas.

Clientes abiertos con la versión antigua deben recargar el chat tras la activación; las escrituras directas antiguas se rechazan. La migración conserva respaldo privado local. Las pruebas incluyen peticiones simultáneas sobre transacciones reales de Firestore en emulador.

Estos controles reducen riesgos identificados; no constituyen una garantía de invulnerabilidad. Validación completa con cuentas institucionales reales y revisión periódica de alertas siguen siendo necesarias.
