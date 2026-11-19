# Datos de demostración

Para la evaluación del viernes 20-11: la base queda poblada con 2 entrenadores y 8 alumnos que llevan de 4 a 8 semanas usando la app, con rutinas, sesiones, series, récords, sugerencias, peso y medidas, observaciones y alertas. Sirve para revisar la app instalada (cada cuenta muestra algo distinto) y la base con un manager como DBeaver.

El script es `apps/api/prisma/demo.ts` (empaquetado en `dist/demo.js`). No escribe las filas a mano: llama a las mismas funciones que usan las rutas de la API (encuesta, rutinas, iniciar, guardar series y cerrar sesiones, detección de alertas, observaciones), así las sugerencias, los récords y las alertas salen con las reglas de verdad.

## Contraseña

Todas las cuentas tienen la misma: **`GymTrack2026!`** (G y T mayúsculas, termina con signo de exclamación).

## Cuentas

Todas en el dominio `demo.gymtrack.cl`, zona America/Santiago, con encuesta respondida.

| Correo | Rol | Qué tiene | Qué mostrar |
| --- | --- | --- | --- |
| `francisca@demo.gymtrack.cl` | Entrenadora | 4 alumnos (Valentina, Benjamín, Josefa y Matías), la plantilla «Full body 3 días» y un código de invitación vigente | Clientes con adherencia y alertas, Alertas (estancamiento, baja con motivos, dolor), Ficha de cada alumno, Ajustar cargas, Invitar |
| `tomas@demo.gymtrack.cl` | Entrenador | 2 alumnos (Catalina y Joaquín), la plantilla «Torso / Pierna intermedio» y un código vigente | Una alerta «sin sesiones», una de dolor ya resuelta con su consejo y una de estancamiento nueva |
| `valentina@demo.gymtrack.cl` | Alumna de Francisca | 7 semanas de «Full body 3 días» (copia de la plantilla), progresión limpia, peso y medidas | Hoy con la sugerencia de sentadilla sobrescrita por la entrenadora (con nota), Progreso con récords y volumen que sube, una observación con respuesta de la entrenadora |
| `benjamin@demo.gymtrack.cl` | Alumno de Francisca | 6 semanas de «Full body 3 días»; el press de banca no sube hace semanas | Alerta de estancamiento en press de banca que le pide sus motivos (se puede responder en la demo) |
| `josefa@demo.gymtrack.cl` | Alumna de Francisca | 6 semanas de «Torso / Pierna 4 días» con días fijos; las dos últimas sesiones bajan | Alerta de baja de rendimiento con sus motivos ya enviados (sueño y estrés), vista por la entrenadora |
| `matias@demo.gymtrack.cl` | Alumno de Francisca | 2 semanas de «Adaptación» (archivada) y 5 de «Fuerza 5×5» (método lineal); en la última sesión dejó la sentadilla por dolor | Alerta de dolor de 8 en la rodilla izquierda (sentadilla) y la baja de volumen de esa sesión; dos rutinas en el historial |
| `catalina@demo.gymtrack.cl` | Alumna de Tomás | 6 semanas de «Recomposición 3 días»; dejó de entrenar hace 9 días; bajó de peso y de cintura | Alerta «sin sesiones», un consejo del entrenador sobre la rutina, medidas con tendencia a la baja |
| `joaquin@demo.gymtrack.cl` | Alumno de Tomás | 8 semanas de «Torso / Pierna intermedio» con días fijos, 4 días por semana, el que más series tiene | Un dolor de hombro hace unas semanas: alerta resuelta, consejo del entrenador y la carga del press militar bajada un 10 % (sugerencia sobrescrita) |
| `fernanda@demo.gymtrack.cl` | Alumna sola | 5 semanas de su propia rutina «Glúteo y pierna 3 días» y un ejercicio propio («Patada de glúteo en polea»); la sentadilla búlgara se estancó | Alumna sin entrenador: rutina propia, ejercicio propio en la biblioteca. Su alerta de estancamiento no tiene entrenador (`trainer_id` nulo) y ya tiene sus motivos (tiempo), por eso la app ya no se los pide |
| `ignacio@demo.gymtrack.cl` | Alumno solo | 4 semanas de su propia rutina «Full body en casa» (mancuernas y peso corporal) | Alumno principiante que entrena en la casa, flexiones y plancha que progresan en repeticiones y segundos |

Las fechas son relativas al día en que se carga: la última sesión de casi todos es de los días anteriores, así Hoy, la racha, la adherencia de la semana y las alertas se ven al día. Los códigos de invitación vigentes cambian en cada carga: el script los muestra al terminar y también se ven en la app (Perfil del entrenador > Invitar).

## Qué queda en la base

En DBeaver, conectado a la base de la API, todo lo de la demo cuelga de los usuarios con correo `@demo.gymtrack.cl`:

```sql
SELECT id, email, rol, nombre, apellido, created_at FROM users WHERE email LIKE '%@demo.gymtrack.cl' ORDER BY rol, email;
```

| Tabla | Qué trae |
| --- | --- |
| `users`, `client_profiles`, `survey_responses` | Las 10 cuentas, el perfil de cada alumno (objetivo, experiencia, días, hora habitual, consentimiento) y su encuesta |
| `trainer_clients` | Los 6 vínculos activos y un código vigente por entrenador |
| `routines`, `routine_days`, `routine_exercises` | 2 plantillas en borrador, 8 rutinas activas (3 son copias de plantilla, con `origen_id`) y 1 archivada |
| `workout_sessions`, `workout_sets` | Unas 150 sesiones cerradas y 2.200 series (cambia un poco según el día de la semana en que se carga), con peso, repeticiones, RIR, RPE, 1RM estimado, duración, volumen y calorías |
| `personal_records`, `progression_suggestions` | Los récords (los superados quedan con `superado_at`) y una sugerencia por ejercicio y sesión, aplicadas, pendientes o sobrescritas |
| `body_metrics` | Peso semanal de cada alumno, y medidas cada dos semanas para algunos |
| `observations` | Observaciones de los alumnos, consejos de los entrenadores y el dolor de Matías |
| `alerts`, `drop_reports` | Las alertas de la tabla de arriba (nuevas, vistas y resueltas) y los motivos de Josefa y Fernanda |
| `exercises` | Los 67 ejercicios base (no los toca) y el ejercicio propio de Fernanda |

## Cargarla en el servidor (Dokploy)

Antes: la API desplegada con la versión que trae `prisma/demo.ts` (la imagen tiene que tener `dist/demo.js`), las migraciones al día y la semilla base cargada. En el Dokploy del proyecto las dos últimas son automáticas al arrancar la API.

1. Dokploy > el servicio de la API > **Terminal**.
2. Corre:

   ```bash
   node dist/demo.js
   ```

3. Tarda de 15 segundos a unos pocos minutos según la máquina (crea unas 150 sesiones con sus series). Al terminar muestra la contraseña, cada cuenta con sus sesiones, récords, medidas y alertas, y el código vigente de cada entrenador. Si la base no tiene los ejercicios base, se detiene y dice que falta la semilla (`node dist/semilla.js`).

Se puede correr las veces que haga falta: cada vez borra las cuentas `@demo.gymtrack.cl` con todo lo que depende de ellas y las vuelve a crear con fechas de ese día. Conviene correrla el jueves en la noche o el viernes temprano, así el viernes todo se ve al día. Para sacar la demo después de la evaluación:

```bash
node dist/demo.js --borrar
```

En local (con `DATABASE_URL` en `apps/api/.env` o en el entorno): `pnpm --filter api db:demo`.

## Cuidados

- **Solo toca el dominio de la demo.** Nunca borra otras cuentas ni los ejercicios base. Si alguien de afuera se vinculó con el código de un entrenador de la demo, al volver a cargarla pierde ese vínculo y las rutinas que ese entrenador le escribió (su cuenta y sus sesiones quedan).
- **Correo.** `demo.gymtrack.cl` no recibe correo, así que la API ni lo intenta: `src/correo/index.ts` omite los destinos de ese dominio y de los reservados para pruebas (`.test`, `.example`, `.invalid`, `.localhost`) y lo deja en el log como «correo omitido». «Olvidé mi contraseña» no le llega a estas cuentas: para mostrar el correo, usa una cuenta con un correo real.
- **Avisos al celular.** Las cuentas parten sin dispositivos registrados. Si en la demo alguien toca «Activar avisos» con una cuenta de la demo, recibe los avisos de verdad (por ejemplo, al responder los motivos de Benjamín le llega el aviso a Francisca).
- **No trae** fotos de progreso (necesitan archivos en el almacenamiento) ni cuentas con Google.
