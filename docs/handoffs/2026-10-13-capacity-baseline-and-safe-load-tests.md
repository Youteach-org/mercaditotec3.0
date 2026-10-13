# Mercadito — capacidad y línea base verificada · 2026-10-13

## Objetivo

Evaluar la capacidad de **5,000 usuarios simultáneos** sin tumbar Mercadito, comprometer datos o activar pagos imprevistos.

## Observación real de Cloudflare (no es simulación)

- Fecha del informe: 2026-10-13 18:05:41 UTC (12:05:41, CDMX).
- Fuente: GitHub Actions [Mercadito — read-only capacity baseline, run #38443944640](https://github.com/Youteach-org/mercaditotec3.0/actions/runs/38443944640), consulta de solo lectura al dataset `workersInvocationsAdaptive` mediante el token ya configurado.
- Últimas **4 horas**: **1,031 ejecuciones, 0 errores, 0 excedieron recursos**; 1,024 `success`, 7 `clientDisconnected`.
- Últimas **24 horas**: **4,326 ejecuciones, 11 errores, 11 `exceededResources` (0.25 %)**; 4,277 `success`, 38 `clientDisconnected`.
- Cuantiles CPU entregados por Cloudflare, **por estado**, no acumulables: últimas 4 h `success` p50=15070, p99=419465 (valores de dataset; comprobar unidades en documentación antes de convertir). Últimas 24 h `success` p50=15638, p99=483786; `exceededResources` p50=10000, p99=24022.
- **Interpretación:** cero errores de recursos en una ventana de cuatro horas es positivo; once en 24 horas impiden dar el incidente por completamente cerrado. No se puede atribuir causalidad a un PR sin ventanas comparables y mismo patrón de tráfico. Tampoco demuestra 5,000 conexiones activas ni el plan de facturación.
- El diagnóstico previo del 12 de octubre de 2026, documentado en #117, indicó 21 eventos `exceededResources` en una ventana de cuatro horas distinta: solo sirve como referencia de incidentes anteriores, no como comparación controlada.

## Instrumentos disponibles

1. `scripts/capacity-baseline.mjs`: consulta **4 h y 24 h de producción** solo a Cloudflare GraphQL; no visita la página, no genera solicitudes a Firebase ni guarda IP o datos personales.
2. `scripts/cloudflare-capacity-metrics.mjs`: convierte respuestas agregadas en una tabla y reporta ausencia de datos en lugar de asignar ceros falsos.
3. `.github/workflows/mercadito-capacity-baseline.yml`: workflow seguro con token existente, sin acceso de escritura a Cloudflare.
4. `scripts/capacity-load-test.mjs`: medidor de concurrencia HTTP GET y tiempos p50/p95/p99. Solo acepta `http://localhost`, `http://127.0.0.1` o **Workers totalmente aislados** que se llamen `mercaditotec-load-*.youteach-tk.workers.dev`.
   - Prohíbe expresamente `mercaditotec.store`, `mercaditotec3-0.youteach-tk.workers.dev`, vista previa antigua, dominios genéricos, rutas privadas y métodos de escritura.
   - Por defecto, incluso sobre Worker aislado admite como máximo **20 solicitudes simultáneas y 100 solicitudes totales** por ejecución.
   - Carga elevada requiere `--high-load yes` y `CAPACITY_ISOLATED_BACKEND_CONFIRMED=yes`; este permiso solo debe fijarse cuando **Firestore/Firebase, almacenamiento y cuota Cloudflare estén verdaderamente aislados y se haya revisado facturación**. No poner esta variable sobre la cuenta/BD de producción.
   - El programa puede medir hasta 5,000 solicitudes concurrentes en laboratorio **local** sin realizar operaciones de producción. Un GET no equivale a una sesión con chat o autenticación.

## Antes de probar 5,000 reales (pendiente)

1. Crear entorno de staging con **Firebase project y datos ficticios separados**, reglas equivalentes, almacenamiento separado, y cuota Cloudflare aislada o margen documentado. Nunca apuntar staging a la base de producción.
2. Preparar escenario representativo de sesiones autenticadas y listeners del chat, no solo GET públicos.
3. Validar fases **100 → 500 → 1,000 → 2,500 → 5,000**, con límite de duración, máximo de solicitudes y botón de parada. Instrumentar 429, 1102, 503, CPU p95/p99, latencia p95, Firestore document reads/writes.
4. Criterios iniciales de aceptación: 5xx < 0.5%, bloqueos legítimos 429 cercanos a cero, latencia p95 del catálogo < 2 segundos y API autenticada < 3 segundos. Ajustar junto al uso real; un escenario excediendo cuotas gratuitas no debe ejecutarse.
5. Solo después de resultados comparar Workers Free/Paid, Firebase Spark/Blaze y alternativas de hosting. **No autorizar cobros ni contratar planes automáticamente.**

## Estado

- [x] Lectura real de Cloudflare (4 h, 24 h) sin carga.
- [x] Implementación del runner de carga con límites y bloqueo de hosts de producción.
- [x] Pruebas unitarias del parser y del runner local.
- [ ] Entorno de staging realmente aislado de Firestore + cuota Cloudflare.
- [ ] Pruebas escalonadas hasta 5,000 usuarios auténticos.
- [ ] Validación de coste/capacidad o necesidad de migración.

No confundir 5,000 usuarios registrados con 5,000 simultáneos: la carga cambia considerablemente. No se garantiza gratuitamente 5,000 usuarios **interactuando** con Firestore Realtime.
