# API de GymTrack

Fastify 5, Zod y Prisma 7 sobre PostgreSQL 16, en TypeScript. Esta primera parte trae las **cuentas**: registro por rol, ingreso, refresh rotativo con detección de reuso, cierre de sesión, recuperación de contraseña por correo, `GET /v1/me` y `GET /health`. El ingreso es propio (Argon2id y JWT): no se usa Firebase Auth.

Los esquemas de entrada y salida no viven aquí: están en `packages/shared/src/api/` y la API los importa tal cual. La app usa los mismos esquemas con el cliente tipado `crearClienteCuentas` del mismo paquete.

## Rutas listas

| Método y ruta | Qué hace | Éxito | Errores |
| --- | --- | --- | --- |
| `POST /v1/auth/register` | Crea la cuenta (`rol`: `trainer` o `client`, `nombre`, `apellido`, `email`, `password`). Manda la bienvenida. Devuelve `{ usuario, tokens }` | 201 | 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN` |
| `POST /v1/auth/login` | Correo y contraseña. Devuelve `{ usuario, tokens }` | 200 | 401 `INVALID_CREDENTIALS` (mismo cuerpo si el correo no existe), 401 `ACCOUNT_DELETED`, 429 `RATE_LIMITED` (5 por minuto por IP, con `Retry-After`) |
| `POST /v1/auth/refresh` | `{ refresh_token }`. Rota el refresh y devuelve un par nuevo | 200 | 401 `REFRESH_INVALID`, `REFRESH_EXPIRED` (30 días), `REFRESH_REUSED` (revoca todos los refresh del usuario) |
| `POST /v1/auth/logout` | `{ refresh_token }`. Revoca solo ese refresh. Siempre responde igual | 200 | 400 |
| `POST /v1/auth/password/forgot` | `{ email }`. 202 siempre con el mismo cuerpo; si hay cuenta, manda el enlace de 1 hora | 202 | 429 (3 por hora por correo) |
| `POST /v1/auth/password/reset` | `{ token, password }`. Un solo uso; revoca todos los refresh | 200 | 400 `RESET_TOKEN_INVALID` (vencido, usado o inventado) |
| `GET /v1/me` | Perfil del usuario del access token | 200 | 401 `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `TOKEN_INVALID`; 429 (60 por minuto por usuario) |
| `GET /health` | `{ estado, version, commit, base }`. Sin `/v1` y sin token | 200 | 503 `SERVICE_UNAVAILABLE` si la base no responde |

Todo error sale con el sobre de §API: `{ "error": { "code", "message", "details" } }`. Los códigos están en `packages/shared/src/api/errores.ts`. El access dura 15 minutos (HS256); el refresh, 30 días; los dos tokens opacos (refresh y enlace) se guardan solo como hash SHA-256.

## Cómo levantarla en local

Requisitos: Node 22, pnpm 12 y Docker.

```bash
pnpm install                         # desde la raíz
cp apps/api/.env.ejemplo apps/api/.env
pnpm --filter api db:levantar        # PostgreSQL 16 en 127.0.0.1:5442 (bases gymtrack y gymtrack_test)
pnpm --filter api db:migrar          # aplica prisma/migrations
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
| `JWT_SECRET` | en producción | Clave HS256 de al menos 32 caracteres (`openssl rand -hex 32`). Fuera de producción, si falta se inventa una por proceso |
| `VERSION`, `COMMIT_SHA` | no | Lo que devuelve `/health`. Compose fija `VERSION` (`sha-<commit>` o `v1.2.3`); el Dockerfile graba `COMMIT_SHA` con `--build-arg` |
| `CONFIAR_PROXY` | no (`false`) | `true` detrás de Caddy, para que el límite por IP use la IP real |
| `CORREO_DRIVER` | no | `resend`, `consola` o `memoria`. Por defecto: producción `resend`, pruebas `memoria`, local `consola`. En producción solo se acepta `resend` |
| `RESEND_API_KEY` | con `resend` | Clave de Resend del entorno |
| `CORREO_REMITENTE` | no | `GymTrack <hola@correo.tudominio.cl>`: tiene que ser de un dominio verificado en Resend |
| `CORREO_RESPONDER_A` | no | Reply-To |
| `CORREO_CARPETA` | no | Con `consola`, carpeta donde se escribe cada correo completo |
| `ENLACE_RESTABLECER_URL` | no (`gymtrack://restablecer`) | Base del enlace del correo; la API agrega `?token=...` |
| `RELOJ_FIJO` | no | Solo pruebas y local: «ahora» fijo en ISO. La API no arranca con esto en producción (SEG-032) |
| `LOG_LEVEL` | no (`info`) | Nivel de pino. Los logs no llevan correos, nombres ni tokens: solo ids |

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

## Dónde tocar

| Quiero cambiar | Archivo |
| --- | --- |
| La forma de una entrada o una respuesta | `packages/shared/src/api/cuentas.ts` (cambia la API y la app a la vez) |
| Un código de error | `packages/shared/src/api/errores.ts` |
| Una regla de cuentas (reuso, vencimientos, qué se revoca) | `src/cuentas/servicio.ts` |
| Qué rutas existen y sus límites | `src/cuentas/rutas.ts` |
| Cómo se valida el access en las rutas privadas | `src/cuentas/autenticacion.ts` |
| Duración de los tokens o el algoritmo | `src/seguridad/tokens.ts` |
| Parámetros de Argon2id | `src/seguridad/contrasenas.ts` |
| Topes de intentos | `src/seguridad/limitador.ts` |
| El texto de un correo | `src/correo/plantillas.ts` |
| Cómo sale un correo | `src/correo/resend.ts`, `src/correo/desarrollo.ts` |
| Una variable de entorno | `src/config.ts` (y `.env.ejemplo`) |
| Una tabla | `prisma/schema.prisma` y luego `pnpm --filter api db:nueva-migracion` |
| El worker | `src/worker.ts` (hoy solo el punto de entrada) |

## Lo que falta

- Rutas de §API que no están todavía: `PATCH /me`, `POST /me/push-tokens` (la tabla `push_tokens` ya existe), `DELETE /me`, `GET /me/export`, encuesta, vínculo con el entrenador y todo lo de rutinas y sesiones. `GET /me` devuelve `entrenador: null` y `encuesta_pendiente: true` para todo alumno hasta que existan esas tablas.
- `/v1/docs` (OpenAPI desde los esquemas Zod) y la comparación con oasdiff (CON-003).
- El límite de intentos vive en la memoria del proceso: sirve para una instancia por entorno. Con dos o más, hay que moverlo a la base o a Redis.
- El registro no tiene límite de intentos propio (el PRD no lo fija).
- El worker no tiene tareas.
- La imagen pesa unos 2 GB: con `nodeLinker: hoisted`, `pnpm install --prod --filter api...` igual instala las dependencias de la app móvil. `pnpm deploy --legacy` dejó `node_modules` vacío. Hay que adelgazarla (por ejemplo con `inject-workspace-packages` y `pnpm deploy`) antes de subirla a GHCR.
- La semilla `piloto` y las fábricas de `datos-de-prueba.md`: hoy las pruebas crean a las personas por la API en cada caso.
