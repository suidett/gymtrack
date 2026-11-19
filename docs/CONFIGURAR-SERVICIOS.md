# Configurar los servicios fuera del código

Lo que hay que hacer a mano en Google, Firebase, Expo (EAS), Gmail y Dokploy para que el viernes 20-11 funcionen el ingreso con Google, los avisos al celular, el correo por Gmail, el APK de Android y la app web del iPhone. Va en el orden en que conviene hacerlo: varios pasos usan lo que sale del anterior.

Cada paso dice quién lo hace:

- **Dueño**: la persona que tiene acceso a la cuenta (Google dueña del proyecto de Firebase `gymtrack-5dd46`, expo.dev, la cuenta de Gmail del equipo o Dokploy). Nadie más puede hacerlo.
- **Equipo**: cualquiera con el repo en su computador.
- **Automático**: lo hace el código o el servicio solo, no hay que tocar nada.

Ningún secreto va al repo. Los valores públicos (client ID de Google, la llave pública VAPID, la URL de la API) pueden ir en `eas.json` o en `.env.local`; los secretos (clave de Gmail, llave privada VAPID, `JWT_SECRET`, la llave de cuenta de servicio de Firebase) van solo en Dokploy o en EAS.

## Resumen

| Paso | Qué | Quién | Sale de aquí |
| --- | --- | --- | --- |
| 1 | Proyecto de EAS | Dueño (expo.dev) | `projectId` en `app.json` |
| 2 | App Android en Firebase | Dueño (Firebase) | `google-services.json` |
| 3 | Llave de FCM V1 en EAS | Dueño (Firebase y expo.dev) | push en Android |
| 4 | Keystore de Android y su SHA-1 | Dueño (expo.dev) | SHA-1 para Google |
| 5 | OAuth de Google | Dueño (Google Cloud) | client ID web y Android |
| 6 | Llaves VAPID | Equipo | llave pública y privada |
| 7 | Clave de aplicación de Gmail | Dueño (Gmail del equipo) | `SMTP_CLAVE` |
| 8 | Variables en Dokploy y migración | Dueño (Dokploy) | API y worker listos |
| 9 | APK de Android | Equipo con la cuenta de expo.dev | el APK para instalar |
| 10 | App web del iPhone | Equipo con acceso a Firebase | <https://gymtrack-app-5dd46.web.app> |
| 11 | Revisión de punta a punta | Equipo | la demostración |

## 1. Proyecto de EAS (dueño de expo.dev)

1. En `apps/mobile`: `npx eas-cli@latest login` con la cuenta de expo.dev del equipo.
2. `npx eas-cli@latest init`. Crea el proyecto en expo.dev y muestra su id. Como la app tiene `app.config.js`, EAS avisa que no puede escribirlo solo: abre `apps/mobile/app.json` y agrega dentro de `"expo"`:

   ```json
   "extra": { "eas": { "projectId": "<el id que mostró eas init>" } }
   ```

   Sin este id el teléfono no puede pedir su token de Expo y «Activar avisos» da error. No es un secreto: se commitea.
3. **Automático**: `eas.json` ya trae `EXPO_PUBLIC_API_URL=https://gymtrack-api.64.176.27.203.sslip.io` en los perfiles `preview` y `production`, así el APK habla con la API del VPS.

## 2. App Android en Firebase (dueño de Firebase)

1. En <https://console.firebase.google.com>, proyecto `gymtrack-5dd46` > Configuración del proyecto > General > «Agregar app» > Android.
2. Nombre del paquete: `com.gymtrack.app` (el mismo de `app.json`). Apodo: GymTrack Android. El SHA-1 aquí es opcional (los push no lo necesitan).
3. Descarga `google-services.json` y guárdalo en `apps/mobile/google-services.json`. Se puede commitear: trae ids públicos del proyecto, no secretos.
   - **Automático**: `apps/mobile/app.config.js` lo detecta y lo pone en `android.googleServicesFile`. Si prefieres no commitearlo, súbelo como variable de archivo de EAS con el nombre `GOOGLE_SERVICES_JSON` (`npx eas-cli@latest env:create --environment preview --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret`) y `app.config.js` lo toma de ahí.
   - Sin el archivo el APK se arma igual, pero Android no recibe push.
4. En la pestaña Cloud Messaging confirma que «Firebase Cloud Messaging API (V1)» está habilitada.

## 3. Llave de FCM V1 en EAS (dueño de Firebase y de expo.dev)

Expo manda los push de Android a través de FCM y necesita una llave de cuenta de servicio.

1. Firebase > Configuración del proyecto > Cuentas de servicio > «Generar nueva clave privada». Baja un JSON. **Es secreto**: no lo pongas en el repo ni lo mandes por chat.
2. En `apps/mobile`: `npx eas-cli@latest credentials` > Android > `preview` (o el perfil que uses) > Google Service Account > «Manage your Google Service Account Key for Push Notifications (FCM V1)» > Set up > «Upload a new service account key» y elige el JSON. También se puede en expo.dev > el proyecto > Credentials > Android > `com.gymtrack.app` > «FCM V1 service account key».
3. Borra el JSON de tu computador después de subirlo.
4. Si usas una cuenta de servicio que ya existía, en Google Cloud > IAM dale el rol «Firebase Cloud Messaging API Admin».

## 4. Keystore de Android y su SHA-1 (dueño de expo.dev)

Google pide el SHA-1 del certificado con que se firma el APK para aceptar el ingreso con Google desde esa app.

1. En `apps/mobile`: `npx eas-cli@latest credentials -p android`, perfil `preview` > Keystore > «Set up a new keystore» y deja que EAS la genere (**automático**: EAS la guarda y firma cada APK con ella). Si ya hiciste un build, la keystore ya existe.
2. En esa misma pantalla copia la línea «SHA1 Fingerprint» (también está en expo.dev > el proyecto > Credentials > Android > `com.gymtrack.app`).
3. Si algún día se publica en Google Play con firma de Google, hay que crear otro client ID Android con el SHA-1 de «App signing» de Play.

## 5. OAuth de Google (dueño de Google Cloud)

Todo en <https://console.cloud.google.com>, eligiendo el proyecto `gymtrack-5dd46` (el de Firebase es también un proyecto de Google Cloud), en «Google Auth Platform».

1. **Branding**: nombre de la app «GymTrack», correo de asistencia del equipo, página principal `https://gymtrack-app-5dd46.web.app` y la política de privacidad cuando exista. Dominio autorizado: `gymtrack-app-5dd46.web.app`. Sin logo, para no gatillar la verificación de marca.
2. **Audience**: tipo «Externo». Estado de publicación: «En producción», así entra cualquier cuenta de Google. Si lo dejas en «Prueba», agrega en «Usuarios de prueba» el Gmail de cada evaluador (hasta 100).
3. **Data access**: solo `openid`, `.../auth/userinfo.email` y `.../auth/userinfo.profile`. No son sensibles y no piden revisión.
4. **Clients > Create client > Aplicación web**, nombre «GymTrack web»:
   - Orígenes de JavaScript autorizados: `https://gymtrack-app-5dd46.web.app`, `https://gymtrack-app-5dd46.firebaseapp.com` y, para probar en local, `http://localhost:8081`.
   - URI de redireccionamiento autorizados: `https://gymtrack-app-5dd46.web.app/ingreso`, `https://gymtrack-app-5dd46.firebaseapp.com/ingreso` y `http://localhost:8081/ingreso`.
   - No se usa el secreto del cliente. Copia el client ID (`<número>-<código>.apps.googleusercontent.com`).
5. **Clients > Create client > Android**, nombre «GymTrack Android»: paquete `com.gymtrack.app` y el SHA-1 del paso 4. En «Configuración avanzada» activa «Habilitar el esquema de URI personalizado»: sin eso Google rechaza la vuelta `com.gymtrack.app:/oauthredirect` del APK. Copia el client ID.
6. **Automático**: `app.json` ya registra el esquema `com.gymtrack.app` para que el APK reciba la vuelta de Google.

Los dos client ID son públicos. Van en tres lugares:

- API (paso 8): `GOOGLE_CLIENT_IDS=<web>,<android>`.
- APK (paso 9): `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` y `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID`.
- App web (paso 10): `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB`.

## 6. Llaves VAPID para los avisos del iPhone (equipo)

Una sola vez, en cualquier computador con el repo:

```bash
pnpm --filter api exec web-push generate-vapid-keys
```

Da una «Public Key» y una «Private Key» en base64url. La pública va en la API (`VAPID_PUBLICA`) y en la app web (`EXPO_PUBLIC_VAPID_PUBLICA`). **La privada es secreta**: solo en Dokploy (`VAPID_PRIVADA`), nunca en el repo ni en la app. Si se cambian, cada iPhone tiene que volver a tocar «Activar avisos».

## 7. Clave de aplicación de Gmail (dueño de la cuenta de Gmail)

1. Usa una cuenta de Gmail del equipo solo para esto (por ejemplo `gymtrack.avisos@gmail.com`), no una personal.
2. En <https://myaccount.google.com> > Seguridad, activa la «Verificación en dos pasos». Sin ella Google no deja crear claves de aplicación.
3. En <https://myaccount.google.com/apppasswords> crea una con el nombre «GymTrack API». Google la muestra una sola vez, en 4 grupos de 4 letras. Cópiala directo a Dokploy (paso 8), con o sin espacios: la API los quita.
4. Si cambias la contraseña de la cuenta, Google borra las claves de aplicación y hay que crear otra y cambiar `SMTP_CLAVE`.
5. Gmail gratis manda unos 500 correos al día: para la evaluación sobra.

## 8. Variables en Dokploy y migración (dueño de Dokploy)

La API y el worker usan la misma imagen (`apps/api/Dockerfile`): la API con el comando por defecto (`node dist/servidor.js`) y el worker con `node dist/worker.js`. Los dos necesitan casi las mismas variables.

### API (servicio de `https://gymtrack-api.64.176.27.203.sslip.io`)

| Variable | Valor | Secreto |
| --- | --- | --- |
| `NODE_ENV` | `production` | no |
| `DATABASE_URL` | la de PostgreSQL 16 en Dokploy | sí |
| `JWT_SECRET` | `openssl rand -hex 32` (una vez; el mismo en el worker) | sí |
| `CONFIAR_PROXY` | `1` (detrás de Traefik) | no |
| `CORS_ORIGENES` | `https://gymtrack-app-5dd46.web.app` | no |
| `ENLACE_RESTABLECER_URL` | `https://gymtrack-app-5dd46.web.app/restablecer` | no |
| `GOOGLE_CLIENT_IDS` | `<client ID web>,<client ID Android>` sin espacios ni comillas | no |
| `CORREO_DRIVER` | `smtp` | no |
| `SMTP_HOST` | `smtp.gmail.com` | no |
| `SMTP_PUERTO` | `465` (si el VPS bloquea la salida por 465, `587`) | no |
| `SMTP_USUARIO` | la cuenta de Gmail del paso 7 | no |
| `SMTP_CLAVE` | la clave de aplicación del paso 7 | sí |
| `CORREO_REMITENTE` | `GymTrack <la misma cuenta de Gmail>` | no |
| `PUSH_DRIVER` | `real` (también es el valor por defecto en producción) | no |
| `VAPID_PUBLICA` | la Public Key del paso 6 | no |
| `VAPID_PRIVADA` | la Private Key del paso 6 | sí |
| `VAPID_CONTACTO` | `mailto:<correo del equipo>` (Apple no acepta localhost) | no |
| `AVISOS_URL_APP` | `https://gymtrack-app-5dd46.web.app` | no |
| `EXPO_ACCESS_TOKEN` | vacío, salvo que actives «Enhanced push security» en expo.dev | sí |
| `ALMACENAMIENTO_DIR` | una carpeta montada como volumen (fotos de progreso) | no |

### Worker

En este Dokploy corre dentro del contenedor de la API (ver el comando de arranque más abajo), así que no hay que crear nada aparte. Si algún día se separa en otro servicio con la misma imagen:

- Comando: `node dist/worker.js` (residente: `noche` a las 07:00 UTC y `recordatorios` cada 5 minutos). Si prefieres un cron de Dokploy: `*/5 * * * *` con `node dist/worker.js recordatorios` y otro diario con `node dist/worker.js noche`.
- Variables: `NODE_ENV`, `DATABASE_URL`, **el mismo `JWT_SECRET` que la API** (de él sale la llave que cifra los dispositivos; con otro, el worker no puede mandar ningún push), todas las de correo (`CORREO_DRIVER`, `SMTP_*`, `CORREO_REMITENTE`) y las de avisos (`PUSH_DRIVER`, `VAPID_*`, `AVISOS_URL_APP`).

### Migración de la base (obligatoria en esta versión)

Esta versión trae la migración `20261118000000_google_y_avisos` (columna `users.google_sub`, columnas `tipo` y `destino_cifrado` en `push_tokens` y la tabla `avisos_enviados`). **Sin ella la API no puede leer usuarios y falla el ingreso.**

En el Dokploy del proyecto ya es automática: el servicio de la API tiene como comando de arranque (Advanced > Run Command) `/bin/sh -c "npx prisma migrate deploy && node dist/semilla.js && { (while true; do node dist/worker.js; sleep 30; done) & exec node dist/servidor.js; }"`. Aplica las migraciones pendientes, carga el catálogo de ejercicios y deja el worker residente corriendo en el mismo contenedor (si se cae, vuelve a partir a los 30 s), así comparte las variables y el `JWT_SECRET` con la API sin un segundo servicio. Si falla la migración, no arranca nada. Si la API usa el comando por defecto de la imagen, hay que correrla a mano después de desplegar y antes de abrir la app, en la terminal del contenedor de la API (Dokploy > el servicio > Terminal):

```bash
npx prisma migrate deploy
```

Tiene que decir que aplicó `20261118000000_google_y_avisos` (o que no hay nada pendiente).

**Automático** al arrancar: la API y el worker revisan todas las variables y no arrancan si algo está mal escrito (un `GOOGLE_CLIENT_IDS` con otra forma, una clave de Gmail que no son 16 letras, llaves VAPID cambiadas de lugar, `CORS_ORIGENES` con comodín o `http`). El motivo queda en el log del contenedor, sin mostrar el valor secreto.

## 9. APK de Android (equipo con la cuenta de expo.dev)

1. Agrega los client ID públicos al perfil `preview` de `apps/mobile/eas.json`, junto a la URL de la API que ya está:

   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "https://gymtrack-api.64.176.27.203.sslip.io",
     "EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB": "<client ID web>",
     "EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID": "<client ID Android>"
   }
   ```

   (o como variables de EAS: `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID --value <id> --visibility plaintext`, y lo mismo con la de web).
2. En `apps/mobile`: `npx eas-cli@latest build -p android --profile preview`.
3. **Automático**: EAS firma con la keystore del paso 4, mete `google-services.json` (paso 2), el ícono de los avisos y el canal `avisos`, y deja un enlace para bajar el APK.
4. En cada Android: abre el enlace, instala el APK (acepta «instalar apps de origen desconocido»), ingresa y en Perfil toca «Activar avisos».

En Expo Go no aparecen el botón de Google ni los push remotos: Google no acepta la vuelta `exp://` y Expo Go en Android no recibe push desde el SDK 53. Para probar eso hace falta el APK.

## 10. App web del iPhone (equipo con acceso a Firebase)

1. Crea `apps/mobile/.env.local` (no se commitea) con los valores públicos:

   ```bash
   EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=<client ID web>
   EXPO_PUBLIC_VAPID_PUBLICA=<la Public Key del paso 6>
   ```

   `EXPO_PUBLIC_API_URL` no hace falta: `export:web` usa la del VPS.
2. Desde la raíz:

   ```bash
   pnpm --filter mobile export:web
   npx firebase-tools login                                                              # una vez por computador
   npx firebase-tools hosting:sites:create gymtrack-app-5dd46 --project gymtrack-5dd46   # solo si el sitio no existe
   npx firebase-tools deploy --only hosting:app --project gymtrack-5dd46
   ```

3. **Automático**: la exportación copia `apps/mobile/public/` (manifest, íconos y `sw-avisos.js`, el service worker de los avisos) a la raíz del sitio, y `firebase.json` reescribe toda ruta a `index.html` (la vuelta de Google a `/ingreso` carga la app) y sirve el service worker sin caché.
4. En cada iPhone (iOS 16.4 o más): abre <https://gymtrack-app-5dd46.web.app> en Safari > Compartir > «Agregar a pantalla de inicio». Abre la app **desde el ícono** (no desde Safari), ingresa y en Perfil toca «Activar avisos». Fuera de la pantalla de inicio el iPhone no da permiso de avisos y Perfil explica cómo agregarla.

## 11. Revisión de punta a punta (equipo)

| Qué | Cómo | Esperado |
| --- | --- | --- |
| API arriba | `curl https://gymtrack-api.64.176.27.203.sslip.io/health` | 200 con `"base":"ok"` |
| CORS | abrir la app web e ingresar | entra; si dice «Sin conexión», falta `CORS_ORIGENES` |
| Google en web | «Continuar con Google» en la app web | vuelve a `/ingreso` y entra, o pide el rol si la cuenta es nueva |
| Google en Android | lo mismo en el APK | se abre Google en una pestaña y vuelve a la app (GOO-026) |
| Avisos | el entrenador toca «Probar avisos» en Perfil | llega un push a cada teléfono con avisos activos y un correo «Prueba de avisos de GymTrack» desde la cuenta de Gmail (NOT-060 a NOT-062) |
| Gmail | «Olvidé mi contraseña» con un correo real | llega el enlace y abre la app web en `/restablecer` |
| Recordatorio | alumno con rutina activa y hora en Perfil | el push llega 30 minutos antes (worker cada 5 minutos) |

Si algo falla, el log de la API o del worker lo dice con un código corto y sin datos personales: `SMTP_535` (clave de Gmail mala), `SMTP_TIEMPO` o `SMTP_RED` (el VPS no sale por ese puerto: prueba 587), `google_no_configurado` (falta `GOOGLE_CLIENT_IDS`), `cliente_ajeno` (el client ID de la app no está en `GOOGLE_CLIENT_IDS`), y los avisos con `omitido: sin_dispositivos` (nadie tocó «Activar avisos») o `omitido: tope` (ya llegaron 2 hoy).
