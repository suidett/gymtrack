# Diseño de CI/CD de GymTrack

Cómo se corren las pruebas de `plan-de-validacion.md` cuando exista el backend: el monorepo con `apps/mobile`, `apps/api` (Fastify, Prisma y el worker), `packages/shared` y `packages/tokens`. Los borradores de los workflows están en `ci-propuesto/`. La infraestructura (el VPS en Vultr, Firebase, los respaldos y la seguridad del servidor) está en [`infraestructura-vps-firebase.md`](infraestructura-vps-firebase.md), con sus borradores en `infra-propuesta/` y sus escenarios en [`escenarios-infra.md`](escenarios-infra.md). Están en `docs/` a propósito, para que GitHub no los ejecute todavía: cuando una fase los necesite, se copian a `.github/` (ver «Cómo se activa», al final).

## Lo que hay hoy y lo que cambia

Hoy hay un solo workflow, `.github/workflows/ci.yml`, con un job `verificar` que en cada PR y en cada push a `main` instala con pnpm 12 y Node 22 y corre tipos, lint, pruebas de `shared` y el bundle de Android con `expo export`. Eso se mantiene y se reparte en workflows por frente:

| Workflow propuesto | Reemplaza o agrega | Cuándo corre |
| --- | --- | --- |
| `ci.yml` | Reemplaza al actual: tipos, lint (ahora también de `shared`), unitarias con cobertura, secretos y auditoría | Cada PR y cada push a `main` |
| `api.yml` | Nuevo: integración con PostgreSQL 16 y MinIO, migraciones de Prisma, worker, contrato y build de la API | Cada PR y cada push a `main` |
| `app.yml` | Nuevo: Jest con Testing Library y el bundle de Android que hoy está en `ci.yml` | Cada PR y cada push a `main` |
| `e2e-android.yml` | Nuevo: humo de Maestro en el emulador con la API levantada en el job | Cada PR y cada push a `main` |
| `staging.yml` | Nuevo: llama a `desplegar-vps.yml` para desplegar a staging en el VPS de Vultr | Cada push a `main` |
| `desplegar-vps.yml` | Nuevo, reutilizable: imagen en GHCR, despliegue por SSH, migraciones, `/health` con la versión, humo y vuelta atrás | Lo llaman `staging.yml` y `version.yml`; a mano para volver atrás |
| `distribuir-apk.yml` | Nuevo: APK `preview` con EAS y subida a Firebase App Distribution | Cada push a `main` que toca la app; a mano para los grupos del piloto |
| `hosting-maquetas.yml` | Nuevo: `docs/pantallas` en Firebase Hosting, con vista previa por PR | Cada push a `main` y cada PR que tocan las maquetas |
| `respaldo-vps.yml` | Nuevo: revisa que exista el respaldo de anoche y hace la restauración de prueba en el servidor | Todos los días; la restauración, los lunes |
| `nocturno.yml` | Nuevo: suite completa de Maestro, sin señal con Toxiproxy, worker con volumen, carga liviana, seguridad contra staging | Cada noche |
| `version.yml` | Nuevo: revisa que la etiqueta esté en `main` y que staging corra ese commit, repite la suite completa, y sigue con producción con aprobación y AAB a la pista de prueba interna de Google Play | Cada etiqueta `v*.*.*` |
| `mensual.yml` | Nuevo: revisión mensual de respaldos (las restauraciones las hace `respaldo-vps.yml`) y de dependencias desactualizadas | El primer lunes de cada mes |
| `acciones/preparar/` | Acción compuesta: pnpm 12, Node 22, caché e instalación | La usan todos |

## Entornos

| | Local | CI | Staging | Producción |
| --- | --- | --- | --- | --- |
| API y worker | `pnpm --filter api dev` | Contenedor del job con `NODE_ENV=test` | VPS de Vultr, proyecto de Compose `gymtrack-staging`, imagen `sha-<commit>` | VPS de Vultr, proyecto de Compose `gymtrack-produccion`, imagen `v1.2.3` |
| Base | PostgreSQL 16 en `docker compose` | Servicio PostgreSQL 16 del job | Contenedor PostgreSQL 16 de staging, sin puerto público | Contenedor PostgreSQL 16 sin puerto público, con `pg_dump` diario cifrado a Cloud Storage y 14 días de retención (§Disponibilidad) |
| Archivos | MinIO (P-57) | MinIO (P-57) | Bucket de Cloud Storage para Firebase de staging, con URLs firmadas | Bucket de Cloud Storage para Firebase de producción, con versionado activado |
| Correo | Mailpit | Driver `memoria` o Mailpit | Resend con dominio de pruebas, solo a cuentas `humo.*` | Resend con dominio propio verificado |
| Push | Buzón de prueba | Buzón de prueba | Expo Push por FCM del proyecto de Firebase de staging, a los teléfonos del equipo | Expo Push por FCM del proyecto de producción |
| Datos | Semillas de `datos-de-prueba.md` | Semillas | Semilla `staging`, falsa (§Disponibilidad) | Reales |
| Reloj | Fijo o real | Fijo | Real | Real |
| Rutas `/test/*` | Sí | Sí | No (SEG-025) | No |
| Sentry | Apagado | Apagado | Entorno `staging` | Entorno `production` |
| App | Expo Go o build de desarrollo | Variante `e2e` (reloj de prueba, apunta a `10.0.2.2`) | APK `preview` por EAS, repartido con Firebase App Distribution | AAB `production` por EAS |

## Qué corre y cuándo

### En cada PR

Todo corre en paralelo. Un job `cambios` mira qué carpetas tocó el PR (con `dorny/paths-filter`) y los demás se saltan si no les toca. Se hace dentro del job y no con `paths:` del workflow porque un workflow que no arranca deja el check obligatorio pendiente para siempre; un job saltado por `if` cuenta como aprobado.

Eso mismo es un riesgo: si `cambios` falla, los jobs que dependen de él se saltan y sus checks quedan aprobados sin haber corrido nada. Por eso cada job obligatorio lleva `!cancelled()` y corre también cuando `cambios` no terminó bien; solo se salta cuando `cambios` terminó bien y dijo que el PR no toca su frente. Los filtros incluyen además `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` y `.github/actions/**`, porque un cambio ahí afecta a todos.

| Job | Workflow | Qué hace | Pruebas |
| --- | --- | --- | --- |
| `calidad` | `ci.yml` | Tipos de todo el monorepo, ESLint de app, API y `shared`, Prettier en modo revisión, Vitest de `shared` y `tokens` con cobertura | UNI, ACC-003, ACC-004 |
| `seguridad` | `ci.yml` | gitleaks sobre el diff, `pnpm audit --audit-level high`, búsqueda de `$queryRawUnsafe` y `$executeRawUnsafe` | SEG-013, SEG-020, SEG-021 |
| `api-integracion` | `api.yml` | PostgreSQL 16 como servicio y MinIO con `docker run`; `prisma migrate deploy`; revisión de que el esquema y las migraciones coinciden; Vitest de integración y del worker con cobertura | INT, WRK (sin volumen), SEG en INT, SYNC en INT, y CON-002 y CON-004, que son ganchos sobre toda la suite INT |
| `migraciones` | `api.yml` | Migra la base con el esquema de `main`, carga la semilla `piloto` y aplica las migraciones del PR encima | Que una migración no rompa datos existentes |
| `contrato` | `api.yml` | Genera el OpenAPI desde los esquemas Zod y lo compara con el de `main` con oasdiff; corre las pruebas de contrato con PostgreSQL 16, porque CON-011 cierra sesiones por la API | CON-001, CON-003 y CON-005 a CON-015 |
| `api-build` | `api.yml` | `tsc` de la API e imagen Docker de la API y el worker | Que compile y arranque (`/health` en el contenedor) |
| `app-componentes` | `app.yml` | Jest con Testing Library y cobertura | APP, SYNC en Jest, ACC en Jest, SEG-030 |
| `app-bundle` | `app.yml` | `expo export --platform android`, como el `ci.yml` actual | Que el bundle arme |
| `e2e-humo` | `e2e-android.yml` | Levanta la API, la base, MinIO y Mailpit; compila el APK `e2e`; corre Maestro con la etiqueta `humo` en un emulador API 34 | E2E-002, E2E-007, E2E-010, E2E-020 |

### En cada push a `main`

Todo lo del PR, más `staging.yml`, que llama a `desplegar-vps.yml`:

1. Construye la imagen de la API y el worker y la publica en GHCR como `sha-<commit>`.
2. Entra por SSH al VPS de Vultr con la llave de staging, que solo puede pedir acciones de staging. En el servidor, `desplegar.sh` baja la imagen, corre `prisma migrate deploy` con ella (si falla, no cambia de versión) y levanta la API y el worker.
3. Espera a que `/health` responda 200 con la versión nueva; si no, `desplegar.sh` vuelve sola a la anterior.
4. Corre el humo contra staging con las cuentas `humo.*`: ingresar, `GET /me/today`, crear y cerrar una sesión, sincronizar un lote de 2, pedir el ZIP de exportación, revisar que `/test/reset` responda 404. Borra lo que creó.

Si el despliegue o el humo fallan, el workflow vuelve a la versión anterior y abre un issue con la etiqueta `staging-roto`. Además, si el push tocó la app, `distribuir-apk.yml` compila el APK `preview` y lo reparte por Firebase App Distribution al grupo `equipo`, para probar en teléfonos reales (§Riesgos: computadores lentos); y si tocó `docs/pantallas`, `hosting-maquetas.yml` publica las maquetas.

### Cada noche

`nocturno.yml` a las 06:00 UTC (03:00 de Chile en verano, 02:00 en invierno):

| Job | Qué hace | Pruebas |
| --- | --- | --- |
| `e2e-completo` | Suite completa de Maestro en API 34 con imagen `google_apis` (permite `adb root` para SEG-023), con un reintento por flujo que falle | E2E-001 a E2E-022, ACC-005, SEG-023, SEG-029 |
| `e2e-compatibilidad` | Humo en un emulador API 29 de 360 dp con la fuente del sistema al 130 % | ACC-005, ACC-008 |
| `sin-senal` | Flujos de sincronización con Toxiproxy entre el emulador y la API | SYNC-006, SYNC-008, SYNC-009, E2E-013 |
| `worker-volumen` | El worker con la semilla `carga` reducida a 500 alumnos y reloj controlado | WRK con volumen, REN-009 |
| `carga-liviana` | k6 contra staging: 20 usuarios virtuales por 5 minutos en lecturas y 200 cierres de sesión | REN-003, REN-004, REN-005, REN-007 |
| `seguridad-staging` | Fotos privadas, https, rutas de prueba ausentes | SEG-016, SEG-022, SEG-025 |

La recarga semanal de staging con la semilla `staging` no corre aquí: es un timer de systemd en el servidor (`gymtrack-semilla-staging.timer`, domingo 07:30 UTC), para que la URL de la base nunca salga del VPS.

Aparte, `respaldo-vps.yml` revisa cada mañana que exista el respaldo de anoche (INF-16) y los lunes hace la restauración de prueba en el servidor (INF-19).

Si algo falla, el workflow abre (o actualiza) un issue con la etiqueta `nocturno-rojo`, los flujos que fallaron y el enlace a los artefactos. Quien esté de turno esa semana lo revisa a primera hora.

### En cada versión

`version.yml` corre al empujar una etiqueta `v1.2.3`:

0. Revisa que la etiqueta apunte a un commit de `main` y que staging corra ese mismo commit (`/health` devuelve el commit desplegado). La carga y la seguridad de la suite nocturna se miden contra staging; sin este paso, una versión podría aprobarse con pruebas de otro código.
1. Vuelve a correr la suite nocturna completa sobre ese commit (se llama a `nocturno.yml` como workflow reutilizable). Si no está verde, no sigue.
2. Corre SEG-017 en staging: sube una foto con `humo.purga@gymtrack.test`, prueba la URL a los 16 minutos, borra la cuenta y corre la purga adelantada 31 días en el worker de staging, por SSH (`purgar staging <fecha>`, la única acción de purga que acepta la puerta SSH). Staging usa el reloj real y no tiene rutas `/test/*`, así que el worker acepta `--ahora` solo fuera de producción (P-52, SEG-032). Al final revisa que la clave ya no exista (§Riesgos: «se prueba en cada release»).
3. Llama a `desplegar-vps.yml` con `entorno: produccion`: pone la etiqueta `v1.2.3` a la misma imagen que corrió en staging, sin recompilar, y espera la aprobación del entorno `produccion` en GitHub. En GitHub basta una aprobación de la lista de revisores, así que la lista tiene una persona de cada frente y el entorno lleva «Prevent self-review»: quien empujó la etiqueta no puede aprobar.
4. Despliega en el VPS de Vultr: respaldo `predespliegue` de la base, migraciones, API y worker, y `/health` con la versión. Si algo falla, vuelve a la versión anterior. Si la migración cambia o borra columnas, el PR tuvo que traer el plan de vuelta atrás.
5. Humo contra producción con una cuenta interna, sin crear datos de salud. Si falla, vuelve atrás y abre un issue `produccion-rota`.
6. Compila el AAB `production` con EAS y lo sube a la pista de **prueba interna** de Google Play con `eas submit --track internal`. Pasar de prueba interna a prueba cerrada o a producción se hace a mano en la consola de Play, después de la revisión del equipo.
7. Mide el tamaño del APK universal y del instalado (REN-006) y lo deja en el resumen.
8. Crea el release de GitHub con el changelog y los artefactos.

### Cada mes

`mensual.yml`, el primer lunes:

- **Revisión de respaldos.** Abre un issue con la etiqueta `respaldo`. La restauración de prueba ya no es a mano: `respaldo-vps.yml` la hace cada lunes en el servidor, en una base temporal sin red, y deja los conteos y la duración en su resumen. Aquí alguien del equipo copia al issue las restauraciones del mes, revisa la retención del bucket de respaldos, el versionado del bucket de medios y los respaldos automáticos de la instancia de Vultr, y lo cierra (MAN-024; §Disponibilidad). El respaldo nunca baja al CI porque trae datos de salud reales.
- **Dependencias.** `pnpm outdated -r` y un issue con lo que hay que actualizar (§Seguridad: actualización mensual).

## Checks obligatorios para mezclar a `main`

En la protección de la rama `main`:

- `calidad`
- `seguridad`
- `api-integracion`
- `migraciones`
- `contrato`
- `api-build`
- `app-componentes`
- `app-bundle`
- `e2e-humo`

Además: un PR necesita la revisión de alguien del otro frente (§Plan: «Todo PR lo revisa alguien del otro frente»), la rama tiene que estar al día con `main`, y no se puede empujar directo a `main`. La `GUIA-DEL-EQUIPO.md` hoy permite subir cosas chicas directo a `main`; con el backend eso se cierra, porque cada push a `main` despliega a staging.

`e2e-completo` y `carga-liviana` no bloquean un PR, pero bloquean una versión: `version.yml` no sigue si no están verdes en ese commit.

**Qué asegura esto sobre los casos de uso.** Los 60 casos de uso tienen al menos una prueba dentro de un check obligatorio (UNI, INT, CON, APP o WRK sin volumen), salvo CU-60, que depende de P-33. La matriz lo muestra fila por fila. Lo que un PR no prueba es el recorrido completo en el emulador: de los flujos de los cinco criterios, solo el humo del criterio 1 (E2E-002) corre en el PR; E2E-001 y E2E-003 a E2E-006 corren de noche. Para que una rotura de esos flujos no se acumule, vale esta regla del equipo: con un issue `nocturno-rojo` abierto por un flujo `criterio`, solo se mezcla el PR que lo arregla.

## Tiempos objetivo

| Qué | Objetivo | Si se pasa |
| --- | --- | --- |
| `calidad` | 5 min | Revisar qué paquete creció; cachear la salida de `tsc` |
| `seguridad` | 3 min | |
| `api-integracion` | 8 min | Subir el número de workers de Vitest (cada uno tiene su base, ver `datos-de-prueba.md`) |
| `migraciones` | 4 min | |
| `contrato` | 3 min | |
| `api-build` | 5 min | Revisar la caché de capas de Docker |
| `app-componentes` | 6 min | Partir Jest en shards |
| `app-bundle` | 6 min | |
| `e2e-humo` | 30 min con caché de Gradle y del emulador; la primera corrida sin caché puede llegar a 45 (el tope del job) | Si con caché pasa de 30: revisar la caché del AVD y de Gradle; después, bajar de 4 a 3 flujos |
| Un PR completo, de verde a verde | 30 min (lo marca `e2e-humo`) | |
| `staging.yml` (con `desplegar-vps.yml`) | 15 min | Revisar la caché de capas de Docker y el tamaño de la imagen |
| `respaldo-vps.yml`, restauración de prueba | 30 min | Ver si la base creció; la restauración corre con 256 MB |
| `nocturno.yml` | 90 min (lo marca `e2e-completo`, con tope de 150) | Partir la suite de Maestro en dos emuladores en paralelo |
| `version.yml` sin contar la aprobación | 150 min: la suite completa (90), SEG-017 con su espera de 16 minutos (25), producción (15) y el AAB en EAS (20) | |

## Caché

| Qué | Cómo |
| --- | --- |
| Paquetes de pnpm | `actions/setup-node` con `cache: pnpm` (como hoy) |
| Motores de Prisma | `actions/cache` sobre `~/.cache/prisma`, con la versión de Prisma en la llave |
| Gradle | `gradle/actions/setup-gradle` |
| Emulador (AVD con snapshot) | `actions/cache` sobre `~/.android/avd/*` y `~/.android/adb*`, con el nivel de API en la llave; se arma la primera vez sin snapshot y se reusa |
| Imagen Docker de la API | `docker/build-push-action` con `cache-from: type=gha` y `cache-to: type=gha,mode=max` |
| APK `e2e` | `e2e-humo` lo guarda como artefacto. Reusarlo en `e2e-completo` está PENDIENTE: hoy cada suite compila el suyo, y `sin-senal` siempre necesita uno propio porque apunta a Toxiproxy |
| Cobertura de `main` | Se guarda como artefacto en cada push a `main` para comparar en los PR |

## Artefactos

| Artefacto | Lo sube | Se guarda |
| --- | --- | --- |
| Reportes JUnit de Vitest, Jest y Maestro | Todos los jobs de prueba | 14 días |
| Cobertura (lcov y HTML) de `shared`, API y app | `calidad`, `api-integracion`, `app-componentes` | 14 días; en `main`, 30 días |
| Capturas, grabaciones y salida de depuración de Maestro (`--debug-output`, y `startRecording` en los flujos `criterio`) | `e2e-humo`, `e2e-completo`, `e2e-compatibilidad`, `sin-senal` | 7 días en PR, 14 días de noche, 90 días en versiones |
| `logcat` del emulador y logs de la API, el worker y Toxiproxy | Los mismos | Igual que las capturas |
| Diferencias del OpenAPI (salida de oasdiff) | `contrato` | 14 días |
| Resumen de k6 (JSON y HTML) | `carga-liviana` | 30 días |
| Tamaño del APK y del instalado | `version.yml` | 90 días |
| APK `e2e` y AAB de la versión | `e2e-humo`, `version.yml` | 7 días y 90 días |

Cada job escribe un resumen corto en `$GITHUB_STEP_SUMMARY`: cuántas pruebas, cuántas fallaron, la cobertura y el enlace a los artefactos. Los datos de prueba son falsos, así que las capturas se pueden guardar sin cuidado especial; aun así, nunca se sube una captura tomada en staging con datos de personas reales.

## Política para pruebas inestables

Una prueba es inestable si falla y pasa en el mismo commit sin que nada cambie.

1. **UNI, INT, CON, WRK y APP no se reintentan nunca.** Si una es inestable, es un bug de la prueba o del código (casi siempre reloj, orden o base compartida). Se arregla en dos días hábiles o se pone en cuarentena con `it.skip`, un comentario `// cuarentena: #<issue>` y un issue con la etiqueta `inestable` y una persona a cargo.
2. **E2E se reintenta una vez solo de noche.** Si un flujo falla y pasa en el reintento, queda verde pero el reporte lo marca y se abre o actualiza un issue `inestable`. En `e2e-humo` no hay reintento: si falla, falla.
3. **Cuarentena.** Un flujo que sale inestable 3 noches de 7 recibe la etiqueta `inestable` de Maestro, y `e2e-humo` lo excluye (`--exclude-tags inestable`). La cuarentena dura como máximo 7 días; si no se arregla, se borra el flujo y se reescribe.
4. **Los cinco criterios no entran nunca a cuarentena.** Si E2E-001 a E2E-006 están inestables, la versión queda bloqueada hasta arreglarlos.
5. **Medida.** La tasa de flujos inestables por semana debe quedar bajo 2 %. Se revisa en la reunión semanal del equipo con la lista de issues `inestable`.

## Secretos

| Secreto o variable | Dónde vive | Lo usa | Notas |
| --- | --- | --- | --- |
| `VULTR_SSH_KEY` | Entornos `staging`, `produccion` y `respaldo`, una llave distinta en cada uno | `desplegar-vps.yml`, `version.yml` (purga en staging), `respaldo-vps.yml` | En el servidor cada llave está atada a `puerta-ssh.sh` con su alcance: la de staging no toca producción y ninguna abre una terminal |
| `VULTR_HOST`, `VULTR_SSH_USER`, `VULTR_SSH_HOST_KEY` | Variables (no secretos) del repositorio | Los mismos | La llave del host va fija en `known_hosts`; nunca `StrictHostKeyChecking=no`. No se usa la API de Vultr |
| `AGE_CLAVE_PRIVADA` | Entorno `respaldo` (solo rama `main`, sin revisores para que corra programado) | `respaldo-vps.yml` | La única llave que descifra los respaldos; copia también en el gestor de claves del equipo |
| `IMAGEN_API` | Variable del repositorio | `desplegar-vps.yml` | `ghcr.io/<dueño>/gymtrack-api`. Las imágenes se publican y se bajan con el `GITHUB_TOKEN` del job: no hay token de GHCR guardado |
| `GCP_WIF_PROVEEDOR_STAGING`, `GCP_SA_DISTRIBUCION`, `GCP_SA_HOSTING`, `FIREBASE_APP_ID_ANDROID_STAGING`, `MAQUETAS_URL` | Variables del repositorio | `distribuir-apk.yml`, `hosting-maquetas.yml` | Workload Identity Federation: GitHub no guarda llaves de Google |
| `EXPO_TOKEN` | Entornos `staging` y `produccion` (no secreto del repositorio) | `distribuir-apk.yml`, `version.yml` | Token de robot de Expo, no de una persona. Como secreto del repositorio lo podría leer cualquier workflow de cualquier rama |
| Cuenta de servicio de Google Play | En EAS, no en GitHub | `eas submit` | Así GitHub nunca la ve |
| `SENTRY_AUTH_TOKEN` | En EAS (secreto del proyecto de Expo), no en GitHub | Subida de mapas de fuentes durante el build de EAS | Ningún workflow lo necesita |
| `HUMO_CLAVE` | Entorno `staging` | Humo, carga y seguridad contra staging | Contraseña de las cuentas `humo.*` |
| `HUMO_CLAVE_PRODUCCION` | Entorno `produccion` | Humo de solo lectura en `version.yml` | Contraseña de la cuenta interna de producción; distinta de la de staging |
| `PRODUCCION_API_URL` | Variable (no secreto) del entorno `produccion` | `desplegar-vps.yml` | |
| `STAGING_API_URL` | Variable (no secreto) del entorno `staging` | Humo, k6 | |
| `JWT_SECRET`, `SEMILLA_CLAVE` en CI | Ninguno: el job los genera con `openssl rand` al empezar | `api-integracion`, `e2e-*` | No sirven fuera de esa corrida |

Reglas:

- Ningún secreto en el repo (§Seguridad). gitleaks corre en cada PR sobre el diff y cada noche sobre toda la historia.
- Las claves de Resend, la URL de la base de producción y la llave de la cuenta de servicio de Storage viven solo en los `.env` y en `secretos/` de cada entorno en el VPS (dueño root, permisos 640). El CI no las necesita: las migraciones corren en el servidor, dentro de `desplegar.sh`.
- Los PR desde forks no reciben secretos; por eso todo lo que corre en un PR (incluido `e2e-humo`) funciona sin secretos.
- Las llaves SSH de GitHub y el token de Expo se rotan cada 90 días; la persona a cargo de infraestructura en esa fase lo anota en el issue fijado de infraestructura.
- Los workflows declaran `permissions` mínimos (`contents: read` por defecto) y fijan las acciones de terceros a una versión mayor; al activarlos, conviene fijarlas a un SHA.

## Migraciones de Prisma

- **Solo hacia adelante.** No se edita una migración que ya llegó a `main`.
- **En el PR.** `api-integracion` aplica todas las migraciones sobre una base vacía y revisa con `prisma migrate diff --exit-code` que el esquema y las migraciones digan lo mismo. `migraciones` aplica las del PR sobre una base con la semilla `piloto` y el esquema de `main`, para atrapar una migración que rompe datos existentes.
- **En staging.** Corren en el servidor con la imagen nueva (`docker compose run --rm api npx prisma migrate deploy`), antes de cambiar de versión, en cada push a `main`. Si fallan, sigue la versión anterior; la migración fallida queda en `_prisma_migrations` y se resuelve con `prisma migrate resolve --rolled-back` (INF-05).
- **En producción.** Igual, desde `version.yml`, después de la aprobación y de un respaldo `predespliegue` tomado en ese momento (INF-07).
- **Cambios que borran o renombran.** Se hacen en dos versiones: primero se agrega lo nuevo y la app deja de usar lo viejo; en la versión siguiente se borra lo viejo. Una app instalada en un teléfono puede estar una versión atrás y seguir mandando su cola sin señal.
- **Índices.** Los de §Rendimiento van en la primera migración (§Rendimiento; REN-008).

## Cómo se activa, fase por fase

Según el plan de construcción de §Plan:

| Fase | Se copia a `.github/` | Pruebas que ya tienen que estar |
| --- | --- | --- |
| 0. Cimientos (semanas 1 y 2) | `acciones/preparar`, `ci.yml`, `api.yml` (con `/health` y la migración inicial), `app.yml` (con Jest instalado), `hosting-maquetas.yml`; y la primera instalación del VPS en Vultr con staging (`infraestructura-vps-firebase.md`) | UNI existentes, INT-140, INT-143, CON-001, REN-008 en su forma básica |
| 1. Cuentas y perfil (3 y 4) | `e2e-android.yml` con E2E-007, `staging.yml` con `desplegar-vps.yml` (staging en Vultr ya instalado en la fase 0), `distribuir-apk.yml` | INT-001 a INT-049, APP-001 a APP-014, E2E-007, E2E-008, SEG-001 a SEG-012 |
| 2. Rutinas y sesión (5 a 7) | Se suman E2E-001, E2E-002 y E2E-010 al humo o a la noche; `nocturno.yml` empieza con `e2e-completo` | INT-050 a INT-115, SYNC, E2E-001 (con el emulador en modo avión, criterio de la fase) |
| 3. Progreso y motor (8 y 9) | Sin workflows nuevos | UNI-020 a UNI-067 todas verdes, INT-116 a INT-131, E2E-003 |
| 4. Entrenador y alertas (10 y 11) | `nocturno.yml` completo (worker, carga) | UNI-080 a UNI-091, INT-132 a INT-136, WRK, E2E-004, E2E-005 |
| 5. Piloto y publicación (12 a 14) | `version.yml`, `mensual.yml`, `respaldo-vps.yml` | E2E-006, REN, ACC, SEG contra staging, MAN durante la prueba cerrada |

Para activar un borrador: cópialo de `docs/pruebas/ci-propuesto/` a `.github/workflows/` (y `acciones/preparar/` a `.github/actions/preparar/`), revisa las rutas y scripts que todavía no existan (marcados con `PENDIENTE` en los comentarios), y abre un PR solo con eso.

## Cambios de la revisión

Revisión del 17 de noviembre de 2026 sobre este diseño y los borradores. Nada de esto se ha ejecutado: los borradores siguen en `docs/`.

| Qué se encontró | Qué se cambió |
| --- | --- |
| Si el job `cambios` fallaba, los jobs obligatorios se saltaban y sus checks quedaban aprobados | Los jobs de `api.yml`, `app.yml` y `e2e-android.yml` llevan `!cancelled()` y corren cuando `cambios` no terminó bien |
| Un PR que solo tocaba `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` o la acción `preparar` no corría las pruebas de API, app ni E2E | Esos archivos entraron a los tres filtros |
| `contrato` no tenía base de datos y CON-011 cierra sesiones por la API; CON-002 y CON-004 son ganchos de la suite INT | `contrato` levanta PostgreSQL 16 y aplica migraciones; la tabla de jobs dice dónde corre cada CON |
| `version.yml` medía carga y seguridad contra staging sin revisar qué commit corría ahí, y aceptaba una etiqueta fuera de `main` | Job `comprobar` al inicio |
| SEG-017 pedía «correr la purga con reloj» en staging, que usa reloj real y no tiene `/test/*` | Purga adelantada en el worker de staging, permitida solo fuera de producción (P-52, SEG-032); con el cambio a Vultr, `fotos-staging` la pide por SSH con la llave de staging |
| SEG-023 usaba `run-as` sobre un APK de release, que no lo permite | Se lee con `adb root` en la imagen `google_apis` |
| `e2e-humo` con objetivo de 25 min y un solo tope de 75 min para todas las suites; 22 flujos no caben en 75 | Topes por suite (45, 60 y 150) y objetivos de 30 y 90 min |
| La tabla de caché decía que `e2e-completo` reusa el APK del humo, y el borrador no lo hace | Queda como PENDIENTE |
| `EXPO_TOKEN` como secreto del repositorio; `HUMO_CLAVE_PRODUCCION` y `PRODUCCION_API_URL` usados en `version.yml` sin estar en la tabla; `mensual.yml` y `SENTRY_AUTH_TOKEN` listados con usos que no tienen | Tabla de secretos corregida |
| No decía qué garantiza un PR verde sobre los casos de uso | Párrafo nuevo en «Checks obligatorios» y la regla del `nocturno-rojo` |

Queda abierto: `staging.yml` despliega en cada push a `main` sin esperar a que los checks de ese push terminen (la protección de la rama ya los exigió en el PR, con la rama al día); `/health` tiene que devolver el commit desplegado para que `comprobar` funcione; `pnpm audit` como check obligatorio puede poner en rojo un PR que no tocó dependencias el día que se publica un aviso nuevo, y el equipo tiene que decidir quién lo atiende ese día; y la semilla `staging` ahora incluye el volumen de `carga`, lo que hay que revisar contra el disco y la memoria de la instancia de Vultr (cerca de un millón de series en una base de staging con 256 MB; ver INF-15).

## Cambio a VPS en Vultr y Firebase

El 17 de noviembre de 2026 se decidió no usar Railway. Lo que cambió en este diseño:

- Staging y producción corren en un VPS de Vultr con Docker Compose y Caddy. `staging.yml` y el job `produccion` de `version.yml` llaman a `desplegar-vps.yml`, que entra por SSH, migra, revisa `/health` con la versión y vuelve atrás solo. Ya no hay vuelta atrás a mano desde un panel.
- Los respaldos son `pg_dump` diarios cifrados a Cloud Storage, fuera de Vultr; `respaldo-vps.yml` revisa el de cada noche y restaura uno cada lunes. `mensual.yml` quedó con la revisión humana de esas restauraciones.
- Las fotos y videos van a Cloud Storage para Firebase con URLs firmadas; el APK de prueba sale por App Distribution (`distribuir-apk.yml`) y las maquetas por Hosting (`hosting-maquetas.yml`).
- Secretos: salen `RAILWAY_TOKEN_STAGING` y `RAILWAY_TOKEN_PRODUCCION`; entran `VULTR_SSH_KEY` (una por entorno), `AGE_CLAVE_PRIVADA` y las variables de la tabla de arriba.
- La aprobación de producción: GitHub pide una aprobación de la lista, no dos; por eso el entorno lleva «Prevent self-review».
- CI sigue con MinIO hasta que la API use el Admin SDK de Firebase (P-57).

El detalle está en `infraestructura-vps-firebase.md` y sus 39 escenarios en `escenarios-infra.md`.
