# Guía del equipo

Cómo está armado GymTrack, dónde se toca cada cosa y qué revisar antes de subir. Léela una vez; después el mapa de abajo alcanza. Lo que está hecho y lo que falta está en [docs/ESTADO-DEL-CODIGO.md](docs/ESTADO-DEL-CODIGO.md).

## Cómo correrlo en tu computador

1. Instala Node 22, pnpm 12 (`npm install -g pnpm`) y Docker.
2. En la raíz: `pnpm install`.
3. La API: `pnpm --filter api db:levantar`, `cp apps/api/.env.ejemplo apps/api/.env`, `pnpm --filter api db:migrar`, `pnpm --filter api db:sembrar` y `pnpm --filter api dev` (queda en `localhost:3000`).
4. La app: `cp apps/mobile/.env.ejemplo apps/mobile/.env` y pon en `EXPO_PUBLIC_API_URL` la IP de tu computador en el wifi (el teléfono no ve tu `localhost`; el emulador de Android usa `10.0.2.2`). `pnpm dev` muestra el QR para Expo Go.
5. Antes de subir: `pnpm typecheck`, `pnpm lint`, `pnpm test` y, si tocaste la API, `pnpm --filter api test:int`. El CI corre lo mismo, con PostgreSQL, más `pnpm export:android`.

`test:int` vacía `gymtrack_test` antes de cada caso: si dos personas (o dos agentes) lo corren a la vez contra la misma base, se pisan. Para correr en paralelo, crea otra base en el mismo contenedor y pásala en `DATABASE_URL`.

## El mapa: qué zona toca cada cosa

| Quiero | Zona | Archivo |
| --- | --- | --- |
| Cambiar Ingreso, Crear cuenta, Recuperar o la Encuesta | Acceso | `apps/mobile/src/features/acceso/` |
| Cambiar Hoy, el registro de la sesión, el descanso o Completada | Entrenar | `apps/mobile/src/features/entrenar/` |
| Cambiar Rutinas, el editor, Ejercicios, Progreso, Perfil o Motivos | Alumno | `apps/mobile/src/features/alumno/` (sirve a los dos roles donde la maqueta es la misma) |
| Cambiar Clientes, la Ficha, Alertas, Ajustar cargas o el Perfil del entrenador | Entrenador | `apps/mobile/src/features/entrenador/` |
| Qué pantallas ve cada rol y a dónde redirige | Rutas | `apps/mobile/src/app/_layout.tsx` y el `_layout.tsx` de cada grupo |
| Un botón, tarjeta, hoja, chip, paso o campo que se repite | Kit de interfaz | `apps/mobile/src/components/ui/` |
| Cómo se guardan los tokens, se renueva la sesión o se llama a la API | Sesión | `apps/mobile/src/lib/sesion/` |
| El tema (gimnasio o clara) | Diseño | `apps/mobile/src/lib/tema.tsx` y `packages/tokens/` |
| La forma de una ruta de la API (entrada, salida, errores) | Contrato | `packages/shared/src/api/<módulo>.ts` |
| Una regla de negocio en el servidor | API | `apps/api/src/modulos/<módulo>/` |
| Quién puede hacer qué (entrenador, alumno vinculado, alumno solo) | API | `apps/api/src/compartido/permisos.ts` |
| Una tabla o un campo | Datos | `apps/api/prisma/schema.prisma` y una migración nueva |
| La detección nocturna o la purga | Worker | `apps/api/src/worker/` |
| La regla de progresión, el 1RM o el cierre de sesión | Motor | `packages/shared/src/progression.ts`, `formulas.ts`, `cierre.ts` |
| La biblioteca de ejercicios | Datos | `packages/shared/src/exercises.seed.ts` (la semilla de la API la lee) |
| Un color, una fuente o un radio | Diseño | `packages/tokens/index.js` |

Regla general: las rutas de `src/app` son delgadas (solo montan una pantalla de `features/`). La lógica que no necesita React va en archivos puros (`logica.ts`, `contrato.ts`, `sesionLocal.ts`, `cola.ts`) con sus pruebas en `__tests__`.

## Cómo fluyen los datos

```
pantalla -> features/<área>/api.ts -> api.llamar (lib/sesion: Bearer, renueva, repite ante 401)
                                          |
                                          v
                         API /v1 (Fastify) -> módulo -> Prisma -> PostgreSQL
                                          |
pantalla <- contrato.ts / datos.ts (leen la respuesta con tolerancia) <-+
```

- **Un solo contrato**: los esquemas Zod de `packages/shared/src/api` los usa la API para validar y la app para armar los cuerpos. Los cuerpos son estrictos: un campo de más da 400. Cada área de la app tiene una prueba que pasa sus cuerpos por esos esquemas (`CON-012`).
- **Entrenar sin señal**: la sesión en curso y la cola viven en el teléfono (`features/entrenar/almacen.ts`, AsyncStorage). Cada serie se guarda al instante; la cola manda crear, series y cerrar cuando hay red, y la API es idempotente por id.
- **Ids del celular**: las sesiones y las series llevan UUID v7 generados en el teléfono (`features/entrenar/uuid7.ts`). La API rechaza otros.
- **Tokens**: solo en `expo-secure-store`. AsyncStorage guarda cachés que no son secretas (Hoy, rutinas, código de invitación).
- **El entrenador ve a su alumno** con `?client_id=` en las rutas `/me/...` (P-02). Lo ajeno da 404, nunca 403; lo que el rol no puede hacer da 403.

## Convenciones

- **Idioma**: lo que ve el usuario va en español de Chile, con tuteo, sin emojis y sin guion largo. Los textos salen de las maquetas de `docs/pantallas`. Los nombres del código también van en español (`iniciarSesion`, `alumnoObjetivo`).
- **Clases de la marca**: `bg-fondo`, `bg-sup`, `text-texto`, `text-texto-2`, `bg-accion`, `text-accion-texto`, `border-borde`, `rounded-control`. Nada de hexadecimales en las pantallas ni de los nombres de la 0.1 (`bg-primary`, `text-ink-muted`) en código nuevo. Donde no hay `className` (SVG, `placeholderTextColor`), `useTema().c`.
- **Fuentes**: nunca `font-bold`. Usa `font-sans-medium`, `font-sans-semibold`, `font-sans-bold` y `font-mono-bold` (en React Native cada peso es una familia).
- **API**: snake_case, pesos en `*_kg`, fechas ISO con zona, errores con el sobre `{ error: { code, message, details } }` y un código del catálogo (`packages/shared/src/api/errores.ts`). La app decide por el código, nunca por el texto.
- **Pruebas**: cada prueba lleva en el nombre el id del plan (`INT-099`, `APP-042`, `CON-012`). Si no hay id, dilo en el nombre.
- **Reglas del compilador de React** (las marca el lint): nada de `Date.now()` en el cuerpo de un componente, nada de `setState` directo en un efecto, nada de escribir una ref durante el render.

## Cómo están comentados los archivos

Cada archivo empieza con una cabecera por zonas: **Qué hace**, **Tócalo cuando**, **No lo toques para** y **Depende de**. Adentro, los bloques van separados con `// ── Nombre ──…`. Cuando agregues un archivo, copia la cabecera de uno vecino.

## Cómo agregar cosas

**Una ruta de la API.** Primero el contrato en `packages/shared/src/api/<módulo>.ts` (esquema y entrada en `RUTAS_<MÓDULO>`), después la ruta en `apps/api/src/modulos/<módulo>/index.ts` con `esquemaDe` y `urlDe`, y su prueba `INT-` en `apps/api/test/<módulo>/`. CON-001 falla si la ruta y el catálogo no coinciden. El paso a paso está en `apps/api/README.md`.

**Una pantalla.** La pantalla va en `apps/mobile/src/features/<área>/` y la ruta en `src/app/` solo la importa. Usa `<Pantalla>` y `<Cabecera>` del kit. Si agregas una ruta, regenera los tipos de rutas con `expo start` (o el comando de `apps/mobile`), si no `tsc` rechaza los `href` nuevos.

**Una tabla o un campo.** En `prisma/schema.prisma` y `pnpm --filter api db:nueva-migracion`. Nunca edites una migración ya aplicada.

**Un ejercicio a la biblioteca.** Una línea en `exercises.seed.ts`. Su id fijo sale del slug: no cambies el slug de uno publicado.

**Una dependencia de la app.** Con `npx expo install <paquete>` dentro de `apps/mobile`, para que Expo elija la versión compatible, y sube el `pnpm-lock.yaml`.

## Git

Ramas cortas y pull request; el CI avisa si rompe tipos, lint, pruebas (con PostgreSQL) o el bundle. Commits en español, en presente, diciendo qué cambia para el usuario («agrega el filtro por equipo en la biblioteca»).

## Lo que todavía no existe

Push (ni en la API ni en la app), subir fotos y videos desde la app, Firebase Storage, OpenAPI en `/v1/docs`, SQLite para la cola, NetInfo y pruebas en un teléfono. La lista completa, por módulo y por pantalla, está en `docs/ESTADO-DEL-CODIGO.md`.
