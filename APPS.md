# APPS.md — Mapa de mini-apps del suite (JRV Tools)

Este repo (`jrv-cart-wise`) es la base técnica de un PWA multi-herramienta. Cada mini-app vive
aislada bajo `src/apps/<slug>/` y comparte solo lo que está en `src/shared/`, `src/firebase/`,
`src/stores/auth.js` y `src/router/index.js` (que arma las rutas de cada app).

**Cuando el usuario mencione el nombre de un proyecto en una conversación, usar esta tabla para
saber en qué carpeta trabajar:**

| Nombre / alias | Carpeta | Ruta base | Firestore | localStorage | Requiere login |
|---|---|---|---|---|---|
| "cart-wise", "CartWise", "el comparador de precios" | `src/apps/cart-wise/` | `/cart-wise` | Prefijo `cartwise_` (`cartwise_businesses`, `cartwise_products`, `cartwise_settings`, `users/{uid}/cartwise_cart`) | — | Sí |
| "global-exchange", "tipo de cambio", "el conversor" | `src/apps/global-exchange/` | `/global-exchange` | — (no usa Firestore) | Prefijo `global_exchange_` (`global_exchange_er_cache_v2`, `global_exchange_converter_prefs_v1`) | No |
| "calc-invoices", "calculadora de cobros", "las calculadoras" | `src/apps/calc-invoices/` | `/calc-invoices` (+ `/calc-invoices/hours`) | — (sin persistencia) | — | No |
| "lunar-garden", "calendario lunar", "fases lunares", "cuándo sembrar" | `src/apps/lunar-garden/` | `/lunar-garden` (+ `/lunar-garden/calendario`, `/lunar-garden/lotes`, `/lunar-garden/lotes/:id`) | Prefijo `lunar_garden_` (`lunar_garden_lots` + subcolección `records`) | — | Sí |
| "spray-mix", "dosificador agrícola", "calculadora de mezclas", "la bomba de fumigar" | `src/apps/spray-mix/` | `/spray-mix` (+ `/spray-mix/productos`) | — (sin Firestore) | Prefijo `spray_mix_` (`spray_mix_products_v1`) | No |
| "ahorros", "ahorro familiar", "metas de ahorro" | `src/apps/ahorros/` | `/ahorros` | Prefijo `ahorros_` (`ahorros_entities`, `ahorros_accounts`, `ahorros_goals`) + `users_by_email` (colección compartida entre apps) | — | Sí |
| "gym-log", "GymLog", "registro de entrenamientos", "rutinas de gimnasio", "plan semanal" | `src/apps/gym-log/` | `/gym-log` (+ `/gym-log/rutinas`, `/gym-log/rutinas/:id`, `/gym-log/entrenamientos`, `/gym-log/registrar`, `/gym-log/entrenar`, `/gym-log/plan-semanal`) | Prefijo `gym_log_` (`gym_log_routines`, `gym_log_workouts`, `gym_log_active_sessions`, `gym_log_weekly_plan`, `gym_log_week_overrides` — las últimas 3 con doc id = uid) | — | Sí |
| "recetas", "Recetas", "recetario", "buscador de recetas por ingredientes" | `src/apps/recetas/` | `/recetas` (+ `/recetas/recetario`, `/recetas/recetario/nueva`, `/recetas/recetario/:id`, `/recetas/recetario/:id/editar`) | Prefijo `recetas_` (`recetas_recipes`) | — | Sí |

## Piezas compartidas del host

- `src/App.vue` — shell raíz: `AppTopBar` (hamburguesa + marca + cuenta) + `AppLauncherDrawer`
  (offcanvas con la lista de apps) + `<RouterView/>` envuelto en un `div` cuya clase
  (`app-<slug>`) escopa el CSS de la app activa.
- `src/shared/apps.registry.js` — única fuente de verdad de qué apps existen, su ícono, color y
  ruta base. **Agregar una mini-app nueva empieza aquí.**
- `src/shared/views/HomeView.vue` — página de inicio (`/`) con el grid de todas las apps.
- `src/shared/views/LoginView.vue` — login único del suite (Firebase Auth, email/password).
- `src/stores/auth.js` — store de auth compartido. El login es **opcional**: cada grupo de rutas
  declara `meta.requiresAuth` (solo cart-wise lo exige hoy). El documento `users/{uid}` en
  Firestore es el perfil compartido del suite, pensado para favoritos/compartir multi-app a
  futuro (`users/{uid}/favorites_<slug>`), aunque esa función todavía no está construida.
- `src/firebase/index.js` — una sola instancia de Firebase (Auth + Firestore con
  `persistentLocalCache`) para todo el suite.

## Cómo agregar una mini-app nueva

1. Crear `src/apps/<slug>/` con su propio `routes.js`, `style.css` (escopado bajo
   `.app-<slug>`), y sus vistas/componentes.
2. Registrar la entrada en `src/shared/apps.registry.js`.
3. Importar `src/apps/<slug>/style.css` en `src/main.js`.
4. Agregar la ruta al array de `routes` en `src/router/index.js`.
5. Si usa Firestore, prefijar sus colecciones con `<slug>_` (con guiones bajos, ej.
   `calc_invoices_...`) para no chocar con las demás apps.
6. Si usa `localStorage`, prefijar sus claves con `<slug>_`.
7. Agregar esta fila a la tabla de arriba.

## Notas de migración (cart-wise)

`cart-wise` tenía datos reales en Firestore bajo colecciones sin prefijo (`businesses`,
`products`, `settings`, `users/{uid}/cart`). El código ya apunta a las colecciones con prefijo
(`cartwise_*`). El script `scripts/migrate-cartwise-collections.mjs` copia los documentos viejos a
las nuevas colecciones (no borra nada). `firestore.rules` mantiene temporalmente las reglas viejas
activas en paralelo — ver el comentario en ese archivo para el paso de limpieza final (manual,
solo después de confirmar que todo funciona).
