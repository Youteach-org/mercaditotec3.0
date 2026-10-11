# Visitas recientes y diagnóstico de actividad — 10 oct 2026

## Evidencia
Capturas del usuario de Firestore: últimos 7 días 179 mil lecturas, 2.9 mil escrituras, 137 eliminaciones; últimas 24 h 18 mil lecturas, 255 escrituras. El máximo horario visible ronda 3700, **no** es número de personas. La ventana de 24 h incluye tarde del viernes y sábado, y los cambios de limpieza diaria y listener se publicaron durante esa ventana.

## Funcionalidad
- `Admin → Consumo y rendimiento` muestra IPs distintas en el **último minuto con datos**, solicitudes y páginas vistas en 15 minutos, actividad por minuto y rutas HTTP con más tráfico.
- Fuente: Cloudflare GraphQL **read-only**, con la dataset `httpRequests1mGroups` (`uniq.uniques`, `sum.requests`, `sum.pageViews`) y `httpRequestsAdaptiveGroups` para rutas; no nuevas escrituras, lecturas ni heartbeats a Firestore.
- Las distintas IPs de cada minuto **no** se suman a un número de usuarios; usuarios diferentes en la escuela pueden compartir IP, una IP puede ser crawler y usuarios inmóviles no generan nuevas peticiones. Llamarlo **actividad reciente estimada**, no «usuarios conectados» ni «personas autenticadas en línea».
- La zona usa la cuenta Cloudflare configurada con `CLOUDFLARE_ZONE_ID` o se descubre mediante `GET /zones?name=mercaditotec.store` con token solo lectura y cache de zona un día. No guarda IPs ni identidades en Mercadito.
- Respuesta en `/api/admin/usage`, autorización de administración en servidor. Caché por Worker de 120 segundos. **Ningún temporizador automático** en el monitor: consulta al abrir o pulsar Actualizar. Retraso normal de procesamiento de Cloudflare.
- Si el token no está configurado, permiso de zone read falta, o API devuelve error, UI «Sin datos», nunca cero inventado. La gráfica de rutas mide **HTTP**, no lecturas Firestore por colección.

## Configuración
Cloudflare Worker debe tener `CLOUDFLARE_ANALYTICS_TOKEN` como **secreto de lectura de Analytics** y `CLOUDFLARE_ZONE_ID` opcional (si el token puede consultar Zones). El secreto de deploy de GitHub Actions no se reutiliza ni se expone al navegador.
Antes de pedir creación de tokens/activar API, revisar si hay acceso de solo lectura ya disponible. No habilitar Blaze ni facturación. El panel vincula Cloudflare dashboard y Firebase Console.

## Investigaciones siguientes
- Chat general `app/chat/page.tsx`: escucha hasta **100 mensajes, 500 reacciones, 100 imágenes personales** en tres listeners. Esos límites no implican 700 lecturas cada vez, pero la carga inicial puede costar muchas lecturas si hay documentos.
- Las métricas de tráfico Cloudflare no bastan para diagnosticar cuál consulta de Firestore es responsable. Para atribuir lecturas reales a consultas deben recogerse métricas agregadas client-side en un entorno controlado sin exponer datos, o usar Query Explain / métricas oficiales de Firestore.
- Evitar escribir presencia por minuto en Firestore/RTDB o DO sin calcular cuotas para 5000 usuarios.
- Verificar diferencia entre ventanas móviles de 24 horas y cuotas que reinician en medianoche de zona horaria Pacífico.

## Pruebas
`lib/monitoring/traffic.test.ts` protege contra sumar IPs distintas por minuto, mostrar cero ante falta de datos, y agregar heartbeat. El build de Cloudflare deberá pasar antes de desplegar.
