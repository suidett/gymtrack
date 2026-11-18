# Catálogo de casos de uso de GymTrack

Este catálogo junta todo lo que la versión 1 tiene que hacer, sacado del PRD técnico (23 de septiembre de 2026). Cada caso de uso (CU) termina en un resultado que se puede comprobar, y cada uno tiene al menos una prueba en `plan-de-validacion.md`. La cobertura está cruzada en `matriz-de-trazabilidad.md`.

## Cómo leerlo

- **Roles.** ENT es el entrenador, AV el alumno vinculado a un entrenador y AS el alumno solo. «Alumno» sin más incluye a los dos.
- **Secciones del PRD.** Se citan así: §Resumen, §Alcance, §Roles (Usuarios, roles y casos de uso), §Pantallas (Pantallas y flujos), §Arquitectura, §Datos (Modelo de datos, con sus fórmulas, métodos y detección), §API, §Seguridad, §Privacidad, §Rendimiento, §SinSeñal, §Disponibilidad, §Accesibilidad, §Compatibilidad, §Notificaciones, §Pruebas, §Publicación (todas dentro de Requisitos no funcionales), §Plan (Plan de construcción) y §Riesgos.
- **Ids que se usan en todos los archivos.** CU-xx son los casos de uso, PAN-xx las 20 pantallas, PERM-xx las celdas de la matriz de permisos, EP-xx los endpoints y P-xx los supuestos y preguntas abiertas (al final de `plan-de-validacion.md`). Cuando el PRD no define algo que la prueba necesita, el CU lo dice y apunta a su P-xx.
- **Rutas.** Todas cuelgan de `/v1`, salvo `/health`. En el texto se omite el prefijo.
- **Errores.** Siempre con el sobre `{ "error": { "code", "message", "details" } }` de §API. Los nombres de código que aparecen aquí son provisionales (P-40): las pruebas usan la constante que defina el paquete compartido.

## Índice

| Grupo | Casos de uso |
| --- | --- |
| Cuentas y acceso | CU-01 a CU-08 |
| Encuesta | CU-09, CU-10 |
| Vínculo | CU-11 a CU-14 |
| Ejercicios | CU-15 a CU-18 |
| Rutinas | CU-19 a CU-25 |
| Entrenar y sincronizar | CU-26 a CU-33 |
| Observaciones | CU-34 a CU-36 |
| Progreso | CU-37 a CU-40 |
| Sugerencias | CU-41, CU-42 |
| Alertas | CU-43 a CU-48 |
| Panel del entrenador | CU-49, CU-50 |
| Notificaciones | CU-51, CU-52 |
| Datos personales | CU-53, CU-54 |
| Worker | CU-55, CU-56 |
| Transversales | CU-57 a CU-60 |

Los 13 flujos de §Roles quedan así: flujo 1 en CU-01 a CU-06, flujo 2 en CU-09, flujo 3 en CU-11 y CU-12, flujo 4 en CU-19 y CU-20, flujo 5 en CU-21 y CU-22, flujo 6 en CU-26 a CU-30, flujo 7 en CU-34 y CU-35, flujo 8 en CU-37 y CU-38, flujo 9 en CU-39 y CU-40, flujo 10 en CU-41 y CU-42, flujo 11 en CU-43 a CU-48, flujo 12 en CU-49 y flujo 13 en CU-53 a CU-55.

---

## Cuentas y acceso

### CU-01 Crear cuenta

- **Actor:** cualquier persona sin cuenta, que elige ser entrenador o alumno.
- **PRD:** §Roles flujo 1; §Pantallas, pantalla 2; §API, Cuentas y perfil; §Datos, `users`; §Seguridad; §Arquitectura (Resend, bienvenida).
- **Precondiciones:** hay conexión; el correo no tiene cuenta.
- **Flujo principal:**
  1. Desde Ingreso toca «Regístrate».
  2. Elige «Como cliente» o «Como entrenador».
  3. Escribe nombre, apellido, correo y contraseña, y toca «Registrarme».
  4. La API crea el usuario con ese rol, guarda la contraseña con Argon2id y devuelve el usuario y un par de tokens.
  5. Sale el correo de bienvenida por Resend.
  6. El alumno entra a la Encuesta (CU-09). El entrenador entra a Clientes (CU-49), sin encuesta.
- **Alternativos:** A1. «Ya tengo cuenta» vuelve a Ingreso sin crear nada.
- **Errores:**
  - E1. Campo vacío o correo mal escrito: la app marca el campo («Escribe tu nombre.», «Revisa el correo: le falta la @.») y no llama a la API.
  - E2. Contraseña de menos de 8 o más de 128 caracteres: la app lo marca; si llega a la API, 400 con `details` del campo.
  - E3. Correo ya registrado: «Ya hay una cuenta con este correo.» (código HTTP en P-36).
  - E4. Rol distinto de `trainer` o `client`: 400.
  - E5. Sin conexión: aviso y nada se crea.
- **Reglas:**
  - El rol no cambia después del registro (§Datos, `users`).
  - Contraseña de 8 a 128 caracteres, con Argon2id (§Seguridad).
  - Correo único (§Datos, `users`).
  - Valores por defecto: zona horaria America/Santiago, unidades kg, descanso 90 s (§Datos).
  - Access de 15 minutos y refresh de 30 días (§Arquitectura); tokens en expo-secure-store, nunca en AsyncStorage (§Seguridad).
- **Endpoints:** EP-01.
- **Pantallas:** PAN-02.

### CU-02 Ingresar

- **Actor:** ENT, AV o AS con cuenta.
- **PRD:** §Pantallas, pantalla 1; §API (login y límites); §Seguridad; §Alcance (limitaciones: ingresar necesita conexión); §SinSeñal.
- **Precondiciones:** cuenta creada y no marcada para borrado; hay conexión.
- **Flujo principal:**
  1. En Ingreso elige Entrenador o Cliente, escribe correo y contraseña y toca «Ingresar».
  2. La API valida y devuelve el par de tokens.
  3. La app los guarda en expo-secure-store y baja a caché la rutina activa, la biblioteca y las últimas sesiones (§Arquitectura, Cómo funciona sin señal).
  4. Alumno sin encuesta: va a la Encuesta. Alumno con encuesta: va a Hoy. Entrenador: va a Clientes.
- **Alternativos:** A1. «Olvidé mi contraseña» lleva a CU-05. A2. «Regístrate» lleva a CU-01.
- **Errores:**
  - E1. Correo o contraseña incorrectos: 401, mensaje genérico que no dice cuál de los dos falló.
  - E2. Seis o más intentos en un minuto desde la misma IP: 429 y la pantalla muestra «Demasiados intentos» con cuenta regresiva (P-42).
  - E3. Sin conexión: estado «Sin conexión»; no hay ingreso sin red.
  - E4. Cuenta marcada para borrado: no entra (P-24).
- **Reglas:**
  - Ingresar necesita conexión (§Alcance).
  - 5 intentos de ingreso por minuto por IP (§API, 429; §Seguridad).
  - El selector Entrenador o Cliente no cambia el rol de la cuenta: la API responde con el rol guardado y la app navega según ese rol.
- **Endpoints:** EP-02.
- **Pantallas:** PAN-01.

### CU-03 Mantener la sesión abierta (vencimiento y rotación de tokens)

- **Actor:** la app, en nombre de cualquier usuario.
- **PRD:** §API, Convenciones; §Arquitectura (JWT de 15 minutos y refresh de 30 días rotativo); §Seguridad.
- **Precondiciones:** hay un par de tokens válido.
- **Flujo principal:**
  1. Cada llamada lleva `Authorization: Bearer <access>`.
  2. A los 15 minutos el access vence y la API responde 401.
  3. La app llama a `POST /auth/refresh` con el refresh, recibe un par nuevo y repite la llamada original una vez.
  4. El refresh usado queda revocado.
- **Errores:**
  - E1. Refresh vencido (más de 30 días): 401; la app vuelve a Ingreso y conserva la cola sin enviar (CU-32).
  - E2. Refresh ya usado (reutilizado): 401, se revoca toda la familia y se cierran todas las sesiones del usuario en todos los dispositivos.
  - E3. Access con firma alterada o de un usuario borrado: 401.
- **Reglas:**
  - El refresh se rota en cada uso (§API).
  - Un refresh reutilizado invalida toda la familia (§API) y cierra todas las sesiones del usuario (§Seguridad).
  - Los tokens se guardan con hash, nunca en claro (§Datos, `refresh_tokens`).
- **Endpoints:** EP-03 (y el 401 de todos los demás).
- **Pantallas:** todas; sin interfaz propia.

### CU-04 Cerrar sesión en el dispositivo

- **Actor:** ENT, AV o AS.
- **PRD:** §Pantallas, pantalla 15 («cerrar sesión»); §API (`POST /auth/logout`).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. En Perfil toca «Cerrar sesión».
  2. La API revoca el refresh actual.
  3. La app borra los tokens de expo-secure-store y vuelve a Ingreso.
- **Alternativos:** A1. Hay sesiones en la cola sin enviar: la app avisa antes de salir y ofrece esperar a que se envíen (§Riesgos, cola visible en Perfil). Qué se borra del teléfono al salir: P-51.
- **Errores:** E1. Sin conexión: la app borra los tokens locales igual; el refresh vence solo.
- **Reglas:** solo se revoca el refresh de ese dispositivo; los demás siguen vivos (§API).
- **Endpoints:** EP-04.
- **Pantallas:** PAN-15.

### CU-05 Pedir el enlace de recuperación

- **Actor:** cualquier persona.
- **PRD:** §Roles flujo 1; §Pantallas, pantalla 3; §API (forgot, 429); §Alcance (solo por correo y con conexión); §Seguridad.
- **Precondiciones:** hay conexión.
- **Flujo principal:**
  1. Desde Ingreso toca «Olvidé mi contraseña» y escribe su correo.
  2. Toca «Enviar enlace».
  3. La API responde 202 siempre. Si el correo existe, manda por Resend un enlace que vale una hora.
  4. La pantalla muestra «Enlace enviado» y permite reenviar (la maqueta espera 60 s entre envíos).
- **Errores:**
  - E1. Correo mal escrito: error en el campo, sin llamada.
  - E2. Cuarto pedido en una hora para el mismo correo: 429 y estado «Límite de envíos».
  - E3. Sin conexión: aviso; la recuperación necesita red (§Alcance).
- **Reglas:**
  - 202 siempre, exista o no el correo, para no revelar cuentas (§API).
  - Enlace de una hora (§Roles flujo 1).
  - 3 recuperaciones por hora por correo (§API; §Seguridad).
  - El token del enlace se guarda con hash (§Datos, `password_resets`).
- **Endpoints:** EP-05.
- **Pantallas:** PAN-03.

### CU-06 Guardar la contraseña nueva desde el enlace

- **Actor:** quien recibió el correo.
- **PRD:** §Pantallas, pantalla 3; §API (reset); §Datos (`password_resets`, `usado_at`).
- **Precondiciones:** tiene un enlace vigente sin usar.
- **Flujo principal:**
  1. Abre el enlace; la app abre «Nueva contraseña».
  2. Escribe la nueva y toca «Guardar contraseña».
  3. La API valida el token, guarda el hash nuevo, marca el token como usado y revoca todos los refresh del usuario.
  4. La pantalla muestra «Contraseña guardada» y lleva a Ingreso.
- **Errores:**
  - E1. Enlace de más de una hora: estado «Enlace vencido» con «Pedir otro enlace».
  - E2. Enlace ya usado: igual que vencido.
  - E3. Contraseña de menos de 8 o más de 128 caracteres: error en el campo; si llega a la API, 400.
- **Reglas:** el reset revoca todos los refresh (§API); el enlace es de un solo uso (§Datos, `usado_at`).
- **Endpoints:** EP-06.
- **Pantallas:** PAN-03.

### CU-07 Ver y editar perfil y ajustes

- **Actor:** ENT, AV o AS.
- **PRD:** §Pantallas, pantalla 15; §API (`GET` y `PATCH /me`); §Datos (`users`); §Pantallas (modo gimnasio 1e); §Compatibilidad (coma decimal, kilos por defecto).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Abre Perfil: nombre, rol, desde cuándo, rutinas hechas, racha y adherencia; datos personales; unidades; descanso predeterminado; notificaciones; modo gimnasio; mi entrenador.
  2. Cambia un ajuste (por ejemplo, unidades a libras o descanso a 120 s).
  3. La API guarda el cambio y la app lo aplica sin reiniciar.
- **Alternativos:**
  - A1. Modo gimnasio: la app cambia al tema oscuro de alto contraste.
  - A2. Unidades en libras: la app muestra todo en libras y sigue mandando kilos a la API (P-32).
  - A3. Notificaciones: activa o apaga el recordatorio y el aviso de fin de descanso (CU-51).
- **Errores:**
  - E1. Descanso fuera de rango: la maqueta acota de 30 s a 5 minutos; fuera de eso, 400.
  - E2. Intento de cambiar el rol o el correo por `PATCH /me`: el campo se rechaza (400) y el rol no cambia.
  - E3. Zona horaria que no existe: 400.
- **Reglas:**
  - El rol no cambia después del registro (§Datos).
  - Pesos siempre en kilos en la API; la conversión a libras es de la app (§API, Convenciones).
  - Por defecto descanso de 90 s y zona America/Santiago (§Datos).
- **Endpoints:** EP-07, EP-08.
- **Pantallas:** PAN-15.

### CU-08 Registrar el dispositivo para notificaciones push

- **Actor:** la app, después de ingresar.
- **PRD:** §API (`POST /me/push-tokens`); §Arquitectura (Expo Push); §Datos (`push_tokens` con hash).
- **Precondiciones:** ingresó y aceptó el permiso de notificaciones de Android.
- **Flujo principal:** la app obtiene el token de Expo y lo registra con su plataforma; la API lo guarda con hash.
- **Alternativos:** A1. El mismo token llega dos veces: no se duplica. A2. El usuario niega el permiso: no hay push, pero todo lo demás funciona y las alertas se ven en la app.
- **Errores:** E1. Token con formato inválido: 400.
- **Reglas:** los tokens se guardan con hash (§Datos).
- **Endpoints:** EP-11.
- **Pantallas:** ninguna propia.

## Encuesta

### CU-09 Responder la encuesta inicial

- **Actor:** AV o AS, la primera vez que entra.
- **PRD:** §Roles flujo 2; §Pantallas, pantalla 4 y «Las 10 preguntas de la encuesta»; §Datos (`survey_responses`, `client_profiles`, `body_metrics`); §Privacidad (consentimiento expreso).
- **Precondiciones:** cuenta de alumno sin encuesta guardada.
- **Flujo principal:**
  1. La encuesta aparece sola al primer ingreso, con barra de avance y «Pregunta n de 10».
  2. Responde una pregunta por pantalla: objetivo, experiencia, días por semana, dónde entrena, minutos por sesión, fecha de nacimiento, altura en cm, peso en kg, lesiones (opciones más texto libre) y código del entrenador (opcional).
  3. En el paso final marca la casilla de consentimiento expreso para datos de salud (CU-57) y toca «Terminar».
  4. La API guarda las 10 respuestas enteras con fecha y versión, llena `client_profiles` y crea el primer registro de peso corporal.
  5. Si escribió un código válido, queda vinculado (CU-12).
  6. Va a Hoy.
- **Alternativos:**
  - A1. «Atrás» vuelve a la pregunta anterior sin perder respuestas.
  - A2. «Seguir sin código» en la pregunta 10.
  - A3. Lesión «ninguna» excluye las demás opciones.
- **Errores:**
  - E1. Número fuera de rango (altura o peso): «Escribe un número entre … y …».
  - E2. Fecha imposible («Revisa el día»).
  - E3. Menor de la edad mínima: no avanza (P-13).
  - E4. Código que no existe o venció: «Ese código no existe o ya venció…», con opción de seguir sin él.
  - E5. Falla al guardar: estado «No se pudo guardar» con reintento, sin perder las respuestas.
  - E6. Sin consentimiento marcado: no se puede terminar.
- **Reglas:**
  - 10 preguntas fijas, iguales para todos; nadie la personaliza (§Alcance).
  - Se guarda entera y no se edita (§Datos, `survey_responses`).
  - El peso queda como primer registro de peso corporal (§Pantallas, pregunta 8).
  - El botón final dice «Terminar», no «Crear mi rutina» (§Pantallas).
  - Aparece una sola vez (§Pantallas, flujo del alumno).
  - El entrenador no tiene encuesta.
- **Endpoints:** EP-09; EP-18 si trae código.
- **Pantallas:** PAN-04.

### CU-10 Consultar la encuesta y responder una versión nueva

- **Actor:** el alumno (la suya); ENT (la de su cliente vinculado, desde la ficha).
- **PRD:** §API (`GET /me/survey`; «la segunda vez crea otra versión»); §Datos (`survey_responses`); §Pantallas, pantalla 17.
- **Precondiciones:** hay al menos una respuesta guardada.
- **Flujo principal:** el alumno o su entrenador leen la respuesta vigente con su fecha y versión.
- **Alternativos:** A1. Un segundo `POST /me/survey` crea otra fila; la primera queda intacta (P-12).
- **Errores:** E1. ENT consulta la encuesta de un alumno que no es suyo: 404. E2. ENT intenta responder la encuesta: rechazado (PERM-31).
- **Reglas:** nunca se edita una respuesta guardada (§Datos).
- **Endpoints:** EP-10, EP-09, EP-16.
- **Pantallas:** PAN-17.

## Vínculo entrenador y alumno

### CU-11 Generar un código de invitación

- **Actor:** ENT.
- **PRD:** §Roles flujo 3; §API (`POST /trainer/invitations`); §Datos (`trainer_clients`); §Pantallas, pantallas 15 y 16.
- **Precondiciones:** cuenta de entrenador; hay conexión.
- **Flujo principal:**
  1. En Clientes toca «Invitar».
  2. La API genera un código de 6 caracteres que vence en 7 días y crea la fila con estado `invitado`.
  3. La app muestra el código y la fecha de vencimiento, y ofrece copiar o compartir.
- **Alternativos:**
  - A1. Sin clientes: el estado vacío de Clientes muestra el código directamente.
  - A2. Pide un código nuevo: según la maqueta, el anterior sin usar deja de servir (P-14).
  - A3. En Perfil ve «Código vigente» o «Código vencido».
- **Errores:** E1. Sin conexión: «Necesitas conexión para crear un código.» E2. Lo pide un alumno: rechazado (PERM-32).
- **Reglas:** 6 caracteres, vence a los 7 días y se usa una vez (§Datos, `trainer_clients`).
- **Endpoints:** EP-14.
- **Pantallas:** PAN-16, PAN-15.

### CU-12 Vincularse con un entrenador

- **Actor:** AS (pasa a ser AV).
- **PRD:** §Roles flujo 3; §API (`POST /me/trainer/link`, 409 «código ya usado»); §Datos (`client_profiles.trainer_id`, `trainer_clients`); §Pantallas, pantallas 4 y 15.
- **Precondiciones:** alumno sin entrenador activo; tiene un código vigente.
- **Flujo principal:**
  1. En Perfil toca «Vincular con código», o lo escribe en la pregunta 10 de la encuesta.
  2. La app muestra el nombre del entrenador («Vincularme con Camila») y confirma.
  3. La API marca la invitación como `activo` con `aceptado_at` y fija `trainer_id`.
  4. Desde ese momento el entrenador ve todo lo del alumno (sesiones, medidas, fotos, encuesta, observaciones).
  5. La app muestra «Listo. Camila Rojas ya ve tus sesiones y tu avance.»
- **Errores:**
  - E1. Código inexistente: 404 y «Vincular: código que no sirve».
  - E2. Código vencido (más de 7 días): rechazado con el mismo mensaje.
  - E3. Código ya usado: 409.
  - E4. Ya tiene entrenador activo: rechazado (P-15).
  - E5. Lo intenta un entrenador: rechazado (PERM-33).
  - E6. Demasiados intentos con códigos al azar: P-27.
- **Reglas:** un solo entrenador a la vez (§Datos, `client_profiles`); el código se usa una vez y dura 7 días (§Datos).
- **Endpoints:** EP-18.
- **Pantallas:** PAN-15, PAN-04.

### CU-13 Desvincularse del entrenador (lo hace el alumno)

- **Actor:** AV (pasa a ser AS).
- **PRD:** §API (`DELETE /me/trainer`); §Privacidad («el entrenador pierde el acceso al instante; conserva solo las rutinas que él escribió»); §Datos (`trainer_clients`, terminar conserva historial).
- **Precondiciones:** vínculo activo.
- **Flujo principal:**
  1. En Perfil toca «Desvincular» y confirma («Camila deja de ver tus datos»).
  2. La API marca el vínculo `terminado` con `terminado_at` y limpia `trainer_id`.
  3. El entrenador pierde el acceso en la siguiente llamada: la ficha y los datos del alumno responden 404.
  4. El alumno conserva todo su historial («Tu historial sigue aquí»).
- **Alternativos:** A1. La rutina activa que escribió el entrenador: P-16.
- **Errores:** E1. No tiene entrenador: 404.
- **Reglas:** el acceso se corta al instante; el historial queda en el alumno (§Privacidad; §Datos).
- **Endpoints:** EP-19.
- **Pantallas:** PAN-15.

### CU-14 Terminar el vínculo con un cliente (lo hace el entrenador)

- **Actor:** ENT.
- **PRD:** §API (`DELETE /trainer/clients/:id`); §Pantallas, pantalla 17 («desvincular»); §Datos (`trainer_clients`).
- **Precondiciones:** vínculo activo con ese cliente.
- **Flujo principal:**
  1. En la Ficha toca «Desvincular» y confirma.
  2. La API termina el vínculo; el historial queda en el alumno.
  3. El cliente sale de la lista de Clientes y sus alertas dejan de aparecer.
  4. El alumno pasa a AS y lo ve en su Perfil.
- **Errores:** E1. Cliente que no es suyo, o vínculo ya terminado: 404.
- **Reglas:** terminar conserva el historial pero corta el acceso (§Datos).
- **Endpoints:** EP-17.
- **Pantallas:** PAN-17, PAN-16.

## Ejercicios

### CU-15 Buscar y filtrar la biblioteca de ejercicios

- **Actor:** ENT, AV o AS.
- **PRD:** §Pantallas, pantalla 9; §API (`GET /exercises`, filtros `q`, `grupo`, `equipo`, PR del alumno, paginación por cursor); §Alcance (biblioteca base sembrada); §SinSeñal (la biblioteca queda en el celular).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Abre Ejercicios: buscador, filtros por grupo (Todos, Piernas, Pecho, Espalda, Hombros, Brazos, Core) y lista con foto, grupo, equipo y PR.
  2. Escribe en el buscador o aplica un filtro; la lista se acota.
  3. La lista trae la biblioteca base más sus ejercicios propios, en páginas de hasta 50 con `next_cursor`.
- **Alternativos:**
  - A1. Sin resultados: «Sin resultados» con botón para crear el ejercicio (CU-17).
  - A2. Sin conexión: usa la biblioteca en caché.
  - A3. ENT: ve la biblioteca base y sus propios ejercicios, sin PR.
- **Errores:** E1. Filtro con grupo inexistente: 400. E2. `limit` mayor que el máximo o cursor inválido: 400.
- **Reglas:**
  - Las listas se paginan por cursor y devuelven `{ items, next_cursor }` (§API).
  - Incluye el PR del alumno (§API).
  - Cantidad e ids de la biblioteca base: P-29.
- **Endpoints:** EP-20.
- **Pantallas:** PAN-09.

### CU-16 Ver el detalle de un ejercicio

- **Actor:** ENT, AV o AS.
- **PRD:** §Pantallas, pantalla 10; §API (P-03 para `GET /exercises/:id`; `GET /me/progress/exercises/:id`).
- **Precondiciones:** el ejercicio es de la base, propio o visible por una rutina asignada (P-07).
- **Flujo principal:** ve la referencia en video o foto, las instrucciones, el PR, el gráfico de 1RM estimado, el historial por sesión y sus observaciones y dolores.
- **Alternativos:**
  - A1. Sin historial: el estado «Sin historial» invita a registrar la primera sesión.
  - A2. Ejercicio propio: muestra «Editar».
  - A3. Sin señal: la referencia no carga y lo dice, el resto se ve desde la caché.
- **Errores:** E1. Ejercicio propio de otra persona: 404.
- **Reglas:** los de la base no se editan (§Datos, `exercises`).
- **Endpoints:** EP-21, EP-46.
- **Pantallas:** PAN-10.

### CU-17 Crear, editar y borrar un ejercicio propio

- **Actor:** ENT, AV o AS.
- **PRD:** §Roles, matriz («Crear ejercicios propios con referencia»: sí para los tres); §API (`POST`, `PATCH`, `DELETE /exercises/:id`, 422 «ejercicio de otro dueño»); §Datos (`exercises`).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Desde Ejercicios toca «Crear ejercicio propio» (o desde «Sin resultados»).
  2. Escribe nombre, grupo, equipo, patrón, tipo de carga, incremento por defecto e instrucciones.
  3. La API lo crea con `owner_id` del usuario.
  4. Puede editarlo; al borrarlo, el borrado es lógico (`deleted_at`).
- **Errores:**
  - E1. Editar o borrar uno de la biblioteca base: rechazado (PERM-40).
  - E2. Editar o borrar el propio de otro usuario: 404.
  - E3. Borrar uno que está en una rutina activa: rechazado (P-35).
  - E4. Usar en una rutina un ejercicio de otro dueño: 422 (§API).
  - E5. Cambiar el tipo de carga si ya tiene sesiones cerradas: rechazado (regla del código actual, en `types.ts`).
- **Reglas:** los propios solo los ve y edita su dueño y, si está vinculado, su entrenador (§Datos; ver P-07); el borrado es lógico (§API).
- **Endpoints:** EP-22, EP-23, EP-24.
- **Pantallas:** PAN-09, PAN-10.

### CU-18 Subir una referencia en video o foto

- **Actor:** el dueño de un ejercicio propio.
- **PRD:** §API (`POST /exercises/:id/media`, «confirma con PUT al terminar»); §Datos (`exercise_media`, videos de hasta 50 MB; los de la base son enlaces); §Seguridad (URLs firmadas de 15 minutos); §Arquitectura (bucket S3).
- **Precondiciones:** ejercicio propio; hay conexión.
- **Flujo principal:**
  1. En el detalle toca «Subir referencia» y elige video o foto.
  2. La API devuelve una URL firmada para subir directo al bucket.
  3. La app sube el archivo y confirma con PUT (P-03).
  4. La referencia aparece en el detalle, servida con URL firmada de 15 minutos.
- **Errores:**
  - E1. Video de más de 50 MB: rechazado antes de subir y también por el bucket.
  - E2. Tipo de archivo que no es video ni foto: 400.
  - E3. Ejercicio de la base o de otro dueño: rechazado.
  - E4. Se confirma sin haber subido el archivo: la confirmación falla y no queda una referencia rota.
- **Reglas:** nada se sirve desde una URL pública (§Seguridad). Enlaces o archivos propios: P-46.
- **Endpoints:** EP-25, EP-26.
- **Pantallas:** PAN-10.

## Rutinas

### CU-19 Crear una rutina

- **Actor:** ENT (para un cliente o como plantilla), AV (propias), AS (propias).
- **PRD:** §Roles flujo 4 y matriz; §Pantallas, pantalla 7; §API (`POST /routines`, 422); §Datos (`routines`, `routine_days`, `routine_exercises`).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Desde Rutinas toca «Crear rutina».
  2. Escribe el nombre, elige el método de progresión (doble progresión por defecto) y las semanas.
  3. Agrega días (Empuje A, Tirón B) y en cada uno marca ejercicios de la biblioteca.
  4. Por ejercicio fija series, rango de repeticiones, RIR objetivo, descanso, incremento de carga, peso inicial, esquema (normal, descendente, cluster), superserie y nota.
  5. Reordena o quita días y ejercicios, y toca «Guardar rutina».
  6. La API la crea en `borrador` con su estructura completa.
- **Alternativos:** A1. ENT la crea sin cliente (plantilla, `client_id` nulo) y la asigna después (CU-21). A2. Día con `dia_semana` fijo u ordenado por ciclo.
- **Errores:**
  - E1. `reps_min` mayor que `reps_max`: 422.
  - E2. Ejercicio de otro dueño: 422.
  - E3. Rutina sin nombre o sin días: 400.
  - E4. Valores fuera de rango (series 0, descanso negativo): 400.
  - E5. Falla al guardar: estado «Con errores al guardar» sin perder lo armado.
- **Reglas:**
  - El método es de la rutina; el esquema es del ejercicio (§Datos, `routine_exercises`).
  - El orden de los días define el ciclo cuando no hay día fijo (§Datos, `routine_days`).
  - Nace en borrador (§API).
- **Endpoints:** EP-28.
- **Pantallas:** PAN-07, PAN-06.

### CU-20 Editar una rutina

- **Actor:** el dueño (ENT en las suyas, AV y AS en las propias).
- **PRD:** §API (`PATCH /routines/:id` y `PUT /routines/:id/days`, «Dueño», sube la versión si está activa); §Datos (`routines.version`; las sesiones guardan la versión con la que se hicieron).
- **Precondiciones:** la rutina es suya y no está borrada.
- **Flujo principal:**
  1. Desde el detalle toca «Editar».
  2. Cambia nombre, método o semanas (PATCH), o la estructura de días y ejercicios (PUT, que reemplaza todo).
  3. Si la rutina está activa, la versión sube en 1.
  4. Las sesiones ya hechas conservan la versión con la que se registraron.
- **Errores:**
  - E1. AV intenta editar la rutina que le asignó su entrenador: rechazado; la ve en solo lectura (PERM-08).
  - E2. ENT intenta editar la rutina de un alumno que no es suyo: 404.
  - E3. ENT intenta editar una rutina que el alumno se hizo solo: P-44.
  - E4. `reps_min` mayor que `reps_max`: 422.
- **Reglas:** el PUT reemplaza toda la estructura (§API); sesión en curso con la versión anterior: la cierra con la versión con que empezó (§Datos).
- **Endpoints:** EP-30, EP-31.
- **Pantallas:** PAN-07, PAN-08.

### CU-21 Asignar una rutina a un cliente

- **Actor:** ENT.
- **PRD:** §Roles flujo 5 y matriz; §API (`POST /routines/:id/assign`); §Pantallas, pantallas 6 («Asignar a clientes») y 17 («Cambiar rutina»).
- **Precondiciones:** la rutina es suya; el cliente tiene vínculo activo.
- **Flujo principal:**
  1. Desde su biblioteca o desde la Ficha elige la rutina y el cliente.
  2. La API la asigna (`client_id`) y queda lista para activar.
- **Alternativos:** A1. Asignar una plantilla a dos clientes: P-43.
- **Errores:** E1. Cliente sin vínculo activo o de otro entrenador: 404. E2. Lo intenta un alumno: rechazado (PERM-11, PERM-12).
- **Reglas:** el entrenador solo alcanza clientes con vínculo activo (§API, Convenciones).
- **Endpoints:** EP-32.
- **Pantallas:** PAN-06, PAN-17.

### CU-22 Activar una rutina

- **Actor:** el dueño (ENT para su cliente; AV y AS para las propias).
- **PRD:** §Roles flujo 5; §API (`POST /routines/:id/activate`, 422 «más de una rutina activa»); §Datos (`client_profiles.rutina_activa_id`, `routines.version`).
- **Precondiciones:** rutina en borrador o archivada, con al menos un día.
- **Flujo principal:**
  1. Toca «Activar» (si ya hay otra, la app pide confirmar).
  2. La API la deja `activa`, sube su versión y archiva la anterior del alumno con su historial intacto.
  3. Hoy pasa a mostrar la nueva rutina.
- **Alternativos:** A1. AV activa una propia teniendo activa la del entrenador: P-06.
- **Errores:** E1. AV intenta activar la del entrenador: rechazado (solo las propias, §Roles). E2. Rutina sin días: 422. E3. Dos activaciones simultáneas: nunca quedan dos activas (422 a la segunda).
- **Reglas:** una rutina activa por alumno (§Roles flujo 5; §Datos); activar sube la versión (§Datos, `routines`).
- **Endpoints:** EP-33.
- **Pantallas:** PAN-06, PAN-08.

### CU-23 Duplicar una rutina

- **Actor:** ENT, AV o AS.
- **PRD:** §API (`POST /routines/:id/duplicate`, «Copia como borrador, incluidas las del entrenador para el alumno»).
- **Precondiciones:** puede leer la rutina.
- **Flujo principal:** toca «Duplicar»; la API crea una copia en borrador cuyo dueño es quien duplica, con días y ejercicios iguales y sin sesiones.
- **Errores:** E1. Rutina que no puede leer: 404.
- **Reglas:** la copia de la rutina del entrenador queda como propia del alumno y puede editarla (§API).
- **Endpoints:** EP-34.
- **Pantallas:** PAN-06, PAN-08.

### CU-24 Archivar una rutina

- **Actor:** el dueño.
- **PRD:** §API (`DELETE /routines/:id`, «Archiva; nunca borra si tiene sesiones»); §Datos (`deleted_at`, borrado lógico donde hay historial).
- **Precondiciones:** la rutina es suya.
- **Flujo principal:** toca «Archivar»; la API la pasa a `archivada`; sus sesiones siguen en el historial.
- **Alternativos:** A1. Archivar la activa deja al alumno sin rutina: Hoy muestra el estado vacío que le toca.
- **Errores:** E1. AV archiva la del entrenador: rechazado (PERM-08).
- **Reglas:** nunca se borra una rutina con sesiones (§API).
- **Endpoints:** EP-35.
- **Pantallas:** PAN-06, PAN-08.

### CU-25 Ver la lista y el detalle de rutinas

- **Actor:** ENT, AV o AS.
- **PRD:** §Pantallas, pantallas 6 y 8; §API (`GET /routines`, `GET /routines/:id`).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Abre Rutinas: sus rutinas (activa y archivadas) y, si es AV, la del entrenador.
  2. Abre una: días con ejercicios, semana actual, método y notas del entrenador; «Empezar» si toca hoy.
- **Alternativos:**
  - A1. Sin rutinas: estado vacío (AS con botón a Nueva rutina; AV con «tu entrenador está armando tu rutina»).
  - A2. ENT: su biblioteca de rutinas, o «Biblioteca vacía».
  - A3. Mirando otro día que no toca hoy: no ofrece «Empezar».
- **Errores:** E1. Rutina de otra persona: 404. E2. Sin conexión: muestra la caché o el estado «Sin conexión».
- **Reglas:** el alumno ve sus rutinas y la que le asignó su entrenador (§API); las plantillas del entrenador no se ven desde el alumno.
- **Endpoints:** EP-27, EP-29.
- **Pantallas:** PAN-06, PAN-08.

## Entrenar y sincronizar

### CU-26 Ver Hoy

- **Actor:** AV o AS.
- **PRD:** §Pantallas, pantalla 5 y estados vacíos; §API (`GET /me/today`); §Rendimiento (Hoy con caché en menos de 1 s en 4G).
- **Precondiciones:** ingresó y respondió la encuesta.
- **Flujo principal:**
  1. Abre Hoy: fecha, saludo, racha en días, tarjeta de la rutina del día (nombre, semana, ejercicios, series, minutos), sesiones del mes, volumen total, PRs nuevos, semana de lunes a domingo y tarjeta del entrenador.
  2. La rutina del día trae la sugerencia por ejercicio.
- **Alternativos:**
  - A1. Sin rutina activa, AV: «tu entrenador está armando tu rutina».
  - A2. Sin rutina activa, AS: botón a Nueva rutina.
  - A3. Día de descanso (P-22).
  - A4. Sesión en curso sin cerrar: ofrece retomar o descartar (CU-31).
  - A5. El entrenador dejó una observación o consejo: «ver observaciones del entrenador».
  - A6. Hay una alerta que pide motivos: abre Motivos de la baja (CU-48).
  - A7. Sin conexión: todo desde la caché.
- **Errores:** E1. Lo pide un entrenador: rechazado (endpoint de alumno).
- **Reglas:** racha, adherencia y «semana n de m» (P-22; `semanaDeRutina` en `historial.ts`).
- **Endpoints:** EP-36.
- **Pantallas:** PAN-05.

### CU-27 Iniciar una sesión de entrenamiento

- **Actor:** AV o AS.
- **PRD:** §Roles flujo 6; §API (`POST /sessions`, 409 si ya hay una en curso de otro día); §Datos (`workout_sessions`: id del celular, una sola en curso por alumno, guarda `routine_version`); §SinSeñal.
- **Precondiciones:** tiene rutina activa; no hay otra sesión en curso.
- **Flujo principal:**
  1. En Hoy toca «Empezar rutina».
  2. La app crea la sesión con un UUID v7 generado en el celular, el `routine_day_id` y la hora de inicio, y la escribe primero en SQLite.
  3. Con red, la manda a la API; sin red, queda en cola (CU-32).
  4. Abre el Registro de sesión con la tabla precargada con la sugerencia o la última vez.
- **Alternativos:** A1. El mismo id llega dos veces: 200 con la sesión tal como está, sin duplicar.
- **Errores:** E1. Ya hay otra en curso: 409 (P-17). E2. Lo intenta un entrenador: rechazado (PERM-16). E3. `routine_day_id` de una rutina ajena: 404.
- **Reglas:** el id viene del celular (§API, Convenciones); la sesión guarda la versión de la rutina (§Datos).
- **Endpoints:** EP-37.
- **Pantallas:** PAN-05, PAN-08, PAN-11.

### CU-28 Registrar series

- **Actor:** AV o AS, en el gimnasio.
- **PRD:** §Roles flujo 6; §Pantallas, pantalla 11 y «Qué se toma de cada variante»; §API (`PUT /sessions/:id/sets`, 409 si está cerrada); §Datos (`workout_sets`: rpe = 10 menos rir, e1rm al guardar); §Rendimiento (sin llamada de red, 60 fps); §Accesibilidad.
- **Precondiciones:** sesión en curso.
- **Flujo principal:**
  1. Ve «Ejercicio n de m», nombre, grupo, objetivo, la tabla serie / kg / reps / RIR, la última vez y la fila activa con cifras grandes.
  2. Ajusta con menos y más (2,5 kg y 1 repetición) y elige el RIR.
  3. Toca «Marcar serie»: la serie se escribe en SQLite al instante y arranca el descanso (CU-29).
  4. Repite hasta terminar el ejercicio y pasa al siguiente.
  5. Las series se mandan por lote, por id del celular.
- **Alternativos:**
  - A1. «Fallé la serie»: se guarda con `fallo` y las repeticiones logradas.
  - A2. «Deshacer»: desmarca la última serie.
  - A3. «Añadir serie».
  - A4. Observación o dolor del ejercicio (CU-34).
  - A5. Vista «toda la sesión» desde la cabecera.
  - A6. AV cambia a mano el peso que sugirió el entrenador: se registra lo que hizo y la sugerencia no cambia (PERM-20).
  - A7. Salir: la sesión queda en curso para retomar.
- **Errores:** E1. Series a una sesión cerrada: 409 `SESSION_CLOSED`. E2. Peso negativo, reps negativas o RIR fuera de 0 a 10: 400.
- **Reglas:**
  - RPE = 10 menos RIR (§Datos).
  - e1RM con Epley al guardar, nulo sobre 12 repeticiones (§Datos).
  - Marcar una serie no llama a la red (§Rendimiento).
  - Botones de kilos y repeticiones de 56 dp, con etiqueta para lector de pantalla (§Accesibilidad).
- **Endpoints:** EP-38.
- **Pantallas:** PAN-11.

### CU-29 Descansar entre series

- **Actor:** AV o AS.
- **PRD:** §Alcance (cronómetro de descanso); §Pantallas, pantalla 12; §Arquitectura (expo-notifications programada al iniciar el descanso, más vibración); §Notificaciones (aviso de fin de descanso).
- **Precondiciones:** acaba de marcar una serie.
- **Flujo principal:**
  1. Al marcar la serie aparece la capa de descanso con cuenta regresiva desde el descanso del ejercicio, y la siguiente serie y ejercicio.
  2. La app programa una notificación local para el final.
  3. Al llegar a cero, vibra y suena, aunque la pantalla esté apagada.
- **Alternativos:** A1. «+30 s» suma 30 segundos y reprograma la notificación. A2. «Saltar descanso» cierra la capa y cancela la notificación. A3. El alumno apagó el aviso en Perfil: no suena, la capa igual cuenta.
- **Errores:** E1. Permiso de notificaciones negado: la cuenta regresiva sigue en pantalla y vibra si la app está abierta.
- **Reglas:**
  - El descanso es una capa sobre el registro, no una pantalla aparte (§Pantallas).
  - Sin llamada de red.
  - El aviso de descanso no cuenta para el tope de 2 push al día (§Notificaciones).
- **Endpoints:** ninguno (local).
- **Pantallas:** PAN-12.

### CU-30 Cerrar la sesión y ver el resumen

- **Actor:** AV o AS.
- **PRD:** §Roles flujo 6; §Pantallas, pantalla 13; §API (contrato de cerrar una sesión); §Datos (fórmulas, `personal_records`, `progression_suggestions`, detección); §Rendimiento (p95 de 800 ms).
- **Precondiciones:** sesión en curso.
- **Flujo principal:**
  1. Toca «Terminar». La app calcula el resumen con el paquete compartido y lo muestra al instante.
  2. Manda `POST /sessions/:id/finish` con `cerrada_at`, `duracion_s`, observación y dolor general.
  3. La API cierra la sesión y calcula: series completadas, volumen (solo completadas), kcal (MET 5 con el último peso corporal), PRs, sugerencias, alertas y próxima sesión.
  4. La pantalla muestra felicitación, series, volumen, kcal, tiempo, PRs, próxima sesión, sugerencias y el recordatorio de peso (cuándo aparece: P-54).
  5. Si el resultado del servidor difiere del calculado en el celular, manda el del servidor.
- **Alternativos:**
  - A1. Sesión incompleta: las series sin marcar se guardan como no hechas y lo dice.
  - A2. Sin récords: no muestra la sección de PRs.
  - A3. Anotar observación de la sesión (CU-34).
  - A4. Sin señal: «queda en cola» (CU-32).
  - A5. Sin peso corporal registrado: no hay kcal.
- **Errores:** E1. Cerrar una sesión ya cerrada: P-18 (mismo dispositivo, 200 con el resumen guardado). E2. Cerrar una descartada: 409.
- **Reglas:**
  - Volumen = suma de peso × reps de las series completadas (§Datos).
  - kcal = 5 × peso corporal × minutos / 60 (§Datos).
  - Una sesión cerrada no se edita; solo se le agregan observaciones (§Alcance; §Datos).
  - PRs recalculados al cerrar; el anterior queda con `superado_at` (§Datos).
  - Una sugerencia por ejercicio por sesión cerrada (§Datos).
  - La detección corre al cerrar (§Datos).
- **Endpoints:** EP-39.
- **Pantallas:** PAN-13, PAN-11.

### CU-31 Retomar o descartar una sesión en curso

- **Actor:** AV o AS.
- **PRD:** §Pantallas, estados vacíos («Sesión en curso sin cerrar (retomar o descartar)»); §API (`POST /sessions/:id/discard`); §Datos (estado `descartada`).
- **Precondiciones:** hay una sesión en curso, por ejemplo porque cerró la app a mitad.
- **Flujo principal:** Hoy muestra la sesión en curso; «Retomar» abre el registro donde quedó, con las series ya marcadas desde SQLite.
- **Alternativos:** A1. «Descartar»: la sesión pasa a `descartada`, no cuenta para historial, PRs ni sugerencias, y el día vuelve a quedar para hoy.
- **Errores:** E1. Descartar una cerrada: 409. E2. Descartar una ajena: 404.
- **Reglas:** una sola en curso por alumno (§Datos).
- **Endpoints:** EP-40.
- **Pantallas:** PAN-05, PAN-11.

### CU-32 Entrenar sin señal y sincronizar

- **Actor:** AV o AS, y la cola de la app.
- **PRD:** §Arquitectura (Cómo funciona sin señal); §SinSeñal (regla de conflicto); §API (ids del celular, 200 sin duplicar; `POST /sync/sessions`); §Riesgos (pruebas en modo avión, cola visible en Perfil con reintento a mano); §Rendimiento (10 sesiones en menos de 5 s); §Plan (fase 5: 80 % o más de las sesiones del piloto sincronizó sin error).
- **Precondiciones:** ingresó con red al menos una vez; la rutina activa, la biblioteca y las últimas sesiones están en el celular.
- **Flujo principal:**
  1. Sin señal, el alumno inicia, registra y cierra la sesión como siempre.
  2. Cada serie se escribe primero en SQLite; la sesión cerrada queda en la cola.
  3. La app calcula la sugerencia con el paquete compartido y la muestra.
  4. Al volver la señal, manda la cola por `POST /sync/sessions`; cada sesión se procesa como crear, series y cerrar, con el mismo resultado que con red.
  5. El servidor recalcula; si la sugerencia difiere, manda la del servidor y la app la reemplaza.
- **Alternativos:**
  - A1. La misma sesión llega dos veces (reintento): se acepta una vez, sin duplicar.
  - A2. La misma sesión llega cerrada desde dos dispositivos: gana la primera copia cerrada y la segunda se descarta con aviso (P-18).
  - A3. La señal vuelve a medias: reintento automático; la cola respeta el orden.
  - A4. El alumno abre la cola en Perfil y toca «Reintentar».
  - A5. El access venció mientras estaba sin señal: la app renueva con el refresh y sigue.
  - A6. Dolor de intensidad 7 o más registrado sin señal: la alerta sale al sincronizar.
- **Errores:**
  - E1. Una sesión del lote no pasa el esquema: esa se rechaza con su motivo y las demás se aceptan.
  - E2. El refresh también venció: la cola se conserva hasta volver a ingresar.
  - E3. La cuenta fue borrada: la cola no se envía.
- **Reglas:**
  - Ingresar y recuperar la clave necesitan red; todo lo demás del gimnasio funciona sin red (§SinSeñal).
  - Una sesión pertenece a un solo dispositivo (§SinSeñal).
  - Crear con un id existente devuelve el recurso con 200 (§API).
  - Si difieren las sugerencias, manda la del servidor (§Arquitectura).
- **Endpoints:** EP-41, EP-37, EP-38, EP-39.
- **Pantallas:** PAN-11, PAN-13, PAN-15.

### CU-33 Ver el historial de sesiones

- **Actor:** el alumno (las suyas) y su entrenador.
- **PRD:** §API (`GET /sessions`, `GET /sessions/:id`, «Alumno y su entrenador», paginado); §Pantallas, pantallas 14 y 17.
- **Precondiciones:** hay sesiones cerradas.
- **Flujo principal:** ve la lista paginada por cursor y abre una sesión con sus series y observaciones.
- **Errores:** E1. ENT lee una sesión de un alumno que no es suyo, o de un ex cliente: 404. E2. Alumno lee la sesión de otro alumno: 404.
- **Reglas:** las descartadas no aparecen; paginación `{ items, next_cursor }` (§API).
- **Endpoints:** EP-42, EP-43.
- **Pantallas:** PAN-14, PAN-17.

## Observaciones

### CU-34 Registrar observación o dolor (alumno)

- **Actor:** AV o AS.
- **PRD:** §Roles flujo 7 y matriz («Sí, en ejercicio y sesión» para AV; «Sí» para AS); §Alcance (observaciones por ejercicio); §API (`POST /observations`); §Datos (`observations`: al menos uno de ejercicio, sesión, serie o rutina; intensidad de 1 a 10; nadie edita la ajena).
- **Precondiciones:** sesión en curso o cerrada, o un ejercicio.
- **Flujo principal:**
  1. Durante o después de la sesión toca «Observación o dolor».
  2. Escribe el texto y, si es dolor, elige zona e intensidad de 1 a 10.
  3. La API la guarda con autor y destino.
  4. El entrenador la ve en la ficha (CU-50).
- **Alternativos:**
  - A1. Sobre una sesión ya cerrada: se puede (solo se agregan observaciones).
  - A2. Dolor de intensidad 7 o más: alerta inmediata al entrenador (CU-46).
  - A3. Sin señal: queda en cola.
- **Errores:**
  - E1. Sin ningún destino: 400.
  - E2. Intensidad fuera de 1 a 10: 400.
  - E3. Sobre la sesión de otro alumno: 404.
  - E4. AV sobre la rutina del entrenador, o tipo consejo: P-08.
- **Reglas:** nadie edita la observación ajena (§Datos); no hay endpoint para editar.
- **Endpoints:** EP-44.
- **Pantallas:** PAN-11, PAN-13, PAN-10.

### CU-35 Escribir observación o consejo (entrenador)

- **Actor:** ENT.
- **PRD:** §Roles flujo 7 y matriz («Sí, en ejercicio, sesión y rutina»); §Alcance (los botones «Mensaje» abren observaciones, no un chat); §Pantallas, pantalla 17.
- **Precondiciones:** cliente con vínculo activo.
- **Flujo principal:**
  1. En la Ficha toca «Escribir observación o consejo», o responde un dolor.
  2. Escribe el texto y lo envía con tipo consejo u observación, sobre el ejercicio, la sesión o la rutina.
  3. El alumno lo ve en Hoy («ver observaciones del entrenador») y en el ejercicio.
- **Errores:** E1. Texto vacío: «Escribe el consejo antes de enviarlo.» E2. Cliente que no es suyo: 404.
- **Reglas:** no hay mensajería en tiempo real (§Alcance).
- **Endpoints:** EP-44.
- **Pantallas:** PAN-17, PAN-05.

### CU-36 Leer observaciones

- **Actor:** el alumno y su entrenador.
- **PRD:** §API (`GET /observations`); §Datos (`observations`).
- **Precondiciones:** hay observaciones.
- **Flujo principal:** cada uno ve las propias y las del otro sobre el mismo alumno, filtrables por ejercicio, sesión o rutina.
- **Errores:** E1. ENT pide las de un alumno que no es suyo: 404 o lista vacía, sin datos ajenos. E2. Ex entrenador: sin acceso.
- **Reglas:** nadie edita la ajena (§Datos).
- **Endpoints:** EP-45.
- **Pantallas:** PAN-10, PAN-17, PAN-05.

## Progreso

### CU-37 Ver el progreso de un ejercicio

- **Actor:** el alumno y su entrenador.
- **PRD:** §Roles flujo 8; §API (`GET /me/progress/exercises/:id`, últimas 26 semanas); §Pantallas, pantalla 10.
- **Precondiciones:** hay sesiones cerradas del ejercicio.
- **Flujo principal:** ve la serie de 1RM estimado y el mejor set por sesión de las últimas 26 semanas, en gráfico y en lista.
- **Alternativos:** A1. Sin sesiones: estado «Sin historial». A2. Ejercicio de peso corporal o de tiempo: la marca es en repeticiones o segundos (P-09).
- **Errores:** E1. ENT sobre un alumno que no es suyo: 404 (P-02).
- **Reglas:** e1RM con Epley, nulo sobre 12 repeticiones (§Datos).
- **Endpoints:** EP-46.
- **Pantallas:** PAN-10.

### CU-38 Ver volumen por semana y récords

- **Actor:** el alumno y su entrenador.
- **PRD:** §Roles flujo 8; §Pantallas, pantalla 14 (vista Fuerza y PRs); §API (`GET /me/progress/volume?weeks=8`, `GET /me/prs`).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. Abre Progreso, vista Fuerza y PRs.
  2. Ve el volumen por semana de 8 semanas con la variación frente a la semana anterior.
  3. Ve los PRs vigentes por ejercicio con fecha y diferencia con el anterior.
- **Alternativos:** A1. Sin conexión: muestra la caché o «Sin conexión». A2. Cargando.
- **Errores:** E1. `weeks` fuera de rango: 400.
- **Reglas:** el volumen suma solo series completadas (§Datos); los PRs se recalculan al cerrar cada sesión (§Datos).
- **Endpoints:** EP-47, EP-48.
- **Pantallas:** PAN-14.

### CU-39 Registrar peso corporal y medidas

- **Actor:** AV o AS (ENT solo lee).
- **PRD:** §Roles flujo 9; §Pantallas, pantalla 14 (Peso corporal; Medidas y fotos); §API (`GET` y `POST /me/body-metrics`, tendencia desde el tercer registro); §Datos (`body_metrics`, una fila por día); §Alcance (la tendencia aparece desde el tercer registro, sin modelo predictivo).
- **Precondiciones:** ingresó.
- **Flujo principal:**
  1. En Progreso toca «Registrar peso» o «Registrar medidas» (cintura, cadera, pecho, brazo, muslo; grasa opcional).
  2. La API guarda la fila del día.
  3. Ve el peso actual, el cambio a 30 días, el gráfico y el historial.
- **Alternativos:**
  - A1. Segundo registro del mismo día: reemplaza al primero.
  - A2. Con menos de 3 registros: «Con 3 registros ves la tendencia».
  - A3. El primer peso viene de la encuesta.
  - A4. Sin señal: queda en cola.
- **Errores:** E1. Peso o medida negativos o absurdos: 400. E2. ENT intenta registrar: rechazado (PERM-16).
- **Reglas:**
  - Una fila por día; la segunda del mismo día reemplaza (§Datos).
  - El día se cuenta en la zona horaria del alumno (§Datos).
  - Fórmula de la tendencia: P-30.
- **Endpoints:** EP-49, EP-50.
- **Pantallas:** PAN-14.

### CU-40 Subir, ver, comparar y borrar fotos de progreso

- **Actor:** AV o AS (ENT solo lee).
- **PRD:** §Roles flujo 9; §Pantallas, pantalla 14; §API (`POST`, `GET /me/photos`, `DELETE /me/photos/:id`, entrenador solo lectura); §Datos (`progress_photos`, privadas, URL firmada de 15 minutos); §Arquitectura (expo-image-picker, compresión a 1600 px, subida con URL firmada); §Privacidad (casilla propia al subir la primera foto).
- **Precondiciones:** hay conexión para subir.
- **Flujo principal:**
  1. En Progreso, vista Medidas y fotos, toca «Tomar o subir foto» y elige frente, lado o espalda.
  2. La primera vez marca la casilla de consentimiento para fotos (CU-57).
  3. La app comprime a 1600 px, pide una URL firmada a la API y sube directo al bucket.
  4. Ve las fotos por fecha, servidas con URLs de 15 minutos, y compara dos fechas lado a lado.
- **Alternativos:** A1. Borra una foto: desaparece de la lista y del bucket.
- **Errores:**
  - E1. URL vencida (más de 15 minutos): el bucket la rechaza y la app pide otra.
  - E2. Sin consentimiento: no se sube.
  - E3. ENT intenta subir o borrar: rechazado (PERM-36).
  - E4. Foto de otro alumno: 404.
- **Reglas:** nada se sirve desde una URL pública (§Seguridad); EXIF: P-37.
- **Endpoints:** EP-51, EP-52, EP-53.
- **Pantallas:** PAN-14.

## Sugerencias

### CU-41 Recibir la sugerencia de la próxima carga

- **Actor:** el sistema (motor de progresión) y el alumno que la recibe.
- **PRD:** §Roles flujo 10; §Alcance (criterio 2); §Datos (Métodos de progresión, `progression_suggestions`); §Arquitectura (se calcula en el celular y el servidor la recalcula; manda la del servidor); §Riesgos (la sugerencia trae su «por qué»).
- **Precondiciones:** se cerró una sesión con ejercicios de la rutina.
- **Flujo principal:**
  1. Al cerrar, el motor toma la última sesión cerrada de cada ejercicio de la rutina y aplica el método de la rutina.
  2. Devuelve peso, rango de repeticiones, RIR y un texto como «Próxima sesión intenta 30 kg × 10 a 12. Si consigues 12 o más con RIR 2 o más, sube a 32,5 kg».
  3. La sugerencia queda `pendiente`, se ve en Rutina completada y en Hoy, y precarga la próxima sesión.
- **Alternativos:** A1. Hoy no se completó ninguna serie de un ejercicio: no hay sugerencia para él. A2. Ejercicio de tiempo o agregado suelto: sin sugerencia (regla de `cierre.ts`).
- **Reglas por método (§Datos):**
  - **Doble progresión**, por defecto. Si todas las series llegaron a `reps_max` con RIR igual o mayor al objetivo, peso más `incremento_kg` y vuelta a `reps_min`. Si no, mismo peso y apuntar a más repeticiones. Si alguna serie quedó bajo `reps_min` dos sesiones seguidas, peso menos `incremento_kg`.
  - **Lineal.** Peso más `incremento_kg` cada sesión mientras se completen todas las series; al fallar dos veces seguidas, baja 10 % y vuelve a subir.
  - **Porcentual.** El peso es un porcentaje del 1RM estimado vigente, fijado por semana en la rutina (por ejemplo 70, 75, 80 y 65 %). Datos que faltan: P-10.
  - **Por RM.** El objetivo se prescribe como xRM (por ejemplo 5RM); la sugerencia es el peso cuyo 1RM estimado coincide con el mejor set actual (P-11).
  - **Series descendentes.** La serie principal sigue doble progresión y las descendentes bajan 20 % cada una, sin sugerencia propia (P-11).
  - **Cluster.** Bloques de 2 a 3 repeticiones con 15 a 20 s entre bloques; el peso sigue la regla lineal.
  - Bordes que piden las pruebas (§Pruebas): RIR 0, fallo y 12 repeticiones o más.
  - Una sugerencia por ejercicio por sesión cerrada (§Datos).
  - Criterio 2 frente a flujo 10: P-38.
- **Endpoints:** EP-39, EP-41, EP-36, EP-54.
- **Pantallas:** PAN-13, PAN-05, PAN-11.

### CU-42 Sobrescribir la sugerencia (Ajustar cargas)

- **Actor:** ENT (para su cliente) y AS (la propia). AV solo ajusta a mano en la sesión.
- **PRD:** §Roles matriz («Sobrescribir la sugerencia de carga»); §Roles flujo 10; §Pantallas, pantalla 19; §API (`GET /clients/:id/suggestions`, `PATCH /suggestions/:id`, queda registrado quién y cuándo); §Datos (`progression_suggestions`: estado pendiente, aplicada o sobrescrita; se puede sobrescribir hasta que se use); §Alcance (el entrenador puede sobrescribir cualquier sugerencia).
- **Precondiciones:** hay sugerencias pendientes de la rutina activa.
- **Flujo principal:**
  1. ENT abre Ajustar cargas desde la Ficha. Por ejercicio ve el último rendimiento, la sugerencia calculada, un campo para sobrescribir y una nota.
  2. Cambia peso o rango, escribe la nota y toca «Guardar».
  3. La API guarda `valor_final`, `sobrescrita_por`, la fecha y el estado `sobrescrita`.
  4. La próxima sesión del alumno se precarga con el valor del entrenador.
- **Alternativos:** A1. «Volver a la sugerencia» deja el valor calculado. A2. AS hace lo mismo sobre las propias (desde qué pantalla: P-50). A3. Sin cambios: «Guardar» no llama a la API.
- **Errores:**
  - E1. AV intenta sobrescribir por la API: rechazado (PERM-20).
  - E2. Sugerencia ya usada: rechazado (P-19).
  - E3. ENT sobre un cliente que no es suyo: 404.
  - E4. `reps_min` mayor que `reps_max`: 422.
  - E5. Falla al guardar: estado «No se pudo guardar».
- **Reglas:** queda registrado quién y cuándo (§API); el texto de la sugerencia siempre trae su «por qué» (§Riesgos).
- **Endpoints:** EP-54, EP-55.
- **Pantallas:** PAN-19, PAN-17.

## Alertas

### CU-43 Detectar estancamiento

- **Actor:** el sistema, al cerrar cada sesión y en el worker nocturno.
- **PRD:** §Datos (Detección de estancamiento y de baja; `alerts`: no se repite la misma alerta abierta para el mismo ejercicio); §Alcance (identificar irregularidades).
- **Precondiciones:** el alumno tiene 3 o más sesiones cerradas del mismo ejercicio.
- **Flujo principal:**
  1. El mejor 1RM estimado del ejercicio no supera el de las sesiones anteriores en 3 sesiones seguidas.
  2. Se crea una alerta `estancamiento` con el ejercicio y las 3 sesiones, para el entrenador.
  3. El alumno recibe aviso y registra motivos (CU-48).
- **Alternativos:** A1. Ya hay una alerta abierta (nueva o vista) para ese ejercicio: no se crea otra. A2. AS: la alerta va sin entrenador y el alumno ve aviso, motivos y consejos.
- **Reglas:** el umbral de 3 sesiones es configuración del servidor, no código (§Datos; P-34). Ejercicios sin 1RM estimado: P-09.
- **Endpoints:** EP-39, EP-41 (detección al cerrar); worker (CU-56).
- **Pantallas:** PAN-18, PAN-20, PAN-13.

### CU-44 Detectar baja de rendimiento

- **Actor:** el sistema, al cerrar cada sesión y en el worker nocturno.
- **PRD:** §Datos (baja: el volumen de la sesión o el mejor 1RM estimado cae 10 % o más frente al promedio de las 4 semanas anteriores); §Alcance (criterio 4).
- **Precondiciones:** hay sesiones de las 4 semanas anteriores para comparar.
- **Flujo principal:**
  1. El volumen de la sesión, o el mejor 1RM estimado de un ejercicio, queda 10 % o más bajo el promedio de las 4 semanas anteriores.
  2. Se crea la alerta `baja_rendimiento` para el entrenador.
  3. La próxima vez que el alumno abre la app, se le piden los motivos (CU-48).
- **Alternativos:** A1. Caída de 9,9 %: no hay alerta. A2. Contra qué sesiones se compara y qué pasa con menos de 4 semanas de historia: P-47. A3. Ejercicios sin 1RM estimado: P-09.
- **Reglas:** umbral de 10 % configurable (§Datos).
- **Endpoints:** EP-39, EP-41, EP-58.
- **Pantallas:** PAN-18, PAN-20.

### CU-45 Detectar falta de sesiones

- **Actor:** el worker nocturno.
- **PRD:** §Datos («Sin sesiones: 7 días sin cerrar ninguna sesión teniendo rutina activa»).
- **Precondiciones:** el alumno tiene rutina activa.
- **Flujo principal:** pasan 7 días sin cerrar ninguna sesión y se crea la alerta `sin_sesiones` para el entrenador.
- **Alternativos:** A1. Sin rutina activa: no hay alerta. A2. Ya hay una abierta: no se repite. A3. AS: P-23.
- **Reglas:** umbral de 7 días configurable (§Datos).
- **Endpoints:** worker (CU-56); se ve por EP-56.
- **Pantallas:** PAN-18, PAN-16.

### CU-46 Avisar un dolor fuerte

- **Actor:** el sistema, al recibir una observación.
- **PRD:** §Datos («una observación de tipo dolor con intensidad 7 o más avisa al entrenador al instante»); §Notificaciones.
- **Precondiciones:** AV registra un dolor.
- **Flujo principal:** la observación de tipo dolor con intensidad 7 o más crea la alerta `dolor` y manda un push al entrenador en el momento.
- **Alternativos:** A1. Intensidad 6: no hay alerta. A2. Registrado sin señal: la alerta sale al sincronizar. A3. Tope diario de push: P-20.
- **Reglas:** umbral de intensidad 7 configurable (§Datos).
- **Endpoints:** EP-44, EP-39 (dolor general al cerrar).
- **Pantallas:** PAN-18, PAN-17, PAN-16.

### CU-47 Revisar y gestionar alertas (entrenador)

- **Actor:** ENT.
- **PRD:** §Pantallas, pantalla 18; §API (`GET /trainer/alerts`, `PATCH /alerts/:id`); §Datos (`alerts`: nueva, vista, resuelta).
- **Precondiciones:** tiene clientes vinculados.
- **Flujo principal:**
  1. Abre Alertas: estancamiento, baja de rendimiento, sin sesiones y dolor, por cliente y ejercicio, con fecha.
  2. Marca una como vista o la resuelve (con o sin nota), o abre la ficha.
- **Alternativos:** A1. Sin alertas: estado vacío. A2. Vista de resueltas. A3. Sin conexión o cargando.
- **Errores:** E1. Alerta de un cliente que no es suyo: 404. E2. Estado inválido: 400. E3. Lo intenta un alumno: rechazado (PERM-02, PERM-03).
- **Reglas:** solo ve alertas de sus clientes con vínculo activo (§API).
- **Endpoints:** EP-56, EP-57.
- **Pantallas:** PAN-18.

### CU-48 Registrar los motivos de la baja y ver consejos

- **Actor:** AV o AS.
- **PRD:** §Roles flujo 11 y matriz; §Alcance (criterio 4); §Pantallas, pantalla 20; §API (`GET /me/alerts`, `POST /me/drop-reports`, hasta 3 consejos por motivo); §Datos (`drop_reports`, un reporte por alerta; `tips`, contenido sembrado).
- **Precondiciones:** hay una alerta que pide motivos.
- **Flujo principal:**
  1. Al abrir la app aparece Motivos de la baja: sueño, estrés, alimentación, lesión, tiempo, otro y comentario.
  2. Elige uno o más y toca «Enviar».
  3. La API guarda el reporte y devuelve hasta 3 consejos por motivo elegido.
  4. Ve los consejos; el entrenador ve los motivos en la ficha y en la alerta.
- **Alternativos:** A1. Sin señal: el reporte queda en cola y los consejos salen de la caché (maqueta «Consejos sin señal»). A2. AV: si ve consejos o no, P-05.
- **Errores:** E1. Segundo reporte para la misma alerta: rechazado (un reporte por alerta). E2. Motivo que no existe: 400. E3. Alerta de otro alumno: 404.
- **Reglas:** hasta 3 consejos por motivo (§Datos, `tips`); los consejos mostrados quedan guardados en `consejos_mostrados`.
- **Endpoints:** EP-58, EP-59.
- **Pantallas:** PAN-20, PAN-05.

## Panel del entrenador

### CU-49 Revisar el panel de clientes

- **Actor:** ENT.
- **PRD:** §Roles flujo 12; §Pantallas, pantalla 16; §API (`GET /trainer/clients`); §Alcance (decenas de clientes, no cientos).
- **Precondiciones:** cuenta de entrenador.
- **Flujo principal:** ve la fecha, activos, quién entrena hoy, quién no tiene rutina, la adherencia de la semana, un buscador y la lista con estado y marca «Revisar» cuando hay alertas abiertas.
- **Alternativos:**
  - A1. Sin clientes: muestra el código de invitación.
  - A2. Búsqueda sin resultados.
  - A3. Filtros (Todos, Hoy, Revisar, Sin rutina).
  - A4. Sin conexión: caché.
- **Errores:** E1. Lo pide un alumno: rechazado (PERM-02).
- **Reglas:** solo clientes con vínculo activo (§API). Definiciones de adherencia y «entrena hoy»: P-22.
- **Endpoints:** EP-15.
- **Pantallas:** PAN-16.

### CU-50 Ver la ficha de un cliente

- **Actor:** ENT.
- **PRD:** §Pantallas, pantalla 17; §API (`GET /trainer/clients/:id`).
- **Precondiciones:** vínculo activo con ese cliente.
- **Flujo principal:** ve adherencia, sesiones al mes, PRs, rutina activa con semana y método, últimas sesiones, encuesta, medidas y fotos, observaciones y alertas; desde ahí cambia la rutina, ajusta cargas, escribe un consejo o desvincula.
- **Alternativos:** A1. Cliente sin rutina. A2. Dolor sin responder, y respondiendo el dolor.
- **Errores:** E1. Id de alguien que no es su cliente, o ex cliente: 404, nunca 403 (§API).
- **Reglas:** el entrenador solo alcanza clientes con vínculo activo (§API).
- **Endpoints:** EP-16 (más EP-42, EP-43, EP-45 a EP-49 y EP-52 con P-02).
- **Pantallas:** PAN-17.

## Notificaciones

### CU-51 Recibir el recordatorio para entrenar

- **Actor:** AV o AS; lo dispara el worker.
- **PRD:** §Notificaciones (recordatorio 30 minutos antes de la hora habitual, configurable o apagable; tope de 2 push al día); §Arquitectura (worker de recordatorios).
- **Precondiciones:** rutina activa, recordatorio encendido y push registrado.
- **Flujo principal:** 30 minutos antes de su hora habitual (P-21) recibe un push que abre Hoy.
- **Alternativos:** A1. Recordatorio apagado en Perfil: no llega. A2. Ya entrenó hoy: P-21. A3. Ya recibió 2 push hoy: no llega (P-20).
- **Reglas:** tope de 2 push al día por persona, sin contar los del descanso (§Notificaciones).
- **Endpoints:** EP-08 (ajuste), EP-11 (token).
- **Pantallas:** PAN-15, PAN-05.

### CU-52 Recibir notificaciones del entrenador y respetar el tope diario

- **Actor:** ENT (y AV para consejos, P-41).
- **PRD:** §Notificaciones («al entrenador solo alertas y observaciones nuevas»; tope de 2 push al día); §Riesgos (alertas ruidosas: tope diario, no repetir alertas abiertas).
- **Precondiciones:** push registrado.
- **Flujo principal:** cuando se crea una alerta o un cliente deja una observación nueva, el entrenador recibe un push que abre la alerta o la ficha.
- **Alternativos:** A1. Tercer evento del día: no sale push, pero queda en Alertas (P-20). A2. Apagó un tipo de aviso en Perfil: no llega ese tipo.
- **Reglas:** a la persona entrenadora no le llegan recordatorios ni otros avisos; tope de 2 al día (§Notificaciones).
- **Endpoints:** EP-11, EP-08.
- **Pantallas:** PAN-15, PAN-18.

## Datos personales

### CU-53 Exportar mis datos

- **Actor:** ENT, AV o AS (cada uno lo propio).
- **PRD:** §Roles flujo 13 y matriz; §Alcance (criterio 5); §API (`GET /me/export`: ZIP con CSV de sesiones, series, medidas, encuesta y observaciones, devuelve URL firmada); §Privacidad (exportar en Perfil, sin pasar por soporte; Ley 21.719: acceso y portabilidad).
- **Precondiciones:** ingresó; hay conexión.
- **Flujo principal:**
  1. En Perfil toca «Exportar mis datos».
  2. La API genera el ZIP y devuelve una URL firmada.
  3. La app descarga `gymtrack-mis-datos.zip` y abre el menú para guardarlo o compartirlo.
- **Alternativos:** A1. ENT: el ZIP trae lo suyo (P-26). A2. Usuario sin datos: ZIP con CSV vacíos que solo traen encabezados.
- **Errores:** E1. URL vencida: se pide otra. E2. Sin conexión: aviso.
- **Reglas:**
  - Solo los datos propios, nunca los de otro (§Roles).
  - Pesos en kilos y fechas ISO 8601 con zona (§API).
  - Codificación, separador y decimales del CSV: P-48.
- **Endpoints:** EP-12.
- **Pantallas:** PAN-15.

### CU-54 Borrar mi cuenta

- **Actor:** ENT, AV o AS.
- **PRD:** §Roles flujo 13; §Alcance (criterio 5); §API (`DELETE /me`: marca para borrado a 30 días y cierra todas las sesiones); §Datos (`users.deleted_at`, el worker purga a los 30 días); §Privacidad (supresión).
- **Precondiciones:** ingresó; hay conexión.
- **Flujo principal:**
  1. En Perfil toca «Borrar mi cuenta» y confirma («Se borra todo en 30 días, con tus fotos»).
  2. La API marca `deleted_at` y revoca todos los refresh del usuario.
  3. La app sale a Ingreso y avisa la fecha («Tu cuenta se borra el …. Te mandamos un correo con el detalle»).
- **Alternativos:** A1. AV: el vínculo termina y el entrenador deja de verlo (P-24). A2. ENT con clientes: sus clientes quedan como AS (P-24).
- **Errores:** E1. Sin conexión: no se puede borrar.
- **Reglas:** borrado a 30 días con fotos (§Roles flujo 13; §Privacidad).
- **Endpoints:** EP-13.
- **Pantallas:** PAN-15.

## Worker

### CU-55 Purgar las cuentas borradas a los 30 días

- **Actor:** el worker, con su programador de tareas en el VPS de Vultr (antes, cron de Railway).
- **PRD:** §Datos (`users`: el worker purga a los 30 días); §Arquitectura (tareas programadas); §Privacidad (purga fotos y datos a los 30 días); §Riesgos (purga al borrar la cuenta).
- **Precondiciones:** hay cuentas con `deleted_at`.
- **Flujo principal:**
  1. Cada noche busca cuentas con `deleted_at` de 30 días o más.
  2. Borra sus fotos del bucket y sus datos de la base (sesiones, series, medidas, encuesta, observaciones, récords, sugerencias, alertas, tokens).
  3. Deja un registro con el id, sin datos personales.
- **Alternativos:** A1. Cuenta con 29 días: no se toca. A2. Falla el borrado de una foto: la cuenta no se marca como purgada y se reintenta la noche siguiente.
- **Reglas:** los logs no llevan correo, nombre ni medidas (§Seguridad); las rutinas que escribió un entrenador purgado: P-24.
- **Endpoints:** ninguno.
- **Pantallas:** ninguna.

### CU-56 Correr la detección nocturna

- **Actor:** el worker, una vez por noche y cada vez que se cierra una sesión.
- **PRD:** §Arquitectura (worker nocturno de estancamiento y recordatorios); §Datos (Detección, umbrales configurables).
- **Precondiciones:** ninguna.
- **Flujo principal:** recorre a los alumnos con rutina activa, aplica las reglas de CU-43, CU-44 y CU-45, crea las alertas que faltan sin repetir las abiertas, programa los recordatorios (CU-51) y manda los push respetando el tope.
- **Alternativos:** A1. Corre dos veces la misma noche: el resultado es el mismo (idempotente). A2. Alumno en otra zona horaria: los días se cuentan en su zona.
- **Reglas:** umbrales de configuración (§Datos; P-34); una sola alerta abierta por ejercicio (§Datos).
- **Endpoints:** ninguno.
- **Pantallas:** ninguna.

## Transversales

### CU-57 Dar consentimiento expreso para datos de salud

- **Actor:** AV o AS.
- **PRD:** §Privacidad (Ley 19.628 y, desde el 1 de diciembre de 2026, Ley 21.719: consentimiento expreso con casilla propia al responder la encuesta y otra al subir la primera foto; política de privacidad publicada).
- **Precondiciones:** ninguna.
- **Flujo principal:** en la encuesta y en la primera foto aparece una casilla propia, sin marcar, con enlace a la política. Sin marcarla no se puede seguir. Queda guardado cuándo y con qué versión de la política (P-25).
- **Errores:** E1. La API recibe la encuesta o la primera foto sin consentimiento: 422.
- **Reglas:** la casilla de la foto es distinta de la de la encuesta (§Privacidad).
- **Endpoints:** EP-09, EP-51.
- **Pantallas:** PAN-04, PAN-14, PAN-15 (enlace a la política).

### CU-58 Limitar intentos y uso de la API

- **Actor:** el sistema.
- **PRD:** §API (429); §Seguridad (5 ingresos por minuto por IP, 3 recuperaciones por hora por correo, 60 llamadas por minuto por usuario en el resto).
- **Flujo principal:** al pasar el límite, la API responde 429 con el sobre de error y la app muestra cuánto falta (P-42).
- **Reglas:** los tres límites exactos de §Seguridad.
- **Endpoints:** EP-02, EP-05 y todos los autenticados.
- **Pantallas:** PAN-01, PAN-03.

### CU-59 Vigilar la salud de la API y publicar su contrato

- **Actor:** el VPS (Docker, Caddy y el monitor externo), el equipo y la app.
- **PRD:** §Arquitectura (Sentry en app y API, logs con pino, endpoint `/health`); §API (documentación OpenAPI en `/v1/docs`, esquemas Zod en el paquete compartido); §Disponibilidad (chequeo de salud y reinicio automático; respaldo diario con 14 días de retención; restauración de prueba al mes; bucket con versionado; staging con datos falsos).
- **Flujo principal:**
  1. `/health` responde 200 si la API y la base están bien.
  2. `/v1/docs` publica el OpenAPI generado de los esquemas Zod.
  3. Los errores llegan a Sentry sin datos personales.
- **Errores:** E1. Sin base: `/health` responde 503, el healthcheck de Docker marca la API como enferma y Docker la reinicia.
- **Endpoints:** EP-60, EP-61.
- **Pantallas:** ninguna.

### CU-60 Recibir el resumen semanal por correo (opcional)

- **Actor:** quien lo active.
- **PRD:** §Arquitectura (Resend: «resumen semanal opcional»).
- **Flujo principal:** una vez por semana llega un correo con sesiones, volumen y PRs de la semana.
- **Reglas:** si entra o no en la versión 1: P-33. Si entra, respeta las mismas reglas de datos que la exportación.
- **Endpoints:** ninguno nuevo (worker y Resend).
- **Pantallas:** PAN-15 (ajuste).

---

## Las 20 pantallas y sus estados

Estados tomados del PRD (§Pantallas, estados vacíos) y de las maquetas de `docs/pantallas/*.html`. Cada estado tiene al menos una prueba de componente (APP) o de flujo (E2E). Todas se ven en modo claro y en modo gimnasio.

| Id | Pantalla | Estados que hay que probar | CU |
| --- | --- | --- | --- |
| PAN-01 | Ingreso | normal, cargando, error de credenciales, demasiados intentos (cuenta regresiva), sin conexión | CU-02, CU-58 |
| PAN-02 | Crear cuenta | vacío, con errores de validación, correo ya registrado, listo para enviar, cargando | CU-01 |
| PAN-03 | Recuperar contraseña | pedir el enlace, correo mal escrito, enviando, enlace enviado (reenvío a los 60 s, «n de 3 en esta hora»), límite de envíos, nueva contraseña, enlace vencido, guardando, contraseña guardada | CU-05, CU-06 |
| PAN-04 | Encuesta inicial | preguntas 1 a 10, número fuera de rango, fecha imposible, edad mínima, código vacío, válido y no válido, revisar y terminar, guardando, no se pudo guardar, consentimiento | CU-09, CU-12, CU-57 |
| PAN-05 | Hoy | normal, sesión en curso, día de descanso, sin rutina con entrenador, sin rutina solo, observaciones del entrenador, aviso de motivos | CU-26, CU-31, CU-35, CU-48 |
| PAN-06 | Rutinas | con entrenadora, sin entrenador, sin rutina con entrenadora, sin rutinas, activar otra (confirmación), cargando, sin conexión; entrenador: biblioteca, biblioteca vacía, asignar a clientes | CU-25, CU-21, CU-22, CU-23, CU-24 |
| PAN-07 | Nueva rutina | vacía, armando, agregando ejercicios, editando un día, editando un ejercicio, eligiendo el método, ordenando, editando la rutina activa, con errores al guardar | CU-19, CU-20 |
| PAN-08 | Detalle de rutina | activa tuya, borrador, archivada, de la entrenadora (solo lectura), mirando otro día, plantilla del entrenador | CU-25, CU-20, CU-22, CU-23, CU-24, CU-27 |
| PAN-09 | Ejercicios | lista, buscando con resultados, filtro aplicado, sin resultados (ofrece crearlo), crear ejercicio propio, cargando, sin conexión; alumna y entrenadora | CU-15, CU-17 |
| PAN-10 | Detalle de ejercicio | con historial, sin historial, propio (editar), registrar observación, subir referencia, sin señal (la referencia no carga); alumna y entrenadora | CU-16, CU-17, CU-18, CU-34, CU-36, CU-37 |
| PAN-11 | Registro de sesión | recién empieza, a mitad, ejercicio terminado, todo marcado, fallé la serie, deshacer, añadir serie, vista toda la sesión, salir | CU-27, CU-28, CU-30, CU-31, CU-34 |
| PAN-12 | Descanso (capa) | descansando, +30 s, saltar, aviso con pantalla apagada, sin permiso de notificaciones | CU-29 |
| PAN-13 | Rutina completada | con récords, sin récords, sesión incompleta, anotar observación, sin señal (queda en cola), sin kcal | CU-30, CU-32, CU-34, CU-41 |
| PAN-14 | Progreso | fuerza y PRs, peso corporal, medidas y fotos, menos de 3 registros, registrar peso, registrar medidas, comparar fotos, cargando, sin conexión | CU-37, CU-38, CU-39, CU-40, CU-57 |
| PAN-15 | Perfil y ajustes | sin entrenador, con entrenadora, vincular (ingresar, correcto, no sirve), desvincular, borrar cuenta, exportar, cola de sincronización con reintento; entrenador: código vigente, código vencido, borrar cuenta | CU-04, CU-07, CU-11, CU-12, CU-13, CU-32, CU-51, CU-52, CU-53, CU-54 |
| PAN-16 | Clientes | normal, cargando, sin clientes (muestra el código), invitar, buscando, búsqueda sin resultados, sin conexión | CU-49, CU-11, CU-14 |
| PAN-17 | Ficha del cliente | normal, cargando, sin rutina, dolor sin responder, respondiendo el dolor, escribiendo un consejo, desvincular | CU-50, CU-35, CU-14, CU-21, CU-42, CU-10 |
| PAN-18 | Alertas | por revisar, resueltas, sin alertas, cargando, sin conexión | CU-47, CU-43, CU-44, CU-45, CU-46 |
| PAN-19 | Ajustar cargas | sin cambios, con cambios, guardando, guardado, no se pudo guardar | CU-42 |
| PAN-20 | Motivos de la baja | baja de rendimiento, estancamiento, preguntando, con opciones elegidas, enviando, consejos, consejos sin señal; sola y con entrenadora | CU-48 |

---

## Matriz de permisos, celda por celda

Cada fila es una celda de la matriz de §Roles, o una regla de «Quién» de §API, con la respuesta que se espera. «Rechazado» quiere decir: el código de P-01, sin datos en la respuesta y sin cambios en la base. «404» es la regla del PRD para lo que no existe o no es tuyo.

| Id | Acción (§Roles o §API) | Rol | Esperado | CU |
| --- | --- | --- | --- | --- |
| PERM-01 | Ver la lista de clientes y sus alertas | ENT | Sí, solo los suyos con vínculo activo | CU-49, CU-47 |
| PERM-02 | Ver la lista de clientes y sus alertas | AV | Rechazado | CU-49, CU-47 |
| PERM-03 | Ver la lista de clientes y sus alertas | AS | Rechazado | CU-49, CU-47 |
| PERM-04 | Ver datos de una persona (sesiones, medidas, fotos) | ENT | Solo de sus vinculados; cualquier otro id, 404 | CU-50, CU-33, CU-37 a CU-40 |
| PERM-05 | Ver datos de una persona | AV | Solo los propios; los de otro, 404 | CU-33, CU-37 a CU-40 |
| PERM-06 | Ver datos de una persona | AS | Solo los propios; los de otro, 404 | CU-33, CU-37 a CU-40 |
| PERM-07 | Crear, editar y archivar rutinas | ENT | Sí, para cada uno de sus clientes y sus plantillas; para un alumno ajeno, 404 | CU-19, CU-20, CU-24 |
| PERM-08 | Crear, editar y archivar rutinas | AV | Las propias sí; la del entrenador solo se lee (editar o archivar, rechazado) | CU-19, CU-20, CU-24, CU-25 |
| PERM-09 | Crear, editar y archivar rutinas | AS | Las propias | CU-19, CU-20, CU-24 |
| PERM-10 | Asignar y activar una rutina | ENT | Sí, a clientes vinculados | CU-21, CU-22 |
| PERM-11 | Asignar y activar una rutina | AV | Solo las propias; asignar, rechazado; activar la del entrenador, rechazado | CU-21, CU-22 |
| PERM-12 | Asignar y activar una rutina | AS | Solo las propias; asignar, rechazado | CU-21, CU-22 |
| PERM-13 | Crear ejercicios propios con referencia | ENT | Sí | CU-17, CU-18 |
| PERM-14 | Crear ejercicios propios con referencia | AV | Sí | CU-17, CU-18 |
| PERM-15 | Crear ejercicios propios con referencia | AS | Sí | CU-17, CU-18 |
| PERM-16 | Registrar sesión, peso, medidas y fotos | ENT | No: rechazado | CU-27, CU-39, CU-40 |
| PERM-17 | Registrar sesión, peso, medidas y fotos | AV | Sí | CU-27, CU-28, CU-39, CU-40 |
| PERM-18 | Registrar sesión, peso, medidas y fotos | AS | Sí | CU-27, CU-28, CU-39, CU-40 |
| PERM-19 | Sobrescribir la sugerencia de carga | ENT | Sí, y queda registrado quién y cuándo | CU-42 |
| PERM-20 | Sobrescribir la sugerencia de carga | AV | Solo ajusta a mano en la sesión; `PATCH /suggestions/:id`, rechazado | CU-42, CU-28 |
| PERM-21 | Sobrescribir la sugerencia de carga | AS | Sí | CU-42 |
| PERM-22 | Recibir alerta de estancamiento | ENT | Sí | CU-43, CU-47 |
| PERM-23 | Recibir alerta de estancamiento | AV | Recibe aviso y registra motivos (consejos: P-05) | CU-43, CU-48 |
| PERM-24 | Recibir alerta de estancamiento | AS | Recibe aviso, motivos y consejos | CU-43, CU-48 |
| PERM-25 | Escribir observaciones y consejos | ENT | Sí, en ejercicio, sesión y rutina, solo de sus clientes | CU-35 |
| PERM-26 | Escribir observaciones y consejos | AV | Sí, en ejercicio y sesión (rutina y tipo consejo: P-08) | CU-34 |
| PERM-27 | Escribir observaciones y consejos | AS | Sí | CU-34 |
| PERM-28 | Exportar datos y borrar cuenta | ENT | Los propios | CU-53, CU-54 |
| PERM-29 | Exportar datos y borrar cuenta | AV | Los propios | CU-53, CU-54 |
| PERM-30 | Exportar datos y borrar cuenta | AS | Los propios | CU-53, CU-54 |
| PERM-31 | Encuesta (`POST` y `GET /me/survey`, «Alumno») | ENT | Rechazado | CU-09, CU-10 |
| PERM-32 | Endpoints `/trainer/*` («Entrenador») | AV y AS | Rechazado | CU-11, CU-14, CU-47, CU-49, CU-50 |
| PERM-33 | Vincular y desvincular por `/me/trainer` («Alumno») | ENT | Rechazado | CU-12, CU-13 |
| PERM-34 | Datos de un ex cliente después de terminar el vínculo | ENT | 404 al instante; conserva solo las rutinas que escribió (§Privacidad) | CU-13, CU-14 |
| PERM-35 | Editar la observación ajena | todos | No existe ruta para editar; nadie la cambia | CU-34, CU-35, CU-36 |
| PERM-36 | Fotos del alumno (`POST` y `DELETE /me/photos`) | ENT | Solo lectura: subir o borrar, rechazado | CU-40 |
| PERM-37 | `GET /me/today`, `/me/alerts`, `/me/drop-reports`, `/sessions` («Alumno») | ENT | Rechazado | CU-26, CU-27, CU-48 |
| PERM-38 | Cualquier endpoint sin token, salvo registro, ingreso, refresh, recuperación, `/health` y `/v1/docs` | anónimo | 401 | CU-03 |
| PERM-39 | Plantillas del entrenador (`client_id` nulo) | AV y AS | No se listan ni se leen: 404 | CU-25 |
| PERM-40 | Editar o borrar un ejercicio de la biblioteca base | todos | Rechazado | CU-17 |
| PERM-41 | Duplicar la rutina del entrenador | AV | Sí, como borrador propio | CU-23 |
| PERM-42 | `GET /clients/:id/suggestions` («Entrenador y el alumno solo») | AV | Rechazado; ve la sugerencia en Hoy | CU-42, CU-26 |

---

## Inventario de endpoints

El PRD dice que la API tiene 44 endpoints. Contando cada método y ruta de las tablas de §API salen 57, más 4 que nacen en otras secciones (EP-21 y EP-26 de §Pantallas y §API, EP-60 de §Arquitectura y EP-61 de §API). Todos tienen prueba.

| Id | Método y ruta | Quién (§API) | CU |
| --- | --- | --- | --- |
| EP-01 | `POST /auth/register` | Todos | CU-01 |
| EP-02 | `POST /auth/login` | Todos | CU-02, CU-58 |
| EP-03 | `POST /auth/refresh` | Todos | CU-03 |
| EP-04 | `POST /auth/logout` | Todos | CU-04 |
| EP-05 | `POST /auth/password/forgot` | Todos | CU-05, CU-58 |
| EP-06 | `POST /auth/password/reset` | Todos | CU-06 |
| EP-07 | `GET /me` | Todos | CU-07 |
| EP-08 | `PATCH /me` | Todos | CU-07, CU-51, CU-52 |
| EP-09 | `POST /me/survey` | Alumno | CU-09, CU-10, CU-57 |
| EP-10 | `GET /me/survey` | Alumno | CU-10 |
| EP-11 | `POST /me/push-tokens` | Todos | CU-08, CU-51, CU-52 |
| EP-12 | `GET /me/export` | Todos | CU-53 |
| EP-13 | `DELETE /me` | Todos | CU-54 |
| EP-14 | `POST /trainer/invitations` | Entrenador | CU-11 |
| EP-15 | `GET /trainer/clients` | Entrenador | CU-49 |
| EP-16 | `GET /trainer/clients/:id` | Entrenador | CU-50, CU-10 |
| EP-17 | `DELETE /trainer/clients/:id` | Entrenador | CU-14 |
| EP-18 | `POST /me/trainer/link` | Alumno | CU-12, CU-09 |
| EP-19 | `DELETE /me/trainer` | Alumno | CU-13 |
| EP-20 | `GET /exercises` | Todos | CU-15 |
| EP-21 | `GET /exercises/:id` (pantalla 10; ruta en P-03) | Todos | CU-16 |
| EP-22 | `POST /exercises` | Todos | CU-17 |
| EP-23 | `PATCH /exercises/:id` | Todos (solo los propios) | CU-17 |
| EP-24 | `DELETE /exercises/:id` | Todos (solo los propios) | CU-17 |
| EP-25 | `POST /exercises/:id/media` | Todos (solo los propios) | CU-18 |
| EP-26 | `PUT` de confirmación de la media (ruta en P-03) | Todos (solo los propios) | CU-18 |
| EP-27 | `GET /routines` | Todos | CU-25 |
| EP-28 | `POST /routines` | Todos | CU-19 |
| EP-29 | `GET /routines/:id` | Todos | CU-25 |
| EP-30 | `PATCH /routines/:id` | Todos (dueño) | CU-20 |
| EP-31 | `PUT /routines/:id/days` | Dueño | CU-20 |
| EP-32 | `POST /routines/:id/assign` | Entrenador | CU-21 |
| EP-33 | `POST /routines/:id/activate` | Dueño | CU-22 |
| EP-34 | `POST /routines/:id/duplicate` | Todos | CU-23 |
| EP-35 | `DELETE /routines/:id` | Dueño | CU-24 |
| EP-36 | `GET /me/today` | Alumno | CU-26, CU-41 |
| EP-37 | `POST /sessions` | Alumno | CU-27, CU-32 |
| EP-38 | `PUT /sessions/:id/sets` | Alumno | CU-28, CU-32 |
| EP-39 | `POST /sessions/:id/finish` | Alumno | CU-30, CU-41, CU-43, CU-44, CU-46 |
| EP-40 | `POST /sessions/:id/discard` | Alumno | CU-31 |
| EP-41 | `POST /sync/sessions` | Alumno | CU-32, CU-41, CU-43, CU-44 |
| EP-42 | `GET /sessions` | Alumno y su entrenador | CU-33 |
| EP-43 | `GET /sessions/:id` | Alumno y su entrenador | CU-33 |
| EP-44 | `POST /observations` | Todos | CU-34, CU-35, CU-46 |
| EP-45 | `GET /observations` | Todos | CU-36 |
| EP-46 | `GET /me/progress/exercises/:id` | Alumno y su entrenador | CU-37, CU-16 |
| EP-47 | `GET /me/progress/volume?weeks=8` | Alumno y su entrenador | CU-38 |
| EP-48 | `GET /me/prs` | Alumno y su entrenador | CU-38 |
| EP-49 | `GET /me/body-metrics` | Alumno y su entrenador | CU-39 |
| EP-50 | `POST /me/body-metrics` | Alumno | CU-39 |
| EP-51 | `POST /me/photos` | Alumno | CU-40, CU-57 |
| EP-52 | `GET /me/photos` | Alumno y su entrenador (lectura) | CU-40 |
| EP-53 | `DELETE /me/photos/:id` | Alumno | CU-40 |
| EP-54 | `GET /clients/:id/suggestions` | Entrenador y el alumno solo | CU-42, CU-41 |
| EP-55 | `PATCH /suggestions/:id` | Entrenador y el alumno solo | CU-42 |
| EP-56 | `GET /trainer/alerts` | Entrenador | CU-47, CU-45 |
| EP-57 | `PATCH /alerts/:id` | Entrenador | CU-47 |
| EP-58 | `GET /me/alerts` | Alumno | CU-48, CU-44 |
| EP-59 | `POST /me/drop-reports` | Alumno | CU-48 |
| EP-60 | `GET /health` | Público | CU-59 |
| EP-61 | `GET /v1/docs` | Público | CU-59 |
