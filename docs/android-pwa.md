# MercaditoTec: instalación como aplicación Android

La misma web en https://mercaditotec.store es la fuente de verdad. No hay segundo backend ni duplicación de cuentas.

## PWA

- Next.js App Router expone el manifiesto desde `app/manifest.ts`.
- El inicio en modo app es `/marketplace`; el identificador es `/` y el alcance es todo el dominio.
- Los iconos PNG 192 y 512 se derivan del icono existente `app/icon.svg` (sin rediseño).
- `public/sw.js` únicamente guarda `/offline.html`. No guarda datos privados, respuestas del API, chat ni páginas autenticadas.
- El registro del service worker se realiza en producción mediante `PwaRegistration`.
- El funcionamiento completo requiere Internet.

## Prueba tras desplegar

1. Comprobar que `https://mercaditotec.store/manifest.webmanifest` devuelva JSON correcto.
2. Verificar que `/icons/mercaditotec-192.png` y `/icons/mercaditotec-512.png` devuelvan imágenes PNG.
3. Verificar `/sw.js` y `/offline.html` (200).
4. Abrir la web en Chrome Android; menú de tres puntos > Instalar aplicación.
5. Abrirla desde el icono del teléfono y comprobar inicio de sesión, navegación, tiendas, chat y enlaces externos.
6. En Chrome DevTools > Application revisar el manifiesto, el scope, el service worker y comprobar que no haya cachés de datos de usuarios.

## Próxima fase: Play Store

Preparar un Android App Bundle mediante **Trusted Web Activity** a partir de la PWA estable. Será necesario verificar la titularidad del dominio con Digital Asset Links, configurar firma y cuenta de Google Play Console, y completar las pruebas y declaraciones exigidas por Google. No se ha creado ni publicado un AAB en esta fase.
