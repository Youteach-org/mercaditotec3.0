# 2026-10-16 — Calificaciones que evitan nombres y descripciones

## Problema
En captura real de Brave/Android en horizontal, la calificación emoji se superponía a las cintas de nombre de varias tiendas (FresaSauria, Ke-Rollos, cine, etc.). Cambios anteriores de posición fija (`top:11%`, `bottom:32%`) fallaban al variar la longitud del nombre, el tamaño de la nube o la orientación. El usuario pidió "ponlo donde no estorbe".

## Solución
- El botón continúa siendo una insignia muy pequeña, emoji + entero, únicamente para usuario autenticado.
- En vez de una única posición `top/left` fija, se examinan varias posiciones **dentro del área de la nube**, de izquierda a derecha y de arriba abajo.
- Se miden los rectángulos reales de la cinta con el nombre, el panel de descripción, el logo y las notas manuscritas con `getBoundingClientRect()`. Una posición libre con separación tiene preferencia. Si el espacio está muy ocupado se escoge el menor solapamiento posible, penalizando especialmente textos.
- La insignia queda oculta hasta calcular su ubicación, impidiendo el parpadeo inicial encima del nombre.
- ResizeObserver, cambio de orientación, resize y carga de tipografías vuelven a calcular ubicación sin solicitudes a Firebase.
- La nube continúa teniendo el mismo diseño, el logo sigue anclado a la derecha y la selección de valoración funciona con el pop-up ya existente.
- No se afecta la composición inclinada de tiendas, paginación, ni el backend.
- Test de geometría de espacios libres y test de integración estática que obliga a usar posición calculada en lugar de píxeles/porcentajes fijos.

## Archivos
- `components/store/ratingBadgePlacement.ts`
- `components/store/ratingBadgePlacement.test.ts`
- `components/store/StoreEmojiRating.tsx`
- `components/store/compact-card-ratings.test.ts`
- `app/globals.css`

## Publicación
Integrar en `feature/student-stores` tras pasar CI y desplegar Worker de Cloudflare.
