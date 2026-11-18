# API de GymTrack

Fastify 5, Zod y Prisma 7 sobre PostgreSQL 16, en TypeScript. Trae las cuentas (Argon2id y JWT propios, sin Firebase Auth, más el ingreso con Google), los siete módulos de §API (perfil, ejercicios, rutinas, sesiones, progreso, alertas y entrenador), los avisos al celular (notificaciones: Expo para Android y Web Push para la app web del iPhone), el correo por Resend o por Gmail con clave de aplicación, y un worker con la detección nocturna, la purga y los recordatorios. Qué está probado y qué falta: [docs/ESTADO-DEL-CODIGO.md](../../docs/ESTADO-DEL-CODIGO.md). Lo que hay que configurar fuera del código (Google, Firebase, VAPID, Gmail, Dokploy): [docs/CONFIGURAR-SERVICIOS.md](../../docs/CONFIGURAR-SERVICIOS.md).

Los esquemas de entrada y salida no viven aquí: están en `packages/shared/src/api/` (uno por módulo, con su catálogo `RUTAS_<MÓDULO>`) y la API los importa tal cual. La app usa los mismos esquemas para armar sus cuerpos.

## Rutas

Todas bajo `/v1`, salvo `/health`. Las privadas piden `Authorization: Bearer <access>`.

| Módulo | Rutas | Notas |
| --- | --- | --- |
| Cuentas (`src/cuentas`) | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, `/auth/password/forgot`, `/auth/password/reset`; `GET /me`; `GET /health` | `GET /me` y el ingreso traen el entrenador del vínculo activo y `encuesta_pendiente` real. `/auth/google` verifica el id_token de Google (ver «Ingreso con Google») |
| Perfil (`modulos/perfil`) | `PATCH /me`, `DELETE /me`, `POST` y `GET /me/survey`, `POST /me/push-tokens`, `GET /me/export`, `GET /me/export/archivo` (pública, firmada), `POST` y `GET /trainer/invitations`, `POST /me/trainer/link` (con `vista_previa`), `DELETE /me/trainer` | La encuesta vincula si trae `codigo_entrenador`. 10 códigos fallidos por hora (P-27). `POST /me/push-tokens` guarda el token igual que `POST /notificaciones/dispositivos` (cifrado, sirve para mandar) |
| Ejercicios (`modulos/ejercicios`) | `GET /exercises`, `GET /exercises/:id`, `POST /exercises`, `PATCH` y `DELETE /exercises/:id` | Visibilidad P-07: base, propios, del entrenador en tus rutinas |
| Rutinas (`modulos/rutinas`) | `GET` y `POST /routines`, `GET` y `PATCH /routines/:id`, `PUT /routines/:id/days`, `POST /routines/:id/assign`, `/activate`, `/duplicate`, `DELETE /routines/:id` | Una sola activa por alumno (P-06); `PUT /days` conserva lo que viene con id |
| Sesiones (`modulos/sesiones`) | `GET /me/today`, `POST /sessions`, `PUT /sessions/:id/sets`, `POST /sessions/:id/finish`, `/discard`, `POST /sync/sessions`, `GET /sessions`, `GET /sessions/:id`, `POST` y `GET /observations` | Ids UUID v7 del celular. Cerrar corre la detección de estancamiento y baja |
| Progreso (`modulos/progreso`) | `GET /me/progress/exercises/:id`, `GET /me/progress/volume`, `GET /me/prs`, `GET` y `POST /me/body-metrics`, `POST` y `GET /me/photos`, `DELETE /me/photos/:id`, `PUT` y `GET /me/photos/:id/archivo` (públicas, firmadas), `GET /clients/:id/suggestions`, `PATCH /suggestions/:id` | El entrenador lee con `?client_id=` (P-02) |
| Alertas (`modulos/alertas`) | `GET /trainer/alerts`, `PATCH /alerts/:id`, `GET /me/alerts`, `POST /me/drop-reports` | Resolver guarda `acciones` (cargas, consejo, rutina, nada) |
| Entrenador (`modulos/entrenador`) | `GET /trainer/clients`, `GET /trainer/clients/:id`, `DELETE /trainer/clients/:id` | Lo ajeno da 404 |
| Notificaciones (`modulos/notificaciones`) | `POST /notificaciones/dispositivos`, `DELETE /notificaciones/dispositivos/:id`, `POST /notificaciones/prueba` | Token de Expo (Android) o suscripción web (iPhone); la prueba es solo del entrenador en producción. Ver «Avisos al celular» |

Todo error sale con el sobre de §API: `{ "error": { "code", "message", "details" } }`, con un código de `packages/shared/src/api/errores.ts`. El access dura 15 minutos (HS256); el refresh, 30 días; los tokens opacos se guardan solo como hash SHA-256. Lo que el rol no puede hacer da 403 `FORBIDDEN`; lo que no es tuyo ni de tu alumno, 404.

## Cómo levantarla en local

Requisitos: Node 22, pnpm 12 y Docker.

```bash
pnpm install                         # desde la raíz
cp apps/api/.env.ejemplo apps/api/.env
pnpm --filter api db:levantar        # PostgreSQL 16 en 127.0.0.1:5442 (bases gymtrack y gymtrack_test)
pnpm --filter api db:migrar          # aplica prisma/migrations
pnpm --filter api db:sembrar         # 67 ejercicios base y 15 consejos (idempotente)
pnpm --filter api dev                # http://localhost:3000/health
```

Con `CORREO_DRIVER=consola` los correos no salen a internet: el log muestra el tipo, el id del usuario y el enlace con el token enmascarado (`token=jTOV…(43)`). Para abrir el enlace completo en local, define `CORREO_CARPETA=tmp/correos` y el correo entero queda en esa carpeta (está en `.gitignore`).

Para probar la imagen igual que en el VPS:

```bash
docker compose -f apps/api/compose.dev.yml --profile completo up --build
```

## Variables

| Variable | Obligatoria | Qué es |
| --- | --- | --- |
| `NODE_ENV` | no (`development`) | `development`, `test` o `production` |
| `PORT`, `HOST` | no (`3000`, `0.0.0.0`) | Dónde escucha |
| `DATABASE_URL` | sí | PostgreSQL 16 |
| `JWT_SECRET` | en producción | Clave HS256 de al menos 32 caracteres (`openssl rand -hex 32`). Fuera de producción, si falta o está vacía se inventa una por proceso. El worker tiene que tener la misma: de ella sale la llave que cifra los dispositivos de los avisos |
| `VERSION`, `COMMIT_SHA` | no | Lo que devuelve `/health`. Compose fija `VERSION` (`sha-<commit>` o `v1.2.3`); el Dockerfile graba `COMMIT_SHA` con `--build-arg` |
| `CONFIAR_PROXY` | no (`1` en producción, `false` fuera) | Saltos de proxy (`1` = Caddy o Traefik), IPs o redes del proxy separadas por coma, o `false`. `true` se lee como `1`. |
| `CORREO_DRIVER` | no | `resend`, `smtp` (Gmail), `consola` o `memoria`. Por defecto: producción `resend`, pruebas `memoria`, local `consola`. En producción se acepta `resend` o `smtp` |
| `RESEND_API_KEY` | con `resend` | Clave de Resend del entorno |
| `SMTP_HOST`, `SMTP_PUERTO` | no (`smtp.gmail.com`, `465`) | Servidor SMTP. 465 va con TLS desde el inicio; 587, con STARTTLS obligatorio |
| `SMTP_USUARIO` | con `smtp` | La cuenta de Gmail que manda los correos |
| `SMTP_CLAVE` | con `smtp` | La clave de aplicación de Google (16 letras; se aceptan los espacios con que Google la muestra). Nunca la contraseña de la cuenta: con `smtp.gmail.com` la API no arranca si no son 16 letras. Nunca se loguea |
| `CORREO_REMITENTE` | no | Con Resend, `GymTrack <hola@correo.tudominio.cl>` de un dominio verificado. Con Gmail, la misma cuenta o un alias verificado en Gmail; sin la variable, `GymTrack <SMTP_USUARIO>` |
| `CORREO_RESPONDER_A` | no | Reply-To |
| `CORREO_CARPETA` | no | Con `consola`, carpeta donde se escribe cada correo completo |
| `ENLACE_RESTABLECER_URL` | no (`gymtrack://restablecer`) | Base del enlace del correo; la API agrega `?token=...`. En el VPS conviene `https://gymtrack-app-5dd46.web.app/restablecer`: abre en el iPhone (sin app nativa) y en Android |
| `GOOGLE_CLIENT_IDS` | para el ingreso con Google | Client ID de OAuth de Google (web y Android) separados por coma. No son secretos. Sin valor, `POST /v1/auth/google` responde 503 y el resto funciona igual. Uno sin la forma `<número>-<código>.apps.googleusercontent.com` no deja arrancar la API |
| `RELOJ_FIJO` | no | Solo pruebas y local: «ahora» fijo en ISO. La API no arranca con esto en producción (SEG-032) |
| `LOG_LEVEL` | no (`info`) | Nivel de pino. Los logs no llevan correos, nombres ni tokens: solo ids |
| `CORS_ORIGENES` | para la app web | Orígenes web que pueden llamar desde un navegador, separados por coma, como `esquema://dominio[:puerto]` sin ruta. En el VPS: `https://gymtrack-app-5dd46.web.app` (la app web para iPhone). Sin valor y fuera de producción se acepta `http://localhost:*` y `http://127.0.0.1:*` (Expo web); con valor, solo lo que diga. Un comodín, una ruta o `http` en producción no dejan arrancar la API (WEB-004). La app nativa no lo necesita |
| `ALMACENAMIENTO_DRIVER` | no (`disco`) | Dónde quedan las fotos de progreso. Hoy solo `disco`; `firebase` todavía no existe y falla al arrancar |
| `ALMACENAMIENTO_DIR` | con `disco` | Carpeta de las fotos. En Docker tiene que ser un volumen, si no se pierden al recrear el contenedor |
| `UMBRAL_ESTANCAMIENTO_SESIONES`, `UMBRAL_BAJA_PCT`, `UMBRAL_BAJA_SEMANAS`, `UMBRAL_BAJA_SEMANAS_MIN`, `UMBRAL_SIN_SESIONES_DIAS`, `UMBRAL_DOLOR_INTENSIDAD` | no (3, 10, 4, 2, 7, 7) | Umbrales de las alertas (P-34) |
| `PUSH_DRIVER` | no | `real` (Expo y Web Push), `consola` (solo log) o `memoria` (pruebas). Por defecto: producción `real`, pruebas `memoria`, local `consola` |
| `VAPID_PUBLICA`, `VAPID_PRIVADA`, `VAPID_CONTACTO` | para la app web | Llaves de Web Push (las tres o ninguna; `npx web-push generate-vapid-keys`). El contacto es `mailto:correo` o una dirección https. Sin ellas, Android recibe y la web no. La pública va también en la app como `EXPO_PUBLIC_VAPID_PUBLICA` |
| `EXPO_ACCESS_TOKEN` | no | Solo si se activa «Enhanced push security» en expo.dev |
| `AVISOS_URL_APP` | no | Dirección de la app web (`https://gymtrack-app-5dd46.web.app`) para el botón «Abrir Alertas» de los correos |
| `TOLERANCIA_RELOJ_CELULAR_MS` | no (24 h) | Cuánto puede venir en el futuro una fecha del celular antes de dar 422 |

## Worker

`src/worker.ts` arranca las tareas de `src/worker/`:

```bash
node dist/worker.js noche                               # detección y purga, una vez, y termina (cron)
node dist/worker.js recordatorios                       # recordatorios para entrenar (cron cada 5 minutos)
node dist/worker.js purga --ahora=2026-12-17T03:00:00Z  # --ahora solo fuera de producción (SEG-032)
node dist/worker.js                                     # residente: `noche` cada día a las 07:00 UTC y `recordatorios` cada 5 minutos
```

En local, sin empaquetar: `node --import tsx src/worker.ts noche`. Termina con código 1 si la configuración está mal o si una cuenta quedó pendiente de purga. `noche` además le manda a cada entrenador un correo con las alertas nuevas de la corrida (sin push: es de madrugada en Chile). `recordatorios` manda el push 30 minutos antes de la hora habitual de cada alumno (P-21). Falta el latido a `HC_WORKER_URL`.

En Dokploy el worker es otro servicio con la misma imagen y el comando `node dist/worker.js` (residente). Necesita las mismas variables que la API: `DATABASE_URL`, el mismo `JWT_SECRET` (si no, no puede descifrar los dispositivos), las de correo (`CORREO_DRIVER`, `SMTP_*`) y las de avisos (`VAPID_*`, `AVISOS_URL_APP`).

## Pruebas

```bash
pnpm --filter api test:int     # levanta PostgreSQL 16 con Docker y corre toda la suite
pnpm --filter api test         # sin DATABASE_URL: corre contrato, correo y config; salta la integración con un aviso
DATABASE_URL=postgresql://gymtrack:gymtrack@127.0.0.1:5442/gymtrack_test pnpm --filter api test
```

- Integración con `app.inject` contra PostgreSQL 16 real. La base se vacía (`TRUNCATE`) antes de cada caso y las migraciones se aplican una vez por corrida (`test/preparar-base.ts`).
- Reloj controlado: la API lee la hora de `src/reloj.ts`; las pruebas parten el martes 17 de noviembre de 2026 a las 13:00 UTC y lo mueven con `reloj.avanzar('16m')`.
- Correo en memoria: las pruebas leen el último correo por destinatario. Nunca se llama a la API real de Resend: el adaptador se prueba con un `fetch` falso.
- Contraseña de las personas de prueba: `SEMILLA_CLAVE` o 12 caracteres al azar por corrida.
- Cada prueba lleva en el nombre el id del plan (`INT-010`, `SEG-009`, `CON-001`), así se cruzan con `docs/pruebas/plan-de-validacion.md`.
- Hay un archivo por módulo en `test/<módulo>/` y `test/integracion.int.test.ts` para lo que une módulos (GET /me con vínculo y encuesta, alertas al cerrar, CORS de Expo web en localhost). El CORS de la app web publicada (`CORS_ORIGENES`) está en `test/cors.test.ts`, que corre sin base (WEB-003, WEB-004).
- `test:int` vacía `gymtrack_test` en cada caso: no la corran dos procesos a la vez. Para correr en paralelo, otra base: `docker exec gymtrack-dev-db-1 psql -U gymtrack -d gymtrack -c 'CREATE DATABASE gymtrack_test_yo'` y `DATABASE_URL=.../gymtrack_test_yo npx vitest run`.
- El ayudante `pedir` revisa en cada respuesta 4xx y 5xx de la suite que tenga el sobre y un código del catálogo (CON-004).

## Correo con Resend

El adaptador está en `src/correo/resend.ts` y llama a `POST https://api.resend.com/emails` con `Authorization: Bearer RESEND_API_KEY`. Se envía en segundo plano: la ruta responde sin esperar a Resend, así «olvidé mi contraseña» tarda lo mismo exista o no el correo. Si Resend falla, queda en el log con el tipo de correo y el id del usuario.

Qué tiene que configurar el equipo en Resend (una vez por dominio):

1. **Cuenta.** Crea una cuenta de equipo en resend.com (no una personal) e invita al resto. El plan gratuito alcanza para la prueba cerrada; revisa sus límites del mes y del día antes de la prueba con usuarios (no verificado aquí).
2. **Dominio.** En *Domains → Add domain* agrega un subdominio de envío, por ejemplo `correo.tudominio.cl`, para no mezclar la reputación con el correo del equipo. Elige la región `sa-east-1` (São Paulo) si está disponible, la más cerca de Chile.
3. **DNS.** Resend muestra los registros exactos; cópialos tal cual en tu proveedor de DNS:
   - **DKIM**: un `TXT` en `resend._domainkey.correo.tudominio.cl` con la llave pública (`p=MIGf...`).
   - **SPF**: un `MX` en `send.correo.tudominio.cl` hacia `feedback-smtp.<región>.amazonses.com` (prioridad 10) y un `TXT` en el mismo nombre con `v=spf1 include:amazonses.com ~all`.
   - **DMARC** (recomendado): un `TXT` en `_dmarc.tudominio.cl` con `v=DMARC1; p=none; rua=mailto:<correo-del-equipo>` para empezar, y subirlo a `quarantine` cuando los envíos estén estables.
   Espera a que Resend marque el dominio como *Verified*.
4. **Seguimiento apagado.** Apaga *click tracking* y *open tracking* del dominio: el seguimiento de clics reescribe los enlaces y el token de recuperación pasaría por los servidores de seguimiento.
5. **Claves.** Crea una API key por entorno (staging y producción) con permiso *Sending access* y limitada a ese dominio. Va en `/opt/gymtrack/<entorno>/app.env` como `RESEND_API_KEY`, nunca en el repo.
6. **Remitente.** `CORREO_REMITENTE=GymTrack <hola@correo.tudominio.cl>`, del dominio verificado.
7. **Staging.** No mandes correos a direcciones `@gymtrack.test`: ese dominio no recibe correo, rebota y los rebotes bajan la reputación del dominio en Resend. Para el humo de staging usa las direcciones de prueba de Resend (por ejemplo `delivered@resend.dev`) o correos reales del equipo.

## Correo con Gmail (clave de aplicación)

`CORREO_DRIVER=smtp` manda los mismos correos (bienvenida, recuperación y avisos) por SMTP con nodemailer (`src/correo/smtp.ts`). Cada intento tiene 10 s de tope y, si se corta o se demora, se reintenta una vez; una clave mala (535) no se reintenta. El log lleva el tipo de correo, el id del usuario y un código corto (`SMTP_535`, `SMTP_TIEMPO`, `SMTP_RED`): nunca la clave ni el destinatario.

1. **Cuenta.** Usa una cuenta de Gmail del equipo solo para esto (por ejemplo `gymtrack.avisos@gmail.com`), no una personal.
2. **Verificación en dos pasos.** En myaccount.google.com, *Seguridad → Verificación en dos pasos*: actívala. Sin ella Google no deja crear claves de aplicación.
3. **Clave de aplicación.** En myaccount.google.com/apppasswords crea una con el nombre «GymTrack API». Google la muestra una sola vez, en 4 grupos de 4 letras.
4. **Variables** (en Dokploy, en el servicio de la API y en el del worker):

   ```bash
   CORREO_DRIVER=smtp
   SMTP_HOST=smtp.gmail.com
   SMTP_PUERTO=465
   SMTP_USUARIO=gymtrack.avisos@gmail.com
   SMTP_CLAVE=<la clave de aplicación>
   CORREO_REMITENTE=GymTrack <gymtrack.avisos@gmail.com>
   ```

5. **Probar.** Ingresa como entrenador y toca «Probar avisos» en Perfil (o llama a `POST /v1/notificaciones/prueba` con `{"correo": true}`): te llega «Prueba de avisos de GymTrack» a tu correo. Si el VPS no deja salir por el 465, prueba con `SMTP_PUERTO=587`. Si la clave está mal, el log de la API dice `SMTP_535`.

Límites: Gmail gratis manda unos 500 correos al día; para la evaluación sobra. Si cambias la contraseña de la cuenta, Google borra las claves de aplicación y hay que crear otra.

## Avisos al celular

El módulo `src/modulos/notificaciones` registra los dispositivos y manda los push. La app Android manda su token de Expo y la app web del iPhone su suscripción del navegador (endpoint y llaves) a `POST /v1/notificaciones/dispositivos` (Perfil, «Activar avisos»); la API guarda en `push_tokens` el tipo (`expo` o `web`), la plataforma, el hash y el destino cifrado (`destino_cifrado`, AES-256-GCM con una llave que sale de `JWT_SECRET`), así no queda ningún token en claro (SEG-003). Si `JWT_SECRET` cambia, los dispositivos se vuelven a registrar solos al abrir la app (la app renueva su registro cada vez que entra). Al cerrar sesión la app borra su dispositivo antes de salir.

| Evento | A quién | Canal |
| --- | --- | --- |
| Cierre de sesión con estancamiento, baja o dolor general de 7 o más | Entrenador | Push y correo |
| Dolor de 7 o más en `POST /observations` | Entrenador | Push y correo, al tiro y aunque ya tenga 2 hoy (P-20) |
| Otra observación del alumno | Entrenador | Push (INT-150) |
| Respuesta o consejo del entrenador | Alumno | Push (P-41) |
| Rutina asignada o activada por el entrenador | Alumno | Push |
| 30 minutos antes de la hora habitual (worker) | Alumno con el recordatorio encendido | Push (P-21) |
| Alertas nuevas de la noche (worker) | Entrenador | Correo |

- Tope de 2 push al día por persona (día de su zona), fuera de la prueba. Lo que pasa el tope no sale por push pero queda en Alertas; el correo de las alertas sale igual.
- Cada aviso tiene una clave para no repetirse (WRK-014). El registro vive en la tabla `avisos_enviados` (migración `20261118000000_google_y_avisos`), que la API y el worker comparten: el tope vale para los dos.
- Expo dice `DeviceNotRegistered` y el navegador 404 o 410 cuando un dispositivo ya no existe: se borra.
- Los avisos salen después de responder: una ruta nunca espera a Expo, a Apple ni a Gmail.
- El alumno solo (sin entrenador) no le avisa a nadie.
- Lo que escribe el alumno no va en el push (se ve en la pantalla bloqueada): solo que dejó una observación y sobre qué.
- Para la demostración: el entrenador toca «Probar avisos» en Perfil (o llama a `POST /v1/notificaciones/prueba` con `{"correo": true}`) y le llega un push a cada teléfono registrado y un correo. Lo que hay que configurar antes (Firebase, EAS, VAPID, Gmail) está en [docs/CONFIGURAR-SERVICIOS.md](../../docs/CONFIGURAR-SERVICIOS.md).

## Ingreso con Google

`POST /v1/auth/google` (`src/cuentas/google.ts`) recibe el `id_token` que Google le da a la app y lo verifica con google-auth-library: firma con los certificados de Google, emisor, vencimiento, audiencia contra `GOOGLE_CLIENT_IDS` y `email_verified`.

- La cuenta queda atada a su cuenta de Google por `users.google_sub`. Se busca primero por ese `sub` (la persona pudo cambiar el correo en Google) y después por el correo verificado. Una cuenta ya atada a otra cuenta de Google da 401 `INVALID_CREDENTIALS` con `motivo: otra_cuenta_google`.
- Si el correo ya tiene cuenta, entra, guarda el `sub` y marca `email_verified_at`. Si no, responde 200 `{ resultado: 'falta_rol', perfil }`; el segundo envío con `rol`, `nombre` y `apellido` crea la cuenta (sin contraseña conocida: la crea con «Olvidé mi contraseña») y responde la misma sesión que el ingreso.
- Errores sin códigos nuevos: token malo o de otra app, 401 con `details.motivo` (`token_invalido`, `cliente_ajeno`, `sin_correo`); correo sin verificar, 422 `BUSINESS_RULE`; cuenta por borrarse, 401 `ACCOUNT_DELETED`; sin `GOOGLE_CLIENT_IDS` o sin respuesta de Google, 503. El log lleva solo el motivo.
- Topes: 5 intentos por minuto por IP; crear la cuenta cuenta además en los 5 registros por hora por IP.
- Las pruebas (`test/google.test.ts`, GOO-001 a GOO-017) firman los tokens con una llave RSA de la corrida: nunca llaman a Google.

## Cómo agregar un módulo

Cada área de §API es una carpeta en `src/modulos/<nombre>/` (hoy: perfil, ejercicios, rutinas, sesiones, progreso, alertas, entrenador, notificaciones) y se registra sola bajo `/v1`: no se toca `app.ts`.

1. **Contrato.** En `packages/shared/src/api/<nombre>.ts` define los esquemas Zod (cuerpos con `z.strictObject`, snake_case, pesos en `*_kg`, fechas con `esquemaFechaHora`) y llena el catálogo `RUTAS_<NOMBRE>` con `{ metodo, ruta: '/v1/...', publica: false, cuerpo?, query?, params?, exito, respuesta }`. Las listas usan `esquemaPaginacion` y `esquemaPagina(item)`; las rutas «Alumno y su entrenador», `esquemaQueryAlumno` (`?client_id=`, P-02). Nombres con el área (`esquemaRutinaNueva`), porque `index.ts` junta todo con `export *`.
2. **Rutas.** En `src/modulos/<nombre>/index.ts`:

   ```ts
   import { RUTAS_EJERCICIOS as R } from '@gymtrack/shared';
   import { definirModulo, esquemaDe, urlDe, usuarioDe } from '../../compartido';

   export default definirModulo(async (app, ctx) => {
     app.get(urlDe(R.listar), { schema: esquemaDe(R.listar), preHandler: app.exigirSesion }, async (req) => {
       const usuario = usuarioDe(req);
       // ctx.prisma, ctx.reloj.ahora(), ctx.config, ctx.correo, ctx.crearLimitador(nombre, { maximo, ventanaMs })
     });
   });
   ```

   `esquemaDe` pone el mismo objeto Zod de entrada y salida y las respuestas de error (CON-001 lo revisa contra `CATALOGO_API`); `urlDe` quita el `/v1`. Una carpeta que empieza con `_` se salta.
3. **Permisos** (`src/compartido`). `app.exigirSesion` (401), `app.exigirRol('trainer')` (403 `FORBIDDEN`, P-01) y `app.exigirPermiso('registrarEntreno')` (la matriz de §Roles en `permisos.ts`, con alumno vinculado y alumno solo separados; deja `req.actor`). El alcance va aparte y da 404: `alumnoObjetivo(prisma, usuario, req.query.client_id)` para `/me/...`, `exigirClienteDe`, `exigirAccesoAlAlumno`, `vinculoDelAlumno`, `idsDeClientes`.
4. **Errores.** `noEncontrado()`, `prohibido()`, `campoInvalido(campo, motivo)`, `fallar('SESSION_CLOSED', { session_id })`, `existeOFalla(fila)`. Un código nuevo va en `packages/shared/src/api/errores.ts` y en la tabla de CON-005 (`packages/shared/src/__tests__/contrato.test.ts`).
5. **Listas.** `const p = paginaPorId(req.query, 'desc')`, `findMany({ ...p, where: { ...p.where, ... } })` y `armarPagina(filas, req.query.limit, (u) => ({ id: u.id }))`. Para otro orden: `leerCursor` y `codificarCursor`.
6. **Pruebas.** Un `test/<nombre>.int.test.ts` con el id del plan en cada nombre:

   ```ts
   import { describeConBase, idEjercicioBase, usarEntornoApi } from './ayudas';
   describeConBase('Ejercicios', () => {
     const e = usarEntornoApi();               // base vacía y sembrada, reloj en AHORA, antes de cada caso
     it('INT-050 Martina ve la biblioteca base', async () => {
       const { camila, martina, diego } = await e.escena();   // Martina vinculada a Camila, Diego solo
       const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/exercises' });
       expect(r.status).toBe(200);
     });
   });
   ```

   También: `e.crear('rodrigo')`, `vincular` y `desvincular`, `e.reloj.avanzar('7d')`, `idEjercicioBase('press-de-banca')` y `e.prisma` para preparar datos. Cada persona tiene 60 llamadas por minuto (el límite se vacía antes de cada caso).

El esquema completo de la base está en `prisma/schema.prisma` (las 22 tablas de §Datos más `avisos_enviados`, con nombres en español en el código y en snake_case en la base). Una tabla o un campo nuevo: cambia el esquema y corre `pnpm --filter api db:nueva-migracion`.

## Dónde tocar

| Quiero cambiar | Archivo |
| --- | --- |
| La forma de una entrada o una respuesta | `packages/shared/src/api/<módulo>.ts` (cambia la API y la app a la vez) |
| Un código de error | `packages/shared/src/api/errores.ts` y la tabla de CON-005 |
| Una regla de un módulo | `src/modulos/<módulo>/` (servicio, consultas o vista) |
| Quién puede hacer qué | `src/compartido/permisos.ts` (matriz) y `src/compartido/vinculo.ts` (alcance) |
| Una regla de cuentas (reuso, vencimientos, qué se revoca) | `src/cuentas/servicio.ts` |
| Cómo se valida el access en las rutas privadas | `src/cuentas/autenticacion.ts` y `src/compartido/autenticacion.ts` |
| Duración de los tokens o el algoritmo | `src/seguridad/tokens.ts` |
| Topes de intentos | `src/seguridad/limitador.ts` |
| Una tabla o un campo | `prisma/schema.prisma` y `pnpm --filter api db:nueva-migracion` |
| Los ejercicios base y los consejos | `packages/shared/src/exercises.seed.ts` y `prisma/semilla.ts` |
| Las alertas y sus umbrales | `src/modulos/alertas/deteccion.ts` y `umbrales.ts` |
| La detección nocturna o la purga | `src/worker/tareas.ts` y `purga.ts` |
| El texto de un correo | `src/correo/plantillas.ts` (los de avisos: `src/modulos/notificaciones/textos.ts`) |
| Cuándo y a quién sale un aviso | `src/modulos/notificaciones/eventos.ts` y `recordatorios.ts` |
| El tope de push o el registro | `src/modulos/notificaciones/servicio.ts` y `registro.ts` |
| Cómo se habla con Expo o con Web Push | `src/modulos/notificaciones/proveedores.ts` |
| El ingreso con Google | `src/cuentas/google.ts` (la variable, en `src/config.ts`) |
| Una variable de entorno | `src/config.ts` (y `.env.ejemplo`) |
