# Guía de la evaluación del viernes 20-11

Lo que pide la pauta y cómo mostrarlo, en el orden en que conviene hacerlo. Las cuentas de la demo y lo que tiene cada una están en [DEMO.md](DEMO.md); las validaciones campo por campo, en [pruebas/validaciones.md](pruebas/validaciones.md).

## Direcciones

| Qué | Dónde |
| --- | --- |
| API (servidor en Vultr, Santiago) | <https://gymtrack-api.64.176.27.203.sslip.io/health> |
| App web para iPhone | <https://gymtrack-app-5dd46.web.app> |
| APK de Android | Página de la última construcción en expo.dev (proyecto `@suidett2/gymtrack`, perfil `preview`), botón «Install» o el código QR |
| Repositorio entregado | <https://github.com/suidett/Gymtrackfinal> |
| Política de privacidad y condiciones | <https://gymtrack-app-5dd46.web.app/privacidad.html> y `/terminos.html` |

## La noche anterior (jueves)

1. **Recargar la demo** para que las fechas queden al día: Dokploy > `gymtrack-api` > Terminal > `node dist/demo.js`. Anota los dos códigos de invitación que muestra al final.
2. **Revisar la API**: abrir `/health`. Tiene que decir `"estado":"ok"` y `"base":"ok"`.
3. **Instalar en los teléfonos** (la pauta no revisa apps sin instalar):
   - Android: abrir la página del APK en el teléfono, «Install», aceptar «instalar apps de origen desconocido». Abrir la app una vez.
   - iPhone: abrir <https://gymtrack-app-5dd46.web.app> en **Safari**, Compartir > «Agregar a pantalla de inicio». Abrirla desde el ícono (no desde Safari) e ingresar una vez.
4. **Avisos**: en cada teléfono, Perfil > «Activar avisos» y aceptar el permiso. Con una cuenta de entrenador, «Probar avisos»: llega un push a cada teléfono y un correo.
5. **DBeaver conectado** a la base del servidor (abajo) y con la consulta de cuentas guardada.
6. **Documento de requerimientos aprobado, impreso** (no se aceptan fotos).
7. Teléfonos y computador cargados.

## Orden sugerido de la demostración

1. **Persistencia remota (requisito excluyente).** En el teléfono, con `benjamin@demo.gymtrack.cl`, registra una serie o responde los motivos de su alerta. En DBeaver, refresca `workout_sets` o `drop_reports` y muestra la fila nueva con su hora. Recalca que la base está en el servidor, no en el teléfono: cierra la app, entra desde el otro teléfono con la misma cuenta y el dato sigue ahí.
2. **Validaciones en forma y en fondo.** Usa los casos en vivo de [pruebas/validaciones.md](pruebas/validaciones.md) (al final): un correo mal escrito, una contraseña débil, un peso negativo o absurdo, un dolor fuera de rango, un código de invitación vencido. Cada uno muestra su mensaje junto al campo, y si se fuerza el pedido a la API, la API también lo rechaza.
3. **Roles.** Entra como `francisca@demo.gymtrack.cl`: clientes con adherencia, alertas (estancamiento, baja con motivos, dolor), ficha del alumno, ajustar cargas.
4. **Ingreso con Google.** «Continuar con Google» con una cuenta real: si es nueva, pide el rol y crea la cuenta.
5. **Avisos y correo.** «Probar avisos» desde el perfil del entrenador; «Olvidé mi contraseña» con una cuenta de correo real (las de la demo no reciben correo, a propósito).

## DBeaver conectado a la base del servidor

La base no tiene ningún puerto abierto a internet. En el servidor hay un puente que escucha solo dentro de la máquina (`127.0.0.1:55432`, contenedor `gymtrack-db-puente`), y DBeaver llega a él por SSH.

Nueva conexión > PostgreSQL:

- Pestaña **SSH**: «Use SSH tunnel». Host `64.176.27.203`, puerto `22`, usuario `root`, autenticación «Public Key» con el archivo `~/.ssh/higestio_oracle`.
- Pestaña **Main**: Host `localhost`, puerto `55432`, base `gymtrack`, usuario `gymtrack`. La contraseña está en Dokploy > `gymtrack-db` > Internal Credentials > Password (botón copiar). Marca «Save password» solo en tu computador.
- «Test Connection» y «Finish».

Consultas útiles:

```sql
-- Cuentas y rol
SELECT email, rol, nombre, apellido, created_at FROM users ORDER BY created_at DESC;

-- Lo último que se guardó desde un teléfono
SELECT s.created_at, u.email, e.nombre AS ejercicio, s.serie_n, s.peso_kg, s.reps, s.rpe
FROM workout_sets s JOIN users u ON u.id = s.client_id JOIN exercises e ON e.id = s.exercise_id
ORDER BY s.created_at DESC LIMIT 20;

-- Alertas abiertas, con alumno y entrenador
SELECT a.tipo, a.estado, c.email AS alumno, t.email AS entrenador, a.created_at
FROM alerts a JOIN users c ON c.id = a.client_id LEFT JOIN users t ON t.id = a.trainer_id
WHERE a.resuelta_at IS NULL ORDER BY a.created_at DESC;
```

En DBeaver el árbol de la izquierda (Schemas > public > Tables) muestra las 23 tablas con sus columnas.

## Si algo falla

| Síntoma | Qué hacer |
| --- | --- |
| La app dice «Sin conexión» | Abrir `/health`. Si no responde, Dokploy > `gymtrack-api` > Deploy. Recién desplegada tarda unos 15 segundos. |
| Dokploy no abre | El panel solo se abre por túnel SSH: `ssh -i ~/.ssh/higestio_oracle -N -L 3900:127.0.0.1:3000 root@64.176.27.203` y entrar a <http://localhost:3900>. |
| Google dice «acceso bloqueado» o da error | Revisar que la app de Google esté «En producción» (Google Cloud > Google Auth Platform > Público). Los cambios pueden tardar unos minutos. |
| En iPhone no aparece «Activar avisos» o no pide permiso | La app tiene que estar abierta desde el ícono de la pantalla de inicio (iOS 16.4 o más), no desde Safari. |
| En Android «Activar avisos» da error | Falta la llave FCM V1 en expo.dev (docs/CONFIGURAR-SERVICIOS.md, paso 3). El resto de la app funciona igual. |
| DBeaver no conecta | Probar `ssh -i ~/.ssh/higestio_oracle root@64.176.27.203` en la terminal; si entra, revisar que el contenedor `gymtrack-db-puente` esté arriba (`docker ps`). |

## Después de la evaluación

- Sacar la demo: Dokploy > `gymtrack-api` > Terminal > `node dist/demo.js --borrar`.
- Cambiar la clave de aplicación de Gmail (myaccount.google.com/apppasswords: borrar «GymTrack API», crear otra y actualizar `SMTP_CLAVE` en Dokploy).
- Si ya no se usa DBeaver: `docker rm -f gymtrack-db-puente` en el servidor.
