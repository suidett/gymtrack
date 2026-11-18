# Datos de prueba de GymTrack

Personas, semillas, reloj y herramientas que comparten todas las pruebas de `plan-de-validacion.md`. Si una prueba nombra a Camila, a Martina o «la semilla `piloto`», es lo que está aquí. Todo es falso: correos en el dominio reservado `gymtrack.test`, que no recibe correo real.

## Reglas

1. **Nadie usa datos reales.** Ni correos, ni nombres de probadores, ni fotos de personas. Las fotos de prueba son imágenes generadas (un rectángulo con la fecha escrita).
2. **La contraseña no está en el repo.** Todas las personas de la semilla usan la contraseña que entrega la variable `SEMILLA_CLAVE`. En local la pone tu `.env.test`, que no se commitea; en el CI la genera el job al empezar; en staging es un secreto del entorno. Nunca es una contraseña real de nadie.
3. **Los ids son fijos.** Cada persona, rutina y sesión de la semilla tiene un UUID v7 fijo (con la marca de tiempo de su fecha), así una prueba puede nombrarlo y un snapshot no cambia de una corrida a otra.
4. **Las semillas se arman con fábricas, no con SQL a mano.** Viven en `apps/api/test/fabricas.ts` (`crearEntrenadora`, `crearAlumna`, `crearRutina`, `cerrarSesion`, `registrarPeso`) y usan el mismo paquete compartido que la app, así los PRs y sugerencias sembrados son los que el motor calcularía.

## Reloj fijo

| Qué | Valor |
| --- | --- |
| «Ahora» por defecto | martes 17 de noviembre de 2026, 10:00 en America/Santiago |
| Lo mismo en UTC | `2026-11-17T13:00:00Z` (Chile está en UTC-3 en noviembre, horario de verano) |
| Cambios de horario de Chile que usan las pruebas | sábado 4 de abril de 2026 (pasa a UTC-4) y sábado 5 de septiembre de 2026 (vuelve a UTC-3) |
| Zona por defecto de las personas | America/Santiago; Martina cambia a America/Punta_Arenas solo en INT-019 |

Cómo se controla en cada nivel:

| Nivel | Cómo se fija y se mueve el reloj |
| --- | --- |
| UNI | Las funciones reciben el «ahora» por parámetro (como `ahoraIso` en `calcularCierre`). Si algo usa la fecha del sistema, `vi.setSystemTime`. |
| INT y WRK | La API y el worker leen la hora de un `reloj` inyectado (decorador de Fastify). En pruebas se crea con `RELOJ_FIJO=2026-11-17T13:00:00Z` y se mueve con `reloj.avanzar('7d')`. El worker también acepta `--ahora=<ISO>`. |
| APP | Relojes falsos de Jest (`jest.useFakeTimers({ now })`). |
| E2E | La API de prueba expone `POST /test/reloj` (solo con `NODE_ENV=test`). La app de la variante `e2e` toma la hora de un reloj de prueba que se mueve con el enlace `gymtrack://test/reloj?ahora=<ISO>`, que Maestro abre con `openLink`. Así «una semana completa» pasa en minutos sin tocar la fecha del emulador (P-39). La alternativa, si el equipo la prefiere, es cambiar la fecha del emulador con `adb shell date` en una imagen sin Google Play. |

## Personas

| Persona | Rol | Correo | Estado en la semilla `piloto` | Para qué sirve |
| --- | --- | --- | --- | --- |
| Camila Rojas | ENT | `camila.rojas@gymtrack.test` | Entrenadora desde agosto. 5 clientes activos (Martina, Sebastián, Antonia, Matías, Florencia), 1 ex clienta (Valeria). Código vigente K7P2QX. 3 plantillas. | La entrenadora de todos los flujos |
| Martina Fuentes | AV | `martina.fuentes@gymtrack.test` | Vinculada a Camila desde el 4 de agosto de 2026. Nacida el 12 de marzo de 1997 (29 años). 165 cm. Peso: 63 kg en la encuesta, 62 kg el último. Lesión: hombro derecho, leve. Rutina activa «Fuerza 4 días» (de Camila) desde el lunes 19 de octubre. Consentimiento de salud y de fotos dados. 3 fotos. Recordatorio encendido, hora habitual 19:00. | La alumna vinculada de los cinco criterios |
| Diego Muñoz | AS | `diego.munoz@gymtrack.test` | Sin entrenador. Rutina propia «Torso pierna 4 días», método lineal, activa desde el 2 de noviembre. Peso 80 kg en la encuesta y 1 registro más (2 en total). Sin consentimiento de fotos. | El alumno solo (criterio 3), y quien intenta tocar lo ajeno |
| Rodrigo Pérez | ENT | `rodrigo.perez@gymtrack.test` | Entrenador sin clientes. Tiene un código vigente propio. | El entrenador vacío y el entrenador intruso (lee a Martina y recibe 404) |
| Paula Silva | ENT | `paula.silva@gymtrack.test` | Entrenadora con un cliente, Benjamín, que tiene una alerta abierta. | Las alertas y clientes de otra entrenadora |
| Benjamín Rivas | AV | `benjamin.rivas@gymtrack.test` | Vinculado a Paula. | El cliente ajeno para Camila |
| Sebastián Morales | AV | `sebastian.morales@gymtrack.test` | Se vinculó a Camila ayer (16 de noviembre) con el código R4M8TD, que quedó usado. Sin rutina. | Hoy sin rutina con entrenador; código ya usado |
| Antonia Herrera | AV | `antonia.herrera@gymtrack.test` | Vinculada a Camila. Dolor en la rodilla izquierda de 7 de 10 el 16 de noviembre (alerta de dolor nueva). Alerta «sin sesiones» abierta. | Alertas de dolor y alertas que no se repiten |
| Matías Contreras | AV | `matias.contreras@gymtrack.test` | Vinculado a Camila. Cerró «Tirón B» hoy a las 07:05. | «Entrena hoy» y «todo al día» en Clientes |
| Florencia Castro | AV | `florencia.castro@gymtrack.test` | Vinculada a Camila. Última sesión el 2 de noviembre. Alerta «sin sesiones» resuelta el 9 de noviembre. | Alerta nueva después de una resuelta (WRK-004) |
| Valeria Núñez | AS | `valeria.nunez@gymtrack.test` | Fue clienta de Camila; se desvinculó el 1 de noviembre. Conserva 20 sesiones. | Ex clienta: Camila ya no la ve (PERM-34) |
| Sofía Lagos | Alumna | `sofia.lagos@gymtrack.test` | Cuenta creada sin encuesta. | Encuesta (INT-021 a INT-024) |
| Ignacio Vera | AS | `ignacio.vera@gymtrack.test` | Cargado directo en la base, sin encuesta ni peso. | Bordes que no deberían pasar pero no pueden romper la API (kcal null) |
| Felipe Araya | AS | `felipe.araya@gymtrack.test` | Marcado para borrado el 18 de octubre de 2026 a las 13:00 UTC (30 días exactos). 2 fotos en el bucket. | Purga (WRK-008) |
| Gonzalo Reyes | AS | `gonzalo.reyes@gymtrack.test` | Marcado para borrado hace 29 días y 23 horas. 1 foto. | No se purga antes de tiempo; no puede ingresar (INT-008) |

### Códigos de invitación

| Código | Dueño | Estado | Uso |
| --- | --- | --- | --- |
| K7P2QX | Camila | Vigente: emitido hoy a las 10:00, vence el 24 de noviembre a las 10:00 | Vincular a Diego o a Sofía |
| R4M8TD | Camila | Usado por Sebastián el 16 de noviembre | Código ya usado (INT-035) |
| H9W3NC | Camila | Vencido: emitido el 9 de noviembre a las 09:00, venció el 16 a las 09:00 | Código vencido (INT-034) |
| P3XK7M | Rodrigo | Vigente | Alumna ya vinculada que intenta otro entrenador (INT-036) |

Los tres primeros son los de la maqueta de Perfil y Clientes. Con el supuesto de P-14 (un código vigente por entrenador), H9W3NC está vencido y R4M8TD usado, así que K7P2QX es el único vigente de Camila.

## Biblioteca y contenido sembrado

- **Ejercicios base.** Los de `packages/shared/src/exercises.seed.ts` (67 hoy; el PRD pide 60; P-29). Cada uno conserva su id actual como `slug` (`press-de-banca`) y recibe un UUID v7 fijo. Las pruebas usan estos:

| Ejercicio | Slug | Tipo de carga | Incremento |
| --- | --- | --- | --- |
| Press de banca | `press-de-banca` | kg | 2,5 kg |
| Press militar | `press-militar` | kg | 2,5 kg |
| Sentadilla trasera | `sentadilla-trasera` | kg | 2,5 kg |
| Peso muerto rumano | `peso-muerto-rumano` | kg | 2,5 kg |
| Zancadas caminando | `zancadas-caminando` | kg | 2 kg |
| Jalón al pecho | `jalon-al-pecho` | kg | 5 kg |
| Remo con barra | `remo-con-barra` | kg | 2,5 kg |
| Elevaciones laterales | `elevaciones-laterales` | kg | 1 kg |
| Fondos en paralelas | `fondos-en-paralelas` | peso corporal | 2,5 kg (lastre) |
| Fondos en banco | `fondos-en-banco` | peso corporal | 0 (sin lastre) |
| Plancha frontal | `plancha-frontal` | tiempo | 0 |

- **Ejercicios propios.** Martina tiene «Hip thrust en máquina del gimnasio» (kg) y «Caminata en cinta inclinada» (tiempo). Camila tiene «Sentadilla con pausa» (kg), usada en «Fuerza 4 días».
- **Consejos.** 6 motivos (sueño, estrés, alimentación, lesión, tiempo, otro) con 3 consejos cada uno: 18 filas en `tips`. Los textos salen de la maqueta `docs/pantallas/motivos.html`.

## Rutinas

| Rutina | Dueño | Para | Método | Días | Estado en `piloto` |
| --- | --- | --- | --- | --- | --- |
| Fuerza 4 días | Camila | Martina | Doble progresión | Empuje A (press de banca, press militar, fondos en paralelas, elevaciones laterales); Tirón A (peso muerto rumano, jalón al pecho, remo con barra, curl con barra); Pierna A (sentadilla trasera, sentadilla con pausa, zancadas caminando, curl femoral acostado); Empuje B (press de banca inclinado, press de hombros con mancuernas, cruce de poleas, extensión de tríceps en polea) | Activa desde el lunes 19 de octubre; versión 2 |
| Hipertrofia 3 días | Martina | Martina | Doble progresión | 3 días | Archivada el 19 de octubre, con 30 sesiones |
| Torso pierna 4 días | Diego | Diego | Lineal | 4 días | Activa desde el 2 de noviembre |
| Base 6 semanas | Camila | Plantilla | Doble progresión | 3 días | Plantilla (`client_id` nulo) |
| Cuerpo completo 3 días | Camila | Plantilla | Lineal | 3 días | Plantilla |
| Fuerza porcentual | Camila | Plantilla | Porcentual (70, 75, 80 y 65 %) | 2 días | Plantilla; sirve para UNI-046 y CON-011 |

Cada ejercicio de «Fuerza 4 días» usa 3 o 4 series, rangos de 6 a 8, 8 a 10 o 12 a 15, RIR 1 o 2 y descansos de 60 a 150 s, como `rutinaEjemplo` de `packages/shared/src/rutina-ejemplo.ts`. Para CON-011 hay además una rutina de fixture por cada uno de los seis métodos.

## Historia de Martina en `piloto`

Entrena lunes, martes, jueves y viernes. Las sesiones van de Empuje A a Empuje B en ciclo, así que el martes 17 de noviembre (sin sesión el lunes 16) le toca **Empuje A**.

| Fecha | Día de rutina | Lo que importa para las pruebas |
| --- | --- | --- |
| Lunes 19, 26 de octubre, 2 y 9 de noviembre | Empuje A | Volumen 4.100, 4.250, 4.200 y 4.250 kg: promedio de 4.200 kg (baja de E2E-005). Press de banca: 40 × 10 × 4; 42,5 × 10, 10, 9, 9; 42,5 × 10 × 4; 45 × 9, 9, 8, 8. La sugerencia pendiente queda en 45 kg × 8 a 10 (INT-127). |
| Martes 20 y 27 de octubre, 3 y 10 de noviembre | Tirón A | Peso muerto rumano: 60 × 10 el 20 de octubre (1RM de 80 kg); después 60 × 9 (78 kg), 60 × 10 (80 kg) y 57,5 × 10 (76,7 kg). Tres sesiones sin superar 80 kg: alerta de estancamiento abierta desde el 10 de noviembre. |
| Jueves 22 y 29 de octubre, 5 y 12 de noviembre | Pierna A | Sentadilla trasera sube de 70 a 80 kg; PRs con fecha y anterior. |
| Viernes 23 y 30 de octubre, 6 y 13 de noviembre | Empuje B | Una observación de dolor de hombro de intensidad 3 el 6 de noviembre, con un consejo de Camila. |

Además: 30 sesiones de «Hipertrofia 3 días» de agosto a octubre; pesos corporales semanales desde el 4 de agosto (63 a 62 kg); medidas el 4 de agosto, el 1 de octubre y el 1 de noviembre; 3 fotos (frente, lado y espalda) del 1 de noviembre.

## Semillas

Cada semilla se carga con `pnpm --filter api semilla <nombre>` en local y con `POST /test/reset?semilla=<nombre>` en E2E.

| Semilla | Qué trae | La usan |
| --- | --- | --- |
| `base` | Solo la biblioteca de ejercicios y los consejos | E2E-001, E2E-004, E2E-007; base de todas las demás |
| `piloto` | Todas las personas, códigos, rutinas e historia de esta página | La mayoría de INT, APP (fixtures), E2E, SYNC y WRK |
| `criterio2` | Camila y Martina con «Fuerza 4 días» activa desde el 2 de noviembre y solo 2 semanas: Empuje A del 2 de noviembre (Press de banca 42,5 × 10 × 4) y del 9 de noviembre (45 × 9, 9, 8, 8) | E2E-003 |
| `estancamiento` | `piloto` sin la sesión de Tirón A del 10 de noviembre ni su alerta: quedan 2 sesiones sin superar 80 kg | INT-099 |
| `panel` | Camila con 60 clientes, cada uno con 2 semanas de sesiones; 8 de ellos con alertas abiertas | E2E-018, REN-007 en el emulador |
| `carga` | 10 entrenadores y 500 alumnos (Camila con 60), 26 semanas de historia a 4 sesiones por semana: cerca de un millón de series | REN-009 en el job `worker-volumen`; en staging va dentro de la semilla `staging` para REN-003, REN-004 y REN-008 |
| `staging` | Las personas de `piloto`, el volumen de `carga` y las cuentas de humo `humo.alumna@gymtrack.test`, `humo.entrenadora@gymtrack.test` y `humo.purga@gymtrack.test` (esta última se crea de nuevo en cada recarga, porque SEG-017 la borra y la purga; P-52) | Pruebas de humo, de carga (REN-003, REN-004, REN-008) y de seguridad contra staging |

## Cómo se deja la base limpia entre pruebas

**UNI.** No hay base.

**INT y WRK (Vitest).**

1. Antes de toda la suite se crea una base plantilla `gymtrack_plantilla`: `prisma migrate deploy` más la biblioteca y los consejos.
2. Cada worker de Vitest crea su propia base copiando la plantilla (`CREATE DATABASE gymtrack_test_<n> TEMPLATE gymtrack_plantilla`), que tarda menos de un segundo. Así los archivos corren en paralelo sin pisarse.
3. Antes de cada prueba se vacían las tablas que no son de catálogo (`TRUNCATE … RESTART IDENTITY CASCADE`) y se carga la semilla que pide el archivo.
4. El bucket de MinIO usa un prefijo por worker y se vacía al terminar cada archivo.
5. Los buzones de correo y de push están en memoria y se vacían antes de cada prueba.

**E2E (Maestro).**

1. Cada flujo empieza con `runScript` que llama a `POST /test/reset?semilla=<nombre>` y a `POST /test/reloj` con la hora que necesita.
2. La app arranca con `launchApp: { clearState: true }`, así no queda caché, cola ni tokens del flujo anterior.
3. Las rutas `/test/*` solo existen con `NODE_ENV=test`. SEG-025 prueba que en staging y producción respondan 404.

**Staging.** Las pruebas de humo usan las cuentas `humo.*` y borran lo que crean al terminar. La base de staging se recarga con la semilla `staging` cada domingo, de noche, con el timer `gymtrack-semilla-staging.timer` del VPS (domingo 07:30 UTC; `infraestructura-vps-firebase.md`).

## Buzones de prueba

| Qué | En INT y WRK | En E2E y local | En staging |
| --- | --- | --- | --- |
| Correo | Driver `memoria` de la capa de correo: las pruebas leen el último correo por destinatario | Mailpit en el `docker compose` de pruebas; `GET /test/correos?para=<correo>` devuelve el último, con el enlace | Resend con un dominio de pruebas; solo a las cuentas `humo.*` |
| Push | Driver `buzon`: guarda cada envío en memoria con destinatario, tipo y hora | El mismo driver; `GET /test/push?para=<id>` | Expo Push real a los teléfonos del equipo |
| Archivos | MinIO con un prefijo por worker (P-57) | MinIO en el `docker compose` (P-57) | El bucket de Cloud Storage para Firebase del proyecto de staging, con URLs firmadas |

## Cómo se simula la falta de señal

| Situación | En Jest | En Maestro (emulador) | En INT o nocturno |
| --- | --- | --- | --- |
| Sin señal | Mock de NetInfo con `isConnected: false` y MSW respondiendo error de red | `setAirplaneMode: enabled` y luego `disabled`; como respaldo, `adb shell svc wifi disable` y `svc data disable` | No aplica |
| Señal que va y viene | MSW que alterna error y 200 | `toggleAirplaneMode` a mitad del flujo | Toxiproxy con `timeout` y `reset_peer` |
| Respuesta perdida después de que el servidor procesó | MSW que procesa y responde error | Toxiproxy entre el emulador y la API | Toxiproxy con `limit_data` en la bajada (SYNC-006) |
| Red lenta (4G) | No aplica | Emulador con `-netspeed lte -netdelay lte` | k6 con latencia simulada |
| Servidor caído | MSW con 503 | `docker compose stop api` desde el job | Se detiene el contenedor de la API |

Toxiproxy queda entre el emulador y la API en `10.0.2.2:8666` (el emulador ve al host en `10.0.2.2`); la app de la variante `e2e` apunta ahí con `EXPO_PUBLIC_API_URL`.
