# Matriz de trazabilidad de GymTrack

Cruza cada requisito del PRD con sus casos de uso, pantallas, endpoints y pruebas. Las tablas de cobertura por caso de uso, endpoint, permiso y pantalla salen directo de los ids de `casos-de-uso.md` y de la columna «Valida» de `plan-de-validacion.md`, así que si una prueba cambia de caso de uso, la matriz se vuelve a generar y no se edita a mano.

Las marcas C1 a C5 son los cinco criterios de «lista» de §Alcance.

## Resultado de la revisión

- **60 casos de uso**, **61 endpoints**, **42 celdas de permisos** y **20 pantallas**.
- **439 escenarios de prueba** en `plan-de-validacion.md`: 79 UNI, 156 INT, 15 CON, 51 APP, 22 E2E, 20 SYNC, 17 WRK, 32 SEG, 9 REN, 9 ACC, 29 MAN. Más **39 de infraestructura** (INF-01 a INF-39) en `escenarios-infra.md`, por el cambio de Railway a un VPS en Vultr con Firebase: **478 en total**.
- **98 requisitos del PRD** trazados por sección.
- **Huecos de trazabilidad: ninguno.** Esto dice que cada id tiene una prueba que lo nombra, no que cada regla del PRD esté probada: la revisión del 17 de noviembre encontró reglas sin escenario y sumó 25 (ver «Revisión» en `README.md`). Todo caso de uso tiene al menos una prueba, y al menos una de ellas corre en un check obligatorio del PR, salvo CU-60, que depende de P-33; todo endpoint tiene al menos una prueba de integración, contrato, seguridad o sincronización que lo llama por su id; toda celda de permisos tiene su prueba; toda pantalla tiene una prueba de componente, de flujo o de accesibilidad.
- Todos los ids citados en la carpeta (los ocho archivos y los borradores de `ci-propuesto/` e `infra-propuesta/`) existen: CU, EP, PERM, PAN, P (P-01 a P-60), H y los ids de prueba, INF incluidos.
- Los INF no agregan casos de uso ni endpoints: se cuelgan de los que ya existen (sobre todo CU-59 y REQ-77) y de los requisitos de seguridad y privacidad. INF-29 e INF-30 (maquetas en Hosting) se cuelgan de REQ-21, no de un caso de uso.

## Los cinco criterios de «lista»

| Criterio (§Alcance) | Prueba de punta a punta | Casos de uso que recorre | Fase que lo exige (§Plan) | Pruebas que lo sostienen |
| --- | --- | --- | --- | --- |
| C1. Un entrenador crea su cuenta, invita a un alumno, le arma una rutina de 4 días, y el alumno la registra una semana completa desde el celular, sin señal dentro del gimnasio | E2E-001 (completo) y E2E-002 (humo en cada PR) | CU-01, CU-09, CU-11, CU-12, CU-19, CU-21, CU-22, CU-26, CU-27, CU-28, CU-29, CU-30, CU-32, CU-50 | Fase 2 | SYNC-001 a SYNC-020, INT-087, INT-092, INT-105, REN-005 |
| C2. Después de 3 sesiones del mismo ejercicio, la app propone la carga de la próxima sesión y el entrenador puede cambiarla | E2E-003 | CU-26, CU-28, CU-30, CU-41, CU-42 | Fase 3 | UNI-020 a UNI-057, INT-098, INT-127, INT-130, INT-155, CON-011, APP-043 |
| C3. Un alumno sin entrenador hace todo lo anterior solo, incluida su propia rutina | E2E-004 | CU-01, CU-09, CU-19, CU-22, CU-27, CU-28, CU-29, CU-30, CU-32, CU-41, CU-42 | Fase 4 | INT-063, INT-129 e INT-144, que cubren los permisos PERM-09, PERM-18 y PERM-21 |
| C4. Una caída de rendimiento genera una alerta al entrenador, y el alumno registra sus motivos y ve consejos | E2E-005 | CU-44, CU-47, CU-48, CU-49, CU-50, CU-52 | Fase 4 | UNI-084 a UNI-087, INT-134, INT-135, INT-149, WRK-002, APP-044 |
| C5. El alumno exporta todo lo suyo en CSV y puede borrar su cuenta | E2E-006 | CU-53, CU-54, CU-55 | Fase 5 | INT-137, INT-139, INT-151, WRK-008, WRK-009, SEG-027, UNI-100 |

## Requisitos del PRD por sección

Pantallas y endpoints salen de los casos de uso de cada fila. Lo que §Alcance deja fuera de la versión 1 (chat, cobros, nutrición, relojes, web del entrenador, otros idiomas, encuesta personalizable, integración con gimnasios, programas recomendados, iPhone) no tiene pruebas a propósito.

| Id | Sección | Requisito | CU | Pantallas | Endpoints | Pruebas |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-01 | §Alcance | El entrenador visualiza a sus clientes | CU-49, CU-50 | PAN-16, PAN-17 | EP-15, EP-16, EP-42, EP-43, EP-45, EP-46, EP-47, EP-48, EP-49, EP-52 | INT-039, INT-041; APP-040; E2E-018 |
| REQ-02 | §Alcance | Los clientes registran sus datos (encuesta, perfil, peso, medidas, fotos, sesión) | CU-09, CU-07, CU-28, CU-39, CU-40 | PAN-04, PAN-11, PAN-14, PAN-15 | EP-07, EP-08, EP-09, EP-18, EP-38, EP-49, EP-50, EP-51, EP-52, EP-53 | INT-021, INT-091, INT-121, INT-123; E2E-007, E2E-015 |
| REQ-03 | §Alcance | Cálculos para estimar las siguientes sesiones (1RM, RIR, RPE, PR, sugerencia) | CU-30, CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54 | UNI-002, UNI-006, UNI-020; INT-095; E2E-003 |
| REQ-04 | §Alcance | Identificar irregularidades en el rendimiento, con alertas | CU-43, CU-44, CU-45, CU-46 | PAN-13, PAN-16, PAN-17, PAN-18, PAN-20 | EP-39, EP-41, EP-44, EP-56, EP-58 | UNI-080, UNI-084, UNI-088, UNI-089; E2E-005; WRK-001 |
| REQ-05 | §Alcance | Registro y autenticación de entrenador y cliente, recuperación por correo | CU-01, CU-02, CU-03, CU-05, CU-06 | PAN-01, PAN-02, PAN-03 | EP-01, EP-02, EP-03, EP-05, EP-06 | INT-001, INT-006, INT-009, INT-013, INT-015; E2E-008; INF-39 |
| REQ-06 | §Alcance | Gestión de clientes: vínculo por código, ficha, desvincular | CU-11, CU-12, CU-13, CU-14, CU-50 | PAN-04, PAN-15, PAN-16, PAN-17 | EP-14, EP-16, EP-17, EP-18, EP-19, EP-42, EP-43, EP-45, EP-46, EP-47, EP-48, EP-49, EP-52 | INT-030, INT-033, INT-045, INT-047; E2E-009 |
| REQ-07 | §Alcance | Fácil de usar: cinco pestañas, cifras grandes, modo gimnasio | CU-07, CU-26, CU-28 | PAN-05, PAN-11, PAN-15 | EP-07, EP-08, EP-36, EP-38 | APP-015, APP-026, APP-045, APP-049; ACC-002; MAN-009, MAN-010 |
| REQ-08 | §Alcance | Encuesta inicial estandarizada de 10 preguntas, versionada | CU-09, CU-10 | PAN-04, PAN-17 | EP-09, EP-10, EP-16, EP-18 | INT-021, INT-025; APP-011; E2E-007 |
| REQ-09 | §Alcance | Crear, modificar y eliminar rutinas (entrenador y cliente) | CU-19, CU-20, CU-24 | PAN-06, PAN-07, PAN-08 | EP-28, EP-30, EP-31, EP-35 | INT-063, INT-072, INT-082, INT-156; E2E-016 |
| REQ-10 | §Alcance | Cronómetro de descanso automático con +30 s y saltar | CU-29 | PAN-12 | ninguno | APP-030; E2E-011; MAN-008 |
| REQ-11 | §Alcance | Observaciones por ejercicio (cliente y entrenador) | CU-34, CU-35, CU-36 | PAN-05, PAN-10, PAN-11, PAN-13, PAN-17 | EP-44, EP-45 | INT-110, INT-112, INT-114; MAN-011 |
| REQ-12 | §Alcance | Limitación: ingresar y recuperar necesitan conexión; recuperación solo por correo | CU-02, CU-05 | PAN-01, PAN-03 | EP-02, EP-05 | INT-013; APP-004; E2E-019 |
| REQ-13 | §Alcance | Limitación: la encuesta es la misma para todos | CU-09 | PAN-04 | EP-09, EP-18 | INT-023; CON-001 |
| REQ-14 | §Alcance | Limitación: una sesión cerrada no se edita; solo se le agregan observaciones | CU-30, CU-34 | PAN-10, PAN-11, PAN-13 | EP-39, EP-44 | INT-093, INT-111 |
| REQ-15 | §Alcance | Limitación: las fórmulas son estimaciones; el entrenador sobrescribe cualquier sugerencia | CU-41, CU-42 | PAN-05, PAN-11, PAN-13, PAN-17, PAN-19 | EP-36, EP-39, EP-41, EP-54, EP-55 | INT-127; E2E-003 |
| REQ-16 | §Alcance | Limitación: la tendencia de peso y medidas aparece desde el tercer registro | CU-39 | PAN-14 | EP-49, EP-50 | UNI-095; INT-120; APP-033, APP-051 |
| REQ-17 | §Alcance | Limitación: decenas de clientes; «Mensaje» abre observaciones, no un chat | CU-49, CU-35 | PAN-05, PAN-16, PAN-17 | EP-15, EP-44 | APP-041; E2E-018; REN-007 |
| REQ-18 | §Alcance | Las cinco pruebas de «lista» | CU-01, CU-41, CU-19, CU-44, CU-53 | PAN-02, PAN-05, PAN-06, PAN-07, PAN-11, PAN-13, PAN-15, PAN-18, PAN-20 | EP-01, EP-12, EP-28, EP-36, EP-39, EP-41, EP-54, EP-58 | E2E-001, E2E-003, E2E-004, E2E-005, E2E-006 |
| REQ-19 | §Roles | Matriz de permisos por rol (42 celdas, PERM-01 a PERM-42) | CU-49, CU-50, CU-20, CU-42 | PAN-07, PAN-08, PAN-16, PAN-17, PAN-19 | EP-15, EP-16, EP-30, EP-31, EP-42, EP-43, EP-45, EP-46, EP-47, EP-48, EP-49, EP-52, EP-54, EP-55 | INT-042, INT-049, INT-071, INT-148; SEG-014 |
| REQ-20 | §Roles | Los 13 casos de uso de la versión 1 | CU-01, CU-09, CU-11, CU-19, CU-22, CU-26, CU-34, CU-37, CU-39, CU-41, CU-43, CU-49, CU-53 | PAN-02, PAN-04, PAN-05, PAN-06, PAN-07, PAN-08, PAN-10, PAN-11, PAN-13, PAN-14, PAN-15, PAN-16, PAN-18, PAN-20 | EP-01, EP-09, EP-12, EP-14, EP-15, EP-18, EP-28, EP-33, EP-36, EP-39, EP-41, EP-44, EP-46, EP-49, EP-50, EP-54 | E2E-001, E2E-003, E2E-005, E2E-006 |
| REQ-21 | §Pantallas | Las 20 pantallas con sus estados (PAN-01 a PAN-20) | CU-26, CU-28 | PAN-05, PAN-11 | EP-36, EP-38 | APP-001, APP-044, APP-045, APP-050; INF-29, INF-30 |
| REQ-22 | §Pantallas | Estados vacíos: Hoy sin rutina (vinculado y solo), día de descanso, sesión en curso, Progreso con menos de 3 registros, Clientes sin clientes, Ejercicios sin resultados | CU-26, CU-31, CU-39, CU-49, CU-15 | PAN-05, PAN-09, PAN-11, PAN-14, PAN-16 | EP-15, EP-20, EP-36, EP-40, EP-49, EP-50 | INT-146; APP-016, APP-017, APP-024, APP-033, APP-040 |
| REQ-23 | §Pantallas | Las 10 preguntas de la encuesta y el botón «Terminar» | CU-09 | PAN-04 | EP-09, EP-18 | INT-023; APP-011, APP-012, APP-013, APP-014 |
| REQ-24 | §Pantallas | Tokens del diseño y modo gimnasio | CU-07 | PAN-15 | EP-07, EP-08 | APP-045; ACC-003, ACC-004 |
| REQ-25 | §Pantallas | Fila activa con cifras grandes, «Fallé la serie» y vista «toda la sesión» | CU-28 | PAN-11 | EP-38 | APP-026, APP-027, APP-028 |
| REQ-26 | §Arquitectura | Sin señal: rutina, biblioteca y últimas sesiones en el celular; ids del celular; SQLite; cola; la sugerencia del servidor manda | CU-32, CU-27, CU-41 | PAN-05, PAN-08, PAN-11, PAN-13, PAN-15 | EP-36, EP-37, EP-38, EP-39, EP-41, EP-54 | E2E-020; SYNC-001, SYNC-002, SYNC-004, SYNC-011 |
| REQ-27 | §Arquitectura | Las fotos suben directo al bucket con URL firmada; compresión a 1600 px | CU-40, CU-18 | PAN-10, PAN-14 | EP-25, EP-26, EP-51, EP-52, EP-53 | INT-060, INT-123; APP-034, APP-048; INF-24 |
| REQ-28 | §Arquitectura | El worker corre de noche y al cerrar cada sesión | CU-56 | ninguna | ninguno | WRK-001, WRK-013 |
| REQ-29 | §Arquitectura | Observabilidad: Sentry, logs con pino, /health | CU-59 | ninguna | EP-60, EP-61 | INT-140; SEG-018, SEG-019; MAN-029; INF-31 |
| REQ-30 | §Arquitectura | Paquete compartido con esquemas Zod y motor que corre igual en celular y servidor | CU-59, CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54, EP-60, EP-61 | CON-001, CON-011 |
| REQ-31 | §Datos | UUID v7 en todas las tablas; fechas en UTC con la zona del usuario (America/Santiago) | CU-27, CU-07 | PAN-05, PAN-08, PAN-11, PAN-15 | EP-07, EP-08, EP-37 | INT-090, INT-121; SYNC-001; WRK-012 |
| REQ-32 | §Datos | Reglas de `users`: el rol no cambia; borrar marca deleted_at y el worker purga a los 30 días | CU-07, CU-54, CU-55 | PAN-15 | EP-07, EP-08, EP-13 | INT-020, INT-139, INT-151; WRK-008 |
| REQ-33 | §Datos | Un solo entrenador a la vez y una sola rutina activa; código de 7 días y de un uso | CU-12, CU-22 | PAN-04, PAN-06, PAN-08, PAN-15 | EP-18, EP-33 | INT-034, INT-035, INT-036, INT-078 |
| REQ-34 | §Datos | Encuesta guardada entera, sin edición; una versión nueva crea otra fila | CU-09, CU-10 | PAN-04, PAN-17 | EP-09, EP-10, EP-16, EP-18 | INT-021, INT-025 |
| REQ-35 | §Datos | Ejercicios base no editables; propios del dueño (y su entrenador); videos de hasta 50 MB | CU-17, CU-18 | PAN-09, PAN-10 | EP-22, EP-23, EP-24, EP-25, EP-26 | INT-052, INT-056, INT-060, INT-152, INT-153 |
| REQ-36 | §Datos | Activar sube la versión; las sesiones guardan la versión con que se hicieron | CU-20, CU-22 | PAN-06, PAN-07, PAN-08 | EP-30, EP-31, EP-33 | INT-072, INT-073, INT-154; SYNC-012 |
| REQ-37 | §Datos | Sesión: id del celular, cerrada no se edita, una sola en curso por alumno | CU-27, CU-30 | PAN-05, PAN-08, PAN-11, PAN-13 | EP-37, EP-39 | INT-087, INT-088, INT-093 |
| REQ-38 | §Datos | Fórmulas: Epley hasta 12 reps, RPE = 10 menos RIR, volumen de completadas, kcal con MET 5 | CU-28, CU-30 | PAN-11, PAN-13 | EP-38, EP-39 | UNI-001, UNI-003, UNI-004, UNI-006, UNI-007, UNI-009; INT-091, INT-096 |
| REQ-39 | §Datos | Los seis métodos de progresión | CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54 | UNI-020, UNI-040, UNI-046, UNI-050, UNI-052, UNI-054; CON-011 |
| REQ-40 | §Datos | Detección: estancamiento (3 sesiones), baja (10 % frente a 4 semanas), sin sesiones (7 días), dolor (intensidad 7); umbrales configurables | CU-43, CU-44, CU-45, CU-46 | PAN-13, PAN-16, PAN-17, PAN-18, PAN-20 | EP-39, EP-41, EP-44, EP-56, EP-58 | UNI-080, UNI-083, UNI-084, UNI-085, UNI-088, UNI-089; INT-147, INT-149; WRK-005, WRK-017 |
| REQ-41 | §Datos | No se repite la misma alerta abierta para el mismo ejercicio | CU-43, CU-56 | PAN-13, PAN-18, PAN-20 | EP-39, EP-41 | UNI-090; WRK-001, WRK-004 |
| REQ-42 | §Datos | Observaciones: al menos un destino, intensidad 1 a 10, nadie edita la ajena | CU-34, CU-36 | PAN-05, PAN-10, PAN-11, PAN-13, PAN-17 | EP-44, EP-45 | INT-110, INT-115 |
| REQ-43 | §Datos | Peso y medidas: una fila por día; la segunda del mismo día reemplaza | CU-39 | PAN-14 | EP-49, EP-50 | INT-121; SYNC-016 |
| REQ-44 | §Datos | Fotos privadas servidas con URL firmada de 15 minutos | CU-40 | PAN-14 | EP-51, EP-52, EP-53 | INT-124; SEG-016; INF-23 |
| REQ-45 | §Datos | Récords recalculados al cerrar; el anterior queda con superado_at | CU-30 | PAN-11, PAN-13 | EP-39 | UNI-063; INT-097 |
| REQ-46 | §Datos | Una sugerencia por ejercicio por sesión cerrada; sobrescribible hasta que se use | CU-41, CU-42 | PAN-05, PAN-11, PAN-13, PAN-17, PAN-19 | EP-36, EP-39, EP-41, EP-54, EP-55 | INT-098, INT-130, INT-155 |
| REQ-47 | §Datos | Un reporte de motivos por alerta; hasta 3 consejos por motivo | CU-48 | PAN-05, PAN-20 | EP-58, EP-59 | INT-135, INT-136 |
| REQ-48 | §Datos | Tokens guardados con hash, nunca en claro | CU-03, CU-05, CU-08 | PAN-03 | EP-03, EP-05, EP-11 | INT-028; SEG-003 |
| REQ-49 | §API | Bearer con access de 15 minutos y refresh de 30 días rotativo; reutilizar invalida la familia | CU-03 | ninguna | EP-03 | INT-006, INT-009, INT-010, INT-011; SEG-004 |
| REQ-50 | §API | Crear con un id existente devuelve 200 con el recurso, nunca un duplicado | CU-27, CU-32 | PAN-05, PAN-08, PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | INT-087, INT-092, INT-100; SYNC-006 |
| REQ-51 | §API | Listas paginadas por cursor con { items, next_cursor } | CU-15, CU-33 | PAN-09, PAN-14, PAN-17 | EP-20, EP-42, EP-43 | INT-051, INT-108; CON-008 |
| REQ-52 | §API | Fechas ISO 8601 con zona; pesos siempre en kilos | CU-27, CU-07 | PAN-05, PAN-08, PAN-11, PAN-15 | EP-07, EP-08, EP-37 | CON-006, CON-007; E2E-017 |
| REQ-53 | §API | El entrenador solo alcanza vínculos activos; lo demás da 404, no 403 | CU-50 | PAN-17 | EP-16, EP-42, EP-43, EP-45, EP-46, EP-47, EP-48, EP-49, EP-52 | INT-042, INT-043, INT-044; SEG-015 |
| REQ-54 | §API | Sobre de errores único y códigos 400, 401, 404, 409, 422 y 429 | CU-59 | ninguna | EP-60, EP-61 | INT-093; CON-004, CON-005 |
| REQ-55 | §API | Contrato de cerrar una sesión | CU-30 | PAN-11, PAN-13 | EP-39 | INT-095; CON-013 |
| REQ-56 | §API | OpenAPI en /v1/docs generado de los esquemas | CU-59 | ninguna | EP-60, EP-61 | INT-141; CON-003 |
| REQ-57 | §Seguridad | Argon2id; contraseña de 8 a 128 caracteres | CU-01 | PAN-02 | EP-01 | INT-004; SEG-001, SEG-002 |
| REQ-58 | §Seguridad | Tokens en expo-secure-store; reutilizar un refresh cierra todas las sesiones | CU-02, CU-03 | PAN-01 | EP-02, EP-03 | APP-005; SEG-006, SEG-023 |
| REQ-59 | §Seguridad | Solo HTTPS; secretos fuera del repo; el CI falla si detecta una clave | CU-59 | ninguna | EP-60, EP-61 | SEG-020, SEG-022; INF-08, INF-10, INF-11, INF-12, INF-13, INF-37, INF-38 |
| REQ-60 | §Seguridad | Límites: 5 ingresos por minuto por IP, 3 recuperaciones por hora por correo, 60 llamadas por minuto por usuario | CU-58 | PAN-01, PAN-03 | EP-02, EP-05 | APP-003; SEG-009, SEG-010, SEG-011 |
| REQ-61 | §Seguridad | Toda entrada pasa por Zod; consultas solo por Prisma | CU-59 | ninguna | EP-60, EP-61 | CON-012; SEG-012, SEG-013 |
| REQ-62 | §Seguridad | Fotos y videos privados con URL firmada de 15 minutos | CU-40, CU-18 | PAN-10, PAN-14 | EP-25, EP-26, EP-51, EP-52, EP-53 | INT-060; SEG-016, SEG-017, SEG-031; INF-23, INF-24, INF-25 |
| REQ-63 | §Seguridad | Logs sin correo, nombre ni medidas | CU-59, CU-55 | ninguna | EP-60, EP-61 | WRK-010; SEG-018; INF-35 |
| REQ-64 | §Seguridad | Auditoría de dependencias en cada PR y actualización mensual | CU-59 | ninguna | EP-60, EP-61 | SEG-021; INF-34 |
| REQ-65 | §Privacidad | Consentimiento expreso con casilla propia en la encuesta y en la primera foto | CU-57 | PAN-04, PAN-14, PAN-15 | EP-09, EP-51 | INT-024, INT-123; APP-014, APP-034; SEG-028 |
| REQ-66 | §Privacidad | Exportar y borrar en Perfil sin soporte; la purga borra fotos y datos a los 30 días | CU-53, CU-54, CU-55 | PAN-15 | EP-12, EP-13 | INT-137, INT-139; E2E-006; WRK-008; INF-26 |
| REQ-67 | §Privacidad | Al desvincularse, el entrenador pierde el acceso al instante y conserva solo sus rutinas | CU-13, CU-14 | PAN-15, PAN-16, PAN-17 | EP-17, EP-19 | INT-045, INT-047 |
| REQ-68 | §Privacidad | Política de privacidad publicada y formulario de seguridad de datos de Play | CU-57 | PAN-04, PAN-14, PAN-15 | EP-09, EP-51 | SEG-029; MAN-020 |
| REQ-69 | §Rendimiento | Abrir Hoy con caché en menos de 1 s en 4G | CU-26 | PAN-05 | EP-36 | REN-001; MAN-023 |
| REQ-70 | §Rendimiento | Marcar una serie sin llamada de red, a 60 fps | CU-28 | PAN-11 | EP-38 | APP-026; REN-002 |
| REQ-71 | §Rendimiento | Lecturas de la API con p95 bajo 300 ms | CU-26, CU-49 | PAN-05, PAN-16 | EP-15, EP-36 | REN-003, REN-007; INF-15 |
| REQ-72 | §Rendimiento | Cerrar sesión con p95 bajo 800 ms | CU-30 | PAN-11, PAN-13 | EP-39 | REN-004 |
| REQ-73 | §Rendimiento | Sincronizar 10 sesiones en menos de 5 s | CU-32 | PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | SYNC-008; REN-005 |
| REQ-74 | §Rendimiento | App instalada de menos de 60 MB | CU-59 | ninguna | EP-60, EP-61 | REN-006 |
| REQ-75 | §Rendimiento | Índices desde la primera migración | CU-33, CU-37 | PAN-10, PAN-14, PAN-17 | EP-42, EP-43, EP-46 | INT-143; REN-008 |
| REQ-76 | §SinSeñal | Todo lo del gimnasio funciona sin red; la primera copia cerrada gana y la segunda se descarta con aviso | CU-32 | PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | E2E-001, E2E-013; SYNC-009 |
| REQ-77 | §Disponibilidad | /health y reinicio automático; respaldo diario de 14 días; restauración de prueba mensual; bucket con versionado; staging con datos falsos | CU-59 | ninguna | EP-60, EP-61 | INT-140; MAN-024, MAN-027; INF-01 a INF-07, INF-14, INF-16 a INF-20, INF-26, INF-32, INF-33, INF-36 |
| REQ-78 | §Accesibilidad | Toques de 48 dp; 56 dp en kilos y repeticiones del registro | CU-28 | PAN-11 | EP-38 | ACC-001, ACC-002 |
| REQ-79 | §Accesibilidad | Contraste: texto en #131A17 o #2f7f68; menta solo como relleno | CU-07 | PAN-15 | EP-07, EP-08 | ACC-003 |
| REQ-80 | §Accesibilidad | Fuente del sistema hasta 130 % sin cortar texto | CU-26 | PAN-05 | EP-36 | ACC-005; MAN-018 |
| REQ-81 | §Accesibilidad | Etiquetas para lector de pantalla en el registro | CU-28, CU-29 | PAN-11, PAN-12 | EP-38 | ACC-006, ACC-007; MAN-017 |
| REQ-82 | §Accesibilidad | Modo gimnasio oscuro de alto contraste | CU-07 | PAN-15 | EP-07, EP-08 | APP-038; ACC-004; MAN-010 |
| REQ-83 | §Compatibilidad | Android 10 o más, desde 360 dp; español de Chile con tuteo, coma decimal y kilos | CU-07, CU-26 | PAN-05, PAN-15 | EP-07, EP-08, EP-36 | UNI-012; ACC-008, ACC-009 |
| REQ-84 | §Notificaciones | Recordatorio 30 minutos antes, configurable; aviso de fin de descanso; al entrenador solo alertas y observaciones; tope de 2 push al día | CU-51, CU-52, CU-29 | PAN-05, PAN-12, PAN-15, PAN-18 | EP-08, EP-11 | INT-150; APP-030; E2E-011, E2E-021; WRK-006, WRK-007, WRK-016; INF-21, INF-22 |
| REQ-85 | §Pruebas | Motor con una prueba por regla y por método, con bordes (RIR 0, fallo, 12 reps o más) | CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54 | UNI-023, UNI-025, UNI-029, UNI-046, UNI-057 |
| REQ-86 | §Pruebas | Cada endpoint con prueba de integración sobre una base de prueba | CU-59 | ninguna | EP-60, EP-61 | INT-141, INT-142 |
| REQ-87 | §Pruebas | Los cinco criterios como flujos de Maestro en el emulador en el CI | CU-32 | PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | E2E-001, E2E-003, E2E-004, E2E-005, E2E-006 |
| REQ-88 | §Publicación | Prueba cerrada con 20 probadores durante 14 días | CU-02 | PAN-01 | EP-02 | MAN-021, MAN-025, MAN-028 |
| REQ-89 | §Plan | Fase 0: un PR corre lint, tipos, pruebas y build; API con /health y migración inicial | CU-59 | ninguna | EP-60, EP-61 | INT-140, INT-143; INF-05 |
| REQ-90 | §Plan | Fase 1: registro, encuesta y perfil pasan en Maestro en el CI; un entrenador vincula a un alumno | CU-01, CU-09, CU-12 | PAN-02, PAN-04, PAN-15 | EP-01, EP-09, EP-18 | INT-033; E2E-007, E2E-009 |
| REQ-91 | §Plan | Fase 2: criterio 1 con el emulador en modo avión toda la sesión | CU-32 | PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | E2E-001 |
| REQ-92 | §Plan | Fase 3: criterio 2; el motor tiene una prueba por regla | CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54 | UNI-057; E2E-003 |
| REQ-93 | §Plan | Fase 4: criterios 3 y 4 | CU-48 | PAN-05, PAN-20 | EP-58, EP-59 | E2E-004, E2E-005 |
| REQ-94 | §Plan | Fase 5: criterio 5; 80 % o más de las sesiones del piloto sincronizó sin error; prueba cerrada en marcha | CU-53, CU-54, CU-32 | PAN-11, PAN-13, PAN-15 | EP-12, EP-13, EP-37, EP-38, EP-39, EP-41 | E2E-006; MAN-019, MAN-021 |
| REQ-95 | §Riesgos | La sincronización duplica o pierde: modo avión en el CI y cola visible en Perfil con reintento | CU-32 | PAN-11, PAN-13, PAN-15 | EP-37, EP-38, EP-39, EP-41 | APP-037; E2E-002; SYNC-006 |
| REQ-96 | §Riesgos | El entrenador no confía en la sugerencia: siempre trae su «por qué» | CU-41 | PAN-05, PAN-11, PAN-13 | EP-36, EP-39, EP-41, EP-54 | UNI-021, UNI-034; MAN-012 |
| REQ-97 | §Riesgos | Alertas ruidosas: no repetir, tope diario de push, umbrales configurables | CU-52, CU-56 | PAN-15, PAN-18 | EP-08, EP-11 | UNI-090; WRK-005, WRK-007; MAN-013 |
| REQ-98 | §Riesgos | Fotos del cuerpo expuestas: se prueba en cada release | CU-40 | PAN-14 | EP-51, EP-52, EP-53 | SEG-017 |

## Cobertura por caso de uso

| CU | Caso de uso | Secciones del PRD | Criterio | Pantallas | Endpoints | Pruebas |
| --- | --- | --- | --- | --- | --- | --- |
| CU-01 | Crear cuenta | §Roles, §Pantallas, §API, §Datos, §Seguridad, §Arquitectura | C1, C3 | PAN-02 | EP-01 | INT-001, INT-002, INT-003, INT-004, INT-005; APP-006, APP-007, APP-008; E2E-001, E2E-004, E2E-007; SEG-001, SEG-002, SEG-018; MAN-002; INF-39 |
| CU-02 | Ingresar | §Pantallas, §API, §Seguridad, §Alcance, §SinSeñal | - | PAN-01 | EP-02 | INT-006, INT-007, INT-008; APP-001, APP-002, APP-003, APP-004, APP-005, APP-049; E2E-019, E2E-020; SEG-009, SEG-022, SEG-023; MAN-001, MAN-021, MAN-028 |
| CU-03 | Mantener la sesión abierta (vencimiento y rotación de tokens) | §API, §Arquitectura, §Seguridad | - | ninguna | EP-03 | INT-009, INT-010, INT-011, INT-142; APP-005, APP-046; SYNC-013; SEG-003, SEG-004, SEG-005, SEG-006, SEG-023 |
| CU-04 | Cerrar sesión en el dispositivo | §Pantallas, §API | - | PAN-15 | EP-04 | INT-012; APP-047; SEG-030 |
| CU-05 | Pedir el enlace de recuperación | §Roles, §Pantallas, §API, §Alcance, §Seguridad | - | PAN-03 | EP-05 | INT-013, INT-014; APP-009; E2E-008; SEG-003, SEG-008, SEG-010; MAN-003; INF-39 |
| CU-06 | Guardar la contraseña nueva desde el enlace | §Pantallas, §API, §Datos | - | PAN-03 | EP-06 | INT-015, INT-016, INT-017; APP-010; E2E-008; SEG-002, SEG-007; MAN-003 |
| CU-07 | Ver y editar perfil y ajustes | §Pantallas, §API, §Datos, §Compatibilidad | - | PAN-15 | EP-07, EP-08 | UNI-012, UNI-013; INT-018, INT-019, INT-020; CON-007, CON-012; APP-029, APP-038, APP-045; E2E-007, E2E-017; SEG-012; ACC-003, ACC-004, ACC-009; MAN-010 |
| CU-08 | Registrar el dispositivo para notificaciones push | §API, §Arquitectura, §Datos | - | ninguna | EP-11 | INT-028; SEG-003; INF-21, INF-22 |
| CU-09 | Responder la encuesta inicial | §Roles, §Pantallas, §Datos, §Privacidad | C1, C3 | PAN-04 | EP-09, EP-18 | INT-021, INT-022, INT-023, INT-024, INT-027; APP-011, APP-012, APP-013, APP-014; E2E-001, E2E-004, E2E-007; MAN-004 |
| CU-10 | Consultar la encuesta y responder una versión nueva | §API, §Datos, §Pantallas | - | PAN-17 | EP-10, EP-09, EP-16 | INT-025, INT-026, INT-027; E2E-022 |
| CU-11 | Generar un código de invitación | §Roles, §API, §Datos, §Pantallas | C1 | PAN-16, PAN-15 | EP-14 | UNI-099; INT-030, INT-031, INT-032; APP-039, APP-040; E2E-001; SEG-024; MAN-005 |
| CU-12 | Vincularse con un entrenador | §Roles, §API, §Datos, §Pantallas | C1 | PAN-15, PAN-04 | EP-18 | INT-022, INT-033, INT-034, INT-035, INT-036, INT-037, INT-038; APP-013, APP-035; E2E-001, E2E-009; SEG-024; MAN-005 |
| CU-13 | Desvincularse del entrenador (lo hace el alumno) | §API, §Privacidad, §Datos | - | PAN-15 | EP-19 | INT-047, INT-048; APP-035; E2E-009 |
| CU-14 | Terminar el vínculo con un cliente (lo hace el entrenador) | §API, §Pantallas, §Datos | - | PAN-17, PAN-16 | EP-17 | INT-045, INT-046; APP-041; E2E-009 |
| CU-15 | Buscar y filtrar la biblioteca de ejercicios | §Pantallas, §API, §Alcance, §SinSeñal | - | PAN-09 | EP-20 | INT-050, INT-051, INT-052, INT-053, INT-146; CON-008; APP-024; E2E-014; SEG-013; REN-003 |
| CU-16 | Ver el detalle de un ejercicio | §Pantallas, §API | - | PAN-10 | EP-21, EP-46 | INT-054; APP-025 |
| CU-17 | Crear, editar y borrar un ejercicio propio | §Roles, §API, §Datos | - | PAN-09, PAN-10 | EP-22, EP-23, EP-24 | INT-052, INT-055, INT-056, INT-057, INT-058, INT-059, INT-152; APP-024, APP-025; E2E-014; SEG-012 |
| CU-18 | Subir una referencia en video o foto | §API, §Datos, §Seguridad, §Arquitectura | - | PAN-10 | EP-25, EP-26 | INT-060, INT-061, INT-062, INT-153; APP-025; E2E-014; SEG-031; INF-24, INF-25 |
| CU-19 | Crear una rutina | §Roles, §Pantallas, §API, §Datos | C1, C3 | PAN-07, PAN-06 | EP-28 | UNI-056; INT-063, INT-064, INT-065, INT-066, INT-067, INT-156; CON-012; APP-021, APP-022; E2E-001, E2E-004, E2E-016; MAN-006 |
| CU-20 | Editar una rutina | §API, §Datos | - | PAN-07, PAN-08 | EP-30, EP-31 | INT-070, INT-071, INT-072, INT-073, INT-154; APP-022; E2E-016; SYNC-012 |
| CU-21 | Asignar una rutina a un cliente | §Roles, §API, §Pantallas | C1 | PAN-06, PAN-17 | EP-32 | INT-074, INT-075, INT-076; APP-020; E2E-001; MAN-006 |
| CU-22 | Activar una rutina | §Roles, §API, §Datos | C1, C3 | PAN-06, PAN-08 | EP-33 | INT-077, INT-078, INT-079, INT-080; APP-019; E2E-001, E2E-004, E2E-016; MAN-006 |
| CU-23 | Duplicar una rutina | §API | - | PAN-06, PAN-08 | EP-34 | INT-081; E2E-016 |
| CU-24 | Archivar una rutina | §API, §Datos | - | PAN-06, PAN-08 | EP-35 | INT-071, INT-082, INT-157; E2E-016 |
| CU-25 | Ver la lista y el detalle de rutinas | §Pantallas, §API | - | PAN-06, PAN-08 | EP-27, EP-29 | INT-068, INT-069, INT-156; APP-019, APP-020, APP-023 |
| CU-26 | Ver Hoy | §Pantallas, §API, §Rendimiento | C1, C2 | PAN-05 | EP-36 | UNI-070, UNI-071, UNI-072, UNI-097; INT-083, INT-084, INT-085, INT-086, INT-157; APP-015, APP-016, APP-017, APP-018, APP-049; E2E-001, E2E-003, E2E-020; REN-001, REN-003; ACC-001, ACC-005, ACC-007, ACC-008; MAN-018, MAN-023 |
| CU-27 | Iniciar una sesión de entrenamiento | §Roles, §API, §Datos, §SinSeñal | C1, C3 | PAN-05, PAN-08, PAN-11 | EP-37 | INT-087, INT-088, INT-089, INT-090, INT-144, INT-155; CON-006; APP-023; E2E-001, E2E-002, E2E-004; SYNC-001, SYNC-010; MAN-007 |
| CU-28 | Registrar series | §Roles, §Pantallas, §API, §Datos, §Rendimiento, §Accesibilidad | C1, C2, C3 | PAN-11 | EP-38 | UNI-001, UNI-002, UNI-003, UNI-004, UNI-005, UNI-006; INT-091, INT-092, INT-093, INT-094, INT-144; CON-007, CON-009, CON-010; APP-026, APP-027, APP-028, APP-029; E2E-001, E2E-002, E2E-003, E2E-004, E2E-017; SYNC-002, SYNC-007; REN-002; ACC-001, ACC-002, ACC-005, ACC-006, ACC-008; MAN-007, MAN-009, MAN-017, MAN-018, MAN-023 |
| CU-29 | Descansar entre series | §Alcance, §Pantallas, §Arquitectura, §Notificaciones | C1, C3 | PAN-12 | ninguno | APP-030; E2E-001, E2E-002, E2E-004, E2E-011; ACC-006; MAN-008, MAN-017 |
| CU-30 | Cerrar la sesión y ver el resumen | §Roles, §Pantallas, §API, §Datos, §Rendimiento | C1, C2, C3 | PAN-13, PAN-11 | EP-39 | UNI-007, UNI-008, UNI-009, UNI-010, UNI-060, UNI-061, UNI-062, UNI-063, UNI-064, UNI-067; INT-073, INT-095, INT-096, INT-097, INT-098, INT-099, INT-100, INT-101, INT-102, INT-144, INT-149; CON-006, CON-010, CON-011, CON-013; APP-031, APP-032, APP-050; E2E-001, E2E-002, E2E-003, E2E-004; WRK-013; REN-004; ACC-005; MAN-007 |
| CU-31 | Retomar o descartar una sesión en curso | §Pantallas, §API, §Datos | - | PAN-05, PAN-11 | EP-40 | UNI-075; INT-085, INT-103, INT-104; APP-017; E2E-010 |
| CU-32 | Entrenar sin señal y sincronizar | §Arquitectura, §SinSeñal, §API, §Riesgos, §Rendimiento, §Plan | C1, C3 | PAN-11, PAN-13, PAN-15 | EP-41, EP-37, EP-38, EP-39 | INT-092, INT-100, INT-105, INT-106, INT-107; CON-015; APP-032, APP-037; E2E-001, E2E-002, E2E-004, E2E-013, E2E-020; SYNC-001, SYNC-002, SYNC-003, SYNC-004, SYNC-005, SYNC-006, SYNC-008, SYNC-009, SYNC-010, SYNC-011, SYNC-012, SYNC-013, SYNC-014, SYNC-015, SYNC-016, SYNC-017, SYNC-018, SYNC-019, SYNC-020; REN-005; MAN-007, MAN-019, MAN-022 |
| CU-33 | Ver el historial de sesiones | §API, §Pantallas | - | PAN-14, PAN-17 | EP-42, EP-43 | INT-108, INT-109; CON-008; SEG-014; REN-008 |
| CU-34 | Registrar observación o dolor (alumno) | §Roles, §Alcance, §API, §Datos | - | PAN-11, PAN-13, PAN-10 | EP-44 | INT-110, INT-111, INT-113, INT-147; E2E-012; SYNC-015; MAN-011 |
| CU-35 | Escribir observación o consejo (entrenador) | §Roles, §Alcance, §Pantallas | - | PAN-17, PAN-05 | EP-44 | INT-112, INT-150; APP-018, APP-041; E2E-018; MAN-011 |
| CU-36 | Leer observaciones | §API, §Datos | - | PAN-10, PAN-17, PAN-05 | EP-45 | INT-114, INT-115; E2E-018; MAN-011 |
| CU-37 | Ver el progreso de un ejercicio | §Roles, §API, §Pantallas | - | PAN-10 | EP-46 | INT-116, INT-148; SEG-014; REN-008 |
| CU-38 | Ver volumen por semana y récords | §Roles, §Pantallas, §API | - | PAN-14 | EP-47, EP-48 | INT-117, INT-118, INT-119, INT-148; APP-033; REN-003, REN-008 |
| CU-39 | Registrar peso corporal y medidas | §Roles, §Pantallas, §API, §Datos, §Alcance | - | PAN-14 | EP-49, EP-50 | UNI-095, UNI-096; INT-120, INT-121, INT-122, INT-144, INT-148; APP-033, APP-051; E2E-015; SYNC-016; SEG-014, SEG-018; MAN-014 |
| CU-40 | Subir, ver, comparar y borrar fotos de progreso | §Roles, §Pantallas, §API, §Datos, §Arquitectura, §Privacidad | - | PAN-14 | EP-51, EP-52, EP-53 | INT-123, INT-124, INT-125; APP-034, APP-048; E2E-015; SEG-014, SEG-016, SEG-017; MAN-014; INF-23, INF-24, INF-25 |
| CU-41 | Recibir la sugerencia de la próxima carga | §Roles, §Alcance, §Datos, §Arquitectura, §Riesgos | C2, C3 | PAN-13, PAN-05, PAN-11 | EP-39, EP-41, EP-36, EP-54 | UNI-011, UNI-020, UNI-021, UNI-022, UNI-023, UNI-024, UNI-025, UNI-026, UNI-027, UNI-028, UNI-029, UNI-030, UNI-031, UNI-032, UNI-033, UNI-034, UNI-035, UNI-040, UNI-041, UNI-042, UNI-043, UNI-044, UNI-045, UNI-046, UNI-047, UNI-048, UNI-049, UNI-050, UNI-051, UNI-052, UNI-053, UNI-054, UNI-055, UNI-057, UNI-065, UNI-066, UNI-073, UNI-074; INT-083, INT-098; CON-011; APP-032; E2E-003, E2E-004; SYNC-011, SYNC-019; MAN-012 |
| CU-42 | Sobrescribir la sugerencia (Ajustar cargas) | §Roles, §Pantallas, §API, §Datos, §Alcance | C2, C3 | PAN-19, PAN-17 | EP-54, EP-55 | INT-126, INT-127, INT-128, INT-129, INT-130, INT-131, INT-155; APP-043; E2E-003, E2E-004; MAN-012 |
| CU-43 | Detectar estancamiento | §Datos, §Alcance | - | PAN-18, PAN-20, PAN-13 | EP-39, EP-41 | UNI-080, UNI-081, UNI-082, UNI-083, UNI-090, UNI-091; INT-099, INT-145; WRK-001, WRK-005 |
| CU-44 | Detectar baja de rendimiento | §Datos, §Alcance | C4 | PAN-18, PAN-20 | EP-39, EP-41, EP-58 | UNI-084, UNI-085, UNI-086, UNI-087; INT-134, INT-149; E2E-005; WRK-002 |
| CU-45 | Detectar falta de sesiones | §Datos | - | PAN-18, PAN-16 | EP-56 | UNI-088; E2E-021; WRK-003, WRK-004, WRK-005, WRK-012, WRK-017 |
| CU-46 | Avisar un dolor fuerte | §Datos, §Notificaciones | - | PAN-18, PAN-17, PAN-16 | EP-44, EP-39 | UNI-089; INT-102, INT-147; E2E-012; SYNC-015; INF-21 |
| CU-47 | Revisar y gestionar alertas (entrenador) | §Pantallas, §API, §Datos | C4 | PAN-18 | EP-56, EP-57 | INT-049, INT-132, INT-133; APP-042; E2E-005, E2E-012; MAN-013 |
| CU-48 | Registrar los motivos de la baja y ver consejos | §Roles, §Alcance, §Pantallas, §API, §Datos | C4 | PAN-20, PAN-05 | EP-58, EP-59 | INT-134, INT-135, INT-136, INT-145; APP-018, APP-044; E2E-005; SYNC-017 |
| CU-49 | Revisar el panel de clientes | §Roles, §Pantallas, §API, §Alcance | C4 | PAN-16 | EP-15 | UNI-098; INT-039, INT-040, INT-049; APP-040, APP-049; E2E-005, E2E-018; REN-003, REN-007 |
| CU-50 | Ver la ficha de un cliente | §Pantallas, §API | C1, C4 | PAN-17 | EP-45, EP-46, EP-47, EP-48, EP-49, EP-16, EP-42, EP-43, EP-45, EP-49, EP-52 | INT-041, INT-042, INT-043, INT-044, INT-049, INT-148; APP-041; E2E-001, E2E-005, E2E-018, E2E-022; SEG-014, SEG-015; REN-003 |
| CU-51 | Recibir el recordatorio para entrenar | §Notificaciones, §Arquitectura | - | PAN-15, PAN-05 | EP-08, EP-11 | APP-038; E2E-021; WRK-006, WRK-012, WRK-016; INF-21 |
| CU-52 | Recibir notificaciones del entrenador y respetar el tope diario | §Notificaciones, §Riesgos | C4 | PAN-15, PAN-18 | EP-11, EP-08 | INT-147, INT-150; E2E-005; WRK-007, WRK-016; MAN-013 |
| CU-53 | Exportar mis datos | §Roles, §Alcance, §API, §Privacidad | C5 | PAN-15 | EP-12 | UNI-100; INT-137, INT-138; APP-036; E2E-006; SEG-027; MAN-015 |
| CU-54 | Borrar mi cuenta | §Roles, §Alcance, §API, §Datos, §Privacidad | C5 | PAN-15 | EP-13 | INT-139, INT-151; APP-035; E2E-006; SYNC-020; SEG-026; MAN-016 |
| CU-55 | Purgar las cuentas borradas a los 30 días | §Datos, §Arquitectura, §Privacidad, §Riesgos | C5 | ninguna | ninguno | E2E-006; WRK-008, WRK-009, WRK-010, WRK-011; SEG-017, SEG-032; MAN-016; INF-26 |
| CU-56 | Correr la detección nocturna | §Arquitectura, §Datos | - | ninguna | ninguno | E2E-021; WRK-001, WRK-002, WRK-003, WRK-004, WRK-005, WRK-006, WRK-007, WRK-010, WRK-012, WRK-013, WRK-014, WRK-017; SEG-032; REN-009 |
| CU-57 | Dar consentimiento expreso para datos de salud | §Privacidad | - | PAN-04, PAN-14, PAN-15 | EP-09, EP-51 | INT-024, INT-123; APP-014, APP-034; E2E-015; SEG-028, SEG-029; MAN-004, MAN-020 |
| CU-58 | Limitar intentos y uso de la API | §API, §Seguridad | - | PAN-01, PAN-03 | EP-02, EP-05 | APP-003; E2E-019; SEG-009, SEG-010, SEG-011 |
| CU-59 | Vigilar la salud de la API y publicar su contrato | §Arquitectura, §API, §Disponibilidad | - | ninguna | EP-60, EP-61 | INT-140, INT-141, INT-143; CON-001, CON-002, CON-003, CON-004, CON-005, CON-014; SEG-019, SEG-020, SEG-021, SEG-025; REN-006; MAN-024, MAN-025, MAN-026, MAN-027, MAN-029; INF-01 a INF-20, INF-27, INF-28, INF-31 a INF-38 |
| CU-60 | Recibir el resumen semanal por correo (opcional) | §Arquitectura | - | PAN-15 | ninguno | WRK-015 |

## Cobertura por endpoint

| EP | Método y ruta | Quién (§API) | CU | Pruebas que lo llaman |
| --- | --- | --- | --- | --- |
| EP-01 | `POST /auth/register` | Todos | CU-01 | INT-001, INT-002, INT-003, INT-004, INT-005 |
| EP-02 | `POST /auth/login` | Todos | CU-02, CU-58 | INT-006, INT-007, INT-008 |
| EP-03 | `POST /auth/refresh` | Todos | CU-03 | INT-009, INT-010, INT-011 |
| EP-04 | `POST /auth/logout` | Todos | CU-04 | INT-012 |
| EP-05 | `POST /auth/password/forgot` | Todos | CU-05, CU-58 | INT-013, INT-014 |
| EP-06 | `POST /auth/password/reset` | Todos | CU-06 | INT-015, INT-016, INT-017 |
| EP-07 | `GET /me` | Todos | CU-07 | INT-018 |
| EP-08 | `PATCH /me` | Todos | CU-07, CU-51, CU-52 | INT-019, INT-020 |
| EP-09 | `POST /me/survey` | Alumno | CU-09, CU-10, CU-57 | INT-021, INT-022, INT-023, INT-024, INT-025, INT-027 |
| EP-10 | `GET /me/survey` | Alumno | CU-10 | INT-026, INT-027 |
| EP-11 | `POST /me/push-tokens` | Todos | CU-08, CU-51, CU-52 | INT-028 |
| EP-12 | `GET /me/export` | Todos | CU-53 | INT-137, INT-138 |
| EP-13 | `DELETE /me` | Todos | CU-54 | INT-139, INT-151 |
| EP-14 | `POST /trainer/invitations` | Entrenador | CU-11 | INT-030, INT-031, INT-032 |
| EP-15 | `GET /trainer/clients` | Entrenador | CU-49 | INT-039, INT-040, INT-049 |
| EP-16 | `GET /trainer/clients/:id` | Entrenador | CU-50, CU-10 | INT-041, INT-042, INT-043, INT-044, INT-049 |
| EP-17 | `DELETE /trainer/clients/:id` | Entrenador | CU-14 | INT-045, INT-046, INT-049 |
| EP-18 | `POST /me/trainer/link` | Alumno | CU-12, CU-09 | INT-022, INT-033, INT-034, INT-035, INT-036, INT-037, INT-038 |
| EP-19 | `DELETE /me/trainer` | Alumno | CU-13 | INT-047, INT-048 |
| EP-20 | `GET /exercises` | Todos | CU-15 | INT-050, INT-051, INT-052, INT-053, INT-146; CON-008 |
| EP-21 | `GET /exercises/:id` (pantalla 10; ruta en P-03) | Todos | CU-16 | INT-054 |
| EP-22 | `POST /exercises` | Todos | CU-17 | INT-055 |
| EP-23 | `PATCH /exercises/:id` | Todos (solo los propios) | CU-17 | INT-056, INT-057 |
| EP-24 | `DELETE /exercises/:id` | Todos (solo los propios) | CU-17 | INT-058, INT-059, INT-152 |
| EP-25 | `POST /exercises/:id/media` | Todos (solo los propios) | CU-18 | INT-060, INT-062, INT-153 |
| EP-26 | `PUT` de confirmación de la media (ruta en P-03) | Todos (solo los propios) | CU-18 | INT-061, INT-153 |
| EP-27 | `GET /routines` | Todos | CU-25 | INT-068 |
| EP-28 | `POST /routines` | Todos | CU-19 | INT-063, INT-064, INT-065, INT-066, INT-067, INT-156 |
| EP-29 | `GET /routines/:id` | Todos | CU-25 | INT-069, INT-156 |
| EP-30 | `PATCH /routines/:id` | Todos (dueño) | CU-20 | INT-070, INT-071 |
| EP-31 | `PUT /routines/:id/days` | Dueño | CU-20 | INT-071, INT-072, INT-073, INT-154 |
| EP-32 | `POST /routines/:id/assign` | Entrenador | CU-21 | INT-074, INT-075, INT-076 |
| EP-33 | `POST /routines/:id/activate` | Dueño | CU-22 | INT-077, INT-078, INT-079, INT-080 |
| EP-34 | `POST /routines/:id/duplicate` | Todos | CU-23 | INT-081 |
| EP-35 | `DELETE /routines/:id` | Dueño | CU-24 | INT-071, INT-082, INT-157 |
| EP-36 | `GET /me/today` | Alumno | CU-26, CU-41 | INT-083, INT-084, INT-085, INT-086, INT-157 |
| EP-37 | `POST /sessions` | Alumno | CU-27, CU-32 | INT-087, INT-088, INT-089, INT-090, INT-144, INT-155; CON-006; SYNC-010 |
| EP-38 | `PUT /sessions/:id/sets` | Alumno | CU-28, CU-32 | INT-091, INT-092, INT-093, INT-094, INT-144; SYNC-007 |
| EP-39 | `POST /sessions/:id/finish` | Alumno | CU-30, CU-41, CU-43, CU-44, CU-46 | INT-073, INT-095, INT-096, INT-097, INT-098, INT-099, INT-100, INT-101, INT-102, INT-144, INT-149; CON-006, CON-013; REN-004 |
| EP-40 | `POST /sessions/:id/discard` | Alumno | CU-31 | INT-103, INT-104 |
| EP-41 | `POST /sync/sessions` | Alumno | CU-32, CU-41, CU-43, CU-44 | INT-105, INT-106, INT-107; CON-015; SYNC-006, SYNC-008, SYNC-009, SYNC-014; REN-005 |
| EP-42 | `GET /sessions` | Alumno y su entrenador | CU-33 | INT-108; CON-008 |
| EP-43 | `GET /sessions/:id` | Alumno y su entrenador | CU-33 | INT-109 |
| EP-44 | `POST /observations` | Todos | CU-34, CU-35, CU-46 | INT-110, INT-111, INT-112, INT-113, INT-147, INT-150 |
| EP-45 | `GET /observations` | Todos | CU-36 | INT-114 |
| EP-46 | `GET /me/progress/exercises/:id` | Alumno y su entrenador | CU-37, CU-16 | INT-116, INT-148 |
| EP-47 | `GET /me/progress/volume?weeks=8` | Alumno y su entrenador | CU-38 | INT-117, INT-118, INT-148 |
| EP-48 | `GET /me/prs` | Alumno y su entrenador | CU-38 | INT-119, INT-148 |
| EP-49 | `GET /me/body-metrics` | Alumno y su entrenador | CU-39 | INT-120, INT-148 |
| EP-50 | `POST /me/body-metrics` | Alumno | CU-39 | INT-121, INT-122, INT-144 |
| EP-51 | `POST /me/photos` | Alumno | CU-40, CU-57 | INT-123 |
| EP-52 | `GET /me/photos` | Alumno y su entrenador (lectura) | CU-40 | INT-124 |
| EP-53 | `DELETE /me/photos/:id` | Alumno | CU-40 | INT-125 |
| EP-54 | `GET /clients/:id/suggestions` | Entrenador y el alumno solo | CU-42, CU-41 | INT-126 |
| EP-55 | `PATCH /suggestions/:id` | Entrenador y el alumno solo | CU-42 | INT-127, INT-128, INT-129, INT-130, INT-131, INT-155 |
| EP-56 | `GET /trainer/alerts` | Entrenador | CU-47, CU-45 | INT-049, INT-132 |
| EP-57 | `PATCH /alerts/:id` | Entrenador | CU-47 | INT-049, INT-133 |
| EP-58 | `GET /me/alerts` | Alumno | CU-48, CU-44 | INT-134, INT-145, INT-149 |
| EP-59 | `POST /me/drop-reports` | Alumno | CU-48 | INT-135, INT-136, INT-145 |
| EP-60 | `GET /health` | Público | CU-59 | INT-140 |
| EP-61 | `GET /v1/docs` | Público | CU-59 | INT-141; CON-001, CON-003 |

## Cobertura por permiso

| PERM | Acción | Rol | Esperado | Pruebas |
| --- | --- | --- | --- | --- |
| PERM-01 | Ver la lista de clientes y sus alertas | ENT | Sí, solo los suyos con vínculo activo | INT-039, INT-132 |
| PERM-02 | Ver la lista de clientes y sus alertas | AV | Rechazado | INT-049 |
| PERM-03 | Ver la lista de clientes y sus alertas | AS | Rechazado | INT-049 |
| PERM-04 | Ver datos de una persona (sesiones, medidas, fotos) | ENT | Solo de sus vinculados; cualquier otro id, 404 | INT-042, INT-052, INT-108, INT-124, INT-148; SEG-014, SEG-015 |
| PERM-05 | Ver datos de una persona | AV | Solo los propios; los de otro, 404 | INT-108; SEG-014 |
| PERM-06 | Ver datos de una persona | AS | Solo los propios; los de otro, 404 | SEG-014 |
| PERM-07 | Crear, editar y archivar rutinas | ENT | Sí, para cada uno de sus clientes y sus plantillas; para un alumno ajeno, 404 | INT-067 |
| PERM-08 | Crear, editar y archivar rutinas | AV | Las propias sí; la del entrenador solo se lee (editar o archivar, rechazado) | INT-071 |
| PERM-09 | Crear, editar y archivar rutinas | AS | Las propias | INT-063 |
| PERM-10 | Asignar y activar una rutina | ENT | Sí, a clientes vinculados | INT-074, INT-077 |
| PERM-11 | Asignar y activar una rutina | AV | Solo las propias; asignar, rechazado; activar la del entrenador, rechazado | INT-075, INT-080 |
| PERM-12 | Asignar y activar una rutina | AS | Solo las propias; asignar, rechazado | INT-075 |
| PERM-13 | Crear ejercicios propios con referencia | ENT | Sí | INT-055 |
| PERM-14 | Crear ejercicios propios con referencia | AV | Sí | INT-055 |
| PERM-15 | Crear ejercicios propios con referencia | AS | Sí | INT-055 |
| PERM-16 | Registrar sesión, peso, medidas y fotos | ENT | No: rechazado | INT-089, INT-122 |
| PERM-17 | Registrar sesión, peso, medidas y fotos | AV | Sí | INT-087, INT-121 |
| PERM-18 | Registrar sesión, peso, medidas y fotos | AS | Sí | INT-144 |
| PERM-19 | Sobrescribir la sugerencia de carga | ENT | Sí, y queda registrado quién y cuándo | INT-127 |
| PERM-20 | Sobrescribir la sugerencia de carga | AV | Solo ajusta a mano en la sesión; `PATCH /suggestions/:id`, rechazado | INT-128 |
| PERM-21 | Sobrescribir la sugerencia de carga | AS | Sí | INT-129 |
| PERM-22 | Recibir alerta de estancamiento | ENT | Sí | INT-099 |
| PERM-23 | Recibir alerta de estancamiento | AV | Recibe aviso y registra motivos (consejos: P-05) | INT-134 |
| PERM-24 | Recibir alerta de estancamiento | AS | Recibe aviso, motivos y consejos | INT-145 |
| PERM-25 | Escribir observaciones y consejos | ENT | Sí, en ejercicio, sesión y rutina, solo de sus clientes | INT-112 |
| PERM-26 | Escribir observaciones y consejos | AV | Sí, en ejercicio y sesión (rutina y tipo consejo: P-08) | INT-110, INT-113 |
| PERM-27 | Escribir observaciones y consejos | AS | Sí | INT-110 |
| PERM-28 | Exportar datos y borrar cuenta | ENT | Los propios | INT-138, INT-151 |
| PERM-29 | Exportar datos y borrar cuenta | AV | Los propios | INT-137, INT-139 |
| PERM-30 | Exportar datos y borrar cuenta | AS | Los propios | INT-138, INT-151 |
| PERM-31 | Encuesta (`POST` y `GET /me/survey`, «Alumno») | ENT | Rechazado | INT-027 |
| PERM-32 | Endpoints `/trainer/*` («Entrenador») | AV y AS | Rechazado | INT-032, INT-049 |
| PERM-33 | Vincular y desvincular por `/me/trainer` («Alumno») | ENT | Rechazado | INT-037 |
| PERM-34 | Datos de un ex cliente después de terminar el vínculo | ENT | 404 al instante; conserva solo las rutinas que escribió (§Privacidad) | INT-043, INT-047 |
| PERM-35 | Editar la observación ajena | todos | No existe ruta para editar; nadie la cambia | INT-115 |
| PERM-36 | Fotos del alumno (`POST` y `DELETE /me/photos`) | ENT | Solo lectura: subir o borrar, rechazado | INT-125 |
| PERM-37 | `GET /me/today`, `/me/alerts`, `/me/drop-reports`, `/sessions` («Alumno») | ENT | Rechazado | INT-086, INT-134 |
| PERM-38 | Cualquier endpoint sin token, salvo registro, ingreso, refresh, recuperación, `/health` y `/v1/docs` | anónimo | 401 | INT-142 |
| PERM-39 | Plantillas del entrenador (`client_id` nulo) | AV y AS | No se listan ni se leen: 404 | INT-068 |
| PERM-40 | Editar o borrar un ejercicio de la biblioteca base | todos | Rechazado | INT-056, INT-152 |
| PERM-41 | Duplicar la rutina del entrenador | AV | Sí, como borrador propio | INT-081 |
| PERM-42 | `GET /clients/:id/suggestions` («Entrenador y el alumno solo») | AV | Rechazado; ve la sugerencia en Hoy | INT-126 |

## Cobertura por pantalla

Solo pruebas que nombran la pantalla. Los flujos de los cinco criterios pasan además por casi todas.

| PAN | Pantalla | CU | Pruebas |
| --- | --- | --- | --- |
| PAN-01 | Ingreso | CU-02, CU-58 | APP-001, APP-002, APP-003, APP-004, APP-005; E2E-019 |
| PAN-02 | Crear cuenta | CU-01 | APP-006, APP-007, APP-008; E2E-007 |
| PAN-03 | Recuperar contraseña | CU-05, CU-06 | APP-009, APP-010; E2E-008 |
| PAN-04 | Encuesta inicial | CU-09, CU-12, CU-57 | APP-011, APP-012, APP-013, APP-014; E2E-007 |
| PAN-05 | Hoy | CU-26, CU-31, CU-35, CU-48 | APP-015, APP-016, APP-017, APP-018, APP-049; E2E-010, E2E-018, E2E-020, E2E-021; REN-001; ACC-001 |
| PAN-06 | Rutinas | CU-25, CU-21, CU-22, CU-23, CU-24 | APP-019, APP-020; E2E-016 |
| PAN-07 | Nueva rutina | CU-19, CU-20 | APP-021, APP-022; E2E-016 |
| PAN-08 | Detalle de rutina | CU-25, CU-20, CU-22, CU-23, CU-24, CU-27 | APP-023; E2E-016 |
| PAN-09 | Ejercicios | CU-15, CU-17 | APP-024; E2E-014 |
| PAN-10 | Detalle de ejercicio | CU-16, CU-17, CU-18, CU-34, CU-36, CU-37 | APP-025; E2E-014 |
| PAN-11 | Registro de sesión | CU-27, CU-28, CU-30, CU-31, CU-34 | APP-026, APP-027, APP-028, APP-029; E2E-010, E2E-012, E2E-017; REN-002; ACC-001, ACC-002, ACC-006 |
| PAN-12 | Descanso (capa) | CU-29 | APP-030; E2E-011; ACC-006 |
| PAN-13 | Rutina completada | CU-30, CU-32, CU-34, CU-41 | APP-031, APP-032, APP-050; E2E-013 |
| PAN-14 | Progreso | CU-37, CU-38, CU-39, CU-40, CU-57 | APP-033, APP-034, APP-048, APP-051; E2E-015 |
| PAN-15 | Perfil y ajustes | CU-04, CU-07, CU-11, CU-12, CU-13, CU-32, CU-51, CU-52, CU-53, CU-54 | APP-035, APP-036, APP-037, APP-038, APP-039, APP-047; E2E-007, E2E-009, E2E-013, E2E-017; SYNC-003 |
| PAN-16 | Clientes | CU-49, CU-11, CU-14 | APP-039, APP-040, APP-049; E2E-018; REN-007 |
| PAN-17 | Ficha del cliente | CU-50, CU-35, CU-14, CU-21, CU-42, CU-10 | APP-041; E2E-009, E2E-018, E2E-022 |
| PAN-18 | Alertas | CU-47, CU-43, CU-44, CU-45, CU-46 | APP-042; E2E-012, E2E-021 |
| PAN-19 | Ajustar cargas | CU-42 | APP-043 |
| PAN-20 | Motivos de la baja | CU-48 | APP-044 |

## Cómo se vuelve a generar

Esta matriz se armó con un script que lee los ids de `casos-de-uso.md` y la columna «Valida» de `plan-de-validacion.md`, revisa que todo id citado exista y falla si queda un caso de uso, endpoint, permiso o pantalla sin prueba. El script no está en el repo (el plan no toca código); si el equipo lo quiere, se suma como revisión del CI de la documentación. Mientras tanto, cuando cambies un caso de uso o una prueba, actualiza también la fila que le toca aquí.
