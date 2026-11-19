# Validaciones de forma y de fondo

Qué revisa GymTrack en cada campo que la persona escribe o elige, dónde se revisa y qué mensaje ve. Sirve para mostrárselo al profesor y para probar a mano. Corte del jueves 19 de noviembre de 2026 (rama `marca/v2-logo-botones`).

- **Forma**: tipo, formato, obligatorio, largo, rango y teclado. Se revisa con los esquemas Zod de `packages/shared/src/api/` (los mismos objetos en la app y en la API).
- **Fondo**: reglas que dependen de otros datos o del sentido (fecha futura, edad, IMC, correo repetido, código vencido, alumno ajeno, sesión cerrada). Las que no necesitan la base viven en `packages/shared/src/api/reglas.ts` y las usan la app y la API; las que sí la necesitan las revisa solo la API (`apps/api/src/modulos`).
- **Dónde**: *App* (se marca junto al campo antes de enviar), *API* (la fuente de verdad) o *Ambas*. Todo lo que dice *Ambas* también lo rechaza la API aunque alguien se salte la app (curl, Postman).
- **Cómo responde la API**: 400 `VALIDATION_ERROR` para la forma, 409 para un estado o un dato repetido, 422 `BUSINESS_RULE` (u otro código 422 del catálogo) para el fondo. Todos con el sobre `{ error: { code, message, details } }`; `details.campo` dice el campo (`respuestas.peso_kg`, `dias.1.nombre`) y `details.motivo` el texto en español que la app pone bajo ese campo. Zod responde en español también en lo que no tiene mensaje propio («Llave desconocida: "owner_id"»).

Inventario: **93 campos** en 21 pantallas de la app y **235 campos** de entrada (cuerpo, query y params) en las 56 rutas de la API que reciben algo. Las pruebas automáticas de cada regla llevan el id `VAL-xxx` de la última columna: `packages/shared/src/__tests__/reglas.test.ts`, `apps/mobile/src/features/*/__tests__/validaciones.test.ts` y `apps/api/test/validaciones.int.test.ts`.

## Acceso

### PAN-01 Ingreso (`POST /v1/auth/login`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Ingresas como | Entrenador o Cliente | Solo arma el destino; la cuenta ya tiene su rol | App | — | |
| Correo | Obligatorio, con @ y final (.cl), hasta 254, sin espacios, minúsculas; teclado de correo, sin mayúscula automática | Que exista y no esté por borrarse (no se dice cuál de los dos falló) | Ambas | «Escribe tu correo.» · «Revisa el correo: le falta la @.» · «Revisa el correo: le falta el final, como .cl o .com.» · «No pudimos ingresar: el correo o la contraseña no coinciden» | APP-001, VAL-007 |
| Contraseña | Obligatoria, hasta 128 (una vieja más corta no da 400) | Coincide con el hash; 5 intentos por minuto por IP | Ambas | «Escribe tu contraseña.» · «Demasiados intentos» con cuenta regresiva | APP-002, APP-003 |

### PAN-02 Crear cuenta (`POST /v1/auth/register`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Cómo vas a usar GymTrack | Obligatorio: entrenador o cliente | No se cambia después | Ambas | «Elige cómo vas a usar GymTrack.» | APP-006 |
| Nombre, Apellido | Obligatorios, 1 a 80 sin espacios de los bordes, solo letras (con tildes y ñ), espacios, guiones, apóstrofos y punto; empieza con letra | — | Ambas | «Escribe tu nombre.» · «Tu nombre puede tener hasta 80 caracteres.» · «Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.» | VAL-001, VAL-003 |
| Correo | Igual que en Ingreso | No repetido (sin mirar mayúsculas): 409 `EMAIL_TAKEN` | Ambas | «Ya hay una cuenta con este correo.» con «Ingresar con él» y «Recuperar contraseña» | APP-007, VAL-001 |
| Contraseña | 8 a 128; regla visible «Al menos 8 caracteres · te faltan 2» | No es de las más usadas (12345678, password, qwerty123...) ni un solo carácter repetido; no es el correo ni lo que va antes de la @ | Ambas | «Esa contraseña es muy fácil de adivinar. Usa otra.» · «La contraseña no puede ser tu correo.» | VAL-004, VAL-005 |

### Google · «Completa tu cuenta» (`POST /v1/auth/google`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| id_token (lo da Google) | JWT de tres tramos, hasta 4096 | Firma, emisor, vencimiento, audiencia y correo verificado; cuenta ya atada a otra cuenta de Google da 401 | API | «No pudimos ingresar con Google» y sus variantes | GOO-001 a 017 |
| Rol, Nombre, Apellido | Los tres o ninguno; mismas reglas que Crear cuenta | Si el correo ya tiene cuenta, entra sin pedirlos | Ambas | Los de Crear cuenta | VAL-001 |

### PAN-03 Recuperar y Restablecer (`/v1/auth/password/forgot` y `/reset`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Correo | Igual que en Ingreso | Responde 202 igual exista o no (no delata cuentas); 3 enlaces por hora por correo y 10 por IP | Ambas | «Límite de envíos» con la hora en que se puede volver a pedir | APP-009 |
| Enlace (token) | Obligatorio, hasta 512 | Vencido (1 hora), usado o inventado responden igual: 400 `RESET_TOKEN_INVALID` | API | «Enlace vencido» con «Pedir otro» | APP-010 |
| Contraseña nueva | 8 a 128 | No fácil de adivinar (la misma lista) | Ambas | «Esa contraseña es muy fácil de adivinar. Usa otra.» | VAL-006 |

## PAN-04 Encuesta (`POST /v1/me/survey`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| 1 Objetivo, 2 Experiencia, 4 Lugar | Una opción de la lista | — | Ambas | «Siguiente» queda deshabilitado sin respuesta | APP-011 |
| 3 Días por semana | 2, 3, 4 o 5 | — | Ambas | «Elige de 2 a 5 días.» | |
| 5 Minutos por sesión | 30, 45, 60 o 90 | — | Ambas | «Elige 30, 45, 60 o 90 minutos.» | |
| 6 Fecha de nacimiento | Día, mes y año completos; día que exista en ese mes; teclado numérico | No futura; de 14 a 100 años con el día de hoy en la zona del alumno (422) | Ambas | «Completa el día, el mes y el año.» · «Revisa el día: febrero de 2001 tiene 28 días.» · «Para usar GymTrack necesitas tener 14 años o más.» · «Revisa el año: la edad máxima es 100 años.» | APP-012, VAL-010 |
| 7 Altura | 120 a 230 cm, entero; teclado numérico | — | Ambas | «Escribe un número entre 120 y 230.» | APP-012, VAL-011 |
| 8 Peso | 30 a 300 kg, un decimal con coma; teclado decimal | Con la altura, IMC de 12 a 70 (422 en `respuestas.peso_kg`) | Ambas | «Escribe un número entre 30 y 300.» · «Revisa tu altura y tu peso: juntos no calzan.» | VAL-011, VAL-012 |
| 9 Lesiones | Al menos una; cada zona una vez; «Ninguna» sola | — | Ambas | «Elige al menos una opción.» · «Cada zona va una sola vez.» | |
| 9 Detalle de lesiones | Opcional, hasta 500 | Se borra si eligió «Ninguna» | Ambas | El campo no deja escribir más de 500 | |
| 10 Código del entrenador | Opcional; 6 letras y números, mayúsculas automáticas | Que exista y esté vigente (7 días): 404 `INVITATION_NOT_FOUND`; usado: 409 `INVITATION_USED`; ya tiene entrenador: 409 `ALREADY_LINKED`; 10 fallidos por hora: 429 | Ambas | «Ese código no existe o ya venció. Revísalo, pídele uno nuevo a tu entrenador o sigue sin él.» · «Ese código ya se usó...» | APP-013, INT-034 |
| Consentimiento de salud | Casilla obligatoria | Sin ella no se guarda nada: 422 `CONSENT_REQUIRED` | Ambas | «Terminar» deshabilitado hasta marcarla | APP-014 |

Un 422 de la API lleva a la pregunta que falló con el motivo de la regla debajo (VAL-013).

## Alumno

### PAN-15 Perfil (`PATCH /v1/me`, `POST /v1/me/trainer/link`, `DELETE /v1/me`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Nombre, Apellido (Datos personales) | Las reglas de Crear cuenta; el error va bajo el campo | — | Ambas | Los de Crear cuenta | VAL-003, VAL-042 |
| Modo gimnasio, Unidades | true o false; kg o lb | — | Ambas | Si la API falla, vuelve al valor anterior y avisa | |
| Descanso entre series | 30 s a 5 min, de 15 en 15 | — | Ambas | «El mínimo es 30 segundos.» · «El máximo es 5 minutos.» | APP-038, INT-020 |
| Recordatorio para entrenar | true o false; hora HH:MM de 00:00 a 23:59 (solo API) | Solo alumnos (el entrenador: 422) | Ambas | «La hora va como HH:MM, de 00:00 a 23:59.» | PERM-28, VAL-042 |
| (cuerpo vacío) | Al menos un campo | — | API | «Manda al menos un campo para cambiar.» | VAL-042 |
| Código del entrenador | 6 letras sin tilde ni ñ y números | Las de la pregunta 10 | Ambas | «Ese código no existe o ya venció. Pídele uno nuevo a tu entrenador.» · «Ya tienes entrenador. Desvincúlate primero.» | VAL-044 |
| Para confirmar, escribe BORRAR | Igual a BORRAR sin mirar mayúsculas | Borra a los 30 días | App | «Borrar mi cuenta» queda deshabilitado | APP-035 |

`GET /v1/me` trae ahora `recordatorio_activo` y `recordatorio_hora` de `client_profiles` (antes solo PATCH los devolvía; VAL-043).

### PAN-06 a PAN-08 Rutinas: nueva, editar y detalle (`POST /v1/routines`, `PATCH` y `PUT /days`, `/assign`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Nombre de la rutina | 1 a 80 | — | Ambas | «Ponle un nombre para encontrarla después.» · «El nombre va hasta 80 caracteres.» | APP-021, VAL-037 |
| Cómo progresa | Uno de los 6 métodos | — | Ambas | — | |
| Semanas | 1 a 24 | — | Ambas | El más y menos se frena en 24 | VAL-033 |
| Días | 1 a 14 | Para activar, ningún día vacío (422 `ROUTINE_EMPTY`) | Ambas | «Agrega al menos un día.» · «La rutina va hasta 14 días.» · «Agrega al menos un ejercicio o quita este día.» | APP-021, VAL-037 |
| Nombre del día | 1 a 40 | No se repite en la rutina (sin tildes ni mayúsculas) | Ambas | «El día 2 no tiene nombre.» · «Pierna A: Ya hay otro día con ese nombre.» (en el segundo) | VAL-032, VAL-037 |
| Qué día de la semana | Lunes a domingo o sin día fijo | Dos días no caen el mismo día de la semana; «Duplicar día» deja la copia sin día fijo | Ambas | «Empuje: Ya hay otro día el lunes.» | VAL-032 |
| Ejercicio (de la biblioteca) | UUID; hasta 30 por día | Visible para quien arma la rutina (base, propio o del entrenador): 422 `EXERCISE_NOT_OWNED` | Ambas | «Un día va hasta 30 ejercicios.» | |
| Series | 1 a 10 | — | Ambas | El más y menos se frena en 10 | VAL-033 |
| Repeticiones mín. y máx. | Enteros desde 1 | Mínimo no pasa al máximo (422 `REPS_RANGE_INVALID`); hasta 60 con carga o peso corporal; en los de tiempo son segundos, de 5 en 5, hasta 600 (422) | Ambas | «Sentadilla en Pierna: el mínimo de repeticiones pasa al máximo.» · «Las repeticiones van hasta 60 por serie.» · «Un ejercicio de tiempo va hasta 600 segundos.» | INT-064, APP-022, VAL-038 |
| RIR objetivo | 0 a 10 (la app ofrece 0 a 4+) | — | Ambas | — | |
| Descanso | 0 a 10 min, de 15 en 15 s | — | Ambas | El más y menos se frena en 10:00 | VAL-033 |
| Incremento | 0 a 50 kg (la app ofrece 0 a 10) | — | Ambas | — | |
| Carga inicial | 0 a 500 kg | Solo en ejercicios con carga | Ambas | El más y menos se frena en 500 | VAL-033 |
| Esquema | Normal, descendentes o cluster | — | Ambas | — | |
| Nota para tus clientes | Hasta 500 | Solo la escribe el entrenador | Ambas | El campo no deja escribir más de 500 | |
| Asignar a clientes | Un UUID por cliente | Solo a un alumno con vínculo activo contigo: si no es tuyo, 404 y no se crea nada | API | «No encontramos lo que buscas.» | VAL-047 |

### PAN-09 y PAN-10 Ejercicios: biblioteca y ejercicio propio (`GET` y `POST /v1/exercises`, `PATCH /:id`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Buscar | Hasta 80; `%` y `_` se buscan como texto | — | Ambas | — | SEG-013 |
| Filtros de grupo y equipo | De la lista cerrada | — | Ambas | — | |
| Nombre | 1 a 80, con al menos una letra | No repetido entre la biblioteca y tus propios ejercicios, sin tildes, mayúsculas ni espacios de más (409 `CONFLICT`, al crear y al renombrar) | Ambas | «Ponle un nombre.» · «El nombre necesita al menos una letra.» · ««Press de banca» ya está en la biblioteca.» · «Ya tienes un ejercicio llamado «X».» | VAL-036, VAL-039 |
| Grupo muscular, Equipo | Obligatorios, de la lista cerrada («Otro» se cambió por Kettlebell: la API no lo conocía) | — | Ambas | «Elige un grupo.» · «Elige el equipo.» | |
| Cómo lo registras | Kilos y reps, solo reps o tiempo | Con sesiones cerradas no se cambia (409 `EXERCISE_HAS_HISTORY`) | Ambas | «El ejercicio ya tiene sesiones registradas.» | |
| Cómo se hace | Opcional, hasta 2000 | — | Ambas | «Las instrucciones van hasta 2000 caracteres.» | VAL-036 |
| Borrar | — | No si está en una rutina activa (409 `EXERCISE_IN_ACTIVE_ROUTINE`) | API | «El ejercicio está en una rutina activa.» | |

### Anotar en un ejercicio y en la sesión (`POST /v1/observations`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Observación o Dolor | Uno de los dos (el consejo es solo del entrenador: 422) | — | Ambas | «El consejo es solo del entrenador.» | INT-110 |
| Dónde (zona) | Obligatoria en un dolor, 1 a 60 | Va solo con un dolor | Ambas | «Indica dónde te duele.» · «La zona y la intensidad van solo con un dolor.» | VAL-034 |
| Cuánto molesta | Entero de 1 a 10 (0 es «sin dolor»: no se registra) | Con 7 o más, alerta al entrenador al instante | Ambas | «La intensidad va de 1 a 10.» · «Con 7 o más, Camila recibe un aviso al instante.» | INT-147, VAL-034 |
| Texto | 1 a 1000 (un dolor sin texto lleva «Dolor en rodilla, 6 de 10.») | Va sobre un ejercicio, sesión, serie o rutina tuya | Ambas | «Escribe qué quieres anotar.» · «La observación va hasta 1000 caracteres.» | INT-110, VAL-034 |

### PAN-11 a PAN-13 Sesión en curso y cierre (`POST /v1/sessions`, `PUT /sets`, `POST /finish`, `/sync/sessions`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Id de sesión y de serie | UUID v7 del celular | El mismo id es la misma sesión (sin duplicar) | API | — | INT-090 |
| Inicio y cierre | ISO 8601 con zona | No más de 24 h en el futuro (reloj del teléfono); el cierre no antes del inicio (422) | API | «La fecha está demasiado en el futuro. Revisa la hora del teléfono.» · «El cierre no puede ser antes del inicio.» | SYNC-018, VAL-048 |
| Kilos | 0 a 500, de 2,5 en 2,5 | — | Ambas | El más y menos se frena en 0 y 500 | VAL-031 |
| Repeticiones | 1 a 60 en la app | Hasta 60 con carga o peso corporal, 600 s en los de tiempo (422); una serie hecha necesita al menos 1, salvo al fallo (422) | Ambas | «Las repeticiones van hasta 60 por serie.» · «Una serie hecha necesita al menos 1 repetición. Si no salió ninguna, márcala al fallo.» | VAL-030, VAL-031 |
| RIR | 0 a 4+ en la app; 0 a 10 en la API | — | Ambas | «El RIR va de 0 a 10.» | VAL-031 |
| Duración | 0 a 24 h | No más larga que el tiempo entre el inicio y el cierre (60 s de holgura, 422) | API | «La duración no puede ser más larga que el tiempo entre el inicio y el cierre.» | VAL-048 |
| Cerrar dos veces | — | El mismo teléfono recibe el mismo resumen; otro teléfono, 409 `SESSION_CLOSED`; guardar series en una cerrada, 409 | API | «La sesión ya está cerrada y no se puede editar» | INT-100, VAL-048 |
| Otra sesión en curso | — | Una sola en curso por alumno (409 `SESSION_IN_PROGRESS`) | API | «Ya tienes una sesión en curso.» | |
| Dolor general del cierre | Zona 1 a 60 e intensidad 1 a 10 | Con 7 o más, alerta | API | — | INT-102 |

### PAN-14 Progreso: peso, medidas y fotos (`POST /v1/me/body-metrics`, `POST /v1/me/photos`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| Peso | 30 a 300 kg, de 0,1 en 0,1 | — | Ambas | «El peso va de 30 a 300 kg.» | VAL-020 |
| Cintura, Cadera, Pecho, Brazo, Muslo | Cintura 40 a 250, cadera y pecho 50 a 250, brazo 15 a 80, muslo 25 a 120 cm; grasa 3 a 70 % (solo API) | Al menos un valor; null es «no lo medí» y no borra lo que había ese día | Ambas | «El brazo va de 15 a 80 cm.» · «Escribe al menos el peso o una medida.» | VAL-020, VAL-021 |
| Fecha | AAAA-MM-DD (o `medido_at` con zona) | No futura ni de hace más de un año en la zona del alumno; una fila por día | API | «La fecha no puede ser futura.» · «La fecha puede ser de hasta un año atrás.» | INT-121, VAL-022 |
| Foto: toma, tipo, tamaño | Frente, lado o espalda; JPEG, PNG o WebP; 1 byte a 10 MB | La primera pide el consentimiento (422 `CONSENT_REQUIRED`); fecha no futura ni de hace más de un año | API (la app todavía no sube fotos) | «La foto puede pesar hasta 10 MB.» · «La fecha no puede ser futura.» | INT-123, VAL-023 |

### PAN-20 Motivos de la baja (`POST /v1/me/drop-reports`)

| Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- |
| ¿Qué pudo influir? | Al menos uno de los 6, cada uno una vez | La alerta es tuya, pide motivos y no tiene ya un reporte (409) | Ambas | «Marca al menos una opción para enviar.» · «Ya mandaste tus motivos para esta alerta.» | INT-136, VAL-040 |
| Comentario | Hasta 500 | Obligatorio si marcaste «Otro» | Ambas | «Cuéntanos cuál es el otro motivo.» | VAL-040 |

## Entrenador

| Pantalla | Campo | Forma | Fondo | Dónde | Mensaje | Prueba |
| --- | --- | --- | --- | --- | --- | --- |
| PAN-16 Clientes | Buscar, filtro | Hasta 80; todos, hoy, revisar o sin rutina | Solo sus clientes con vínculo activo | Ambas | — | |
| PAN-17 Ficha | Consejo o respuesta | 1 a 1000 | Solo a un alumno con vínculo activo (404) | Ambas | «Escribe el consejo antes de enviarlo.» · «El mensaje va hasta 1000 caracteres.» | INT-112, VAL-045 |
| PAN-18 Alertas | Qué hiciste al resolver | Cargas, consejo, rutina o nada; cada una una vez | «Nada» va sola; las acciones van solo al resolver; una resuelta no vuelve a vista (409) | Ambas | ««Nada» no va con otras acciones.» | VAL-041 |
| PAN-19 Ajustar cargas | Carga | Desde el incremento hasta 500 kg | Ya usada por una sesión: 409 `SUGGESTION_USED` | Ambas | «Esa sugerencia ya se usó en una sesión.» | VAL-046 |
| PAN-19 Ajustar cargas | Rango de repeticiones | Enteros desde 1 | Mínimo no pasa al máximo (422); hasta 60 o 600 s según el ejercicio (422) | Ambas | «Las repeticiones van hasta 60 por serie.» | VAL-035 |
| PAN-19 Ajustar cargas | Nota | Hasta 300 | — | Ambas | El campo no deja escribir más de 300 | VAL-046 |
| Perfil | Código para invitar | 6 caracteres sin 0, O, 1 ni I | Uno vigente por entrenador; pedir otro anula el anterior | API | — | INT-030 |

## Solo API (lo que la app arma sola o no muestra)

| Entrada | Forma | Fondo |
| --- | --- | --- |
| Todos los cuerpos | Estrictos: un campo de más da 400 («Llave desconocida») | — |
| `limit` y `cursor` de las listas | 1 a 100; cursor opaco hasta 512 | Un cursor alterado da 400 |
| `client_id` en las rutas `/me/...` | UUID | Solo el entrenador con vínculo activo; si no, 404 |
| Ids en la ruta (`:id`) | UUID | Lo que no existe o no es tuyo da 404 con el mismo cuerpo |
| Zona horaria (`timezone`) | IANA, hasta 64 | Que el motor la conozca |
| Dispositivo de avisos | Token de Expo o suscripción web con llaves P-256 | El endpoint solo puede ser de FCM, Apple, Mozilla o Windows |
| Tokens firmados (exportar, fotos) | Hasta 512 | Firma y 15 minutos de vigencia; si no, 404 o 403 |
| Lote sin señal (`/sync/sessions`) | 1 a 20 sesiones | Cada una se valida aparte: la inválida vuelve `rechazada` con su motivo y no frena a las demás |

## Qué cambió en este corte

- **Arreglo**: `GET /v1/me` devuelve `recordatorio_activo` y `recordatorio_hora` (leídos de `client_profiles`), igual que `PATCH /v1/me`.
- **Arreglos que rompían flujos de la app**: Registrar medidas mandaba `null` en lo no medido y la API lo rechazaba (ahora la API acepta `null` como «no lo medí» y la app no lo manda); un dolor sin texto en el detalle de ejercicio daba 400 (ahora lleva un texto armado); elegir el equipo «Otro» daba 400 (se cambió por Kettlebell).
- **Reglas nuevas compartidas** (`packages/shared/src/api/reglas.ts`): nombre con letras, contraseña fácil de adivinar o igual al correo, edad de 14 a 100 años, IMC posible, rangos de las medidas, fechas de registro hasta un año atrás, topes de 500 kg, 60 repeticiones o 600 segundos, 10 series, 24 semanas y 10 minutos de descanso, y días de una rutina sin nombre ni día de la semana repetidos.
- **Reglas nuevas solo en la API**: nombre de ejercicio repetido, repeticiones según el tipo de carga en rutinas, series y sugerencias, serie hecha con 0 repeticiones, duración más larga que la sesión, foto con fecha futura o vieja.
- **App**: cada campo tiene su `maxLength`, el error va bajo el campo con el mismo texto de la API (`detalleDeError` de `@gymtrack/shared`), y la encuesta, el editor de rutinas, Progreso, Motivos y Resolver usan las constantes del paquete compartido en vez de números propios.

## 10 casos para demostrar en vivo

Con la app web o el APK contra la API, y una cuenta de alumno nueva (los 1 a 5) o las de la demostración: `valentina@demo.gymtrack.cl` (alumna) y `francisca@demo.gymtrack.cl` (su entrenadora), contraseña `GymTrack2026!`.

| # | Dónde | Qué escribir | Qué debe salir |
| --- | --- | --- | --- |
| 1 | Crear cuenta | Nombre «Martina2», el resto bien | Bajo Nombre: «Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.» (no llama a la API) |
| 2 | Crear cuenta | Contraseña «12345678» | Bajo Contraseña: «Esa contraseña es muy fácil de adivinar. Usa otra.» |
| 3 | Crear cuenta | El correo de una cuenta que ya existe, en mayúsculas | Bajo Correo: «Ya hay una cuenta con este correo.» con «Ingresar con él» (409 de la API) |
| 4 | Encuesta, pregunta 6 | 1 de enero de 1920 | «Revisa el año: la edad máxima es 100 años.» y no avanza |
| 5 | Encuesta, preguntas 7 y 8 | Altura 125, peso 290 | En el peso: «Revisa tu altura y tu peso: juntos no calzan.» |
| 6 | Nueva rutina | Dos días llamados «Pierna A» (o los dos fijados el lunes) y tocar Guardar | Arriba «Falta 1 cosa para guardar» con «Pierna A: Ya hay otro día con ese nombre.» (o «...: Ya hay otro día el lunes.») y el segundo día en rojo |
| 7 | Ejercicios, nuevo ejercicio | Nombre «press de banca» | Bajo Nombre: ««press de banca» ya está en la biblioteca.» (la API responde 409 si se fuerza) |
| 8 | Motivos de la baja | Marcar solo «Otro» y enviar sin comentario | Bajo Comentario: «Cuéntanos cuál es el otro motivo.» |
| 9 | Anotar en un ejercicio, Dolor | Elegir Rodilla, intensidad 7, sin texto | Se guarda como «Dolor en rodilla, 7 de 10.» y Francisca recibe la alerta de dolor; con curl e intensidad 0 la API responde 400 «La intensidad va de 1 a 10.» |
| 10 | API con curl | `POST /v1/me/body-metrics` con `{"brazo_cm": 150}` | 400 `VALIDATION_ERROR`, `details.campo: "brazo_cm"`, `details.motivo: "El brazo va de 15 a 80 cm."`; con `{"fecha":"2025-01-01","peso_kg":62}`, «La fecha puede ser de hasta un año atrás.» |

Para el 10, con el access de Valentina (sale de `POST /v1/auth/login`), y `API=https://gymtrack-api.64.176.27.203.sslip.io`: `curl -s -X POST "$API/v1/me/body-metrics" -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' -d '{"brazo_cm":150}'`.
