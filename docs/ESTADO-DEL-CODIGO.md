# Estado del código

Corte del miércoles 18 de noviembre de 2026, 01:40 (rama `marca/v2-logo-botones`, sin commitear). Qué existe, qué tiene pruebas y qué falta, por módulo de la API y por pantalla de la app. Las pruebas citan los ids de `docs/pruebas/plan-de-validacion.md`. Lo que hay que configurar fuera del código para el viernes 20-11 está en [CONFIGURAR-SERVICIOS.md](CONFIGURAR-SERVICIOS.md).

Cómo leer las columnas:

- **Hecho y probado**: el código existe y tiene pruebas automáticas que pasan. En la API son pruebas de integración contra PostgreSQL 16 real (`app.inject`). En la app son pruebas de la lógica pura en Node (vitest): **ninguna pantalla se probó renderizada, en un teléfono ni en un emulador**.
- **Hecho sin pruebas**: el código existe y compila, pero nada lo prueba de forma automática.
- **Falta**: no existe o está a medias.

## Resultado de los comandos (corrida real del corte)

| Comando | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile --lockfile-only` | Pasa: el lock coincide con los `package.json` (ya trae google-auth-library, nodemailer, web-push, expo-notifications y expo-auth-session; este corte no agregó dependencias) |
| `pnpm typecheck` | Pasa en shared, mobile y api |
| `pnpm lint` | Pasa en api y mobile, sin avisos |
| `pnpm test` (sin `DATABASE_URL`) | shared 62 de 62, mobile 15 archivos y 179 de 179, api 91 pasan y 230 se saltan sin base |
| `pnpm --filter api test:int` | 22 archivos, 321 de 321 contra `gymtrack_test` (aplica la migración `20261118000000_google_y_avisos`) |
| `pnpm --filter mobile run export:android` | Pasa: bundle hbc de 5,8 MB en `apps/mobile/dist/android` |
| `pnpm --filter mobile export:web` | Pasa: bundle web de 2,4 MB en `apps/mobile/dist/web`, con la URL del VPS, el manifest, los íconos y `sw-avisos.js` en la raíz |
| `pnpm --filter api build` | Pasa: `dist/servidor.js` responde `/health` y `POST /v1/auth/google`; `node dist/worker.js recordatorios` termina con 0 contra la base de desarrollo |

## Prueba a mano del flujo principal (curl contra la API local)

API levantada con `node --import tsx src/servidor.ts` (lo mismo que `pnpm --filter api dev`, sin el watch) sobre la base de desarrollo `gymtrack`, migrada y sembrada. `pnpm --filter api dev` también arranca y responde `/health`: antes fallaba con «does not provide an export named CODIGOS_ERROR» y se arregló marcando `packages/shared` como ESM (`"type": "module"`). El guion hace todo con curl, con correos `@gymtrack.test` y claves de prueba inventadas en la corrida. Funcionó de punta a punta:

1. Registro de la entrenadora (Camila) y de la alumna (Martina): 201. El ingreso de Martina dice `encuesta_pendiente: true`.
2. Camila pide un código (201, vence a los 7 días). Martina lo revisa con `vista_previa: true` (ve «Camila» sin vincularse) y responde la encuesta con el código en minúsculas: 201 y queda vinculada. `GET /v1/me` ya dice `encuesta_pendiente: false` y `entrenador: Camila`.
3. Camila busca Press de banca y Sentadilla búlgara, crea «Fuerza» para Martina (201, borrador) y la activa (200). `GET /me/today` de Martina muestra el día con los dos ejercicios y sus pesos.
4. Martina inicia la sesión con un UUID v7 (201), guarda 5 series (una sin completar) y cierra: volumen 1.680 kg, 291 kcal (por el peso de la encuesta), 2 récords, 2 sugerencias y la próxima sesión. Cerrar otra vez devuelve el mismo resumen.
5. Progreso: volumen de 8 semanas, 2 PRs, historial del ejercicio con 1 punto, el peso de la encuesta como primera medida, y Hoy con las cifras del mes y racha 1.
6. Camila ve a Martina en Clientes (con el resumen), su ficha, sus 2 sugerencias, sobrescribe una (Martina la ve en Hoy con la nota) y le deja un consejo.
7. Permisos: la alumna en `/trainer/clients` y la entrenadora iniciando una sesión reciben 403 `FORBIDDEN`.

## Prueba a mano de este corte (Google, avisos, correo y web)

- La API armada (`pnpm --filter api build`, `node dist/servidor.js`) arranca contra la base de desarrollo migrada, responde `/health` y `POST /v1/auth/google` con un token inventado da 401 `token_invalido` (bajó los certificados de Google). Con `GOOGLE_CLIENT_IDS=mala` no arranca y dice por qué.
- El worker armado (`node dist/worker.js recordatorios`) terminó con 0: revisó 3 alumnos y no mandó nada (ninguno a 30 minutos de su hora).
- La app web exportada contra la API local, servida con reescritura a `index.html`: el Perfil del entrenador muestra «Avisos en este navegador» con el estado del permiso y «Probar avisos»; tocarlo pidió `POST /v1/notificaciones/prueba`, la API mandó el correo (driver consola) y la app mostró «Te mandamos un correo de prueba...». Cerrar sesión volvió a Ingreso y borró la sesión del navegador. El navegador de prueba tenía los avisos bloqueados: no se probó un push real.
- No probado: nada en un teléfono, nada contra Google, Expo, FCM, Apple ni Gmail reales (faltan las cuentas: [CONFIGURAR-SERVICIOS.md](CONFIGURAR-SERVICIOS.md)).

## API (`apps/api`)

| Módulo | Hecho y probado | Hecho sin pruebas | Falta |
| --- | --- | --- | --- |
| Cuentas (`src/cuentas`) | Registro, ingreso, refresh rotativo con reuso, logout, olvidé y restablecer contraseña, `GET /v1/me` (cuentas 24 y seguridad 23 pruebas). `GET /me` y el ingreso ahora traen el entrenador del vínculo y si falta la encuesta (INT-002, INT-022 en `test/integracion.int.test.ts`) | | Correo de «tu cuenta se borra el ...» (CU-54) |
| Ingreso con Google (`src/cuentas/google.ts`) | `POST /v1/auth/google`: verificación del id_token (firma, emisor, vencimiento, audiencia contra `GOOGLE_CLIENT_IDS`, correo verificado), cuenta existente, `falta_rol` y cuenta nueva sin contraseña, cuenta atada por `users.google_sub` (otra cuenta de Google con el mismo correo da 401), doble toque, topes por IP, 503 sin configurar (17 pruebas, GOO-001 a GOO-017) | | Probarlo contra Google real (GOO-026, GOO-027). Decisión pendiente: al vincular una cuenta creada con contraseña sin verificar el correo (P-55), revocar sus sesiones y anular la contraseña |
| Correo (`src/correo`) | Resend, consola y memoria; SMTP con Gmail y clave de aplicación (`smtp.ts`): 465 con TLS o 587 con STARTTLS, 10 s por etapa, un reintento, 535 sin reintento, errores con código corto y sin secretos; la configuración exige las 16 letras de la clave (NOT-020 a NOT-026) | | Un correo real por Gmail (NOT-062, manual) |
| Notificaciones (`modulos/notificaciones`) | `POST` y `DELETE /v1/notificaciones/dispositivos`, `POST /v1/notificaciones/prueba`; destino cifrado en `push_tokens` (`tipo`, `destino_cifrado`, SEG-003); Expo Push y Web Push con reintento; tope de 2 push al día en la zona de la persona, compartido por la API y el worker en `avisos_enviados`; avisos de dolor, observaciones, cierre con alertas, consejos y rutinas; el alumno solo no avisa (NOT-001 a NOT-042, INT-145, INT-147, INT-150, WRK-007, WRK-014, WRK-016, WRK-017) | | Leer los recibos de Expo (un `DeviceNotRegistered` que llega recién en el recibo no borra el token); push real (NOT-060, NOT-061) |
| Compartido (`src/compartido`) | Registro automático de módulos, permisos por rol y vínculo, `?client_id=`, paginación por cursor, semilla con ids fijos (15 pruebas) | | OpenAPI en `/v1/docs` (CON-003) |
| Perfil (`modulos/perfil`) | `PATCH/DELETE /me`, encuesta, push tokens, exportar ZIP firmado, invitaciones, vincular (con vista previa) y desvincular (30 pruebas). `POST /me/push-tokens` ahora guarda el token igual que notificaciones (cifrado, sirve para mandar; INT-028) | | UNI-099, ZIP en un bucket; campo para apagar los avisos del entrenador (P-41: hoy solo `recordatorio_activo` llega a la API) |
| Ejercicios (`modulos/ejercicios`) | Biblioteca con búsqueda, filtros y PR, detalle, crear, editar y borrar propios (16 pruebas) | | Subir video o imagen de referencia (INT-060 a 062, 153, SEG-031); búsqueda sin tildes (`unaccent`) |
| Rutinas (`modulos/rutinas`) | Listar, crear, editar, reemplazar días conservando ids, asignar (copia por cliente), activar con una sola activa, duplicar y archivar (30 pruebas) | | INT-073 (sesión en curso con la versión anterior) |
| Sesiones (`modulos/sesiones`) | Hoy, iniciar idempotente, series, cerrar con récords y sugerencias, descartar, cola `POST /sync/sessions`, historial, detalle y observaciones (14 pruebas). El cierre ahora corre la detección de estancamiento y baja (INT-099 por la ruta, en `test/integracion.int.test.ts`) | | Pruebas de INT-095, SYNC-011, SYNC-012, SYNC-018, CON-011, CON-013, CON-015; recalcular PRs al llegar una sesión vieja (P-31); récords `peso_max`, `reps_con_peso` y `volumen_sesion` |
| Progreso (`modulos/progreso`) | Progreso por ejercicio, volumen semanal, PRs, peso y medidas con tendencia, fotos con consentimiento, sugerencias con sobrescribir y restaurar (24 pruebas) | | Adaptador de Firebase Storage (hoy solo disco con `ALMACENAMIENTO_DIR`); revisión de EXIF en el servidor |
| Alertas (`modulos/alertas`) | Lista del entrenador, cambiar estado con acciones, alertas del alumno, motivos con consejos, reglas de estancamiento, baja, sin sesiones y dolor (24 pruebas). El push al entrenador con tope de 2 al día sale del módulo notificaciones (P-20) | | |
| Entrenador (`modulos/entrenador`) | Clientes con filtros y resumen, ficha completa y desvincular (9 pruebas) | | |
| Worker (`src/worker`) | Tareas `noche`, `deteccion`, `purga` y `recordatorios` (30 minutos antes de la hora habitual, P-21); `noche` manda el correo de alertas nuevas a cada entrenador (10 pruebas más NOT-037, NOT-038, NOT-042) | `src/worker.ts` corre una tarea y termina o queda residente: `noche` a las 07:00 UTC y `recordatorios` cada 5 minutos. Probado a mano con el bundle | Latido `HC_WORKER_URL` |
| CORS | Expo web en localhost puede llamar; un origen ajeno no (`test/integracion.int.test.ts`). `CORS_ORIGENES` con los orígenes exactos de la app web, validado al arrancar (WEB-003, WEB-004) | | Definirlo en Dokploy |

## App (`apps/mobile`)

Todas las pantallas existen, compilan y entran en el bundle de Android. Ninguna se vio en un teléfono ni en un emulador. Las áreas Acceso y Entrenador se miraron en la versión web exportada, sin API detrás. La lógica pura de cada área tiene pruebas en `src/features/<área>/__tests__`.

| Pantalla | Hecho y probado (lógica) | Hecho sin pruebas | Falta |
| --- | --- | --- | --- |
| PAN-01 Ingreso, PAN-02 Crear cuenta, PAN-03 Recuperar, Restablecer | Validaciones, errores por código, envíos y cuenta regresiva (15 pruebas, APP-001 a 010). «Continuar con Google»: plataformas, vuelta en Android y en web con `state` y `nonce`, mensajes, «Completa tu cuenta» y contrato (GOO-020 a GOO-025); la sesión de Google entra al tiro con `entrarConSesion` (GOO-028) | La pantalla y la navegación por rol después de ingresar. El botón de Google y la vuelta en web se miraron en el export web con una API falsa | NetInfo para deshabilitar sin red (APP-004); `extra.urlTerminos` y `extra.urlPrivacidad` en `app.json` (SEG-029); Google en un teléfono (GOO-026, GOO-027) |
| PAN-04 Encuesta | Las 10 preguntas, reductor y cuerpo (15 pruebas). El cuerpo ahora pasa el esquema estricto de la API (`esquemaEncuestaEntrada`) y el código se revisa con la vista previa de `POST /me/trainer/link` | La pantalla, el botón atrás de Android (en la web ya no se registra) | |
| PAN-05 Hoy | Estados de Hoy y lector de `GET /me/today` con la forma real de la API (`contratoApi.test.ts`, CON-006) | La pantalla y la caché del último Hoy | Leer `?dia=` que manda Detalle de rutina para empezar otro día |
| PAN-11/12 Registro de sesión y descanso | Marcar, fallar, deshacer, añadir serie, cola sin señal con reintentos, cuerpos que pasan `RUTAS_SESIONES` (CON-012) | La pantalla, `expo-keep-awake`, vibración | Notificación local al terminar el descanso (`expo-notifications`), vista «toda la sesión», libras, SQLite en vez de AsyncStorage (H-05), lotes por `POST /sync/sessions` |
| PAN-13 Completada | Resumen local y lectura del resumen de la API | La pantalla | Animación del símbolo |
| PAN-06 Rutinas, PAN-07 Nueva y Editar, PAN-08 Detalle | Orden de la lista, permisos de la hoja, errores del editor (APP-019 a 023). Los cuerpos ya no mandan `orden`, `PUT /days` conserva los ids, la rutina para un cliente va con `client_id` y se activa, y asignar va de a un cliente | Las pantallas | Pregunta «¿Salir sin guardar?» con el botón atrás de Android |
| PAN-09 Ejercicios, PAN-10 Detalle y formulario | Búsqueda sin tildes, filtros, «Crear «X»» (APP-024, 025) | Las pantallas, el gráfico | Subir video o foto de referencia (`expo-image-picker`), «Tus clientes» en el detalle del entrenador |
| PAN-14 Progreso | Tendencia desde el tercer registro, medidas nulas (APP-033, 051) | Las pantallas y gráficos | Fotos de progreso (`expo-image-picker`, `expo-image-manipulator`) |
| PAN-15 Perfil | Descanso de 30 s a 5 min (APP-038). Avisos del teléfono: activar, renovar al entrar, borrar al cerrar sesión y probar (NOT-050 a NOT-058, NOT-063 a NOT-065) | Modo gimnasio, unidades, vincular, exportar, borrar cuenta. La fila «Avisos en este teléfono» con «Activar avisos» y, para el entrenador, «Probar avisos» (vista en web). El interruptor del recordatorio manda `recordatorio_activo` | Cola visible con Reintentar (APP-037), aviso de sesiones en cola al cerrar sesión (APP-047), limpiar la caché al cerrar sesión; los interruptores de mensajes del entrenador, alertas y notas no llegan a la API (falta el campo) |
| PAN-20 Motivos de la baja | Consejos por motivo y cola sin señal (APP-044) | La pantalla | |
| PAN-16 Clientes, PAN-17 Ficha, PAN-18 Alertas, PAN-19 Ajustar cargas, Perfil del entrenador | Filtros, textos, cambios de Ajustar cargas (34 pruebas). Ahora leen la forma real de la API: `rutina`, `adherencia_semana` y `ultima_sesion` en Clientes; `mes`, `medidas.ultima` y `dia_nombre` en la Ficha; `client`, `exercise`, `reporte` y `acciones` en Alertas; resolver manda `acciones` y las resueltas se piden con `estado=resueltas` | Las pantallas; la insignia de Alertas en la barra | La adherencia de 4 semanas en la ficha (la API da la de esta semana; se muestra «–»); los días perdidos de la semana; «Ver fotos»; `expo-clipboard` en vez del Clipboard de React Native |
| Sesión y tema (`src/lib`) | Renovación de tokens, 401, restaurar sin red, entrar con una sesión ya armada, pasos antes de cerrar sesión (14 pruebas); en web la sesión queda en `localStorage` o en memoria (WEB-001, WEB-002) | Tema gimnasio y clara | Sincronizar `modo_gimnasio` del usuario con el tema al ingresar |
| Avisos (`src/lib/notificaciones`) | Activar, renovar, desactivar y probar, con el contrato de la API (NOT-050 a NOT-058, NOT-064, NOT-065) | `expo-notifications` en Android (canal `avisos`, token de Expo con el `projectId` de EAS), Push API y `public/sw-avisos.js` en la web; abrir la pantalla del aviso tocado (layout raíz) | Un push real en Android y en el iPhone (NOT-060, NOT-061) |
| App web del iPhone | Manifest, íconos, `index.html` y Firebase Hosting (WEB-005, WEB-006, WEB-009) | Recorrido en el navegador de escritorio (WEB-007) | Instalarla en un iPhone (WEB-008) |

## Pendientes que cruzan todo

- **Push**: la API manda los avisos (Expo y Web Push) y la app los activa en Perfil, pero nada se probó con servicios reales. Para que funcionen hacen falta el proyecto de EAS, `google-services.json`, la llave de FCM V1 y las llaves VAPID ([CONFIGURAR-SERVICIOS.md](CONFIGURAR-SERVICIOS.md)). El fin del descanso sigue sin notificación local.
- **Migración nueva**: `20261118000000_google_y_avisos` (`users.google_sub`, `push_tokens.tipo` y `destino_cifrado`, tabla `avisos_enviados`). Hay que correr `npx prisma migrate deploy` en el VPS antes de abrir la app: sin ella la API no puede leer usuarios.
- **Almacenamiento**: fotos en disco local (`ALMACENAMIENTO_DIR`); en Docker tiene que ser un volumen. Falta Firebase Storage.
- **Sin señal**: la app detecta la red por fallas de `fetch` y reintenta cada 30 s; no usa NetInfo.
- **Pruebas en dispositivo**: no se corrió ningún E2E ni se abrió la app en Android. Es lo primero que hay que hacer con la API local (`EXPO_PUBLIC_API_URL`).
- **Decisiones por confirmar**: tolerancia de reloj del celular (24 h, entre P-28 y SYNC-018); definición de «entrena hoy» y de adherencia; INT-080 (solo se archiva la rutina activa del entrenador, no sus borradores).
- **Bases sobrantes de las pruebas en paralelo**: `gymtrack_test_ejrut`, `gymtrack_test_progreso` y `gymtrack_test_sesiones` en el contenedor `gymtrack-dev-db-1`. Se pueden borrar con `docker exec gymtrack-dev-db-1 psql -U gymtrack -d gymtrack -c 'DROP DATABASE <nombre>'`.
- **Cuentas de prueba en la base de desarrollo** (`gymtrack`): «Prueba Web» (`web.prueba.8b0e51@gymtrack.test`) y «Prueba Integracion» (`integracion.b6862d@gymtrack.test`, entrenador), creadas para revisar la app web. Se pueden borrar.
