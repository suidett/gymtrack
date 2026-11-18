# GymTrack

App móvil para que un personal trainer arme, siga y ajuste las rutinas de sus alumnos, y para que el alumno registre cada sesión aunque entrene solo. El PRD técnico está en el documento del proyecto (ver `docs/`). Qué está hecho, qué está probado y qué falta: [docs/ESTADO-DEL-CODIGO.md](docs/ESTADO-DEL-CODIGO.md).

## Qué hay hoy

- **API** (`apps/api`): cuentas con Argon2id y JWT, perfil y encuesta, código de invitación y vínculo, biblioteca de ejercicios, rutinas (crear, asignar, activar, duplicar, archivar), entrenar (Hoy, sesiones con ids del celular, series, cierre con récords y sugerencias, cola sin señal), progreso (volumen, PRs, peso, medidas y fotos), alertas (estancamiento, baja, sin sesiones, dolor) con motivos y consejos, clientes y ficha del entrenador, y un worker con la detección nocturna y la purga de cuentas. 61 rutas bajo `/v1` más `/health`, todas con su esquema Zod en `packages/shared/src/api`.
- **App** (`apps/mobile`): la marca «Más» (modo gimnasio oscuro y modo claro) y las 20 pantallas de las maquetas, conectadas a la API: Acceso y Encuesta; Hoy, Registro de sesión, Completada, Rutinas, Editor, Ejercicios, Progreso, Perfil y Motivos del alumno; Clientes, Ficha, Alertas, Ajustar cargas y Perfil del entrenador. La sesión en curso y la cola de envíos quedan en el teléfono, así se entrena sin señal.
- **Lo que no hay todavía**: push, subir fotos y videos desde la app, Firebase Storage, OpenAPI. Nada se probó en un teléfono. El detalle está en el estado del código.

## Para el equipo

Lee [GUIA-DEL-EQUIPO.md](GUIA-DEL-EQUIPO.md): el mapa de zonas, las convenciones y qué revisar antes de subir. La API tiene su propia guía en [apps/api/README.md](apps/api/README.md).

## Estructura

```
apps/
  mobile/        Expo SDK 57 + Expo Router + NativeWind 4 (Tailwind 3) + Reanimated.
    src/app/         rutas delgadas: (acceso), (alumno), entrenador/, sesion/, rutina/, cliente/...
    src/features/    la lógica por área: acceso, entrenar, alumno, entrenador (y sesion de la 0.1)
    src/components/  kit de interfaz (ui/) con las piezas de sistema.css
    src/lib/         sesión y tokens (sesion/), tema, fuentes, vibración
    src/store/       estado persistido de la 0.1 (zustand)
  api/           Fastify 5 + Zod + Prisma 7 sobre PostgreSQL 16.
    src/cuentas/     registro, ingreso, tokens y GET /v1/me
    src/compartido/  permisos, vínculo, errores, paginación y registro de módulos
    src/modulos/     perfil, ejercicios, rutinas, sesiones, progreso, alertas, entrenador
    src/worker/      tareas noche, deteccion y purga (src/worker.ts las arranca)
    src/correo/      Resend, consola y memoria; plantillas
    prisma/          esquema (22 tablas), migraciones y semilla (67 ejercicios, 15 consejos)
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
| `pnpm export:android` | Arma el bundle de Android con Metro, sin emulador; es la prueba de humo |
| `pnpm --filter api build` | Empaqueta la API, el worker y la semilla en `apps/api/dist` |

## Publicar con EAS

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

El perfil `preview` genera un APK instalable. Antes de la primera compilación hay que fijar `android.package` en `apps/mobile/app.json` y `EXPO_PUBLIC_API_URL` con la URL de staging.

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
| Un correo | `apps/api/src/correo/plantillas.ts` |
