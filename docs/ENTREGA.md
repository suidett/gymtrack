# GymTrack · entrega del 17 de noviembre de 2026

Qué se hizo, dónde está y qué queda abierto. Si vas a revisar, parte por aquí.

## Cómo verlo

- **En línea:** las maquetas y los ejercicios 3D quedan publicados en Firebase Hosting, en `https://gymtrack-5dd46.web.app` (proyecto `gymtrack-5dd46`).
- **En tu computador:** desde la raíz del repo, `python3 -m http.server 4322 --directory docs/pantallas` y abre `http://localhost:4322`. La página de inicio enlaza todo.

## 1. Marca · `docs/marca/v2/`

- Investigación breve de logos y botones de apps de gimnasio (`investigacion.md`), tres direcciones (`direccion.md`) y la revisión de arte (`revision.md`).
- **Elegida: «Más».** Grafito con ámbar `#F5B83D`, Archivo y JetBrains Mono, formas rectas de radio 8. El logo es el botón de más: entrenar es sumar un poco cada vez. Todo en `docs/marca/v2/mas/`: logo en SVG y PNG, ícono de app, `tokens.json` y la página de botones animados.
- La propuesta anterior (`docs/marca/` raíz, «Cuaderno Exacto») quedó descartada. El ícono y la pantalla de carga de la app todavía no se reemplazan.

## 2. Pantallas · `docs/pantallas/`

- Las 20 pantallas del PRD como maquetas HTML de 412 × 892 dp, en modo gimnasio y en clara, con todos sus estados (vacíos, errores, cargando, sin señal) y enlazadas entre sí. Alumno: Ingreso, Crear cuenta, Recuperar, Encuesta, Hoy, Rutinas, Nueva rutina, Detalle de rutina, Ejercicios, Detalle de ejercicio, Registro de sesión con su descanso, Rutina completada, Progreso, Perfil y Motivos de la baja. Entrenador: Clientes, Ficha del cliente, Alertas y Ajustar cargas.
- Piezas compartidas en `sistema.css` y `maqueta.js`. Revisión de dirección de arte en `revision.md`.
- Auditoría de accesibilidad y uso (`auditoria.js`): toques de 48 y 56 dp, contraste AA, letra mínima, etiquetas, enlaces rotos y desbordes, en cerca de 150 estados y los dos temas. Resultado final: 0 hallazgos.

## 3. Ejercicios en 3D · `docs/pantallas/3d/` y `docs/pantallas/ejercicios-3d.html`

- Los 67 ejercicios de la biblioteca (`packages/shared/src/exercises.seed.ts`, con los mismos ids) tienen su animación 3D: un maniquí simple que se gira con el dedo, con los músculos que trabajan en ámbar y los pasos de la técnica sincronizados. Funciona sin conexión: cada ejercicio son datos de movimiento, no un video.
- `esqueleto.js` es matemática pura, sin three.js, para llevarla después a la app. `motor.js` dibuja con three.js. Cada ejercicio vive en `3d/ejercicios/<id>.js`.
- Revisados en técnica y claridad (`3d/revision.md`). La hoja `3d/revision.html` muestra todos de un vistazo.

## 4. Plan de pruebas y CI · `docs/pruebas/`

- 60 casos de uso, 478 escenarios en Dado / Cuando / Entonces (unitarias, integración, contrato, app, Maestro de punta a punta, sin señal, worker, seguridad, rendimiento, accesibilidad, infraestructura y prueba manual en Play) y la matriz que cruza cada requisito del PRD con sus pruebas.
- Diseño de CI/CD y borradores de GitHub Actions en `ci-propuesto/` (no se ejecutan hasta moverlos a `.github/`).
- Revisado. Las preguntas abiertas están ordenadas en `README.md`, partiendo por las que bloquean los criterios de «lista».

## 5. Infraestructura · `docs/pruebas/infraestructura-vps-firebase.md`

- **Decisión final:** el backend va en el VPS de Vultr (API, worker y PostgreSQL 16 con Docker Compose y Caddy, staging y producción) y Firebase para push (FCM), fotos (Storage), App Distribution y Hosting. Railway queda fuera, aunque el PRD todavía lo diga.
- Borradores del servidor en `docs/pruebas/infra-propuesta/` y 39 escenarios de infraestructura en `escenarios-infra.md`.

## 6. API: ingreso, sesiones y correos · `apps/api/`

- Primera parte real del backend: Fastify 5, Zod, Prisma 7 y PostgreSQL 16, en `apps/api/`, con Dockerfile y compose de desarrollo.
- **Endpoints listos:** registro por rol, ingreso, renovación de sesión con rotación y detección de reuso, cierre de sesión, olvidé mi contraseña (siempre responde igual), restablecer contraseña con enlace de un solo uso que vence en 1 hora, `GET /v1/me` y `GET /health` (con versión y commit, para el despliegue). Contraseñas con Argon2id, JWT de 15 minutos, límites de intentos del PRD y errores con el formato del PRD.
- **Correos:** módulo con dos adaptadores, Resend para staging y producción y uno de desarrollo que no envía nada. Plantillas de bienvenida y recuperación en español, con la marca. Qué configurar en Resend (dominio, DNS SPF, DKIM y DMARC, claves por entorno) está en `apps/api/README.md`.
- **Cliente compartido:** esquemas Zod y un cliente tipado de las rutas de cuentas en `packages/shared/src/api/`, para que la app y la API no se desincronicen. Las pantallas de la app todavía no lo usan.
- **Pruebas:** 52 en la API contra un PostgreSQL 16 real (INT-001 a 018, INT-140, 142 y 143, SEG-001 a 012, SEG-018, 025 y 032, CON-001, 002, 004, 012 y 014), todas pasan; sin base, las de integración se saltan con un aviso. 44 en el paquete compartido. El CI suma un servicio PostgreSQL 16 para correrlas.
- **Falta:** editar el perfil, tokens de push, borrar la cuenta y exportar; la documentación OpenAPI; el worker con tareas; y achicar la imagen de Docker, que hoy pesa unos 2 GB.

## Decisiones tomadas

- Marca «Más». Maquetas en HTML antes de tocar la app. Ejercicios 3D con maniquí básico y entendible. Vultr y Firebase en vez de Railway. El ingreso es el del PRD (Argon2id y JWT), no Firebase Auth. El proyecto es personal.

## Lo que queda abierto

- **Firebase:** aceptar los términos de Firebase en la consola y agregarlo al proyecto `gymtrack-5dd46` (sin eso no se puede publicar). Para Storage y App Distribution hará falta el plan Blaze, que pide tarjeta pero trae cuota gratis.
- **Resend:** crear la cuenta y verificar el dominio de los correos (registros DNS SPF y DKIM). Ver `apps/api/README.md`.
- **Vultr:** confirmar ubicación, tamaño y dominio (`api.` y `api-staging.`); precios marcados «no verificado».
- **PRD:** actualizar las secciones que todavía dicen Railway.
- **Preguntas del plan de pruebas:** las P-xx de `docs/pruebas/README.md`, sobre todo qué responde la API sin permiso, cómo lee el entrenador el progreso del alumno y cómo se distingue un reintento de un conflicto sin señal.
- **Escala de RIR:** pendiente; las maquetas usan de 0 a 4+.
- **Ejercicios 3D:** detalles menores anotados en `docs/pantallas/3d/revision.md` (por ejemplo, la cámara en ejercicios en el suelo y el salto al reiniciar la zancada caminando).
