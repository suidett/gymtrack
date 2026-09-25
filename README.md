# GymTrack

App móvil para que un personal trainer arme, siga y ajuste las rutinas de sus alumnos, y para que el alumno registre cada sesión aunque entrene solo. El PRD técnico completo está en el documento del proyecto (ver `docs/`).

## Qué hay en esta versión (0.1)

- Cinco pestañas: Hoy, Rutinas, Progreso, Ejercicios, Perfil.
- Biblioteca de 67 ejercicios con búsqueda y filtro por grupo, más ejercicios propios que se crean, editan y eliminan.
- Editor de rutinas: días, ejercicios por día con series, rango de repeticiones, RIR objetivo, descanso, incremento de carga y peso inicial; método de progresión por rutina; activar, duplicar, archivar y eliminar.
- Bitácora de sesión: tabla serie / kg / reps / RIR editable, marcar serie o fallo, añadir y quitar series, descanso automático con +30 s y saltar, observación por ejercicio, salir y retomar.
- Cierre de sesión: volumen, tiempo, kcal (si hay peso corporal), récords y la sugerencia de la próxima sesión por ejercicio (doble progresión y lineal; el resto se calcula como doble progresión y lo dice).
- Progreso: volumen por semana, récords por ejercicio e historial de sesiones.
- Los datos se guardan en el teléfono (AsyncStorage). No hay cuentas, servidor, entrenador, fotos ni notificaciones todavía: eso viene en las fases 1, 3 y 4 del PRD.

## Para el equipo

Lee [GUIA-DEL-EQUIPO.md](GUIA-DEL-EQUIPO.md): el mapa de zonas, las convenciones y qué revisar antes de subir.

## Estructura

```
apps/
  mobile/        Expo SDK 57 + Expo Router + NativeWind 4 (Tailwind 3).
    src/app/         rutas: una pantalla por archivo, delgadas
    src/features/    la lógica grande por zona (hoy: sesion/)
    src/components/  kit de interfaz (ui/) y componentes compartidos
    src/store/       estado persistido (zustand) y selectores
    src/lib/         ids, tiempo, formato
packages/
  shared/        Tipos, biblioteca de ejercicios, fórmulas, motor de progresión, cierre de sesión. Con pruebas.
  tokens/        Colores, fuentes y radios: objeto JS y preset de Tailwind.
```

## Cómo correrlo

Requisitos: Node 22 y pnpm 12 (`npm install -g pnpm`).

```bash
pnpm install
pnpm dev
```

`pnpm dev` levanta Metro y muestra un código QR. Se abre con Expo Go en el teléfono (misma red wifi) o con `a` en un emulador de Android. `pnpm web` lo abre en el navegador.

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `pnpm typecheck` | TypeScript en la app y en shared |
| `pnpm test` | Pruebas de fórmulas y progresión (vitest) |
| `pnpm lint` | ESLint con la configuración de Expo |
| `pnpm export:android` | Compila el bundle de Android con Metro, sin emulador; sirve como prueba de humo |

## Publicar con EAS

Con una cuenta de Expo y `eas.json` ya incluido:

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

El perfil `preview` genera un APK instalable. Antes de la primera compilación, cambiar `android.package` en `apps/mobile/app.json` por el identificador definitivo.

## Diseño

Tres colores (menta `#45B392` para acción, violeta `#8B7BE8` para celebración y descanso, tinta `#131A17` para texto), Manrope para texto e IBM Plex Mono para cifras. Todo sale de `packages/tokens`; en la app se usa como clases de NativeWind (`bg-primary`, `text-ink-muted`, `font-sans-bold`, `font-mono-semibold`). Las clases de fuente llevan el peso en el nombre porque en React Native cada peso es una familia distinta.

## Dónde tocar

| Quiero cambiar | Archivo |
| --- | --- |
| Una pantalla | `apps/mobile/src/app/...` (una ruta por archivo) |
| La bitácora de sesión | `apps/mobile/src/features/sesion/` |
| Un componente de interfaz | `apps/mobile/src/components/ui/` |
| Cómo se guardan y cambian los datos | `apps/mobile/src/store/useStore.ts` |
| La regla de progresión o el 1RM | `packages/shared/src/progression.ts` y `formulas.ts` (con sus pruebas al lado) |
| La biblioteca de ejercicios | `packages/shared/src/exercises.seed.ts` |
| Colores o fuentes | `packages/tokens/index.js` |
