# GymTrack

App móvil para que un personal trainer arme, siga y ajuste las rutinas de sus alumnos, y para que el alumno registre cada sesión aunque entrene solo. El PRD técnico está en el documento del proyecto (ver `docs/`). Qué está hecho, qué está probado y qué falta: [docs/ESTADO-DEL-CODIGO.md](docs/ESTADO-DEL-CODIGO.md). Lo que hay que configurar fuera del código (Google, Firebase, EAS, VAPID, Gmail y las variables de Dokploy), paso a paso: [docs/CONFIGURAR-SERVICIOS.md](docs/CONFIGURAR-SERVICIOS.md).

## Qué hay hoy

- **API** (`apps/api`): cuentas con Argon2id y JWT más el ingreso con Google, perfil y encuesta, código de invitación y vínculo, biblioteca de ejercicios, rutinas (crear, asignar, activar, duplicar, archivar), entrenar (Hoy, sesiones con ids del celular, series, cierre con récords y sugerencias, cola sin señal), progreso (volumen, PRs, peso, medidas y fotos), alertas (estancamiento, baja, sin sesiones, dolor) con motivos y consejos, clientes y ficha del entrenador, avisos al celular (Expo para Android, Web Push para la app web del iPhone, tope de 2 al día) y correo por Resend o por Gmail con clave de aplicación. Un worker con la detección nocturna, la purga de cuentas y los recordatorios 30 minutos antes. 65 rutas bajo `/v1` más `/health`, todas con su esquema Zod en `packages/shared/src/api`.
- **App** (`apps/mobile`): la marca «Más» (modo gimnasio oscuro y modo claro) y las 20 pantallas de las maquetas, conectadas a la API: Acceso (con «Continuar con Google») y Encuesta; Hoy, Registro de sesión, Completada, Rutinas, Editor, Ejercicios, Progreso, Perfil y Motivos del alumno; Clientes, Ficha, Alertas, Ajustar cargas y Perfil del entrenador. Perfil activa los avisos del teléfono. La sesión en curso y la cola de envíos quedan en el teléfono, así se entrena sin señal. Se instala como APK en Android y como app web desde Safari en el iPhone.
- **Lo que no hay todavía**: subir fotos y videos desde la app, Firebase Storage, OpenAPI. Nada se probó en un teléfono real: ni Google, ni los push, ni el correo de Gmail (necesitan las cuentas configuradas). El detalle está en el estado del código.

## Para el equipo

Lee [GUIA-DEL-EQUIPO.md](GUIA-DEL-EQUIPO.md): el mapa de zonas, las convenciones y qué revisar antes de subir. La API tiene su propia guía en [apps/api/README.md](apps/api/README.md).

## Estructura

```
apps/
  mobile/        Expo SDK 57 + Expo Router + NativeWind 4 (Tailwind 3) + Reanimated.
    src/app/         rutas delgadas: (acceso), (alumno), entrenador/, sesion/, rutina/, cliente/...
    src/features/    la lógica por área: acceso, entrenar, alumno, entrenador (y sesion de la 0.1)
    src/components/  kit de interfaz (ui/) con las piezas de sistema.css
    src/lib/         sesión y tokens (sesion/), avisos al celular (notificaciones/), tema, fuentes, vibración
    public/          lo que la app web publica tal cual: index.html, manifest, íconos y el service worker de los avisos
    src/store/       estado persistido de la 0.1 (zustand)
  api/           Fastify 5 + Zod + Prisma 7 sobre PostgreSQL 16.
    src/cuentas/     registro, ingreso (con correo y con Google), tokens y GET /v1/me
    src/compartido/  permisos, vínculo, errores, paginación y registro de módulos
    src/modulos/     perfil, ejercicios, rutinas, sesiones, progreso, alertas, entrenador, notificaciones
    src/worker/      tareas noche, deteccion, purga y recordatorios (src/worker.ts las arranca)
    src/correo/      Resend, SMTP (Gmail), consola y memoria; plantillas
    prisma/          esquema (23 tablas), migraciones y semilla (67 ejercicios, 15 consejos)
packages/
  shared/        Tipos, fórmulas, motor de progresión, cierre de sesión y el contrato de la API
                 (esquemas Zod por módulo, códigos de error y cliente tipado en src/api/).
  tokens/        La marca «Más»: colores por tema, fuentes, radios y el preset de Tailwind.
docs/            PRD, maquetas (pantallas/), plan de pruebas (pruebas/) y el estado del código.
```

## Cómo correrlo

Requisitos: Node 22, pnpm 12 (`npm install -g pnpm`) y Docker para la base.

```bash
pnpm install
pnpm --filter api db:levantar      # PostgreSQL 16 en 127.0.0.1:5442 (bases gymtrack y gymtrack_test)
cp apps/api/.env.ejemplo apps/api/.env
pnpm --filter api db:migrar
pnpm --filter api db:sembrar       # 67 ejercicios y 15 consejos
pnpm --filter api dev              # http://localhost:3000/health
cp apps/mobile/.env.ejemplo apps/mobile/.env   # EXPO_PUBLIC_API_URL con la IP de tu computador
pnpm dev                           # Metro con el QR para Expo Go o `a` para el emulador
```

En un teléfono real, `EXPO_PUBLIC_API_URL` tiene que ser la IP de tu computador en la red (no `localhost`). El emulador de Android usa `10.0.2.2`. `pnpm web` abre la app en el navegador: la API acepta `http://localhost:*` fuera de producción (CORS).

| Comando | Qué hace |
| --- | --- |
| `pnpm typecheck` | TypeScript en shared, la app y la API |
| `pnpm lint` | ESLint (configuración de Expo en la app, typescript-eslint en la API) |
| `pnpm test` | Vitest en shared, la app y la API. Sin `DATABASE_URL` las de integración de la API se saltan con un aviso |
| `pnpm --filter api test:int` | Levanta PostgreSQL con Docker y corre toda la suite de la API. Usa `gymtrack_test` y la vacía en cada caso: de a una persona a la vez |
| `pnpm export:android` | Arma el bundle de Android con Metro (con `--clear`), sin emulador; es la prueba de humo |
| `pnpm --filter mobile export:web` | Arma la app web instalable en `apps/mobile/dist/web`, apuntada a la API del VPS |
| `pnpm --filter api build` | Empaqueta la API, el worker y la semilla en `apps/api/dist` |

## Publicar con EAS

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init                                  # una vez: crea el proyecto en expo.dev
npx eas-cli@latest build -p android --profile preview
```

El perfil `preview` genera un APK instalable que habla con la API del VPS (`EXPO_PUBLIC_API_URL` está en `eas.json`). `android.package` es `com.gymtrack.app`. La configuración de la app es `app.json` más `app.config.js`, que suma el `google-services.json` de Firebase si existe (sin él el APK se arma igual, pero sin push). Como hay `app.config.js`, `eas init` no puede escribir el id del proyecto solo: pega el `projectId` que muestra en `app.json`, en `expo.extra.eas.projectId`. Los client ID de Google y el resto, en [docs/CONFIGURAR-SERVICIOS.md](docs/CONFIGURAR-SERVICIOS.md).

## Publicar la app web para iPhone

Sin cuenta de Apple, el iPhone usa la versión web instalada desde Safari. Va en Firebase Hosting, en el sitio `gymtrack-app-5dd46` del proyecto `gymtrack-5dd46`: <https://gymtrack-app-5dd46.web.app>.

```bash
pnpm --filter mobile export:web                                  # apps/mobile/dist/web, con la API del VPS
npx firebase-tools login                                         # una vez por computador
npx firebase-tools hosting:sites:create gymtrack-app-5dd46 --project gymtrack-5dd46   # solo si el sitio no existe
npx firebase-tools deploy --only hosting:app --project gymtrack-5dd46
```

- `export:web` arma la app con `EXPO_PUBLIC_API_URL=https://gymtrack-api.64.176.27.203.sslip.io`, salvo que la definas antes del comando (por ejemplo `EXPO_PUBLIC_API_URL=http://localhost:3000` para probar contra la API local).
- La API del VPS necesita `CORS_ORIGENES=https://gymtrack-app-5dd46.web.app`; sin eso el navegador bloquea todas las llamadas y la app muestra «Sin conexión».
- `firebase.json` tiene dos sitios con target: `maquetas` (`docs/pantallas`, como siempre) y `app` (`apps/mobile/dist/web`, con toda ruta reescrita a `index.html` para Expo Router). Publica cada uno con `--only hosting:app` o `--only hosting:maquetas`: `--only hosting` publica los dos y falla si no corriste `export:web`.
- Lo que el iPhone lee para instalarla está en `apps/mobile/public/`: `index.html` (etiquetas de Apple, viewport y manifest), `manifest.json`, íconos de la marca y `sw-avisos.js`, el service worker de los avisos (`firebase.json` lo sirve sin caché).
- Para Google y los avisos la exportación necesita `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` y `EXPO_PUBLIC_VAPID_PUBLICA` (públicas): ponlas en `apps/mobile/.env.local` o antes del comando. Sin ellas la app funciona, sin el botón de Google y sin avisos en el iPhone.
- Probarla en el computador: `python3 -m http.server 4393 --directory apps/mobile/dist/web` y abre <http://localhost:4393>. Para usarla contra la API local, arma con `EXPO_PUBLIC_API_URL=http://localhost:3000`.
- Instalarla: en el iPhone abre la URL en Safari, toca Compartir y «Agregar a pantalla de inicio». Se abre a pantalla completa con el ícono de la marca. La app instalada no comparte la sesión con la pestaña de Safari: se ingresa una vez dentro de la app y la sesión queda guardada ahí.

## Diseño

La marca «Más»: en modo gimnasio, grafito `#0F1113` de fondo y ámbar `#F5B83D` para la acción; en modo claro la acción va en grafito; Archivo para el texto y JetBrains Mono para las cifras. Todo sale de `packages/tokens` (que copia `docs/pantallas/sistema.css` y `docs/marca/v2/mas/tokens.json`) y en la app se usa como clases: `bg-fondo`, `text-texto-2`, `bg-accion`, `font-sans-semibold`, `font-mono-bold`, `rounded-control`. Las maquetas de `docs/pantallas/*.html` mandan en textos, estados y orden.

## Dónde tocar

| Quiero cambiar | Archivo |
| --- | --- |
| Una pantalla | `apps/mobile/src/features/<área>/Pantalla*.tsx` (la ruta en `src/app` solo la monta) |
| Una pieza de interfaz que se repite | `apps/mobile/src/components/ui/` |
| Cómo la app llama a la API o renueva el token | `apps/mobile/src/lib/sesion/` y `features/<área>/api.ts` |
| La forma de una entrada o una respuesta de la API | `packages/shared/src/api/<módulo>.ts` (cambia la API y la app a la vez) |
| Una regla de la API | `apps/api/src/modulos/<módulo>/` |
| Quién puede hacer qué | `apps/api/src/compartido/permisos.ts` |
| Una tabla o un campo | `apps/api/prisma/schema.prisma` y `pnpm --filter api db:nueva-migracion` |
| La regla de progresión o el 1RM | `packages/shared/src/progression.ts` y `formulas.ts` |
| Un umbral de alerta | variables `UMBRAL_*` de la API (`src/modulos/alertas/umbrales.ts`) |
| Colores o fuentes | `packages/tokens/index.js` |
| Un correo | `apps/api/src/correo/plantillas.ts` (los de avisos: `apps/api/src/modulos/notificaciones/textos.ts`) |
| Cuándo sale un push y a quién | `apps/api/src/modulos/notificaciones/eventos.ts` y `recordatorios.ts` |
| El botón y los textos de «Activar avisos» | `apps/mobile/src/components/AvisosDelTelefono.tsx` y `src/lib/notificaciones/registro.ts` |
| El ingreso con Google | `apps/api/src/cuentas/google.ts` y `apps/mobile/src/features/acceso/useIngresoGoogle.ts` |
