# Guía del equipo

Cómo está armado GymTrack, dónde se toca cada cosa y qué revisar antes de subir. Léela una vez; después el mapa de abajo alcanza.

## Cómo correrlo en tu computador

1. Instala Node 22 y pnpm (`npm install -g pnpm`).
2. Clona el repo y en la raíz: `pnpm install`.
3. `pnpm dev` levanta el servidor y muestra un QR. Escanéalo con Expo Go (mismo wifi). `pnpm web` lo abre en el navegador.
4. Antes de subir: `pnpm typecheck`, `pnpm lint` y `pnpm test`. Los tres tienen que pasar; el CI de GitHub corre lo mismo. El lint cubre la app; shared se cuida con tipos y pruebas.

## El mapa: qué zona toca cada cosa

| Quiero | Zona | Archivo |
| --- | --- | --- |
| Cambiar una pantalla del alumno (Hoy, Rutinas, Progreso, Ejercicios, Perfil) | Rutas | `apps/mobile/src/app/(tabs)/` |
| Cambiar el editor de rutinas o el selector de ejercicios | Rutas | `apps/mobile/src/app/rutina/[id]/` |
| Cambiar la bitácora de sesión (tabla de series, descanso, resumen) | Sesión | `apps/mobile/src/features/sesion/` |
| Cambiar un botón, tarjeta, campo o chip que se repite | Kit de interfaz | `apps/mobile/src/components/ui/` |
| Cambiar cómo se guardan los datos o agregar una acción (crear, editar, borrar) | Store | `apps/mobile/src/store/useStore.ts` |
| Cambiar un cálculo derivado (racha, semana, volumen por semana) | Store | `apps/mobile/src/store/selectors.ts` |
| Cambiar la regla de progresión o el texto de la sugerencia | Motor | `packages/shared/src/progression.ts` |
| Cambiar cómo se detecta un récord o qué pasa al cerrar la sesión | Motor | `packages/shared/src/cierre.ts` |
| Cambiar una fórmula (1RM, volumen, calorías) o un formato (kg, fechas) | Motor | `packages/shared/src/formulas.ts`, `format.ts` |
| Agregar o corregir ejercicios de la biblioteca | Datos | `packages/shared/src/exercises.seed.ts` |
| Cambiar la rutina de ejemplo | Datos | `packages/shared/src/rutina-ejemplo.ts` |
| Cambiar un color, una fuente o un radio | Diseño | `packages/tokens/index.js` |
| Cambiar un tipo (qué campos tiene una rutina, una serie, una sesión) | Datos | `packages/shared/src/types.ts` |

Regla general: las pantallas (`src/app`) se mantienen delgadas. Si una pantalla crece, su lógica se va a `src/features/<zona>/` y la ruta solo importa.

## Cómo fluyen los datos

```
pantalla  ->  useStore (acciones)  ->  estado en memoria  ->  AsyncStorage (se guarda solo)
    ^                                        |
    +------ useStore (selectores) -----------+
```

- Todo lo que el usuario cambia pasa por una acción del store. No se muta un objeto a mano.
- Los cálculos que no dependen de React (fórmulas, progresión, récords) viven en `packages/shared`. Tienen pruebas y no importan nada de React Native. Así la API del servidor los va a reutilizar tal cual.
- Los ids se generan en el celular (`src/lib/ids.ts`) para que la sincronización futura no duplique sesiones.

## Convenciones

- **Idioma**: todo lo que ve el usuario en español neutro chileno, con tuteo ("tu rutina", "elige"). Sin emojis. Los nombres en el código también van en español (`iniciarSesion`, `marcarSet`).
- **Fuentes**: nunca `font-bold` ni `font-semibold`. En React Native cada peso es una familia distinta: usa `font-sans-bold`, `font-sans-semibold`, `font-mono-medium`, etc.
- **Colores**: solo los tokens (`bg-primary`, `text-ink-muted`, `border-line`). Si necesitas uno nuevo, agrégalo en `packages/tokens/index.js`; no pongas hexadecimales en las pantallas.
- **Tarjetas teñidas**: usa `<Tarjeta tono="acento">`, no pases `bg-*` por className. En NativeWind dos clases del mismo grupo no se resuelven por el orden escrito.
- **Texto**: `<Txt v="secundario">` con sus variantes. Si necesitas otro color, usa `<Text className="...">` con las clases completas, no una variante más una clase que la contradiga.
- **Campos de texto**: `CampoDiferido` o `EntradaDiferida` para lo que se guarda en el store; confirman al perder el foco. `Campo` solo para estado local.
- **Confirmaciones**: `<Confirmar>` en línea. `Alert.alert` con botones no funciona en web.
- **Fechas y números**: `fmtFecha`, `fmtKg`, `fmtNum` de shared. Coma decimal, kilos.
- **Reglas del compilador de React** (las marca el lint): nada de `Date.now()` en el cuerpo de un componente (usa `ahoraMs()` o un efecto), nada de `setState` directo dentro de un efecto, nada de escribir una ref durante el render.

## Cómo están comentados los archivos

Cada archivo empieza con una cabecera que dice su zona (Rutas, Sesión, Kit de interfaz, Store, Motor, Datos, Diseño, Configuración o Utilidades), qué hace, cuándo tocarlo y de qué depende. Adentro, los bloques van separados con `// ── Nombre ──…` de 80 columnas (la sangría va aparte). Cuando agregues un archivo, copia la cabecera de uno vecino.

## Cómo agregar cosas

**Una pantalla nueva.** Crea el archivo en `src/app/` (la ruta es el nombre del archivo). Usa `<Pantalla>` y `<Cabecera atras>`. Si va en las pestañas, agrégala en `src/app/(tabs)/_layout.tsx`.

**Un ejercicio a la biblioteca.** Una línea en `exercises.seed.ts` con id único, grupo, equipo, patrón, incremento y tipo de carga. Los ids empiezan con `base-` y no se cambian una vez publicados (las sesiones guardadas apuntan a ellos).

**Un campo nuevo en un dato guardado.** Agrégalo en `types.ts` como opcional o con valor por defecto al leer: los teléfonos ya tienen datos guardados con el esquema viejo.

**Una regla de progresión.** En `progression.ts`, con su prueba al lado en `__tests__/progression.test.ts`. El texto que se le muestra al alumno sale de ahí mismo.

## Git

Trabajen en ramas cortas y abran un pull request, o suban directo a `main` si es algo chico: el CI avisa si rompe tipos, lint, pruebas o el bundle. Commits en español, en presente, diciendo qué cambia para el usuario ("agrega el filtro por equipo en la biblioteca").

## Lo que todavía no existe

Cuentas, entrenador, sincronización con servidor, fotos y videos, notificaciones. Está todo planificado en el PRD (`docs/PRD.md`). Cuando llegue el servidor, `packages/shared` es lo que se comparte con la API.
