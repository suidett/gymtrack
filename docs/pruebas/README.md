# Plan de pruebas de GymTrack

Esta carpeta dice cómo vamos a comprobar, cuando exista el backend, que todo lo que pide el PRD técnico funciona de punta a punta: cada caso de uso, cada permiso por rol, cada endpoint, las 20 pantallas con sus estados, el uso sin señal y los cinco criterios de «lista». Es un plan: no hay código de pruebas todavía y nada de esto corre en GitHub.

## Qué hay aquí

| Archivo | Para qué lo abres |
| --- | --- |
| [`casos-de-uso.md`](casos-de-uso.md) | El catálogo: 60 casos de uso (CU-01 a CU-60) con actor, precondiciones, flujos, errores, reglas con sus números exactos del PRD, endpoints y pantallas. Al final, las 20 pantallas con sus estados (PAN), la matriz de permisos celda por celda (PERM) y el inventario de los 61 endpoints (EP). |
| [`plan-de-validacion.md`](plan-de-validacion.md) | La estrategia por niveles y los 439 escenarios en Dado / Cuando / Entonces, cada uno con el caso de uso que valida. Al final, las diferencias entre el PRD y el código actual (H) y los supuestos y preguntas abiertas (P). |
| [`matriz-de-trazabilidad.md`](matriz-de-trazabilidad.md) | El cruce de cada requisito del PRD con casos de uso, pantallas, endpoints y pruebas; los cinco criterios de «lista»; y la prueba de que no queda ningún caso de uso, endpoint, permiso ni pantalla sin prueba. |
| [`datos-de-prueba.md`](datos-de-prueba.md) | Las personas (Camila, Martina, Diego, Rodrigo y el resto), las semillas, el reloj fijo, cómo se limpia la base entre pruebas y cómo se simula la falta de señal. |
| [`ci.md`](ci.md) | Qué corre en cada PR, en `main`, de noche y en cada versión; checks obligatorios, tiempos, caché, artefactos, pruebas inestables, secretos y entornos. |
| [`ci-propuesto/`](ci-propuesto/) | Borradores de GitHub Actions (`ci.yml`, `api.yml`, `app.yml`, `e2e-android.yml`, `staging.yml`, `desplegar-vps.yml`, `distribuir-apk.yml`, `hosting-maquetas.yml`, `nocturno.yml`, `version.yml`, `respaldo-vps.yml`, `mensual.yml`), la acción compuesta `acciones/preparar` y el script `scripts/correr-maestro.sh`. Están en `docs/` para que no se ejecuten. |
| [`infraestructura-vps-firebase.md`](infraestructura-vps-firebase.md) | Dónde corre todo: el VPS en Vultr (Compose, Caddy, staging y producción), Firebase (FCM, Storage, App Distribution, Hosting), variables y secretos, despliegue y vuelta atrás, respaldos, seguridad del servidor, monitoreo, costos y riesgos. |
| [`infra-propuesta/`](infra-propuesta/) | Borradores del servidor: los archivos de Compose, el Caddyfile, los scripts de despliegue, respaldo, restauración de prueba y vigilancia, el formato de los `.env`, `firebase.json` y `storage.rules`. |
| [`escenarios-infra.md`](escenarios-infra.md) | Los 39 escenarios de infraestructura (INF-01 a INF-39) en Dado / Cuando / Entonces. |

## Cómo se usa

**Al empezar una fase.** Mira en la tabla de abajo qué pruebas tiene que dejar verdes la fase y qué workflow se activa. Cada escenario ya trae los datos y el resultado esperado; convertirlo en prueba es copiar el Dado a la preparación, el Cuando a la llamada y el Entonces a las aserciones.

**Al escribir una prueba.** Ponle el id del escenario en el nombre (`it('INT-071 · la alumna vinculada no edita la rutina de su entrenadora', …)`). Así un fallo en el CI se encuentra en el plan y en la matriz sin buscar.

**Al abrir un PR.** Si el PR agrega o cambia un caso de uso, actualiza `casos-de-uso.md`, el escenario en `plan-de-validacion.md` y su fila en `matriz-de-trazabilidad.md` en el mismo PR. Si un escenario ya no aplica, se borra; no se deja una prueba que nadie va a escribir.

**Al cerrar una pregunta abierta.** Cuando el equipo decida una P-xx, cambia su supuesto por la decisión, busca el id en los cinco archivos y ajusta los escenarios que la nombran. Si la decisión cambia el PRD, avísalo en el documento del PRD.

**Al encontrar algo que el PRD no dice.** No lo inventes en una prueba: agrégalo como P-xx nueva con el supuesto que vas a usar mientras tanto.

## En qué fase entra cada parte

Según §Plan del PRD (seis fases en 14 semanas):

| Fase | Qué se prueba | Escenarios que tienen que estar verdes | Workflows que se activan |
| --- | --- | --- | --- |
| 0. Cimientos (semanas 1 y 2) | Paquete compartido, migración inicial, `/health`, que la app arme, controles del CI | Las UNI que ya existen, INT-140, INT-141 (con las rutas que haya), INT-143, CON-001, REN-008 (índices), SEG-013, SEG-020, SEG-021, INF-01, INF-03, INF-05, INF-08 a INF-13, INF-29, INF-30, INF-33 a INF-35, INF-37, INF-38 | `ci.yml`, `api.yml`, `app.yml`, `hosting-maquetas.yml`; y la primera instalación del VPS en Vultr con staging |
| 1. Cuentas y perfil (3 y 4) | Registro, ingreso, tokens, recuperación, encuesta, perfil, vínculo | INT-001 a INT-049, INT-142, UNI-099, CON-002 a CON-010 y CON-012 a CON-014, APP-001 a APP-014, APP-035, APP-038, APP-039, APP-049, E2E-007 (criterio de la fase), E2E-008, E2E-009, E2E-019, E2E-022, SEG-001 a SEG-012, SEG-024, INF-27, INF-28, INF-39 | `e2e-android.yml` (humo), `staging.yml` con `desplegar-vps.yml`, `distribuir-apk.yml` |
| 2. Rutinas y sesión (5 a 7) | Biblioteca, rutinas, Hoy, registro, descanso, cierre, cola sin señal | INT-050 a INT-115, INT-146, INT-152 a INT-154, INT-156, INT-157, CON-015, APP-015 a APP-032, APP-037, APP-045 a APP-047, APP-050, SEG-031, SYNC-001 a SYNC-020, E2E-001 y E2E-002 (criterio 1 en modo avión), E2E-010, E2E-011, E2E-013, E2E-014, E2E-016, E2E-017, E2E-020, INF-23 a INF-26 | `nocturno.yml` con `e2e-completo` y `sin-senal` |
| 3. Progreso y motor (8 y 9) | Fórmulas, PRs, seis métodos, sobrescritura, progreso, peso, medidas y fotos | UNI-001 a UNI-075 (incluidas las que hoy fallan, H-03), UNI-095, UNI-096, INT-116 a INT-131, INT-148, INT-155, CON-011, APP-033, APP-034, APP-048, APP-051, E2E-003 (criterio 2), E2E-015 | Ninguno nuevo |
| 4. Entrenador y alertas (10 y 11) | Clientes, ficha, alertas, ajustar cargas, detección, motivos, push | UNI-080 a UNI-091, UNI-097, UNI-098, INT-132 a INT-136, INT-144, INT-145, INT-147, INT-149, INT-150, APP-040 a APP-044, WRK-001 a WRK-014, WRK-016, WRK-017, E2E-004 y E2E-005 (criterios 3 y 4), E2E-012, E2E-018, E2E-021, INF-21, INF-22 | `nocturno.yml` completo (worker y carga) |
| 5. Piloto y publicación (12 a 14) | Exportar, borrar, purga, accesibilidad, rendimiento, seguridad contra staging, prueba cerrada | UNI-100, INT-137 a INT-139, INT-151, APP-036, E2E-006 (criterio 5), REN-001 a REN-009, ACC-001 a ACC-009, SEG-014 a SEG-019, SEG-022, SEG-023, SEG-025 a SEG-030, SEG-032, MAN-001 a MAN-029 (WRK-015 solo si P-33 lo deja en la versión 1), INF-02, INF-04, INF-06, INF-07, INF-14 a INF-20, INF-31, INF-32, INF-36 | `version.yml` (producción por `desplegar-vps.yml`), `respaldo-vps.yml`, `mensual.yml` |

El punto de control de la semana 6 (§Plan) se mide con esta tabla: si INT-001 a INT-115 no están verdes en staging, corre el plan B. Los esquemas Zod compartidos y las pruebas CON siguen sirviendo con Supabase, porque la app habla con los mismos esquemas.

## Los números

- 60 casos de uso, 42 celdas de permisos, 20 pantallas y 61 endpoints.
- 439 escenarios en `plan-de-validacion.md`: 79 unitarias (UNI), 156 de integración (INT), 15 de contrato (CON), 51 de componentes (APP), 22 de punta a punta con Maestro (E2E), 20 de sincronización sin señal (SYNC), 17 del worker (WRK), 32 de seguridad (SEG), 9 de rendimiento (REN), 9 de accesibilidad (ACC) y 29 manuales para la prueba cerrada de Google Play (MAN).
- 39 escenarios de infraestructura (INF-01 a INF-39) en `escenarios-infra.md`: 478 en total.
- 98 requisitos del PRD trazados por sección, 13 diferencias con el código actual (H-01 a H-13) y 60 supuestos o preguntas abiertas (P-01 a P-60).

## Lo que hay que decidir antes de la fase 1

El listado completo (P-01 a P-60) está al final de `plan-de-validacion.md`. Estas van primero porque, sin decidirlas, no se puede escribir la prueba de alguno de los cinco criterios de «lista» o cambia la mayoría de las pruebas de un nivel. Cada una dice qué bloquea y qué supuesto usa el plan mientras tanto.

| Orden | Pregunta | Qué bloquea | Supuesto del plan |
| --- | --- | --- | --- |
| 1 | **P-18. Conflicto de sincronización.** Cómo distingue la API un reintento de un conflicto, qué le responde a la app y si «la primera copia cerrada» es la primera en cerrarse o en llegar | Criterio 1: E2E-001, E2E-013, INT-100, INT-105 a INT-107 y todas las SYNC | `POST /sync/sessions` responde por sesión `aceptada`, `ya_estaba` o `descartada_conflicto`; gana la primera que llega cerrada al servidor |
| 2 | **P-02. Cómo lee la entrenadora los datos de su cliente** en los endpoints `/me/...` que dicen «Alumno y su entrenador» | Criterios 1, 2 y 4: la ficha no tiene de dónde sacar progreso, fotos ni historial (INT-108, INT-124, INT-148, SEG-014) | El mismo endpoint con `?client_id=<id>`; sin vínculo activo, 404 |
| 3 | **P-01. El 403 que el PRD no tiene.** Qué responde la API cuando tu rol no deja hacer algo sobre un recurso que sí ves (la alumna editando la rutina de su entrenadora) | Las 42 celdas de permisos: toda prueba que dice «rechazado» | 403 `FORBIDDEN`; lo que no existe o no es tuyo sigue en 404 |
| 4 | **P-39. Cómo pasa «una semana completa» en el emulador.** El criterio 1 pide una semana de sesiones y el CI no puede esperar siete días | Criterios 1, 3 y 5: E2E-001, E2E-004 y E2E-006 necesitan mover el reloj de la app y de la API | Variante `e2e` de la app con reloj de prueba y rutas `/test/*` en la API, que no existen fuera de `NODE_ENV=test` (SEG-025, SEG-032) |
| 5 | **P-19. Cuándo se «usa» una sugerencia**, que desde ahí ya no se puede sobrescribir | Criterio 2: E2E-003, INT-130, INT-155 | Al iniciar la sesión que la precarga |
| 6 | **P-47. Contra qué se compara la baja de rendimiento.** Comparar una sesión de pierna contra el promedio de todas las sesiones da alertas falsas | Criterio 4: E2E-005, INT-149, UNI-084 a UNI-087, WRK-002 | Contra el mismo día de rutina en los 28 días anteriores; con menos de 2 semanas no se evalúa |
| 7 | **P-05. Si el alumno vinculado ve consejos después de una baja.** La matriz de permisos dice que solo registra motivos; el criterio 4 dice que ve consejos | Criterio 4: E2E-005, APP-044, PERM-23 | Sí los ve, como dice el criterio 4 |
| 8 | **P-24. Qué pasa al borrar una cuenta** durante los 30 días: si se puede volver, qué pasa con el vínculo, con la sesión en curso y con las rutinas que escribió una entrenadora | Criterio 5: E2E-006, INT-139, INT-151, WRK-008 a WRK-011 | No hay vuelta atrás; ingresar da 401; el vínculo termina al marcar; los clientes de una entrenadora borrada quedan solos con su historial |
| 9 | **P-10 y P-11. Los métodos Porcentual, Por RM y Descendentes** no tienen dónde guardar su porcentaje o su xRM en el modelo de datos, y dos reglas son ambiguas | Fase 3: UNI-046 a UNI-053, CON-011 («el motor tiene una prueba por regla y todas pasan») | Dos campos nuevos en `routine_exercises`; las fórmulas de P-11 |
| 10 | **P-20. El tope de 2 push al día frente al dolor «al instante»** | WRK-007, WRK-016, INT-102, INT-147 | El dolor de intensidad 7 o más siempre sale y cuenta para el tope |
| 11 | **P-52. Cómo se prueba la purga de fotos en staging en cada versión** si staging usa el reloj real | SEG-017, que el PRD pide «en cada release» (§Riesgos) | El worker acepta adelantar la purga solo fuera de producción (SEG-032) |

Del código actual, lo que hay que corregir antes de que las pruebas de sincronización tengan sentido: la app genera UUID v4 y el PRD pide v7 (H-01), y la app guarda todo en AsyncStorage en vez de SQLite y secure-store (H-05).

## Revisión

Revisión de completitud del 17 de noviembre de 2026, contra el PRD técnico del 23 de septiembre, el `ci.yml` actual y las maquetas.

**Lo que se corrigió**

- **25 escenarios nuevos** (de 414 a 439) para reglas del PRD que no tenían prueba: filtro por `equipo` (INT-146); dolor de intensidad 7 por `POST /observations`, con su borde en 6 (INT-147); lectura de progreso, volumen, PRs y medidas por la entrenadora (INT-148); alerta de baja al cerrar, con el borde de 10 % (INT-149); push a la entrenadora solo por alertas y observaciones nuevas (INT-150); borrar la cuenta de una entrenadora y de un alumno solo (INT-151); borrar un ejercicio de la base (INT-152); el tope de 50 MB justo y la confirmación de la subida (INT-153); `PUT /days` sin subir versión en borrador (INT-154); la sugerencia que pasa a `aplicada` (INT-155); superserie, esquema, peso inicial y día fijo de una rutina (INT-156); archivar la rutina activa (INT-157); EXIF y 1600 px (APP-048); las cinco pestañas de cada rol (APP-049); próxima sesión y recordatorio de peso (APP-050); tendencia de medidas (APP-051); tope de push del alumno (WRK-016); «sin sesiones» del alumno solo (WRK-017); videos privados (SEG-031); reloj de prueba imposible en producción (SEG-032); y cinco manuales de publicación y disponibilidad: AAB en Play, nombre y dominio, reinicio, cron, respaldos y versionado en Railway, probadores inscritos en la semana 11 y Sentry (MAN-025 a MAN-029).
- **13 escenarios reescritos** porque no se podían ejecutar como estaban o no tenían resultado verificable: INT-011, INT-039, INT-041, INT-079, INT-083 e INT-101 (ahora con valores de la semilla y código de error), E2E-004 (pasos y cargas concretas; antes decía «todo lo de E2E-001 y E2E-003»), E2E-009 y E2E-018, UNI-051, SEG-017 (pedía mover el reloj de staging, que usa reloj real), SEG-023 (`run-as` no funciona en un APK de release) y SEG-029. Además, INT-088 y E2E-001 nombraban días que la rutina de Martina no tiene («Tirón B», «Piernas A»).
- **5 preguntas nuevas** (P-52 a P-56) y la lista de arriba reordenada: primero las que bloquean un criterio de «lista», cada una con lo que bloquea y su supuesto.
- **Matriz**: las 25 pruebas nuevas quedaron en sus filas de caso de uso, endpoint, permiso, pantalla y requisito; se corrigieron los conteos, y «Huecos: ninguno» ahora dice lo que mide (ids con prueba, no reglas probadas).
- **CI**: ver «Cambios de la revisión» al final de `ci.md`. Lo principal: un check obligatorio ya no puede quedar aprobado por saltarse cuando falla el job `cambios`; `version.yml` revisa que la etiqueta esté en `main` y que staging corra ese mismo commit antes de medir carga y seguridad; el job `contrato` tiene la base que CON-011 necesita; los tiempos de Maestro son realistas; y `EXPO_TOKEN` pasa de secreto del repositorio a secreto de entorno.

**Lo que queda abierto**

- Las 11 preguntas de la tabla de arriba. Mientras no se cierren, las pruebas usan el supuesto.
- Ningún flujo de los cinco criterios bloquea un PR: E2E-001 y E2E-003 a E2E-006 corren de noche y antes de cada versión. En el PR los cubren las pruebas de integración y el humo. Si el equipo quiere más, el paso siguiente es sumar E2E-003 al humo, que es el más corto de los cinco.
- La revisión del lado del servidor del EXIF de las fotos no tiene prueba, porque el PRD no define una ruta de confirmación para fotos (P-53).
- `users.email_verified_at` existe en el modelo de datos y ningún flujo lo usa (P-55).
- Los umbrales de cobertura, el presupuesto del worker (REN-009) y el límite de intentos del código de invitación (P-27) son propuestas de este plan, no del PRD.
- El script que regenera la matriz no está en el repo: los cruces de esta revisión se hicieron con un script temporal y la matriz se sigue manteniendo a mano.
- Los borradores de `ci-propuesto/` no se han ejecutado nunca. Todo lo marcado `PENDIENTE` (versiones de Maestro, EAS, firebase-tools, bundletool, Caddy y PostgreSQL; scripts que aún no existen) se cierra al activarlos, fase por fase.

## Cambio a VPS y Firebase

El 17 de noviembre de 2026 el equipo dejó Railway, que es lo que dice el PRD. La API, el worker y PostgreSQL 16 van en un VPS propio en Vultr, con Docker Compose y Caddy, staging y producción en el mismo servidor como dos proyectos separados. Firebase se usa para Cloud Messaging (lo que Expo Push necesita en Android), Storage (fotos y videos, con URLs firmadas que entrega la API), App Distribution (el APK de prueba) y Hosting (estas maquetas y la web futura). El ingreso sigue con correo, Argon2id y JWT; los correos, con Resend.

Lo que cambió en esta carpeta:

- **Nuevo:** [`infraestructura-vps-firebase.md`](infraestructura-vps-firebase.md) con el diseño completo, los borradores de [`infra-propuesta/`](infra-propuesta/), los workflows `desplegar-vps.yml`, `respaldo-vps.yml`, `distribuir-apk.yml` y `hosting-maquetas.yml`, y 39 escenarios INF en [`escenarios-infra.md`](escenarios-infra.md) (de 439 a 478 en total).
- **`ci.md` y los borradores:** `staging.yml` y el job `produccion` de `version.yml` ahora llaman a `desplegar-vps.yml`, que entra por SSH, migra, revisa `/health` con la versión y vuelve atrás solo; la purga adelantada de SEG-017 corre por SSH en el worker de staging; la restauración de prueba pasa a ser semanal y automática (`respaldo-vps.yml`), y `mensual.yml` queda con su revisión; la recarga de la semilla de staging es un timer del servidor. Salen los tokens de Railway y entran las llaves SSH por entorno (`VULTR_SSH_KEY`) y la llave de los respaldos (`AGE_CLAVE_PRIVADA`).
- **`plan-de-validacion.md`:** nivel INF en la tabla de niveles y su sección; MAN-024 y MAN-027 sin Railway; P-52 con la purga por SSH; preguntas nuevas P-57 a P-60 (emulador de Storage en CI, versionado y purga, región de los buckets, ubicación de la instancia).
- **`matriz-de-trazabilidad.md`:** los INF en las filas de requisito y de caso de uso, y los conteos.
- **`datos-de-prueba.md` y `casos-de-uso.md`:** el bucket de staging, la recarga de la semilla y los actores de CU-55 y CU-59.

Lo que falta: confirmar con el usuario los supuestos del servidor (ubicación, tamaño, dominio), los precios de Vultr (no se pudieron verificar en su página) y P-57 a P-60; y avisar en el documento del PRD que §Arquitectura, §Seguridad, §Disponibilidad y §Plan ya no dicen lo que se va a hacer.

