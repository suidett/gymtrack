# Plan de validación de GymTrack

Este plan dice cómo comprobar, cuando exista el backend, que todos los casos de uso de `casos-de-uso.md` funcionan de punta a punta. Está escrito para el equipo de cinco: cada escenario tiene un id, el caso de uso que valida y un Dado / Cuando / Entonces que se puede convertir en prueba sin interpretar.

Los datos que se nombran (Camila, Martina, Diego, Rodrigo, el reloj fijo) están en `datos-de-prueba.md`. Lo que corre en cada PR, en `main`, de noche y en cada versión está en `ci.md`.

## Niveles

| Nivel | Prefijo | Herramienta | Dónde corre | Qué prueba | Cuándo |
| --- | --- | --- | --- | --- | --- |
| Unitarias | UNI | Vitest | `packages/shared` (y el módulo de detección) | Fórmulas, motor de progresión con una prueba por regla y por método, historial, detección, formatos | Cada PR |
| Integración | INT | Vitest con `fastify.inject` | `apps/api` contra PostgreSQL 16 real y un bucket local (MinIO hoy; un emulador de Cloud Storage cuando la API use el Admin SDK de Firebase, P-57) | Cada endpoint, sus errores y los permisos negados por rol | Cada PR |
| Contrato | CON | Vitest y oasdiff | `packages/shared`, `apps/api`, `apps/mobile` | Esquemas Zod compartidos, OpenAPI, sobre de errores, mismo cálculo en celular y servidor | Cada PR |
| Componentes | APP | Jest con Testing Library | `apps/mobile` | Las 20 pantallas con sus estados, sin red real | Cada PR |
| Punta a punta | E2E | Maestro | Emulador Android con la API, la base y el worker levantados en el CI | Los cinco criterios de «lista» y los flujos críticos | Humo en cada PR; suite completa de noche y antes de cada versión |
| Sin señal | SYNC | Jest, Vitest, Maestro y Toxiproxy | App y API | Ids del celular, cola, reintentos idempotentes, orden, conflictos y aviso | Cada PR (Jest y Vitest); de noche (Maestro y Toxiproxy) |
| Worker | WRK | Vitest con reloj controlado | `apps/api/src/worker` contra PostgreSQL 16 y MinIO | Estancamiento, baja, sin sesiones, recordatorios, tope de push, purga a 30 días | Cada PR (rápidas); de noche (con volumen) |
| Seguridad | SEG | Vitest, gitleaks, pnpm audit, revisión del APK | API, app, repo, staging | §Seguridad y §Privacidad | Cada PR; cada versión contra staging |
| Rendimiento | REN | k6, adb y Perfetto | Staging y emulador | Presupuestos de §Rendimiento | De noche (carga liviana); cada versión |
| Accesibilidad | ACC | Jest, Maestro y Accessibility Scanner | App | §Accesibilidad y §Compatibilidad | Cada PR (Jest); de noche (Maestro) |
| Manual | MAN | Lista de chequeo | Teléfonos reales en la prueba cerrada de Google Play | Lo que no se automatiza bien y lo que exige gente real | Fase 5, durante los 14 días de prueba cerrada |
| Infraestructura | INF | curl, nmap, SSH, Firebase CLI, Healthchecks.io y listas de chequeo | VPS de Vultr, Firebase y GitHub Actions | Despliegue y vuelta atrás, red y puertos, respaldos y restauración, memoria, Storage, push real por FCM, App Distribution y Hosting | En cada despliegue, de noche, los lunes y en ventanas anunciadas; están en `escenarios-infra.md` |

## Reglas que valen para todos los niveles

1. **Un escenario, una afirmación de negocio.** El «Entonces» dice qué número, estado o fila se espera. Si no lo dice, el escenario no está listo.
2. **Reloj fijo.** Toda prueba que dependa de la hora usa el reloj de `datos-de-prueba.md` (martes 17 de noviembre de 2026, 10:00 en America/Santiago, que es 13:00 UTC) y lo mueve a mano. Nunca `Date.now()` sin inyectar.
3. **Base limpia.** Cada archivo de integración parte de la semilla fija; cada prueba deja la base como la encontró (ver `datos-de-prueba.md`).
4. **Códigos de error por constante.** Las pruebas comparan el estado HTTP y `error.code` contra la constante del paquete compartido, nunca contra el texto de `message` (P-40).
5. **Permisos con la regla de 404.** Lo que no existe o no es tuyo responde 404 y el mismo cuerpo que un id inexistente (§API). Lo que tu rol no puede hacer sobre algo que sí ves responde el código de P-01. En los dos casos la prueba revisa también que la base no cambió.
6. **Umbrales por configuración.** Las pruebas de detección leen los umbrales (3 sesiones, 10 %, 7 días, intensidad 7) de la configuración y tienen al menos un caso que los cambia (§Datos; P-34).
7. **Cobertura mínima propuesta.** No la fija el PRD; es la propuesta de este plan. Motor y fórmulas: 100 % de ramas. API: 85 % de líneas. App: 70 % de líneas en `src/features` y `src/store`. Bajar de eso hace fallar el PR.

---

## UNI · Unitarias del paquete compartido

Corren con `pnpm --filter @gymtrack/shared test`. La columna «Hoy» dice si ya existe una prueba equivalente en `packages/shared/src/__tests__` (para no duplicarla) o si es nueva. Las que dicen «falla hoy» describen lo que la fase 3 tiene que construir (H-03).

### Fórmulas (§Datos, Fórmulas que se calculan al guardar)

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-001 | CU-28 | una serie de 100 kg × 1 | se calcula el e1RM | da 100 kg, no 103,3 | Existe (`formulas.test.ts`) |
| UNI-002 | CU-28 | una serie de 60 kg × 8 | se calcula el e1RM con Epley | da 76 kg | Existe (`formulas.test.ts`) |
| UNI-003 | CU-28 | una serie de 50 kg × 12, el último caso válido de Epley | se calcula el e1RM | da 70 kg (50 × 1,4) | Nueva (borde 12 reps) |
| UNI-004 | CU-28 | una serie de 60 kg × 13 | se calcula el e1RM | da null, porque pasa de 12 | Existe (`formulas.test.ts`) |
| UNI-005 | CU-28 | series con peso 0, con 0 reps y con reps NaN | se calcula el e1RM | las tres dan null | Existe en parte (peso 0); nueva para reps 0 y NaN |
| UNI-006 | CU-28 | RIR 0, RIR 2, RIR 11 y RPE 8 | se convierten | RIR 0 da RPE 10, RIR 2 da RPE 8, RIR 11 se acota a RPE 0, RPE 8 da RIR 2 | Nueva |
| UNI-007 | CU-30 | tres series de 60 × 8, una sin completar | se suma el volumen | da 960 kg | Existe (`formulas.test.ts`) |
| UNI-008 | CU-30 | una sesión con un ejercicio de kilos (60 × 8 × 3), uno de tiempo (45 s × 3) y fondos sin lastre | se cierra | el volumen es 1.440 kg: el de tiempo no suma y los fondos sin lastre aportan 0 | Nueva |
| UNI-009 | CU-30 | peso corporal 80 kg y duración 2.718 s | se calculan las kcal con MET 5 | da 302 kcal (5 × 80 × 0,755) | Existe para 70 kg y 3.600 s; nueva para el caso del contrato |
| UNI-010 | CU-30 | peso corporal null y peso corporal 0 | se cierra la sesión | `kcalEstimadas` queda null en los dos casos | Existe para 0; nueva para null |
| UNI-011 | CU-41 | 53,7 kg y 54 kg con paso 2,5; 9 kg con paso 2 | se redondea la carga | da 52,5, 55 y 10 | Existe para paso 2,5; nueva para paso 2 |
| UNI-012 | CU-07 | 47,5 y 60 y 32,5 kg | se formatean | «47,5», «60» y «32,5 kg»: coma decimal y sin «,0» | Existe (`formulas.test.ts`) |
| UNI-013 | CU-07 | 100 kg, y 225 lb escritas en la app | se convierten con la función de unidades | 100 kg se muestra como 220,5 lb; 225 lb se guarda como 102,06 kg (P-32) | Nueva |

### Motor de progresión: doble progresión (§Datos, Métodos de progresión)

Base de estas pruebas: Press de banca, 3 series de 8 a 10, RIR objetivo 2, incremento 2,5 kg.

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-020 | CU-41 | las 3 series en 30 × 10 con RIR 2 | se pide la sugerencia | sube a 32,5 kg, vuelve a 8 repeticiones, motivo `tope_del_rango`, el texto nombra 32,5 y 35 kg | Existe (`progression.test.ts`) |
| UNI-021 | CU-41 | series 30 × 9, 30 × 8, 30 × 8 | se pide la sugerencia | mantiene 30 kg y el texto es exactamente «Próxima sesión intenta 30 kg × 8 a 10. Si consigues 10 o más con RIR 2 o más, sube a 32,5 kg.» | Existe (`progression.test.ts`) |
| UNI-022 | CU-41 | las 3 series al tope (30 × 10) con RIR 0, 1 y 2 | se pide la sugerencia | no sube: queda en 30 kg, motivo `dentro_del_rango` | Existe (`progression.test.ts`) |
| UNI-023 | CU-41 | RIR objetivo 0 y las 3 series en 30 × 10 con RIR 0 | se pide la sugerencia | sube a 32,5 kg (borde RIR 0: igual al objetivo cuenta) | Nueva |
| UNI-024 | CU-41 | las 3 series en 30 × 10 sin RIR marcado (null) | se pide la sugerencia | sube a 32,5 kg; regla del código actual que el PRD no menciona, a confirmar en la revisión del motor | Nueva |
| UNI-025 | CU-41 | 30 × 10, 30 × 10 y 30 × 10 marcada como «Fallé la serie» | se pide la sugerencia | no sube; motivo `bajo_el_minimo`, mismo peso (borde fallo) | Nueva |
| UNI-026 | CU-41 | una sesión bajo el mínimo (7, 6, 6); y otra vez con la sesión anterior también bajo el mínimo (7, 7, 5) | se pide la sugerencia | la primera mantiene 30 kg; la segunda baja a 27,5 kg con motivo `baja_dos_sesiones` | Existe (`progression.test.ts`) |
| UNI-027 | CU-41 | hoy una serie con fallo y la sesión anterior otra serie con fallo, todas con 8 o más reps | se pide la sugerencia | baja a 27,5 kg: el fallo cuenta como «bajo el mínimo» las dos sesiones | Nueva |
| UNI-028 | CU-41 | solo 2 de las 3 series prescritas, las dos en 30 × 10 | se pide la sugerencia | no sube: mantiene 30 kg porque no completó las series | Nueva |
| UNI-029 | CU-41 | las 3 series en 30 × 12 con RIR 2 (12 reps o más con rango de 8 a 10) | se pide la sugerencia | sube a 32,5 kg y vuelve a 8 (borde 12 reps: pasar el máximo es llegar al tope) | Nueva |
| UNI-030 | CU-41 | fondos con incremento 0, rango 8 a 12, las 3 series en 0 × 12; y otro caso con dos sesiones bajo el mínimo | se pide la sugerencia | la primera corre el rango a 12 a 14 sin decir «kg»; la segunda no dice «0 kg» | Existe (`progression.test.ts`) |
| UNI-031 | CU-41 | series de 30 × 12 con RIR 0 en rango 8 a 10; y series de 30 × 9 | se pide la sugerencia | el rango nunca sale invertido («30 kg × 10.») y el mínimo nuevo es 9 en el segundo caso | Existe (`progression.test.ts`) |
| UNI-032 | CU-41 | ninguna serie completada | se pide la sugerencia | devuelve null | Existe (`progression.test.ts`) |
| UNI-033 | CU-41 | incremento 2,5, peso 2,5 kg y dos sesiones bajo el mínimo | se pide la sugerencia | el texto dice «Quita el lastre», no «Baja a 0 kg» | Nueva |
| UNI-034 | CU-41 | rango 10 a 12 y series 30 × 10, 30 × 10, 30 × 11 | se pide la sugerencia | el texto coincide con el ejemplo de §Datos: «Próxima sesión intenta 30 kg × 10 a 12. Si consigues 12 o más con RIR 2 o más, sube a 32,5 kg.» | Nueva |
| UNI-035 | CU-41 | 4 series de 8 a 10 con 47,5 × 8, 47,5 × 9, 47,5 × 8, 47,5 × 8 | se pide la sugerencia | coincide con el contrato de cierre de §API: 47,5 kg, rango 8 a 10, RIR 2 y «… sube a 50 kg» | Nueva |

### Motor de progresión: los otros cinco métodos (§Datos, Métodos de progresión)

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-040 | CU-41 | método lineal, 3 × 8 con 60 kg, todas completas | se pide la sugerencia | sube a 62,5 kg, motivo `lineal_sube` | Existe (`progression.test.ts`) |
| UNI-041 | CU-41 | método lineal, una sola sesión con una serie fallida | se pide la sugerencia | repite 60 kg, motivo `lineal_mantiene` | Nueva |
| UNI-042 | CU-41 | método lineal, dos sesiones seguidas con una serie fallida en 60 kg | se pide la sugerencia | baja 10 %: 54 kg redondeado al incremento da 55 kg, motivo `lineal_baja` | Existe (`progression.test.ts`) |
| UNI-043 | CU-41 | método lineal, 2 de 3 series completas sin fallo | se pide la sugerencia | mantiene 60 kg: no completó todas las series | Nueva |
| UNI-044 | CU-41 | método lineal y un ejercicio sin lastre (incremento 0) | se pide la sugerencia | se calcula como doble progresión en repeticiones y no inventa kilos | Nueva |
| UNI-045 | CU-41 | método lineal: baja a 55 kg y la sesión siguiente completa todo | se pide la sugerencia | vuelve a subir a 57,5 kg («baja 10 % y vuelve a subir») | Nueva |
| UNI-046 | CU-41 | método porcentual con porcentajes 70, 75, 80 y 65 % y 1RM estimado vigente de 100 kg | se pide la sugerencia en las semanas 1 a 4 | sugiere 70, 75, 80 y 65 kg (P-10) | Nueva, falla hoy |
| UNI-047 | CU-41 | método porcentual, 1RM vigente 93 kg, semana 1 (70 %) | se pide la sugerencia | 65,1 kg se redondea al incremento: 65 kg | Nueva, falla hoy |
| UNI-048 | CU-41 | método porcentual y un PR nuevo de 1RM en la sesión de hoy (de 100 a 105 kg) | se pide la sugerencia de la semana 2 | usa 105 kg: 78,75 kg se redondea a 80 kg | Nueva, falla hoy |
| UNI-049 | CU-41 | método porcentual sin ningún 1RM vigente (primera sesión) | se pide la sugerencia | usa el peso inicial de la rutina y el texto lo dice; si no hay, no sugiere (P-10) | Nueva, falla hoy |
| UNI-050 | CU-41 | método por RM con objetivo 5RM y mejor serie de hoy 82,5 × 6 (e1RM 99 kg) | se pide la sugerencia | sugiere 85 kg × 5 (99 / (1 + 5/30) = 84,9, redondeado a 2,5; P-11) | Nueva, falla hoy |
| UNI-051 | CU-41 | método por RM con objetivo 5RM y mejor serie de hoy 82,5 × 13 | se pide la sugerencia | usa la marca comparable sin tope (82,5 × 13 cuenta como 118,25 kg de 1RM) y el texto dice que la serie pasó de 12 repeticiones (P-09) | Nueva, falla hoy |
| UNI-052 | CU-41 | esquema descendente con serie principal 60 × 10 en las 3 series (tope) y dos descendentes | se pide la sugerencia | la principal sube a 62,5 kg y las descendentes quedan en 50 y 40 kg (cada una 80 % de la anterior; P-11) | Nueva, falla hoy |
| UNI-053 | CU-41 | esquema descendente con series descendentes muy por debajo del rango | se pide la sugerencia | hay una sola sugerencia por ejercicio, la de la serie principal; las descendentes no tienen sugerencia propia | Nueva, falla hoy |
| UNI-054 | CU-41 | esquema cluster con bloques de 3 reps a 70 kg, todos completos | se pide la sugerencia | sube a 72,5 kg como en lineal | Nueva, falla hoy |
| UNI-055 | CU-41 | esquema cluster con bloques fallidos dos sesiones seguidas a 70 kg | se pide la sugerencia | baja 10 %: 63 kg redondeado da 62,5 kg | Nueva, falla hoy |
| UNI-056 | CU-19 | un ejercicio cluster con bloques de 4 reps o 25 s de pausa | se valida con el esquema compartido | lo rechaza: bloques de 2 a 3 reps y pausas de 15 a 20 s | Nueva |
| UNI-057 | CU-41 | cualquiera de los seis métodos con series al tope | se pide la sugerencia | ningún texto dice «se calcula como doble progresión»; reemplaza a la prueba actual «otros métodos avisan…» | Reemplaza una existente |

### Cierre de sesión y récords (§Datos, `personal_records`; `cierre.ts`)

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-060 | CU-30 | jalón con 10 × 15 en dos series | se cierra | hay un PR de 15 kg aunque Epley no se muestre sobre 12 | Existe (`cierre.test.ts`) |
| UNI-061 | CU-30 | fondos: 12 reps sin lastre, luego 10 con 2,5 kg, luego 12 con 2,5 kg | se cierran las tres | la primera es PR, la segunda no, la tercera sí por desempate de lastre | Existe (`cierre.test.ts`) |
| UNI-062 | CU-30 | un ejercicio que cambió de tipo de carga | se busca la marca vigente | se compara solo con marcas del mismo tipo | Existe (`cierre.test.ts`) |
| UNI-063 | CU-30 | un PR previo de 60 kg de 1RM y hoy 63,3 kg | se cierra | el PR nuevo trae `anterior: 60` y el anterior queda marcado como superado | Nueva |
| UNI-064 | CU-30 | una sesión con series no marcadas y el reloj del teléfono 10 minutos atrás del inicio | se cierra | las series no marcadas desaparecen y la duración es 0, nunca negativa | Nueva |
| UNI-065 | CU-41 | una sesión con un ejercicio de rutina, uno agregado suelto y uno de tiempo | se cierra | solo el de la rutina tiene sugerencia | Nueva |
| UNI-066 | CU-41 | sentadilla en dos rutinas distintas | se cierran sesiones de las dos | cada puesto progresa por separado (por `routine_exercise_id`) | Nueva |
| UNI-067 | CU-30 | los tipos de récord del PRD (peso máximo, 1RM, repeticiones con peso, volumen de sesión) | se cierra una sesión que bate los cuatro | se generan los cuatro tipos con su valor y su serie (H-04) | Nueva, falla hoy |

### Historial (`historial.ts`)

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-070 | CU-26 | rutina de 4 días y la última sesión cerrada en el día 4 | se busca el próximo día | toca el día 1; con la última en el día 2, toca el 3 | Nueva |
| UNI-071 | CU-26 | la última sesión fue de un día que ya se borró en el editor | se busca el próximo día | vuelve al primer día | Nueva |
| UNI-072 | CU-26 | rutina de 8 semanas activada hace 0, 6, 7 y 70 días | se calcula la semana | da 1, 1, 2 y 8 (nunca pasa del total); archivar y reactivar no reinicia | Nueva |
| UNI-073 | CU-41 | la sesión anterior tuvo el ejercicio pero sin series completas | se buscan las series anteriores | devuelve una lista vacía y no sigue buscando más atrás | Nueva |
| UNI-074 | CU-41 | la última sesión no tuvo el ejercicio y la penúltima sí, con sugerencia | se busca la sugerencia vigente | devuelve la de la penúltima | Nueva |
| UNI-075 | CU-31 | sesiones en curso, descartadas y cerradas | se arma el historial | solo aparecen las cerradas, de la más reciente a la más antigua | Nueva |

### Detección de estancamiento y baja (§Datos, Detección)

Propuesta: la detección vive como funciones puras (por ejemplo `packages/shared/src/deteccion.ts`) que el cierre de sesión y el worker llaman. Así los umbrales se prueban sin base.

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-080 | CU-43 | mejor 1RM de Peso muerto rumano 80 kg (60 × 10, 20 de octubre) y luego 3 sesiones con mejor 1RM de 78, 80 y 76,7 kg | se evalúa al cerrar la tercera | hay estancamiento, con el ejercicio y las 3 sesiones en el detalle | Nueva |
| UNI-081 | CU-43 | la misma serie pero la segunda sesión llegó a 81 kg | se evalúa al cerrar la tercera | no hay estancamiento: la cuenta se reinició en la segunda | Nueva |
| UNI-082 | CU-43 | solo 2 sesiones sin superar | se evalúa | no hay estancamiento | Nueva |
| UNI-083 | CU-43 | 3 sesiones sin superar y el umbral configurado en 4 | se evalúa | no hay estancamiento | Nueva |
| UNI-084 | CU-44 | promedio de volumen de las 4 semanas anteriores en el mismo día de rutina de 4.200 kg y hoy 3.780 kg (justo 10 % menos) | se evalúa | hay baja de rendimiento (P-47) | Nueva |
| UNI-085 | CU-44 | el mismo promedio y hoy 3.781 kg (9,98 % menos) | se evalúa | no hay baja | Nueva |
| UNI-086 | CU-44 | volumen normal pero el mejor 1RM de sentadilla cae de un promedio de 100 kg a 90 kg | se evalúa | hay baja por 1RM, con el ejercicio en el detalle | Nueva |
| UNI-087 | CU-44 | menos de 4 semanas de historial | se evalúa | usa las semanas que hay si son al menos 2; con menos, no evalúa (P-47) | Nueva |
| UNI-088 | CU-45 | rutina activa y la última sesión cerrada hace exactamente 7 días; otro caso con 6 días, 23 horas y 59 minutos; otro sin rutina activa | se evalúa | solo el primero genera «sin sesiones» | Nueva |
| UNI-089 | CU-46 | observaciones de tipo dolor con intensidad 7 y 6, y una de tipo observación con intensidad 9 | se evalúan | solo la de dolor con 7 genera alerta | Nueva |
| UNI-090 | CU-43 | ya hay una alerta de estancamiento abierta (nueva o vista) para el ejercicio; otro caso con la anterior resuelta | se vuelve a detectar | en el primero no se crea otra; en el segundo sí | Nueva |
| UNI-091 | CU-43 | un ejercicio de peso corporal y otro de tiempo con 3 sesiones sin mejorar | se evalúa | se usa la marca comparable (repeticiones y segundos; P-09) | Nueva |

### Otros cálculos y formatos

| Id | Valida | Dado | Cuando | Entonces | Hoy |
| --- | --- | --- | --- | --- | --- |
| UNI-095 | CU-39 | 2 registros de peso; luego 3 | se calcula la tendencia | con 2 no hay tendencia; con 3 hay «cambio a 30 días» (P-30) | Nueva |
| UNI-096 | CU-39 | registros de peso de hoy y de hace 29, 31 y 45 días | se calcula el cambio a 30 días | se compara con el más cercano a 30 días antes (el de hace 29 o 31, el más cercano; P-30) | Nueva |
| UNI-097 | CU-26 | sesiones cerradas ayer, anteayer y hace 4 días, y ninguna hoy | se calcula la racha | da 2: hoy sin sesión no la corta, el hueco de hace 3 días sí (regla de `selectors.ts`, P-22) | Nueva |
| UNI-098 | CU-49 | rutina de 4 días y 3 sesiones cerradas de lunes a domingo en la zona del alumno | se calcula la adherencia de la semana | da 75 %; con 5 sesiones, tope 100 % (P-22) | Nueva |
| UNI-099 | CU-11 | 10.000 códigos generados | se revisan | todos tienen 6 caracteres del alfabeto sin 0, O, 1 ni I (P-14) | Nueva |
| UNI-100 | CU-53 | textos con coma, comillas dobles, salto de línea y tildes | se escriben en el CSV | quedan entre comillas, con comillas dobladas, en UTF-8, y se vuelven a leer igual (P-48) | Nueva |

---

## INT · Integración de cada endpoint

Corren con `pnpm --filter api test:int` contra PostgreSQL 16 con las migraciones de Prisma aplicadas y MinIO como bucket. Cada prueba llama a la API con `fastify.inject`, con tokens reales de las personas de `datos-de-prueba.md`, y revisa la respuesta y las filas de la base. Los nombres de código son provisionales (P-40). Crear algo nuevo responde 201 (P-40).

### Cuentas y perfil

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-001 | CU-01 · EP-01 | el correo `nuevo.alumno@gymtrack.test` sin cuenta | registra rol `client` con nombre, apellido, correo y contraseña de 12 caracteres | 201 con usuario y tokens; `password_hash` empieza con `$argon2id$`; zona America/Santiago, unidades kg, descanso 90 s; un correo de bienvenida en el buzón de prueba |
| INT-002 | CU-01 · EP-01 | sin cuenta | registra rol `trainer` | 201 con rol `trainer`; `GET /me` no pide encuesta |
| INT-003 | CU-01 · EP-01 | Camila ya registrada | registra `CAMILA.ROJAS@gymtrack.test` | 409 `EMAIL_TAKEN` (P-36); sigue habiendo una sola fila con ese correo |
| INT-004 | CU-01 · EP-01 | sin cuenta | registra con contraseñas de 7, 8, 128 y 129 caracteres | 7 y 129 dan 400 con `details.campo = password`; 8 y 128 dan 201 |
| INT-005 | CU-01 · EP-01 | sin cuenta | registra con rol `admin`, sin apellido o con correo sin @ | 400 con el campo y el motivo en `details`; no se crea nada |
| INT-006 | CU-02 · EP-02 | Martina con su contraseña | ingresa | 200 con access que vence a los 900 s y refresh que vence a los 30 días |
| INT-007 | CU-02 · EP-02 | Martina | ingresa con contraseña mala; y alguien ingresa con un correo que no existe | los dos dan 401 con el mismo `code` y el mismo `message` |
| INT-008 | CU-02 · EP-02 | Gonzalo, con la cuenta marcada para borrado hace 29 días | ingresa con su contraseña correcta | 401 `ACCOUNT_DELETED` (P-24) |
| INT-009 | CU-03 · EP-03 | Martina con un refresh vigente | lo usa | 200 con un par nuevo; el refresh usado queda con `revocado_at` |
| INT-010 | CU-03 · EP-03 | Martina rotó su refresh A y recibió B | usa A otra vez | 401 `REFRESH_REUSED`; A, B y todos los refresh de Martina quedan revocados |
| INT-011 | CU-03 · EP-03 | un refresh emitido hace 30 días y 1 segundo (reloj movido); y otro emitido hace 29 días, 23 horas y 59 minutos | los usa | el primero da 401 `REFRESH_EXPIRED` y no entrega tokens; el segundo da 200 |
| INT-012 | CU-04 · EP-04 | Martina ingresó en dos dispositivos | cierra sesión en uno | se revoca solo ese refresh; el del otro dispositivo sigue sirviendo |
| INT-013 | CU-05 · EP-05 | Martina existe | pide recuperación | 202; un correo con enlace; una fila en `password_resets` con `token_hash` y `expires_at` a 1 hora |
| INT-014 | CU-05 · EP-05 | nadie con `nadie@gymtrack.test` | pide recuperación | 202 con el mismo cuerpo que INT-013; ningún correo; ninguna fila |
| INT-015 | CU-06 · EP-06 | un enlace vigente de Martina y dos refresh activos | guarda una contraseña nueva | 200; hash nuevo; `usado_at` lleno; los dos refresh revocados; ingresa con la nueva y no con la vieja |
| INT-016 | CU-06 · EP-06 | un enlace emitido hace 1 hora y 1 segundo | guarda una contraseña nueva | 400 `RESET_TOKEN_INVALID`; la contraseña no cambia |
| INT-017 | CU-06 · EP-06 | un enlace ya usado | lo usa otra vez | 400 `RESET_TOKEN_INVALID` |
| INT-018 | CU-07 · EP-07 | Martina | pide `GET /me` | 200 con nombre, rol, zona, unidades, descanso, modo gimnasio y entrenador; sin `password_hash` ni tokens |
| INT-019 | CU-07 · EP-08 | Martina | cambia unidades a `lb`, descanso a 120 s, modo gimnasio a true y zona a America/Punta_Arenas | 200; `GET /me` devuelve los cuatro cambios |
| INT-020 | CU-07 · EP-08 | Martina | manda `rol: trainer`, `email` nuevo, descanso de 20 s o de 301 s, o la zona `Marte/Base` | 400 en cada caso; nada cambia en `users` |
| INT-021 | CU-09 · EP-09 | Sofía, alumna nueva sin encuesta, con consentimiento marcado | manda las 10 respuestas | 201; una fila en `survey_responses` con versión 1, respuestas completas y `completada_at`; `client_profiles` lleno; un `body_metrics` de hoy con el peso de la pregunta 8 |
| INT-022 | CU-09 · CU-12 · EP-09 · EP-18 | Sofía y el código vigente de Camila | manda la encuesta con ese código | 201 y queda vinculada: `trainer_clients` en `activo` y `trainer_id` de Camila |
| INT-023 | CU-09 · EP-09 | Sofía | manda 9 respuestas, o «días por semana: siete» | 400 con el campo; no queda ninguna fila parcial (todo en una transacción) |
| INT-024 | CU-09 · CU-57 · EP-09 | Sofía | manda la encuesta sin consentimiento | 422 `CONSENT_REQUIRED`; ninguna fila (P-25) |
| INT-025 | CU-10 · EP-09 | Martina con su encuesta de agosto | responde otra vez | 201; hay dos filas; la de agosto quedó intacta; `GET /me/survey` devuelve la nueva (P-12) |
| INT-026 | CU-10 · EP-10 | Martina | pide `GET /me/survey` | 200 con las 10 respuestas, la fecha y la versión |
| INT-027 | CU-09 · CU-10 · EP-09 · EP-10 · PERM-31 | Camila | llama a `POST /me/survey` y `GET /me/survey` | rechazado (P-01); ninguna fila nueva |
| INT-028 | CU-08 · EP-11 | Martina | registra el mismo token de Expo dos veces | 201 y luego 200; una sola fila en `push_tokens`, con el token en hash |

### Vínculo entrenador y alumno

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-030 | CU-11 · EP-14 | Camila | pide un código | 201 con 6 caracteres del alfabeto de P-14; `codigo_vence_at` a 7 días exactos; estado `invitado` |
| INT-031 | CU-11 · EP-14 | Camila con el código K7P2QX sin usar | pide otro | el nuevo sirve y K7P2QX deja de servir (P-14) |
| INT-032 | CU-11 · EP-14 · PERM-32 | Martina y Diego | piden un código | rechazado; ninguna fila |
| INT-033 | CU-12 · EP-18 | Diego, alumno solo, y el código vigente de Camila | se vincula | 200; vínculo `activo` con `aceptado_at`; `trainer_id` de Camila; Camila ya puede abrir su ficha |
| INT-034 | CU-12 · EP-18 | un código de Camila emitido hace 7 días y 1 segundo; y un código que nunca existió | Diego intenta vincularse | 404 `INVITATION_NOT_FOUND` en los dos casos, con el mismo cuerpo (P-14) |
| INT-035 | CU-12 · EP-18 | un código que ya usó Sebastián | Diego lo usa | 409 `INVITATION_USED` |
| INT-036 | CU-12 · EP-18 | Martina ya vinculada a Camila y un código vigente de Rodrigo | Martina lo usa | 409 `ALREADY_LINKED` (P-15); sigue con Camila |
| INT-037 | CU-12 · EP-18 · PERM-33 | Rodrigo y un código de Camila | Rodrigo llama a `POST /me/trainer/link` | rechazado |
| INT-038 | CU-12 · EP-18 | el código K7P2QX | Diego escribe `k7p2qx` | se vincula igual (P-14) |
| INT-039 | CU-49 · EP-15 · PERM-01 | Camila con 5 clientes activos, Valeria como ex clienta y Martina con alertas abiertas | pide `GET /trainer/clients` | 200 con 5 clientes (Martina, Sebastián, Antonia, Matías y Florencia), cada uno con estado, adherencia de la semana, alertas abiertas, entrena hoy y sin rutina. Con el reloj fijo: Sebastián trae `sin_rutina: true` y los otros cuatro false; Martina trae 1 alerta abierta (estancamiento) y adherencia 0 % (semana del lunes 16, sin sesiones todavía); Antonia trae 2 alertas abiertas (dolor y sin sesiones); Florencia trae 0 abiertas (la suya está resuelta); Matías trae la sesión de hoy a las 07:05 como última. No aparece Valeria ni nadie de Rodrigo ni de Paula |
| INT-040 | CU-49 · EP-15 | Rodrigo sin clientes | pide la lista | 200 con `items` vacío y `next_cursor` null |
| INT-041 | CU-50 · EP-16 | Camila | pide la ficha de Martina | 200 con la rutina activa «Fuerza 4 días» (versión 2, doble progresión), las últimas sesiones con Empuje B del viernes 13 de noviembre primero, los PRs vigentes (Sentadilla trasera en 80 kg), las medidas del 1 de noviembre, la encuesta de agosto (versión 1) y la alerta de estancamiento del Peso muerto rumano abierta desde el 10 de noviembre |
| INT-042 | CU-50 · EP-16 · PERM-04 | Rodrigo | pide la ficha de Martina | 404 `NOT_FOUND`, nunca 403 |
| INT-043 | CU-50 · EP-16 · PERM-34 | Camila y Valeria, que se desvinculó | pide la ficha de Valeria | 404 |
| INT-044 | CU-50 · EP-16 | Camila | pide la ficha de un UUID v7 que no existe | 404 con un cuerpo idéntico al de INT-042 |
| INT-045 | CU-14 · EP-17 | Camila y Sebastián vinculado | termina el vínculo | 200; `terminado_at` lleno; la ficha da 404; Sebastián conserva sus sesiones; las rutinas que escribió Camila siguen en su biblioteca (P-16) |
| INT-046 | CU-14 · EP-17 | Rodrigo | intenta terminar el vínculo de Martina | 404; el vínculo de Martina sigue activo |
| INT-047 | CU-13 · EP-19 · PERM-34 | Martina vinculada y un access de Camila todavía vigente | Martina se desvincula y Camila pide su ficha con ese access | Martina recibe 200; Camila recibe 404 en la llamada siguiente, sin esperar a que venza su token |
| INT-048 | CU-13 · EP-19 | Diego sin entrenador | se desvincula | 404 |
| INT-049 | CU-47 · CU-49 · CU-50 · EP-15 · EP-16 · EP-17 · EP-56 · EP-57 · PERM-02 · PERM-03 · PERM-32 | Martina y Diego | llaman a las cinco rutas de entrenador | rechazado en las cinco; nada cambia |

### Ejercicios

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-050 | CU-15 · EP-20 | la biblioteca base y 2 ejercicios propios de Martina | Martina pide `GET /exercises?grupo=Pecho&q=press` | 200 solo con ejercicios de pecho cuyo nombre tiene «press», más sus propios que calcen, cada uno con su PR |
| INT-051 | CU-15 · EP-20 | la biblioteca base completa | pide páginas con `limit=20` hasta el final | cada página trae `next_cursor` hasta la última, que trae null; no hay repetidos ni faltantes |
| INT-052 | CU-15 · CU-17 · EP-20 · PERM-04 | Martina con un ejercicio propio | lo buscan Diego, Camila y Rodrigo | Diego y Rodrigo no lo ven; Camila lo ve sin poder editarlo (P-07) |
| INT-053 | CU-15 · EP-20 | Martina | pide `grupo=Piernasss` o `limit=0` | 400 |
| INT-054 | CU-16 · EP-21 | un ejercicio base y uno propio de Diego | Martina pide el detalle de los dos | el base da 200 con instrucciones y referencia; el de Diego da 404 |
| INT-055 | CU-17 · EP-22 · PERM-13 · PERM-14 · PERM-15 | Camila, Martina y Diego | cada uno crea un ejercicio propio | 201 con `owner_id` de cada uno; la biblioteca base no cambia |
| INT-056 | CU-17 · EP-23 · PERM-40 | Martina | edita su propio ejercicio, uno de la base y uno de Diego | el propio da 200; el de la base, rechazado; el de Diego, 404 |
| INT-057 | CU-17 · EP-23 | un ejercicio propio de Martina con sesiones cerradas | cambia su tipo de carga de kg a tiempo | 409 `EXERCISE_HAS_HISTORY`; el tipo no cambia |
| INT-058 | CU-17 · EP-24 | un ejercicio propio sin rutinas activas, usado en una sesión vieja | Martina lo borra | 200; queda con `deleted_at`; no aparece en `GET /exercises`; la sesión vieja sigue mostrando su nombre |
| INT-059 | CU-17 · EP-24 | un ejercicio propio en la rutina activa de Martina | lo borra | 409 `EXERCISE_IN_ACTIVE_ROUTINE` (P-35) |
| INT-060 | CU-18 · EP-25 | un ejercicio propio de Martina | pide subir un video de 30 MB; y otro de 51 MB | el de 30 MB da una URL firmada que vence a los 15 minutos, con la clave bajo el prefijo de Martina; el de 51 MB da 400 |
| INT-061 | CU-18 · EP-26 | una subida pedida | confirma con el archivo ya en MinIO; y confirma otra sin haber subido nada | la primera crea la fila en `exercise_media`; la segunda da 409 y no crea fila |
| INT-062 | CU-18 · EP-25 | un ejercicio base y uno de Diego | Martina pide subir una referencia | base, rechazado; de Diego, 404 |

### Rutinas

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-063 | CU-19 · EP-28 · PERM-09 | Diego | crea «Fuerza 4 días» con 4 días y 4 ejercicios por día | 201 en `borrador`, con días y ejercicios en el orden enviado y método `doble_progresion` |
| INT-064 | CU-19 · EP-28 | Diego | crea una rutina con un ejercicio de 12 a 8 repeticiones | 422 `REPS_RANGE_INVALID` con el ejercicio en `details`; no se crea nada |
| INT-065 | CU-19 · EP-28 | Diego y un ejercicio propio de Martina | lo incluye en su rutina | 422 `EXERCISE_NOT_OWNED` |
| INT-066 | CU-19 · EP-28 | Diego | crea una rutina sin nombre, sin días o con 0 series | 400 en cada caso |
| INT-067 | CU-19 · EP-28 · PERM-07 | Camila | crea una rutina con `client_id` de Diego, que no es su cliente | 404 |
| INT-068 | CU-25 · EP-27 · PERM-39 | Martina con 2 rutinas propias, una asignada por Camila y 3 plantillas de Camila | Martina y Camila piden `GET /routines` | Martina ve sus 2 y la asignada, no las plantillas; Camila ve las suyas y las asignadas a sus clientes |
| INT-069 | CU-25 · EP-29 | una rutina de Diego | Martina pide su detalle | 404 |
| INT-070 | CU-20 · EP-30 | la rutina propia de Martina | cambia nombre, método a lineal y semanas a 6 | 200; los tres cambios guardados |
| INT-071 | CU-20 · CU-24 · EP-30 · EP-31 · EP-35 · PERM-08 | la rutina que Camila asignó a Martina | Martina intenta `PATCH`, `PUT /days` y `DELETE` | rechazado en los tres (P-01); la rutina queda idéntica, misma versión |
| INT-072 | CU-20 · EP-31 | una rutina activa en versión 2 con una sesión cerrada | el dueño reemplaza los días con `PUT /days` | 200; la estructura es solo la nueva; versión 3; la sesión cerrada sigue con `routine_version` 2 |
| INT-073 | CU-20 · CU-30 · EP-31 · EP-39 | Martina con una sesión en curso sobre la versión 3 | Camila cambia los días (versión 4) y Martina cierra | la sesión cierra bien con `routine_version` 3; la siguiente usa la 4 |
| INT-074 | CU-21 · EP-32 · PERM-10 | una plantilla de Camila | la asigna a Martina, a Diego y a Valeria | Martina 200; Diego 404; Valeria (ex clienta) 404 |
| INT-075 | CU-21 · EP-32 · PERM-11 · PERM-12 | Martina y Diego con rutinas propias | llaman a `POST /routines/:id/assign` | rechazado |
| INT-076 | CU-21 · EP-32 | una plantilla de Camila | la asigna a Martina y a Antonia | dos copias independientes: editar la de Martina no cambia la de Antonia (P-43) |
| INT-077 | CU-22 · EP-33 · PERM-10 | Martina con «Hipertrofia 3 días» activa y «Fuerza 4 días» asignada por Camila | Camila activa «Fuerza 4 días» | 200; la nueva queda activa con versión más 1; la anterior queda archivada con sus sesiones intactas; `rutina_activa_id` apunta a la nueva |
| INT-078 | CU-22 · EP-33 | dos rutinas en borrador de Diego | se activan las dos al mismo tiempo (dos llamadas en paralelo) | una da 200 y la otra 422 `ACTIVE_ROUTINE_CONFLICT`; hay una sola activa |
| INT-079 | CU-22 · EP-33 | una rutina de Diego sin días | la activa | 422 `ROUTINE_EMPTY`; sigue en `borrador` y la activa anterior no cambia |
| INT-080 | CU-22 · EP-33 · PERM-11 | la rutina asignada por Camila en borrador y una propia de Martina | Martina activa la de Camila; luego activa la propia | la de Camila, rechazado; la propia, 200, y la de Camila queda archivada (P-06) |
| INT-081 | CU-23 · EP-34 · PERM-41 | la rutina activa de Martina, escrita por Camila | Martina la duplica | 201 con una rutina en borrador cuyo dueño es Martina, misma estructura, sin sesiones; Martina puede editarla |
| INT-082 | CU-24 · EP-35 | una rutina de Diego con 5 sesiones y otra sin sesiones | Diego archiva las dos | la primera queda `archivada` y sus 5 sesiones siguen; la segunda queda archivada con `deleted_at` (nunca se borra físicamente si tiene sesiones) |

### Entrenar y sincronizar

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-083 | CU-26 · CU-41 · EP-36 | Martina con rutina activa y sugerencias pendientes | pide `GET /me/today` | 200 con «Empuje A» como rutina del día, la sugerencia pendiente de Press de banca en 45 kg × 8 a 10, semana 5, racha 0 (no entrenó ayer), 8 sesiones en noviembre (2, 3, 5, 6, 9, 10, 12 y 13), el volumen total y los PRs del mes calculados de esas 8 sesiones, y el consejo de Camila del 6 de noviembre como última acción |
| INT-084 | CU-26 · EP-36 | Sebastián (vinculado, sin rutina) y Diego sin rutina | piden Hoy | rutina null; el de Sebastián indica que espera a su entrenador y el de Diego que está solo |
| INT-085 | CU-26 · CU-31 · EP-36 | Martina con una sesión en curso | pide Hoy | trae la sesión en curso para retomar o descartar |
| INT-086 | CU-26 · EP-36 · PERM-37 | Camila | pide `GET /me/today` | rechazado |
| INT-087 | CU-27 · EP-37 · PERM-17 | Martina | crea una sesión con un UUID v7 del celular; y la crea otra vez con el mismo id | 201 y luego 200 con el mismo recurso; una sola fila |
| INT-088 | CU-27 · EP-37 | Martina con una sesión en curso del día «Empuje A» | crea otra con id distinto para «Tirón A»; y otra con id distinto para «Empuje A» | 409 `SESSION_IN_PROGRESS` en las dos (P-17) |
| INT-089 | CU-27 · EP-37 · PERM-16 | un `routine_day_id` de la rutina de Diego; y Camila | Martina crea una sesión con ese día; Camila crea una sesión | Martina 404; Camila rechazado |
| INT-090 | CU-27 · EP-37 | Martina | crea una sesión con un UUID v4 o con un texto que no es UUID | 400 |
| INT-091 | CU-28 · EP-38 | una sesión en curso | manda en lote 60 × 8 con RIR 2 y 60 × 13 | 200; RPE 8 en la primera; e1RM 76 kg en la primera y null en la segunda |
| INT-092 | CU-28 · CU-32 · EP-38 | la misma sesión | manda el mismo lote 3 veces | el estado final es igual al de una vez; no hay series duplicadas |
| INT-093 | CU-28 · EP-38 | una sesión cerrada | manda series | 409 con el sobre exacto de §API: `SESSION_CLOSED`, «La sesión ya está cerrada y no se puede editar» y `details.session_id` |
| INT-094 | CU-28 · EP-38 | una sesión en curso | manda RIR 11, reps -1 o peso -5 | 400 con el número de serie y el campo en `details`; no se guarda ninguna serie del lote |
| INT-095 | CU-30 · EP-39 | la sesión del contrato de §API (14 series, 2.718 s, observación y dolor general de intensidad 3) | la cierra | 200 con la forma exacta del ejemplo de §API: `session`, `prs`, `sugerencias`, `alertas_creadas` y `proxima_sesion` |
| INT-096 | CU-30 · EP-39 | Martina con último peso corporal 62 kg y una sesión de 2.718 s; e Ignacio, cargado sin encuesta ni peso | cierran | Martina: 234 kcal (5 × 62 × 0,755 = 234,05); Ignacio: `kcal_estimadas` null y la API no falla |
| INT-097 | CU-30 · EP-39 | Martina con un PR de 1RM de Press de banca de 60 kg | cierra con una serie de 50 × 8 (63,3 kg) | `prs` trae 63,3 con `anterior: 60`; el récord anterior queda con `superado_at` |
| INT-098 | CU-30 · CU-41 · EP-39 | una sesión con 4 ejercicios de la rutina y uno agregado suelto | la cierra | 4 filas en `progression_suggestions` en estado `pendiente`, una por ejercicio de la rutina |
| INT-099 | CU-30 · CU-43 · EP-39 · PERM-22 | la semilla `estancamiento`: Martina con 2 sesiones de Peso muerto rumano sin superar su mejor 1RM de 80 kg (60 × 10 del 20 de octubre) | cierra la tercera sesión de Tirón A con 57,5 × 10 | `alertas_creadas` trae `estancamiento` del Peso muerto rumano; hay una alerta para Camila con las 3 sesiones |
| INT-100 | CU-30 · CU-32 · EP-39 | una sesión ya cerrada desde el mismo dispositivo | se vuelve a cerrar con el mismo cuerpo | 200 con el mismo resumen; no se duplican PRs, sugerencias ni alertas (P-18) |
| INT-101 | CU-30 · EP-39 | una sesión descartada | se intenta cerrar | 409 `SESSION_DISCARDED`; no se crean PRs, sugerencias ni alertas |
| INT-102 | CU-30 · CU-46 · EP-39 | una sesión de Martina | la cierra con dolor general de intensidad 7 | se crea una alerta `dolor` para Camila en la misma llamada y sale un push al buzón de prueba |
| INT-103 | CU-31 · EP-40 | una sesión en curso con 6 series | Martina la descarta | 200; estado `descartada`; no aparece en `GET /sessions`, ni en PRs, ni en sugerencias; puede crear otra |
| INT-104 | CU-31 · EP-40 | una sesión cerrada y una de Diego | Martina las descarta | la cerrada da 409; la de Diego, 404 |
| INT-105 | CU-32 · EP-41 | 3 sesiones completas de Martina hechas sin señal | las manda en un lote; y un alumno gemelo hace las mismas 3 con red | las filas resultantes (series, PRs, sugerencias, alertas) son iguales en los dos |
| INT-106 | CU-32 · EP-41 | un lote de 3 sesiones donde la segunda tiene una serie con RIR 11 | lo manda | 200 con resultado por sesión: la primera y la tercera aceptadas, la segunda rechazada con su motivo |
| INT-107 | CU-32 · EP-41 | una sesión ya cerrada desde el teléfono A | llega la misma, cerrada, desde el teléfono B | la del A queda intacta; la del B vuelve como `descartada_conflicto` (P-18) |
| INT-108 | CU-33 · EP-42 · PERM-04 · PERM-05 | Martina con 40 sesiones cerradas y 1 descartada | Martina y Camila piden el historial con `limit=20`; Rodrigo lo pide | Martina y Camila: 2 páginas, más reciente primero, sin la descartada; Rodrigo: 404 (P-02) |
| INT-109 | CU-33 · EP-43 | una sesión de Martina con observaciones | la pide Martina, Camila y Diego | Martina y Camila: 200 con series y observaciones; Diego: 404 |
| INT-110 | CU-34 · EP-44 · PERM-26 · PERM-27 | Martina | crea una observación sobre un ejercicio, una sobre una sesión y un dolor sobre una serie; una sin destino; un dolor de intensidad 0 y otro de 11 | las tres primeras 201; las tres últimas 400 |
| INT-111 | CU-34 · EP-44 | una sesión cerrada | Martina le agrega una observación | 201; la sesión no cambia en nada más |
| INT-112 | CU-35 · EP-44 · PERM-25 | Camila y Rodrigo | escriben un consejo sobre la rutina de Martina | Camila 201; Rodrigo 404 |
| INT-113 | CU-34 · EP-44 · PERM-26 | Martina | escribe una observación sobre la rutina que le asignó Camila; y una de tipo consejo | rechazado y 422, respectivamente (P-08) |
| INT-114 | CU-36 · EP-45 | observaciones de Martina y consejos de Camila sobre ella | piden `GET /observations?exercise_id=…` Martina, Camila y Rodrigo | Martina y Camila ven las dos clases; Rodrigo, 404 |
| INT-115 | CU-36 · PERM-35 | una observación de Martina | Camila llama a `PATCH` y `DELETE /observations/:id` | 404: la ruta no existe; la observación sigue igual |

### Progreso, sugerencias y alertas

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-116 | CU-37 · EP-46 | Martina con Sentadilla en las últimas 27 semanas | pide el progreso del ejercicio | un punto por sesión de las últimas 26 semanas, con 1RM estimado y mejor serie; la sesión de hace 27 semanas no aparece |
| INT-117 | CU-38 · EP-47 | Martina con sesiones en 6 de las últimas 8 semanas | pide `volume?weeks=8` | 8 semanas de lunes a domingo en su zona, dos con 0, cada una con la variación frente a la anterior |
| INT-118 | CU-38 · EP-47 | Martina | pide `weeks=0` y `weeks=53` | 400 (rango propuesto de 1 a 52) |
| INT-119 | CU-38 · EP-48 | Martina con PRs superados | pide `GET /me/prs` | un récord vigente por ejercicio y tipo, con fecha y diferencia con el anterior |
| INT-120 | CU-39 · EP-49 | Diego con 2 registros de peso; luego con 3 | pide `GET /me/body-metrics` | con 2, tendencia null; con 3, tendencia presente (P-30) |
| INT-121 | CU-39 · EP-50 · PERM-17 | Martina | registra 62 kg a las 08:00 y 61,5 kg a las 21:00 del mismo día; y otro a las 23:30 y otro a las 00:30 en hora de Santiago | los dos primeros dejan una sola fila con 61,5; los dos últimos quedan en días distintos |
| INT-122 | CU-39 · EP-50 · PERM-16 | Martina y Camila | Martina manda peso -1 o cintura 0; Camila registra un peso | Martina 400; Camila rechazado |
| INT-123 | CU-40 · CU-57 · EP-51 | Martina con consentimiento de fotos y Diego sin él | piden subir una foto de frente | Martina: URL firmada de 15 minutos; Diego: 422 `CONSENT_REQUIRED` |
| INT-124 | CU-40 · EP-52 · PERM-04 | 3 fotos de Martina | las piden Martina, Camila y Rodrigo | Martina y Camila: lista por fecha con URLs que vencen en 15 minutos o menos; Rodrigo: 404 |
| INT-125 | CU-40 · EP-53 · PERM-36 | una foto de Martina | Camila la borra; Diego la borra; Martina la borra | Camila rechazado; Diego 404; Martina 200 y el objeto ya no está en MinIO |
| INT-126 | CU-42 · EP-54 · PERM-42 | sugerencias pendientes de Martina y de Diego | Camila pide las de Martina; Diego las suyas; Martina las suyas; Rodrigo las de Martina | Camila y Diego 200; Martina rechazado; Rodrigo 404 |
| INT-127 | CU-42 · EP-55 · PERM-19 | la sugerencia pendiente de Press de banca de Martina (45 kg × 8 a 10) | Camila la sobrescribe a 42,5 kg con la nota «Cuida el hombro» | 200; estado `sobrescrita`; `valor_final` de 42,5 kg; `sobrescrita_por` Camila con fecha; `GET /me/today` de Martina muestra 42,5 kg con la nota |
| INT-128 | CU-42 · EP-55 · PERM-20 | la misma sugerencia | Martina la intenta cambiar | rechazado; la sugerencia no cambia |
| INT-129 | CU-42 · EP-55 · PERM-21 | una sugerencia propia de Diego | Diego la cambia | 200 con `sobrescrita_por` Diego |
| INT-130 | CU-42 · EP-55 | una sugerencia ya usada al iniciar la sesión siguiente; y otra pendiente | Camila cambia la usada; y cambia la pendiente con rango de 12 a 8 | 409 `SUGGESTION_USED` (P-19); 422 |
| INT-131 | CU-42 · EP-55 | una sugerencia sobrescrita por Camila | Camila vuelve a la sugerencia | estado `pendiente` con el valor calculado; queda registrado quién y cuándo |
| INT-132 | CU-47 · EP-56 · PERM-01 | alertas abiertas y resueltas de clientes de Camila y una de Benjamín, cliente de Paula | Camila pide `GET /trainer/alerts` y luego con filtro de resueltas | abiertas por defecto y resueltas con el filtro; nunca la de Benjamín |
| INT-133 | CU-47 · EP-57 | una alerta nueva de Martina y una de Benjamín | Camila la marca vista, luego resuelta, luego con estado `borrada`; y cambia la de Benjamín | vista y resuelta 200; `borrada` 400; la de Benjamín 404 |
| INT-134 | CU-44 · CU-48 · EP-58 · PERM-23 · PERM-37 | Martina con una alerta de baja que pide motivos | Martina pide `GET /me/alerts`; Camila lo pide | Martina ve solo las suyas que piden acción; Camila rechazado |
| INT-135 | CU-48 · EP-59 | la alerta de baja de Martina | manda los motivos sueño y estrés con un comentario | 201; `drop_reports` con motivos, comentario y `consejos_mostrados`; devuelve hasta 3 consejos de cada motivo (6 como máximo) |
| INT-136 | CU-48 · EP-59 | la misma alerta ya reportada; un motivo `flojera`; una alerta de Diego | Martina manda otro reporte en cada caso | 409; 400; 404 |

### Datos personales, salud de la API y reglas transversales

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| INT-137 | CU-53 · EP-12 · PERM-29 | Martina con sesiones, medidas, encuesta y observaciones | pide `GET /me/export` | 200 con URL firmada de un ZIP que trae los CSV de sesiones, series, medidas, encuesta y observaciones; solo filas de Martina; pesos en kilos; fechas ISO 8601 con zona |
| INT-138 | CU-53 · EP-12 · PERM-28 · PERM-30 | Camila y Diego | piden su exportación | Camila: rutinas, ejercicios propios y observaciones (P-26), sin datos de salud de sus clientes; Diego: lo mismo que Martina con lo suyo |
| INT-139 | CU-54 · EP-13 · PERM-29 | Martina vinculada, con una sesión en curso y dos refresh | borra su cuenta | 200; `deleted_at` lleno; refresh revocados; sesión en curso descartada; vínculo terminado; su access deja de servir en la llamada siguiente (P-24) |
| INT-140 | CU-59 · EP-60 | la API con la base arriba; y con la base detenida | pide `/health` | 200; y 503 |
| INT-141 | CU-59 · EP-61 | la API levantada | pide `/v1/docs` | un OpenAPI 3 que trae las 61 rutas del inventario de `casos-de-uso.md` |
| INT-142 | CU-03 · PERM-38 | la lista de rutas del inventario | se llama a cada ruta autenticada sin token y con un token vencido | 401 en todas; las públicas (registro, ingreso, refresh, recuperación, `/health`, `/v1/docs`) no piden token |
| INT-143 | CU-59 | la base de prueba recién migrada | se leen las tablas y llaves foráneas | existen las tablas de §Datos con llaves foráneas reales, UUID como id y `deleted_at` donde hay historial; `prisma migrate diff` no muestra diferencias con el esquema (H-08) |
| INT-144 | CU-27 · CU-28 · CU-30 · CU-39 · EP-37 · EP-38 · EP-39 · EP-50 · PERM-18 | Diego, alumno solo | crea una sesión, manda sus series, la cierra y registra su peso | 201, 200, 200 y 201: el alumno solo registra igual que el vinculado, sin entrenador de por medio |
| INT-145 | CU-43 · CU-48 · EP-58 · EP-59 · PERM-24 | Diego con 3 sesiones de su press de banca sin superar su mejor 1RM | cierra la tercera, pide `GET /me/alerts` y manda sus motivos | la alerta queda con `trainer_id` nulo; `GET /me/alerts` la trae; `POST /me/drop-reports` devuelve hasta 3 consejos por motivo; no sale ningún push a un entrenador |
| INT-146 | CU-15 · EP-20 | la biblioteca base | Martina pide `GET /exercises?equipo=Mancuerna`, luego `?grupo=Pecho&equipo=Barra`, luego `?equipo=Trampolín` | la primera trae solo ejercicios con mancuerna; la segunda trae Press de banca y Press de banca inclinado y ningún otro de la base; la tercera da 400 (§API: filtros `q`, `grupo` y `equipo`) |
| INT-147 | CU-34 · CU-46 · CU-52 · EP-44 | Martina vinculada a Camila | crea por `POST /observations` un dolor de intensidad 7 sobre Press de banca; y otro de intensidad 6 | el de 7 da 201, crea una alerta `dolor` para Camila en la misma llamada y deja un push de alerta en el buzón; el de 6 da 201 y no crea alerta (§Datos: intensidad 7 o más) |
| INT-148 | CU-37 · CU-38 · CU-39 · CU-50 · EP-46 · EP-47 · EP-48 · EP-49 · PERM-04 | Martina con historia en la semilla `piloto` | Camila pide con `?client_id=<Martina>` el progreso de Sentadilla trasera, el volumen de 8 semanas, los PRs y el peso y las medidas; Martina pide lo mismo sin `client_id` | Camila recibe 200 en las cuatro y el cuerpo es idéntico al que recibe Martina (P-02); ninguna llamada de Camila crea ni cambia filas |
| INT-149 | CU-30 · CU-44 · EP-39 · EP-58 | la semilla `piloto`: promedio de 4.200 kg en las 4 sesiones anteriores de Empuje A | Martina cierra Empuje A con 3.780 kg de volumen; en otro caso, con 3.781 kg | con 3.780, `alertas_creadas` trae `baja_rendimiento`, hay una alerta para Camila con el volumen y el promedio en `detalle`, y `GET /me/alerts` de Martina la trae pidiendo motivos; con 3.781 no se crea nada (§Datos: 10 % o más; P-47) |
| INT-150 | CU-35 · CU-52 · EP-44 | Martina vinculada a Camila, las dos con push registrado y sin avisos hoy | Martina deja una observación (no dolor) sobre Press de banca; Martina registra su peso y cierra una sesión sin alertas; Camila le responde con un consejo | la observación deja 1 push a Camila que abre la ficha; el peso y el cierre no dejan ningún push a Camila (§Notificaciones: al entrenador solo alertas y observaciones nuevas); el consejo deja 1 push a Martina (P-41) |
| INT-151 | CU-54 · EP-13 · PERM-28 · PERM-30 | Camila con sus 5 clientes; Diego, alumno solo | cada uno borra su cuenta con `DELETE /me` y después intenta ingresar | 200 en los dos; `deleted_at` lleno y refresh revocados; los 5 vínculos de Camila quedan terminados en la misma llamada, sus clientes siguen ingresando y conservan su historial, y la rutina que ella les escribió queda archivada para ellos (P-24); ingresar da 401 `ACCOUNT_DELETED` |
| INT-152 | CU-17 · EP-24 · PERM-40 | un ejercicio de la biblioteca base y uno propio de Diego | Martina llama a `DELETE /exercises/:id` con cada uno | el de la base, rechazado (P-01); el de Diego, 404; los dos siguen en `GET /exercises` de su dueño |
| INT-153 | CU-18 · EP-25 · EP-26 | un ejercicio propio de Martina | pide subir un video de 52.428.800 bytes (50 MB justos), otro de 52.428.801 bytes y un archivo `application/pdf`; y confirma una subida declarada de 10 MB cuyo objeto en MinIO pesa 60 MB | 50 MB da URL firmada; un byte más da 400; el PDF da 400; la confirmación da 409, borra el objeto y no crea fila en `exercise_media` (§Datos: hasta 50 MB) |
| INT-154 | CU-20 · EP-31 | una rutina en `borrador` de Diego en versión 1 | Diego reemplaza los días con `PUT /days`; Rodrigo intenta lo mismo | Diego recibe 200 y la versión sigue en 1 (solo sube si está activa, §API); Rodrigo recibe 404 y la rutina no cambia |
| INT-155 | CU-27 · CU-42 · EP-37 · EP-55 | la sugerencia `pendiente` de Press de banca de Martina (45 kg × 8 a 10) | Martina inicia la sesión de Empuje A con `POST /sessions`; después Camila intenta sobrescribirla | la sugerencia pasa a `aplicada` al iniciar la sesión (P-19); el `PATCH` de Camila da 409 `SUGGESTION_USED` y `valor_final` no cambia |
| INT-156 | CU-19 · CU-25 · EP-28 · EP-29 | Camila | crea una rutina con `semanas: 8`, un día con `dia_semana: 1`, dos ejercicios con el mismo `grupo_superserie`, uno con esquema `descendente`, `peso_inicial_kg: 40` y `nota_entrenador` | 201; `GET /routines/:id` devuelve los mismos valores campo por campo; un esquema `piramidal` da 400 (§Datos: `routine_exercises`) |
| INT-157 | CU-24 · CU-26 · EP-35 · EP-36 | Diego con «Torso pierna 4 días» activa | la archiva con `DELETE /routines/:id` y pide Hoy | 200; la rutina queda `archivada` con sus sesiones; `rutina_activa_id` queda nulo y `GET /me/today` responde sin rutina, como alumno solo (P-56) |

---

## CON · Contrato entre la app y la API

§API fija que cada esquema de entrada y salida se define una vez en Zod dentro del paquete compartido, y que de ahí salen la validación del servidor, los tipos de la app y el OpenAPI. Estas pruebas cuidan que eso siga siendo verdad.

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| CON-001 | CU-59 · EP-61 | las rutas que Fastify tiene registradas | se recorren en una prueba | cada una tiene esquema de entrada y de salida importado de `@gymtrack/shared`; ninguna define un esquema propio en `apps/api` |
| CON-002 | CU-59 | toda la suite INT corriendo en modo de prueba | cada respuesta pasa por un gancho que la valida contra su esquema de salida | una respuesta que no cumple hace fallar la prueba que la produjo, con la ruta y el campo |
| CON-003 | CU-59 · EP-61 | el OpenAPI commiteado en `packages/shared/openapi.json` | se genera de nuevo en el PR y se compara con oasdiff | si hay un cambio que rompe (campo quitado, tipo cambiado, ruta borrada), el PR falla salvo que lleve la etiqueta `contrato-cambia` y suba la versión |
| CON-004 | CU-59 | todas las respuestas 4xx y 5xx de la suite INT | se validan | todas tienen el sobre `{ error: { code, message, details } }` y `code` está en la lista del paquete compartido |
| CON-005 | CU-59 | la tabla de códigos de §API | se cruza con la lista de errores del paquete compartido | cada código tiene su estado: esquema 400, sin token o vencido 401, no existe o no es tuyo 404, estado que no permite 409, regla de negocio 422, límite 429 |
| CON-006 | CU-27 · CU-30 · EP-37 · EP-39 | el esquema de fechas | recibe `2026-11-17T10:00:00` sin zona y `2026-11-17T10:00:00-03:00` | la primera da 400 y la segunda pasa (§API: ISO 8601 con zona) |
| CON-007 | CU-07 · CU-28 | los esquemas de series, medidas y sugerencias | se revisan | todos los pesos son `peso_kg` o `*_kg`; no hay campo de unidad ni de libras (§API: pesos siempre en kilos) |
| CON-008 | CU-15 · CU-33 · EP-20 · EP-42 | todas las rutas de lista | se revisan sus esquemas | todas aceptan `limit` y `cursor` y devuelven `{ items, next_cursor }`; `limit` por defecto 50 |
| CON-009 | CU-28 | los tipos de `types.ts` (camelCase) y la API (snake_case) | se pasa una sesión completa de la app a la API y de vuelta | el mapeo vive en un solo lugar del paquete compartido y el viaje de ida y vuelta da el mismo objeto (H-11, P-49) |
| CON-010 | CU-28 · CU-30 | los fixtures de la app en `apps/mobile/src/__fixtures__` | se validan con los esquemas de salida | todos pasan; un fixture viejo hace fallar el PR antes de que una prueba de la app mienta |
| CON-011 | CU-30 · CU-41 | 30 sesiones de fixture con los seis métodos | se cierran con `calcularCierre` en Node (como el celular) y con `POST /sessions/:id/finish` | volumen, kcal, PRs y sugerencias son iguales en los dos (§Arquitectura: el mismo número en el celular y en el servidor) |
| CON-012 | CU-07 · CU-19 | los esquemas de entrada | reciben un campo que no existe (`rol`, `owner_id`, `estado`) | 400: los esquemas son estrictos y no aceptan campos de más |
| CON-013 | CU-30 · EP-39 | el ejemplo exacto de request y response del contrato de cierre de §API | se valida contra los esquemas | pasa sin cambios |
| CON-014 | CU-59 | una llamada a `/sessions` sin `/v1` | se hace | 404; todas las rutas, salvo `/health`, cuelgan de `/v1` |
| CON-015 | CU-32 · EP-41 | el esquema de `POST /sync/sessions` | se revisa | cada elemento del lote tiene la misma forma que crear, series y cerrar juntos, y la respuesta trae un resultado por sesión (P-18) |

---

## APP · Componentes de la app con Jest y Testing Library

Corren con `pnpm --filter mobile test`. La red se simula con MSW con respuestas que pasan CON-010; la falta de señal se simula con el mock de NetInfo; los temporizadores con los relojes falsos de Jest; `expo-secure-store`, `expo-notifications`, `expo-haptics` y `expo-sqlite` con mocks. Cada pantalla se prueba en modo claro y en modo gimnasio.

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| APP-001 | CU-02 · PAN-01 | Ingreso vacío | escribe `martina.gymtrack.test` y toca Ingresar | ve «Revisa el correo: le falta la @.» y no sale ninguna llamada |
| APP-002 | CU-02 · PAN-01 | la API responde 401 | ingresa | ve un error que no dice si falló el correo o la contraseña; el correo queda escrito y la contraseña se borra |
| APP-003 | CU-02 · CU-58 · PAN-01 | la API responde 429 con `Retry-After: 48` | ingresa | ve «Demasiados intentos» con una cuenta regresiva desde 48; el botón se habilita al llegar a 0 (P-42) |
| APP-004 | CU-02 · PAN-01 | NetInfo sin conexión | abre Ingreso | ve el estado «Sin conexión» y el botón deshabilitado |
| APP-005 | CU-02 · CU-03 · PAN-01 | la API responde 200 con tokens | ingresa | los tokens se guardan con `expo-secure-store`; `AsyncStorage.setItem` nunca recibe un token |
| APP-006 | CU-01 · PAN-02 | Crear cuenta | escribe una contraseña de 6 caracteres; deja el apellido vacío | ve «Al menos 8 caracteres · te faltan 2» y «Escribe tu apellido.»; no sale ninguna llamada |
| APP-007 | CU-01 · PAN-02 | la API responde 409 | se registra | ve «Ya hay una cuenta con este correo.» bajo el campo de correo |
| APP-008 | CU-01 · PAN-02 | registro exitoso como cliente; y como entrenador | se registra | el cliente llega a la Encuesta; el entrenador llega a Clientes |
| APP-009 | CU-05 · PAN-03 | enlace pedido | toca reenviar antes de 60 s; reenvía 2 veces; la API responde 429 | el botón está deshabilitado hasta los 60 s; ve «Te mandamos otro enlace (2 de 3 en esta hora)»; ve «Límite de envíos» |
| APP-010 | CU-06 · PAN-03 | un enlace con token vencido | abre la app desde el enlace y guarda | ve «Enlace vencido» con «Pedir otro enlace» |
| APP-011 | CU-09 · PAN-04 | la encuesta en la pregunta 3 | mira la cabecera; toca Atrás; vuelve | ve «Pregunta 3 de 10» y la barra en 30 %; la respuesta de la pregunta 2 sigue marcada; Siguiente está deshabilitado sin respuesta |
| APP-012 | CU-09 · PAN-04 | las preguntas 6 y 7 | escribe 31 de febrero, una fecha que da 13 años y una altura de 300 cm | ve «Revisa el día…», el aviso de edad mínima (P-13) y «Escribe un número entre … y …» |
| APP-013 | CU-09 · CU-12 · PAN-04 | la pregunta 10 | escribe un código que la API rechaza; luego K7P2QX | ve «Ese código no existe o ya venció…» con «Seguir sin código»; con el bueno ve el nombre de Camila |
| APP-014 | CU-09 · CU-57 · PAN-04 | el paso final | intenta terminar sin marcar el consentimiento; marca y la API falla; reintenta | el botón dice «Terminar» y está deshabilitado sin la casilla; ve «No se pudo guardar» sin perder respuestas; el reintento manda las mismas 10 |
| APP-015 | CU-26 · PAN-05 | el fixture de Hoy de Martina (sacado de la semilla `piloto`) | abre Hoy | ve «Martes 17 de noviembre», saludo, racha, la tarjeta de «Empuje A» con «semana 5 de 8», la semana de lunes a domingo y la tarjeta de Camila |
| APP-016 | CU-26 · PAN-05 | Hoy sin rutina para Sebastián (vinculado) y para Diego (solo) | abre Hoy | Sebastián ve «tu entrenador está armando tu rutina»; Diego ve el botón a Nueva rutina |
| APP-017 | CU-26 · CU-31 · PAN-05 | un día de descanso; y una sesión en curso | abre Hoy; toca Descartar | ve el estado de descanso; ve Retomar y Descartar; Descartar pide confirmación y deja «Pierna A vuelve a quedar para hoy» |
| APP-018 | CU-26 · CU-35 · CU-48 · PAN-05 | un consejo nuevo de Camila y una alerta que pide motivos | abre la app | se abre Motivos de la baja; al volver, Hoy muestra el consejo de Camila |
| APP-019 | CU-25 · CU-22 · PAN-06 | Martina con su rutina y la de Camila | abre Rutinas; activa otra | la de Camila aparece marcada como de su entrenadora sin Editar ni Archivar; activar pide confirmación y dice cuál se archiva |
| APP-020 | CU-25 · CU-21 · PAN-06 | Camila con la biblioteca vacía; luego con rutinas | abre Rutinas; abre «Asignar a clientes» | ve «Biblioteca vacía»; la hoja lista solo a sus clientes vinculados |
| APP-021 | CU-19 · PAN-07 | Nueva rutina vacía | agrega 2 días, marca 3 ejercicios, pone 12 a 8 repeticiones, reordena | el método parte en Doble progresión; el error de rango aparece en el ejercicio antes de guardar; el orden nuevo se ve al instante |
| APP-022 | CU-19 · CU-20 · PAN-07 | la API responde 422 con `details` de un ejercicio | guarda | ve «Con errores al guardar» y el error en ese ejercicio; no se pierde nada de lo armado |
| APP-023 | CU-25 · CU-27 · PAN-08 | detalles de rutina en los seis estados de la maqueta | abre cada uno | «Empezar» solo aparece si el día toca hoy; la de la entrenadora es de solo lectura con sus notas; la archivada no tiene Empezar |
| APP-024 | CU-15 · CU-17 · PAN-09 | la biblioteca en caché | busca «remo», filtra Espalda, busca «zercher» | la lista se acota; con «zercher» ve «Sin resultados» y un botón para crear «zercher» con el nombre ya escrito |
| APP-025 | CU-16 · CU-17 · CU-18 · PAN-10 | un ejercicio propio sin historial; uno base; sin señal | abre cada detalle | el propio muestra Editar y «Subir referencia»; el base no; sin señal ve que la referencia no carga y el resto sí |
| APP-026 | CU-28 · PAN-11 | la fila activa en 60 kg × 8 | toca más dos veces y menos una en kilos, menos una en reps, y marca la serie | queda 62,5 kg × 7; marcar escribe en la capa local y `fetch` no se llama |
| APP-027 | CU-28 · PAN-11 | la serie 2 en curso con 6 repeticiones | toca «Fallé la serie»; toca Deshacer | ve «Serie 2 guardada como fallida, con 6 repeticiones.»; al deshacer ve «Serie 2 desmarcada.» |
| APP-028 | CU-28 · PAN-11 | el registro a mitad | toca «Añadir serie»; abre «toda la sesión» | ve «Agregaste la serie 5.»; la vista completa muestra todos los ejercicios con sus series; la cabecera dice «Ejercicio 2 de 5» y la última vez |
| APP-029 | CU-07 · CU-28 · PAN-11 | unidades en libras | toca más en kilos | la fila sube 5 lb y lo que se guarda va en kilos (P-32) |
| APP-030 | CU-29 · PAN-12 | descanso del ejercicio en 90 s | marca una serie, toca «+30 s», avanza el reloj 120 s; en otra serie toca Saltar | la capa cuenta desde 90; con +30 la notificación se reprograma a 120 s; al llegar a 0 vibra; Saltar cierra la capa y cancela la notificación |
| APP-031 | CU-30 · PAN-13 | cierres con récords, sin récords, incompleto y sin peso corporal | abre Rutina completada | con récords ve los PRs; sin récords no hay sección; incompleta dice «Quedaron 2 series sin marcar…»; sin peso no muestra kcal (H-13) |
| APP-032 | CU-30 · CU-32 · CU-41 · PAN-13 | cierre sin señal; y luego la API responde con una sugerencia distinta | abre Rutina completada; vuelve la red | ve «queda en cola»; cuando llega la respuesta, la sugerencia de la pantalla y de Hoy es la del servidor |
| APP-033 | CU-38 · CU-39 · PAN-14 | Progreso con 2 registros de peso | abre Peso corporal; registra uno | ve «Con 3 registros ves la tendencia.» y «Vas bien: falta uno.»; al tercero aparece la tendencia |
| APP-034 | CU-40 · CU-57 · PAN-14 | Martina sin fotos | toma la primera foto | aparece la casilla de consentimiento de fotos (distinta de la de la encuesta); la imagen se comprime a 1600 px antes de subir |
| APP-035 | CU-12 · CU-13 · CU-54 · PAN-15 | Perfil de Diego y de Martina | Diego vincula con un código bueno y con uno malo; Martina desvincula; Martina toca Borrar mi cuenta | ve «Vincularme con Camila» y luego «Listo…»; ve el error del código; la confirmación dice «Camila deja de ver tus datos»; la de borrar dice la fecha a 30 días |
| APP-036 | CU-53 · PAN-15 | la API devuelve la URL del ZIP | toca Exportar mis datos | descarga `gymtrack-mis-datos.zip` y abre el menú de compartir; si falla, ve el error y puede reintentar |
| APP-037 | CU-32 · PAN-15 | 2 sesiones en cola y una rechazada | abre Perfil | ve la cola con 2 pendientes y 1 con su motivo, y un botón Reintentar que manda la cola |
| APP-038 | CU-07 · CU-51 · PAN-15 | Ajustes | cambia el descanso a 20 s y a 6 minutos; activa modo gimnasio; apaga el recordatorio | ve «El mínimo es 30 segundos.» y «El máximo es 5 minutos.»; el tema cambia sin reiniciar; se manda `PATCH /me` con el recordatorio apagado |
| APP-039 | CU-11 · PAN-15 · PAN-16 | Camila con un código vigente y otro vencido | abre Perfil y Clientes | ve el código vigente con su fecha y el vencido marcado; «Invitar» copia y abre compartir |
| APP-040 | CU-49 · CU-11 · PAN-16 | Rodrigo sin clientes; Camila con clientes; sin conexión | abre Clientes; busca «zz»; toca Invitar sin red | Rodrigo ve su código en el estado vacío; Camila ve «Revisar» en Martina; «zz» da búsqueda sin resultados; sin red ve «Necesitas conexión para crear un código.» |
| APP-041 | CU-50 · CU-35 · CU-14 · PAN-17 | la ficha de Martina con un dolor sin responder | responde vacío; escribe un consejo; toca Desvincular | ve «Escribe la respuesta antes de enviarla.»; ve «Enviado. Martina lo ve en Hoy…»; Desvincular pide confirmación |
| APP-042 | CU-47 · PAN-18 | Alertas con 4 abiertas | marca una vista, resuelve otra, abre resueltas, vacía la lista | ve «Marcaste como vista…», «Resolviste…», la vista de resueltas y el estado sin alertas |
| APP-043 | CU-42 · PAN-19 | Ajustar cargas sin cambios | mira el botón; cambia Press de banca; vuelve a la sugerencia; guarda con la API caída | Guardar deshabilitado sin cambios; con cambio se habilita; volver deja «Igual que la sugerencia.»; con error ve «No se pudo guardar» |
| APP-044 | CU-48 · PAN-20 | Motivos de la baja de Martina (vinculada) y de Diego (solo) | elige sueño y estrés y envía; repite sin señal | ve hasta 3 consejos por motivo; sin señal ve los consejos de la caché y «en cola»; la versión de Martina dice que Camila verá sus motivos (P-05) |
| APP-045 | CU-07 | las 20 pantallas | se montan con modo gimnasio activo | todos los colores salen de los tokens del modo gimnasio de §Pantallas; ninguna pantalla usa un hexadecimal suelto |
| APP-046 | CU-03 | una llamada que responde 401 y un refresh que funciona; luego un refresh que falla | se hace la llamada | la app renueva una vez y repite; si el refresh falla, va a Ingreso y la cola queda intacta |
| APP-047 | CU-04 · PAN-15 | 1 sesión en cola | toca Cerrar sesión | aparece el aviso de que hay sesiones sin enviar y ofrece esperar; si confirma, manda `POST /auth/logout` y borra los tokens |
| APP-048 | CU-40 · PAN-14 | una foto de 4000 × 3000 px con ubicación GPS en sus datos EXIF | Martina la elige para subir | lo que sale hacia la URL firmada mide 1600 px en su lado mayor y no trae EXIF ni GPS (§Arquitectura; P-37) |
| APP-049 | CU-02 · CU-26 · CU-49 · PAN-05 · PAN-16 | una sesión iniciada como Martina; y otra como Camila | se mira la barra de pestañas | Martina ve Hoy, Rutinas, Progreso, Ejercicios y Perfil, en ese orden; Camila ve Clientes, Rutinas, Ejercicios, Alertas y Perfil; Camila nunca llega a Encuesta ni a Hoy (§Pantallas) |
| APP-050 | CU-30 · PAN-13 | un cierre con `proxima_sesion` «Tirón A» para el 19 de noviembre; último peso corporal de hace 8 días; y otro caso con peso de hoy | abre Rutina completada | ve «Tirón A» con su fecha como próxima sesión; con el peso de hace 8 días ve el recordatorio de peso con un botón que abre Registrar peso; con el peso de hoy no hay recordatorio (P-54) |
| APP-051 | CU-39 · PAN-14 | Medidas con 2 registros de cintura; luego 3; y un registro sin grasa corporal | abre Medidas y fotos y registra | con 2 no hay tendencia de cintura; con 3 aparece (§Alcance: peso y medidas desde el tercer registro); la grasa vacía se manda como null y no como 0 |

---

## E2E · Flujos de punta a punta con Maestro

Corren en un emulador Android (API 34 para la suite, API 29 de 360 dp para el humo de ACC-008) con la API, PostgreSQL 16, MinIO, el buzón de correo de prueba y el worker levantados en el mismo job. La falta de señal se simula con `setAirplaneMode` de Maestro; el tiempo, con el reloj de prueba de `datos-de-prueba.md`. Cada flujo empieza con `POST /test/reset` y la semilla que nombra. Los flujos de los cinco criterios llevan la etiqueta `criterio`; los del humo de cada PR, `humo`.

### E2E-001 · Criterio 1 completo (CU-01, CU-11, CU-12, CU-09, CU-19, CU-21, CU-22, CU-26 a CU-30, CU-32, CU-50) · etiqueta `criterio`

- **Dado** la semilla vacía (solo biblioteca y consejos) y el reloj en el lunes 16 de noviembre de 2026 a las 08:00.
- **Cuando**
  1. Crea la cuenta de entrenadora de «Camila Rojas» desde Crear cuenta.
  2. En Clientes toca Invitar y anota el código que aparece.
  3. Cierra sesión y crea la cuenta de alumna de «Martina Fuentes».
  4. Responde la encuesta con ese código en la pregunta 10 y marca el consentimiento.
  5. Cierra sesión, entra como Camila, abre la ficha de Martina y arma «Fuerza 4 días» con Empuje A, Tirón A, Pierna A y Empuje B, cuatro ejercicios por día.
  6. La asigna y la activa.
  7. Entra como Martina con red, abre Hoy y activa el modo avión.
  8. De lunes a jueves (el reloj avanza un día entre sesiones) registra las 4 sesiones completas sin señal, con descanso y cierre en cada una.
  9. El viernes desactiva el modo avión y espera a que la cola de Perfil quede vacía.
  10. Entra como Camila y abre la ficha.
- **Entonces**
  - Las 4 sesiones se cerraron con resumen sin red.
  - La cola se vació en menos de 5 s (REN-005).
  - La ficha muestra 4 sesiones, una por día, sin duplicados, con sus series.
  - La adherencia de la semana es 100 %.
  - La base tiene exactamente 4 filas en `workout_sessions` para Martina.

### E2E-002 · Humo de criterio 1 (CU-27 a CU-30, CU-32) · etiqueta `humo`

- **Dado** la semilla `piloto` (Martina con «Fuerza 4 días» activa).
- **Cuando** Martina activa el modo avión, registra Empuje A completa con una serie fallida, cierra, vuelve la red.
- **Entonces**
  - Rutina completada muestra «queda en cola» y luego el resumen del servidor.
  - `GET /sessions` de Martina por la API trae la sesión una vez, con la serie fallida marcada.

### E2E-003 · Criterio 2 (CU-41, CU-42, CU-30, CU-26, CU-28) · etiqueta `criterio`

- **Dado** la semilla `criterio2`: Martina con 2 sesiones cerradas de Empuje A con Press de banca (42,5 × 10 en las 4 series el 2 de noviembre; 45 × 9, 9, 8 y 8 el 9 de noviembre) y Empuje A como día que toca el martes 17.
- **Cuando**
  1. Martina hace la tercera sesión de Empuje A con 45 × 10 en las 4 series y RIR 2.
  2. Mira Rutina completada.
  3. Entra Camila, abre Ajustar cargas desde la ficha, cambia Press de banca de 47,5 a 45 kg con la nota «Cuida el hombro» y guarda.
  4. Martina abre Hoy y empieza la próxima sesión de Empuje A.
- **Entonces**
  - Rutina completada muestra «Próxima sesión intenta 47,5 kg × 8 a 10…» para Press de banca.
  - Ajustar cargas muestra el último rendimiento y la sugerencia calculada.
  - Hoy muestra 45 kg con la nota de Camila.
  - La fila activa del registro parte en 45 kg.
  - La sugerencia quedó `sobrescrita` por Camila con fecha.

### E2E-004 · Criterio 3 (CU-01, CU-09, CU-19, CU-22, CU-27 a CU-30, CU-32, CU-41, CU-42) · etiqueta `criterio`

- **Dado** la semilla vacía y el reloj del lunes 16 de noviembre.
- **Cuando**
  1. Crea la cuenta de alumno de «Diego Muñoz» y responde la encuesta con «Seguir sin código».
  2. En Rutinas crea «Fuerza 4 días» con 4 días fijos de lunes a jueves (Empuje A el lunes, con Press de banca en 4 series de 8 a 10, RIR 2 e incremento de 2,5 kg) y la activa.
  3. Activa el modo avión y registra las 4 sesiones de la semana (lunes 16 a jueves 19, el reloj avanza un día entre sesiones); en Empuje A hace Press de banca con 40 × 10 en las 4 series y RIR 2. El viernes 20 desactiva el modo avión y espera a que la cola de Perfil quede vacía.
  4. Con red, el job avanza el reloj al lunes 23 y al lunes 30 de noviembre y Diego registra Empuje A cada vez (42,5 × 10 en las 4 series con RIR 2; después 45 × 10 en las 4 series con RIR 2). Es la tercera sesión del mismo ejercicio.
  5. Abre Ajustar cargas desde el detalle de su rutina (P-50), cambia Press de banca de 47,5 a 45 kg y guarda.
  6. Abre Hoy y empieza la próxima sesión de Empuje A.
- **Entonces**
  - Las 4 sesiones de la primera semana se cerraron sin red y la base tiene exactamente 4 filas de esa semana, sin duplicados (como E2E-001).
  - Rutina completada de la tercera sesión de Empuje A muestra «Próxima sesión intenta 47,5 kg × 8 a 10…» para Press de banca (como E2E-003).
  - La fila activa del registro parte en 45 kg y la sugerencia queda `sobrescrita` con `sobrescrita_por` Diego.
  - Hoy nunca muestra la tarjeta del entrenador.
  - La base no tiene ninguna cuenta con rol `trainer` ni ninguna fila en `trainer_clients`.

### E2E-005 · Criterio 4 (CU-44, CU-47, CU-48, CU-49, CU-50, CU-52) · etiqueta `criterio`

- **Dado** la semilla `piloto` (Martina con 4 sesiones de Empuje A en las 4 semanas anteriores, con un promedio de 4.200 kg de volumen, y Empuje A como día que toca).
- **Cuando**
  1. Martina registra Empuje A con 3.570 kg (15 % menos) y cierra.
  2. Camila abre Clientes y Alertas.
  3. Martina vuelve a abrir la app.
  4. Elige «Dormí poco o mal» y «Semana cargada o preocupaciones», escribe un comentario y envía.
  5. Camila abre la ficha.
- **Entonces**
  - El cierre devuelve la alerta `baja_rendimiento`.
  - El buzón de push de prueba tiene un aviso para Camila.
  - Clientes marca a Martina con «Revisar».
  - Alertas muestra «Baja de rendimiento» con el volumen y la fecha.
  - Al abrir la app, Martina cae en Motivos de la baja y, al enviar, ve hasta 3 consejos de sueño y hasta 3 de estrés.
  - Camila ve los motivos y el comentario en la ficha y en la alerta.

### E2E-006 · Criterio 5 (CU-53, CU-54, CU-55) · etiqueta `criterio`

- **Dado** la semilla `piloto` con fotos de progreso de Martina en MinIO.
- **Cuando**
  1. Martina toca Exportar mis datos y guarda el ZIP.
  2. El script del job saca el archivo con `adb pull` y lo abre.
  3. Martina toca Borrar mi cuenta y confirma.
  4. Intenta ingresar.
  5. Camila abre Clientes.
  6. El job mueve el reloj 30 días y corre el worker.
- **Entonces**
  - El ZIP trae los 5 CSV con las sesiones, series, medidas, encuesta y observaciones de Martina.
  - Ingresar falla.
  - Martina ya no aparece en los clientes de Camila.
  - Después del worker no queda ninguna fila de Martina ni ningún objeto suyo en el bucket.

### Flujos críticos

| Id | Valida | Dado | Cuando | Entonces | Etiqueta |
| --- | --- | --- | --- | --- | --- |
| E2E-007 | CU-01 · CU-09 · CU-07 · PAN-02 · PAN-04 · PAN-15 | la semilla vacía | crea una cuenta de alumna, responde las 10 preguntas y abre Perfil | Perfil muestra su nombre, rol, «desde hoy» y la encuesta guardada; es el criterio de la fase 1 de §Plan | `humo` |
| E2E-008 | CU-05 · CU-06 · PAN-03 | Martina en la semilla | pide el enlace, el job lo saca del buzón de prueba y lo abre con `openLink`, guarda una contraseña nueva e ingresa | ingresa con la nueva; la vieja ya no sirve | nocturno |
| E2E-009 | CU-12 · CU-13 · CU-14 · PAN-15 · PAN-17 | Diego solo y un código vigente de Camila | Diego se vincula desde Perfil; Camila abre su ficha; Diego se desvincula; Camila refresca | la ficha se abre con el nombre de Diego; después del desvínculo, al refrescar, Camila vuelve a Clientes, Diego ya no está en la lista y `GET /trainer/clients/:id` de Diego da 404 | nocturno |
| E2E-010 | CU-31 · PAN-05 · PAN-11 | Martina a mitad de una sesión con 6 series marcadas | el job mata la app y la vuelve a abrir; Martina retoma; en otra sesión descarta | retoma con las 6 series; la descartada no aparece en el historial | `humo` |
| E2E-011 | CU-29 · PAN-12 | Martina en el registro | marca una serie, el job apaga la pantalla con `adb shell input keyevent 26` y espera el descanso | `adb shell dumpsys notification` muestra la notificación de fin de descanso a tiempo, con 2 s de margen | nocturno |
| E2E-012 | CU-34 · CU-46 · CU-47 · PAN-11 · PAN-18 | Martina en Press de banca | registra un dolor de hombro de intensidad 7 durante la sesión, con red | el buzón de push tiene el aviso para Camila en la misma llamada; Alertas de Camila muestra el dolor | nocturno |
| E2E-013 | CU-32 · PAN-13 · PAN-15 | Martina cierra una sesión sin señal | el job cierra la misma sesión (mismo id) por la API como si fuera otro teléfono; vuelve la red | la app muestra el aviso de conflicto; la ficha tiene una sola sesión, la primera copia cerrada (P-18) | nocturno |
| E2E-014 | CU-15 · CU-17 · CU-18 · PAN-09 · PAN-10 | Martina en Ejercicios | busca «zercher», crea el ejercicio desde «Sin resultados» y sube una foto de referencia | el ejercicio aparece en la lista con su foto; Diego no lo ve | nocturno |
| E2E-015 | CU-39 · CU-40 · CU-57 · PAN-14 | Martina sin registros de peso | registra peso 3 días seguidos (reloj), medidas y 2 fotos con consentimiento, y compara | la tendencia aparece al tercer día; la comparación muestra dos fechas | nocturno |
| E2E-016 | CU-19 · CU-20 · CU-22 · CU-23 · CU-24 · PAN-06 · PAN-07 · PAN-08 | Martina con la rutina de Camila activa | duplica la de Camila, edita la copia, la activa con confirmación y archiva una vieja | la copia queda activa; la de Camila queda archivada (P-06); la vieja queda en archivadas con su historial | nocturno |
| E2E-017 | CU-07 · CU-28 · PAN-15 · PAN-11 | Martina en kilos | cambia a libras y modo gimnasio, registra 135 lb × 8 | la app muestra libras en el tema oscuro; la API guarda 61,23 kg (P-32) | nocturno |
| E2E-018 | CU-49 · CU-50 · CU-35 · CU-36 · PAN-16 · PAN-17 · PAN-05 | la semilla `panel`: Camila con 60 clientes | busca «Martina», abre la ficha, escribe un consejo | la búsqueda deja una sola fila («Martina Fuentes»); sin buscar, el scroll llega hasta el cliente 60; el consejo queda guardado y Martina lo ve en la tarjeta de su entrenadora en Hoy | nocturno |
| E2E-019 | CU-02 · CU-58 · PAN-01 | Martina | se equivoca 6 veces de contraseña; activa el modo avión e intenta ingresar | ve la cuenta regresiva de «Demasiados intentos»; sin red ve «Sin conexión» | nocturno |
| E2E-020 | CU-02 · CU-26 · CU-32 · PAN-05 | Martina ingresó ayer con red | abre la app en modo avión | entra directo a Hoy con la rutina y la biblioteca de la caché, sin pedir ingreso | `humo` |
| E2E-021 | CU-45 · CU-51 · CU-56 · PAN-18 · PAN-05 | la semilla `piloto` y Martina con hora habitual 19:00 | el job avanza el reloj 7 días sin que Martina entrene y corre el worker | Camila ve la alerta «sin sesiones»; Martina recibió el recordatorio 30 minutos antes de su hora | nocturno |
| E2E-022 | CU-10 · CU-50 · PAN-17 | Martina con encuesta | Camila abre la ficha | ve las 10 respuestas con fecha y versión | nocturno |

---

## SYNC · Sincronización sin conexión y conflictos

| Id | Valida | Dado | Cuando | Entonces | Dónde |
| --- | --- | --- | --- | --- | --- |
| SYNC-001 | CU-27 · CU-32 | el generador de ids del celular | genera 10.000 ids seguidos | todos son UUID versión 7, crecen con el tiempo y no se repiten (hoy la app genera v4: H-01) | Jest |
| SYNC-002 | CU-28 · CU-32 | una serie recién marcada | la app se mata antes de cualquier llamada y se abre de nuevo | la serie está en SQLite y en la pantalla | Jest y E2E-010 |
| SYNC-003 | CU-32 · PAN-15 | una sesión cerrada sin red | se mira la cola | la sesión está en estado pendiente y Perfil la muestra | Jest |
| SYNC-004 | CU-32 | 3 sesiones en cola de lunes, martes y miércoles | vuelve la red | se mandan en orden de `iniciada_at`; la cola queda vacía; la base tiene las 3 | Jest con MSW y Maestro |
| SYNC-005 | CU-32 | la API responde 503 dos veces y luego 200 | la cola intenta mandar una sesión | hace 3 intentos con espera creciente (1 s, 2 s); queda una sola sesión en la base | Jest con relojes falsos |
| SYNC-006 | CU-32 · EP-41 | Toxiproxy corta la conexión después de que la API procesó el lote | la app reintenta | la segunda respuesta dice `ya_estaba`; no hay series, PRs, sugerencias ni alertas duplicadas | Nocturno con Toxiproxy |
| SYNC-007 | CU-28 · EP-38 | dos lotes de series de la misma sesión que llegan al revés (el segundo antes que el primero) | se aplican | cada serie queda con el último valor por id y `serie_n`; la sesión no pierde series | INT |
| SYNC-008 | CU-32 · EP-41 | 10 sesiones completas en cola | vuelve la red | todas quedan aceptadas en menos de 5 s (§Rendimiento) | Maestro y REN-005 |
| SYNC-009 | CU-32 · EP-41 | la misma sesión cerrada en el teléfono A y en el teléfono B (dos instalaciones de Martina) | A sincroniza primero y después B | gana la primera copia cerrada que llegó (la de A); B recibe `descartada_conflicto` y la app de B muestra el aviso; la base tiene una sola sesión (§SinSeñal; P-18) | INT y E2E-013 |
| SYNC-010 | CU-27 · CU-32 · EP-37 | una sesión en curso en el teléfono A y otra iniciada sin señal en el B | B sincroniza | B recibe 409 `SESSION_IN_PROGRESS`; la app de B lo avisa y ofrece descartar la suya (P-17) | INT y Jest |
| SYNC-011 | CU-32 · CU-41 | Camila sobrescribió la carga mientras Martina entrenaba sin señal | Martina sincroniza | la sugerencia que muestra la app pasa a ser la del servidor, en Hoy y en la precarga siguiente (§Arquitectura) | INT y Jest |
| SYNC-012 | CU-20 · CU-32 | Martina entrena sin señal con la versión 2 de la rutina y Camila sube la rutina a la 3 | Martina sincroniza | la sesión queda con `routine_version` 2; la sesión siguiente usa la 3 | INT |
| SYNC-013 | CU-03 · CU-32 | el access vence mientras hay cola; en otro caso, también vence el refresh | vuelve la red | con refresh vigente, renueva y manda sin pedir ingreso; con refresh vencido, pide ingresar, conserva la cola y la manda después | Jest |
| SYNC-014 | CU-32 · EP-41 | una sesión con un dato inválido en la cola junto a dos buenas | se sincroniza | las buenas quedan aceptadas; la inválida queda en Perfil con su motivo y no se borra | Jest e INT-106 |
| SYNC-015 | CU-34 · CU-46 · CU-32 | una observación y un dolor de intensidad 8 registrados sin señal | vuelve la red | las dos llegan; la alerta de dolor y el push a Camila salen en ese momento | INT y Jest |
| SYNC-016 | CU-39 · CU-32 | dos pesos del mismo día registrados sin señal | se sincroniza | la base tiene una fila de ese día, con el último peso | INT |
| SYNC-017 | CU-48 · CU-32 | un reporte de motivos enviado sin señal | se ven los consejos y luego vuelve la red | los consejos salen de la caché; al sincronizar, `consejos_mostrados` coincide con lo que se mostró | Jest e INT |
| SYNC-018 | CU-32 | el reloj del teléfono 2 horas adelantado respecto del servidor | se sincroniza una sesión | se guarda con las horas del teléfono y la duración no es negativa; con 3 días de adelanto, 422 (P-28) | INT |
| SYNC-019 | CU-32 · CU-41 | 4 sesiones de la semana en cola, con sugerencias encadenadas calculadas en el celular | se sincronizan juntas | el servidor procesa en orden de `cerrada_at` y llega a las mismas sugerencias que el celular (P-31) | INT |
| SYNC-020 | CU-32 · CU-54 | una sesión en cola y la cuenta borrada desde otro teléfono | vuelve la red | la app recibe 401 `ACCOUNT_DELETED`, no reintenta en bucle y muestra que la cuenta está marcada para borrado | Jest |

---

## WRK · Worker con reloj controlado

El worker recibe el «ahora» por parámetro (`--ahora=2026-11-17T13:00:00Z`) y los umbrales por variables de entorno (P-34). Corre contra PostgreSQL 16 y MinIO. El push sale a un buzón de prueba que guarda cada envío.

| Id | Valida | Dado | Cuando | Entonces |
| --- | --- | --- | --- | --- |
| WRK-001 | CU-43 · CU-56 | la semilla `piloto` sin la alerta de Peso muerto rumano (se borra al preparar): 3 sesiones sin superar 80 kg de 1RM | corre el worker de la noche; y corre otra vez | la primera corrida crea una alerta de estancamiento; la segunda no crea nada |
| WRK-002 | CU-44 · CU-56 | la semilla `piloto` más una sesión de Empuje A de 3.570 kg que llegó sin que corriera la detección del cierre | corre el worker | crea la alerta de baja y la marca para pedir motivos en el próximo `GET /me/alerts` |
| WRK-003 | CU-45 · CU-56 | rutina activa y última sesión cerrada el martes 10 de noviembre a las 19:00 en Santiago | corre el martes 17 a las 18:59 y a las 19:00 | a las 18:59 no hay alerta; a las 19:00 hay «sin sesiones» |
| WRK-004 | CU-45 · CU-56 | Sebastián sin rutina activa; Antonia con una alerta «sin sesiones» abierta; Florencia con una resuelta y 7 días más sin entrenar | corre el worker | Sebastián: nada; Antonia: no se repite; Florencia: alerta nueva |
| WRK-005 | CU-43 · CU-45 · CU-56 | `UMBRAL_SIN_SESIONES_DIAS=10` y `UMBRAL_ESTANCAMIENTO_SESIONES=4` | corre con los datos de WRK-001 y WRK-003 | no crea ninguna de las dos alertas |
| WRK-006 | CU-51 · CU-56 | Martina con hora habitual 19:00 y recordatorio encendido; Diego con recordatorio apagado | corre la programación del día | Martina tiene un push programado a las 18:30 de Santiago; Diego ninguno (P-21) |
| WRK-007 | CU-52 · CU-56 | Camila ya recibió 2 push hoy | se crea una tercera alerta de estancamiento | no sale push; la alerta está en Alertas; al día siguiente vuelve a haber cupo; los avisos de descanso no cuentan (P-20) |
| WRK-008 | CU-55 | Felipe marcado para borrado hace 30 días y Gonzalo hace 29 días y 23 horas, los dos con fotos | corre la purga | no queda ninguna fila ni objeto de Felipe; Gonzalo está intacto |
| WRK-009 | CU-55 | MinIO falla al borrar una foto de Felipe | corre la purga; y corre la noche siguiente con MinIO bien | la primera vez la cuenta no queda como purgada y no quedan filas huérfanas; la segunda vez termina |
| WRK-010 | CU-55 · CU-56 | la purga y la detección corriendo | se capturan sus logs | los logs tienen ids y conteos; no tienen correos, nombres ni medidas |
| WRK-011 | CU-55 | una entrenadora marcada hace 30 días con 2 clientes | corre la purga | sus clientes quedan como alumnos solos con todo su historial; las rutinas que ella les escribió: P-24 |
| WRK-012 | CU-45 · CU-51 · CU-56 | un alumno con la última sesión el viernes 3 de abril de 2026, antes del cambio de horario de Chile del sábado 4 | corre el worker el viernes 10 de abril a la misma hora local | la cuenta de 7 días usa la hora de Santiago y la alerta sale a esa hora local; el recordatorio de ese fin de semana sale 30 minutos antes de la hora habitual local |
| WRK-013 | CU-56 · CU-30 | una sesión que se cierra | se dispara el worker por el cierre | crea las mismas alertas que crearía la corrida nocturna, y la nocturna después no duplica |
| WRK-014 | CU-56 | el worker muere a mitad de la corrida | se vuelve a correr | no hay alertas duplicadas ni push repetidos |
| WRK-015 | CU-60 | el resumen semanal activado para Martina y apagado para Diego (si P-33 lo deja en la versión 1) | corre el domingo | solo Martina recibe el correo, con sesiones, volumen y PRs de la semana |
| WRK-016 | CU-52 · CU-51 | Martina ya recibió hoy el recordatorio de las 18:30 y un push por un consejo de Camila | Camila le deja un segundo consejo; y Martina termina un descanso | el segundo consejo queda guardado y se ve en Hoy, pero no sale push (tope de 2 al día por persona); el aviso de fin de descanso sale igual porque es local y no cuenta (§Notificaciones) |
| WRK-017 | CU-45 · CU-56 | Diego, alumno solo, con rutina activa y 7 días sin cerrar sesiones | corre el worker de la noche | se crea una alerta `sin_sesiones` con `trainer_id` nulo; no sale ningún push a un entrenador; Diego recibe su recordatorio (P-23) |

---

## SEG · Seguridad y privacidad

| Id | Valida | Dado | Cuando | Entonces | Dónde |
| --- | --- | --- | --- | --- | --- |
| SEG-001 | CU-01 | una cuenta recién creada | se lee `users.password_hash` | empieza con `$argon2id$` y usa los parámetros que fije el equipo (propuesta: memoria de 19 MiB, 2 iteraciones, paralelismo 1) | INT |
| SEG-002 | CU-01 · CU-06 | una contraseña de 10.000 caracteres | se registra o se cambia | 400 en menos de 50 ms: no se intenta el hash (§Seguridad: tope de 128) | INT |
| SEG-003 | CU-03 · CU-05 · CU-08 | la base después de toda la suite INT | se buscan los tokens emitidos en texto plano en `refresh_tokens`, `password_resets` y `push_tokens` | ninguno aparece: solo hay hashes | INT |
| SEG-004 | CU-03 | un access emitido a las 10:00:00 | se usa a las 10:14:59 y a las 10:15:01 (reloj) | 200 y 401 | INT |
| SEG-005 | CU-03 | access con firma alterada, con `alg: none`, firmado con otra clave y de un usuario que no existe | se usan | 401 en los cuatro | INT |
| SEG-006 | CU-03 | Martina con sesiones abiertas en 3 dispositivos | se reutiliza un refresh viejo | los 3 dispositivos quedan sin sesión en su próxima renovación (§Seguridad) | INT |
| SEG-007 | CU-06 | un enlace de recuperación | se usa dos veces, o a la hora y 1 segundo | rechazado; todos los refresh anteriores al cambio quedan revocados | INT |
| SEG-008 | CU-05 | 50 pedidos de recuperación con correos que existen y 50 con correos que no | se mide | misma respuesta; la mediana de tiempo difiere en menos de 50 ms (el envío del correo va en segundo plano) | INT |
| SEG-009 | CU-02 · CU-58 | una IP | hace 6 ingresos en 1 minuto; espera 60 s | el sexto da 429 con `Retry-After`; después del minuto vuelve a poder (§Seguridad: 5 por minuto por IP) | INT |
| SEG-010 | CU-05 · CU-58 | un correo | pide 4 recuperaciones en 1 hora | la cuarta da 429 (§Seguridad: 3 por hora por correo) | INT |
| SEG-011 | CU-58 | Martina | hace 61 llamadas en 1 minuto; Diego hace 1 | la 61 de Martina da 429; la de Diego da 200 (§Seguridad: 60 por minuto por usuario) | INT |
| SEG-012 | CU-07 · CU-17 | entradas con campos de más (`rol`, `owner_id`, `sobrescrita_por`) | se mandan a sus rutas | 400 y nada cambia: ningún campo protegido se asigna desde la entrada | INT y CON-012 |
| SEG-013 | CU-15 | `q` con `'; DROP TABLE users; --`, `%` y `_` | se busca en ejercicios | responde normal, sin error, y la tabla sigue; el CI falla si aparece `$queryRawUnsafe` o `$executeRawUnsafe` en `apps/api` | INT y CI |
| SEG-014 | CU-33 · CU-37 · CU-39 · CU-40 · CU-50 · PERM-04 · PERM-05 · PERM-06 | la lista de rutas con `:id` del inventario | se llama a cada una con un id de otra persona | 404 en todas, con el mismo cuerpo que un id inexistente (prueba recorrida por tabla) | INT |
| SEG-015 | CU-50 · PERM-04 | Rodrigo con un id de Martina y con un id inventado | pide la ficha | las dos respuestas son idénticas en estado, cuerpo y cabeceras | INT |
| SEG-016 | CU-40 | una foto de Martina en el bucket | se pide sin firma, con firma vencida (16 minutos) y se intenta listar el bucket | 403 en los tres; la respuesta firmada no trae `Cache-Control: public` | INT con MinIO y staging |
| SEG-017 | CU-40 · CU-55 | staging antes de cada versión (§Riesgos: «se prueba en cada release») | se sube una foto con la cuenta `humo.purga@gymtrack.test`, se prueba su URL a los 16 minutos, se borra la cuenta y se corre la purga de staging adelantada 30 días (P-52) | la URL vencida da 403 y, después de la purga, la clave ya no existe en el bucket ni queda ninguna fila de esa cuenta | staging |
| SEG-018 | CU-01 · CU-39 | los logs de pino de toda la suite INT | se buscan los correos, nombres y medidas de `datos-de-prueba.md` | cero coincidencias: solo ids (§Seguridad) | INT |
| SEG-019 | CU-59 | un error forzado en la API y en la app | se captura con un transporte falso de Sentry | el evento no trae correo, nombre, medidas ni el cuerpo de la petición | INT y Jest |
| SEG-020 | CU-59 | una rama de prueba con una clave de ejemplo plantada | corre el CI | gitleaks hace fallar el PR (§Seguridad: el CI falla si detecta una clave) | CI |
| SEG-021 | CU-59 | una dependencia con vulnerabilidad alta | corre el CI | `pnpm audit --audit-level high` hace fallar el PR (§Seguridad) | CI |
| SEG-022 | CU-02 | staging y producción | se llama por `http://` | redirige a https o rechaza; el APK de release tiene `usesCleartextTraffic` en false | staging y revisión del APK |
| SEG-023 | CU-02 · CU-03 | el APK `e2e` en el emulador (imagen `google_apis`, que permite `adb root`; un APK de release no deja usar `run-as`) después de ingresar | se leen con `adb root` las preferencias compartidas y la base de AsyncStorage de la app | ningún archivo contiene el access ni el refresh que devolvió el ingreso (§Seguridad: tokens en expo-secure-store) | nocturno |
| SEG-024 | CU-11 · CU-12 | un alumno | prueba 11 códigos inventados en una hora | el undécimo da 429 (P-27) | INT |
| SEG-025 | CU-59 | staging y producción | se llama a `/test/reset`, `/test/reloj` y `/test/correos` | 404: las rutas de prueba solo existen con `NODE_ENV=test` | staging |
| SEG-026 | CU-54 | Martina con un access vigente | borra su cuenta y usa ese access | 401 en la llamada siguiente | INT |
| SEG-027 | CU-53 | el ZIP de Martina | se revisa | no trae ninguna fila de otra persona y su URL vence a los 15 minutos | INT |
| SEG-028 | CU-57 | una encuesta y una primera foto aceptadas | se lee el perfil | quedaron guardados la fecha y la versión de la política de cada consentimiento (P-25) | INT |
| SEG-029 | CU-57 | la app de release | se toca el enlace a la política de privacidad en Perfil y en la encuesta | los dos abren la misma URL propia (la de `app.config`), que responde 200 con la política y no es un documento de Google ni un PDF sin dominio (§Privacidad) | nocturno |
| SEG-030 | CU-04 | Martina con datos en la caché | cierra sesión | se borran la caché local y los tokens; la cola sin enviar se conserva solo si el usuario eligió esperar (P-51) | Jest |
| SEG-031 | CU-18 | un video propio de referencia de Martina en el bucket | se pide sin firma, con la URL firmada a los 16 minutos, y Diego pide el detalle del ejercicio | 403 en los dos primeros; Diego recibe 404 y nunca una URL (§Seguridad: fotos y videos privados) | INT con MinIO |
| SEG-032 | CU-55 · CU-56 | la API y el worker arrancados con `NODE_ENV=production` | se les pasa `RELOJ_FIJO`, `--ahora` o se llama a `/test/reloj` | la API y el worker se niegan a arrancar con reloj fijo y `/test/reloj` da 404: en producción nadie puede adelantar la purga ni las alertas (P-52) | INT |

---

## REN · Rendimiento

Los presupuestos son los de §Rendimiento. La carga se mide contra staging con la semilla `carga` de `datos-de-prueba.md`; la app, en el emulador y en un teléfono de gama media real.

| Id | Valida | Dado | Cuando | Entonces | Herramienta |
| --- | --- | --- | --- | --- | --- |
| REN-001 | CU-26 · PAN-05 | la app con caché y el emulador con red 4G simulada (`-netspeed lte -netdelay lte`) | se abre en frío 10 veces | Hoy queda visible en menos de 1 s en el percentil 90 | `adb shell am start -W` y Perfetto |
| REN-002 | CU-28 · PAN-11 | una sesión de 5 ejercicios | Maestro marca 20 series seguidas | no sale ninguna llamada de red al marcar (APP-026) y el percentil 90 del tiempo de cuadro queda bajo 16,7 ms (60 fps) | `adb shell dumpsys gfxinfo` |
| REN-003 | CU-26 · CU-49 · CU-50 · CU-15 · CU-38 | staging con la semilla `carga` | k6 hace lecturas de `GET /me/today`, `/trainer/clients`, `/trainer/clients/:id`, `/exercises`, `/me/progress/volume` y `/me/prs` con 20 usuarios virtuales por 5 minutos | p95 bajo 300 ms en cada ruta | k6 |
| REN-004 | CU-30 · EP-39 | la misma semilla y sesiones de 6 ejercicios por 4 series sobre 26 semanas de historia | k6 cierra 200 sesiones | p95 bajo 800 ms con los cálculos incluidos | k6 |
| REN-005 | CU-32 · EP-41 | 10 sesiones completas en cola | vuelve la red | la cola queda vacía en menos de 5 s en el emulador; `POST /sync/sessions` con las 10 responde en menos de 5 s en staging | Maestro y k6 |
| REN-006 | CU-59 | el APK de release | se instala en el emulador | el tamaño instalado (`adb shell dumpsys package` y `du` de la carpeta de la app) es menor a 60 MB; el CI reporta el tamaño en cada versión | adb |
| REN-007 | CU-49 · PAN-16 | Camila con 60 clientes (decenas, no cientos: §Alcance) | pide la lista y hace scroll hasta el final | p95 de la lista bajo 300 ms y el scroll sin cuadros perdidos | k6 y gfxinfo |
| REN-008 | CU-33 · CU-37 · CU-38 | la base de staging con la semilla `carga` (cerca de un millón de series) | se corre `EXPLAIN` de historial, progreso por ejercicio y PRs | usan los índices de §Rendimiento: sesiones por (`client_id`, `cerrada_at`), series por (`session_id`), récords por (`client_id`, `exercise_id`); el de series por (`client_id`, `exercise_id`, `created_at`) depende de H-09 | SQL |
| REN-009 | CU-56 | 500 alumnos con 26 semanas de historia | corre el worker nocturno | termina en menos de 5 minutos (objetivo propuesto por este plan, no del PRD) | WRK con volumen |

---

## ACC · Accesibilidad, compatibilidad e idioma

| Id | Valida | Dado | Cuando | Entonces | Herramienta |
| --- | --- | --- | --- | --- | --- |
| ACC-001 | CU-26 · CU-28 · PAN-05 · PAN-11 | las 20 pantallas montadas | se recorren todos los elementos tocables | ninguno mide menos de 48 dp de alto y de ancho (§Accesibilidad) | Jest con ayudante de medidas y Accessibility Scanner |
| ACC-002 | CU-28 · PAN-11 | el registro de sesión | se miden los botones de kilos y repeticiones | miden 56 dp o más | Jest |
| ACC-003 | CU-07 | los tokens del paquete `tokens` | se calcula el contraste de cada par texto y fondo del modo claro | el texto sobre fondo claro es #131A17 o #2f7f68; #45B392 solo aparece como relleno con texto blanco en negrita de 15 pt o más; el lint marca `text-primary` sobre fondos claros | Vitest en `packages/tokens` y ESLint |
| ACC-004 | CU-07 | los tokens del modo gimnasio | se calcula el contraste de cada par | todos los textos llegan a 4,5:1 o más; el texto grande a 3:1 o más | Vitest |
| ACC-005 | CU-26 · CU-28 · CU-30 | el emulador con `font_scale` en 1,3 | Maestro saca capturas de las 20 pantallas | ningún texto queda cortado ni tapado (revisión de capturas y búsqueda de `numberOfLines` en textos que no deben cortarse) | Maestro |
| ACC-006 | CU-28 · CU-29 · PAN-11 · PAN-12 | el registro y el descanso | se buscan los controles por etiqueta | existen «subir 2,5 kilos», «bajar 2,5 kilos», «subir 1 repetición», «bajar 1 repetición», «marcar serie 3», «fallé la serie», «sumar 30 segundos» y «saltar descanso» | Jest con `getByLabelText` |
| ACC-007 | CU-26 | las 20 pantallas | se recorre el árbol | todo control tocable tiene `accessibilityLabel` y `accessibilityRole` | Jest |
| ACC-008 | CU-26 · CU-28 | un emulador con Android 10 (API 29) y 360 dp de ancho | corre el humo de Maestro | pasa entero y nada se sale de la pantalla (§Compatibilidad) | Maestro |
| ACC-009 | CU-07 | todos los textos de la app | se revisan con una prueba | no hay «usted», «vosotros» ni emojis; las cifras se muestran con coma decimal y kilos por defecto (§Compatibilidad) | Jest |

---

## MAN · Prueba manual con usuarios reales (prueba cerrada de Google Play)

Corre en la fase 5, con al menos 20 probadores durante 14 días seguidos (§Publicación): el equipo, los 2 entrenadores y los 6 alumnos del piloto, y quien se sume. Cada probador marca cada ítem con «sí», «no» o «no aplica» y anota el teléfono y la versión de Android. Lo que sale «no» se convierte en issue con la etiqueta `piloto`.

| Id | Valida | Qué haces | Qué miras |
| --- | --- | --- | --- |
| MAN-001 | CU-02 | Instalas desde el enlace de la prueba cerrada en tu teléfono (Android 10 o más) | Abre en Ingreso, en español, sin errores |
| MAN-002 | CU-01 | Creas tu cuenta con tu correo real | Llega la bienvenida y no cae en spam |
| MAN-003 | CU-05 · CU-06 | Recuperas la contraseña con Gmail u Outlook | El correo llega en menos de 2 minutos y el enlace abre la app |
| MAN-004 | CU-09 · CU-57 | Respondes la encuesta y lees la política desde el enlace | Las 10 preguntas se entienden; la casilla está sin marcar al llegar |
| MAN-005 | CU-11 · CU-12 | El entrenador te invita por WhatsApp con el botón de compartir | El código llega y te vinculas a la primera |
| MAN-006 | CU-19 · CU-21 · CU-22 | El entrenador te arma una rutina real de 4 días | Te aparece en Hoy el día que corresponde |
| MAN-007 | CU-27 · CU-28 · CU-30 · CU-32 | Entrenas una semana en tu gimnasio, si puedes en un lugar sin señal | Ninguna sesión se pierde ni se duplica en la ficha del entrenador |
| MAN-008 | CU-29 | Descansas con el teléfono bloqueado en el bolsillo | Vibra y suena a tiempo |
| MAN-009 | CU-28 | Registras con una mano, con las manos transpiradas | Subes y bajas kilos y repeticiones sin tocar el botón equivocado |
| MAN-010 | CU-07 | Activas el modo gimnasio bajo la luz del gimnasio | Lees las cifras a 50 cm sin acercarte |
| MAN-011 | CU-34 · CU-35 · CU-36 | Anotas un dolor; el entrenador te responde con un consejo | Lo ves en Hoy y en el ejercicio |
| MAN-012 | CU-41 · CU-42 | Después de 3 sesiones del mismo ejercicio, el entrenador revisa Ajustar cargas | El entrenador anota cuántas sugerencias cambió y por qué (§Riesgos: confianza en la sugerencia) |
| MAN-013 | CU-47 · CU-52 | El entrenador usa Alertas durante los 14 días | Anota si las alertas le sirven o le molestan, y cuántos push le llegan por día (nunca más de 2) |
| MAN-014 | CU-39 · CU-40 | Registras peso, medidas y una foto, y comparas dos fechas | Nadie más que tu entrenador las ve |
| MAN-015 | CU-53 | Exportas tus datos y abres el ZIP en Excel y en Google Sheets | Tildes y decimales se leen bien (P-48) |
| MAN-016 | CU-54 · CU-55 | Borras una cuenta de prueba | Llega el correo con la fecha; a los 30 días ya no hay rastro (lo revisa el equipo) |
| MAN-017 | CU-28 · CU-29 | Completas una sesión solo con TalkBack | Cada control dice qué hace |
| MAN-018 | CU-26 · CU-28 | Usas la fuente del sistema al 130 % en un teléfono de 360 dp | Nada se corta |
| MAN-019 | CU-32 | El equipo cruza Sentry con la base al final del piloto | El 80 % o más de las sesiones del piloto sincronizó sin error (§Plan, fase 5) |
| MAN-020 | CU-57 | El equipo revisa el formulario de seguridad de datos de Play | Dice lo mismo que la política y lo que la app hace (§Privacidad) |
| MAN-021 | CU-02 | El equipo revisa la consola de Play | Hay 20 probadores activos durante 14 días seguidos (§Publicación) |
| MAN-022 | CU-32 | Actualizas la app con sesiones en cola | La cola sigue ahí y se envía |
| MAN-023 | CU-26 · CU-28 | Usas la app en un teléfono de gama media con 4G | Hoy abre en menos de 1 s y marcar una serie no se traba |
| MAN-024 | CU-59 | El equipo revisa en el issue mensual de `mensual.yml` las restauraciones de prueba que `respaldo-vps.yml` hizo cada lunes en el VPS (INF-19) | Cada una queda anotada con fecha del respaldo, duración y conteo de filas, y ninguna falló (§Disponibilidad) |
| MAN-025 | CU-59 | El equipo revisa en la consola de Play la versión que subió `version.yml` | El AAB está firmado, su `versionCode` es mayor que el anterior, aparece en prueba interna, se promueve a prueba cerrada y se instala desde el enlace en un teléfono que no es del equipo (§Publicación) |
| MAN-026 | CU-59 | El equipo busca «GymTrack» en Play Store y revisa el dominio, antes de la semana 12 | Queda anotado si el nombre y el dominio están libres o cuál se usa en su lugar (§Riesgos: nombre en conflicto) |
| MAN-027 | CU-59 | El equipo revisa el VPS de Vultr y Firebase en staging y producción: mata el contenedor de la API de staging (`docker kill`), mira el último ciclo del worker, los respaldos y los buckets | La API vuelve sola (`restart: unless-stopped`) y `/health` responde 200 en menos de 2 minutos; el worker corrió anoche; hay un respaldo diario cifrado por cada uno de los últimos 14 días en el bucket de respaldos; los respaldos automáticos de la instancia de Vultr están activos; el bucket de medios tiene el versionado activado; staging no tiene ningún correo fuera de `gymtrack.test` (§Disponibilidad) |
| MAN-028 | CU-02 | En la semana 11 el equipo cuenta los probadores inscritos en la prueba cerrada | Hay 20 o más correos inscritos antes de empezar los 14 días (§Riesgos: prueba cerrada sin probadores) |
| MAN-029 | CU-59 | El equipo fuerza un error en la app y otro en la API de staging | Los dos llegan a Sentry en el entorno `staging`, con la versión y sin datos personales (§Arquitectura) |

---

## INF · Infraestructura (VPS en Vultr y Firebase)

Los 39 escenarios de infraestructura (INF-01 a INF-39) están en [`escenarios-infra.md`](escenarios-infra.md), con el mismo formato que este archivo: despliegue y vuelta atrás, migraciones, HTTPS, puertos cerrados por el firewall de Vultr y `ufw`, Postgres sin acceso desde afuera, respaldos y restauración, límites de memoria, push real por FCM, URLs firmadas que vencen, reglas de Storage, App Distribution y Hosting. El diseño que prueban está en [`infraestructura-vps-firebase.md`](infraestructura-vps-firebase.md). No suman al total de este archivo.

---

## Diferencias entre el PRD y el código actual

Lo que hoy hace el repo y choca con el PRD. Las pruebas de arriba ya están escritas contra el PRD, así que estas fallan hasta que se corrija una de las dos partes.

| Id | Diferencia | Pruebas afectadas |
| --- | --- | --- |
| H-01 | La app genera UUID v4 (`apps/mobile/src/lib/ids.ts`); el PRD pide UUID v7 generados en el celular (§Datos; §API). | SYNC-001, INT-090 |
| H-02 | La biblioteca base usa ids `base-…` y tiene 67 ejercicios (`exercises.seed.ts`); el PRD pide UUID v7 en todas las tablas y una semilla de 60 (§Plan). | INT-050, INT-051 (P-29) |
| H-03 | El motor calcula Porcentual, Por RM, Descendentes y Cluster como doble progresión, con aviso en el texto (`progression.ts`). | UNI-046 a UNI-057 |
| H-04 | Los tipos de récord del código son `e1rm`, `reps` y `tiempo`; `personal_records.tipo` del PRD es `peso_max`, `e1rm`, `reps_con_peso` y `volumen_sesion`. | UNI-067, INT-097, INT-119 |
| H-05 | La app guarda todo en AsyncStorage; el PRD pide expo-sqlite para la cola y expo-secure-store para los tokens (§Arquitectura; §Seguridad). | APP-005, SYNC-002, SEG-023 |
| H-06 | La app todavía no tiene Jest y el lint no cubre `packages/shared` (GUIA-DEL-EQUIPO.md). | Todo APP; ver `ci.md` |
| H-07 | El CI actual (`.github/workflows/ci.yml`) no tiene base de datos, contrato, Maestro ni auditoría. | Ver `ci.md` |
| H-08 | §Datos dice «Veinte tablas» y lista 22 (`push_tokens`, `refresh_tokens` y `password_resets` van en una sola fila). | INT-143 |
| H-09 | §Rendimiento pide un índice de series por (`client_id`, `exercise_id`, `created_at`), pero `workout_sets` no tiene `client_id` ni `created_at` en §Datos. | REN-008 |
| H-10 | §API dice 44 endpoints; contando método y ruta salen 61 (inventario en `casos-de-uso.md`). | INT-141 |
| H-11 | Los tipos del código van en camelCase (`pesoKg`) y la API del PRD en snake_case (`peso_kg`). | CON-009 (P-49) |
| H-12 | El estado `descartada` existe en `types.ts` pero el store no lo usa. | INT-103, APP-017 |
| H-13 | `calcularCierre` deja las kcal en null sin peso corporal. Con la encuesta obligatoria (la pregunta 8 crea el primer peso) no debería pasar, pero el PRD no dice qué mostrar si pasa. | APP-031, INT-096 |

---

## Supuestos y preguntas abiertas

Cada pregunta trae el supuesto que usan las pruebas mientras tanto. Cuando el equipo la cierre, se cambia el supuesto y las pruebas que lo nombran. Las más importantes van primero en el resumen de `README.md`.

| Id | Pregunta | Supuesto que usan las pruebas |
| --- | --- | --- |
| P-01 | ¿Qué responde la API cuando tu rol no permite una acción sobre algo que sí ves (Martina editando la rutina de Camila) o cuando llamas a un endpoint de otro rol? La tabla de §API no tiene 403. | 403 `FORBIDDEN`, sin datos y sin cambios. Lo que no existe o no es tuyo sigue en 404, como dice §API. |
| P-02 | ¿Con qué ruta lee el entrenador los datos de su cliente en los endpoints `/me/...` que dicen «Alumno y su entrenador»? | El mismo endpoint con `?client_id=<id>`; sin vínculo activo, 404. |
| P-03 | La pantalla 10 usa `GET /exercises/:id`, que no está en la tabla de §API; la subida de media «confirma con PUT» sin ruta. | `GET /v1/exercises/:id` y `PUT /v1/exercises/:id/media/:media_id`. |
| P-04 | La pantalla 19 nombra `PATCH /clients/:id/suggestions`; §API define `PATCH /suggestions/:id`. | La de §API. |
| P-05 | ¿El alumno vinculado ve consejos después de una baja? La matriz dice «recibe aviso y registra motivos»; el criterio 4 dice que «registra sus motivos y ve consejos». | Sí, como el criterio 4 y como `POST /me/drop-reports`. |
| P-06 | ¿El alumno vinculado puede activar una rutina propia si con eso archiva la que le asignó su entrenador? | Sí, con confirmación (maqueta «Activar otra»); la ficha del entrenador lo muestra. |
| P-07 | ¿Quién ve y edita los ejercicios propios? §Datos dice «su dueño y, si está vinculado, su entrenador»; §API dice «solo los propios». ¿El alumno ve los ejercicios propios del entrenador que aparecen en su rutina? | El dueño edita; el entrenador vinculado ve los del alumno sin editarlos; el alumno ve los del entrenador que están en rutinas asignadas a él. |
| P-08 | ¿El alumno vinculado puede escribir una observación sobre una rutina? ¿Alguien que no sea entrenador puede usar el tipo consejo? | El alumno vinculado escribe en ejercicio, sesión y serie; el alumno solo también en sus rutinas; el tipo consejo es solo del entrenador (422 para los demás). |
| P-09 | ¿Cómo se detecta estancamiento o baja en ejercicios sin 1RM estimado (más de 12 reps, peso corporal, tiempo)? | Con la marca comparable de `cierre.ts`: 1RM sin tope, repeticiones o segundos. |
| P-10 | Porcentual necesita el porcentaje por semana y Por RM el «x» de xRM, y ninguno tiene campo en §Datos. ¿Y qué hace Porcentual sin 1RM vigente? | `routine_exercises.porcentajes_semana` (lista) y `routine_exercises.objetivo_rm` (entero); sin 1RM vigente se usa el peso inicial y, si no hay, no se sugiere. |
| P-11 | Por RM dice «el peso cuyo 1RM estimado coincide con el mejor set actual» y Descendentes «bajan 20 % cada una». ¿20 % de qué? | Por RM: peso = 1RM del mejor set / (1 + x/30), redondeado al incremento. Descendentes: cada una es el 80 % de la anterior, redondeada al incremento. |
| P-12 | En la encuesta, ¿`version` es la versión del cuestionario o el número de respuesta? ¿Se repite cada cierto tiempo (pregunta abierta del PRD)? | `version` es la del cuestionario (1); cada envío crea una fila; la vigente es la más reciente; no se pide repetirla en la versión 1. |
| P-13 | ¿Edad mínima? La maqueta exige 14 años; §Resumen estima usuarios de 18 a 40. Con la Ley 21.719, los menores necesitan reglas propias. | 14 años en la app y en la API (422 bajo eso), hasta que se confirme. |
| P-14 | ¿El código es uno por invitación (fila de `trainer_clients`) o uno vigente por entrenador? La maqueta dice que pedir uno nuevo invalida el anterior. ¿Mayúsculas? ¿Qué código HTTP da uno vencido? | Uno vigente por entrenador: pedir otro invalida el anterior sin usar. Alfabeto sin 0, O, 1 ni I. Sin distinguir mayúsculas. Inexistente o vencido, 404 con el mismo cuerpo; usado, 409. |
| P-15 | ¿Qué pasa si un alumno ya vinculado ingresa el código de otro entrenador? | 409 `ALREADY_LINKED`; tiene que desvincularse primero. |
| P-16 | ¿Qué pasa con la rutina activa que escribió el entrenador cuando se termina el vínculo? §Privacidad dice que el entrenador «conserva solo las rutinas que él escribió». | El entrenador la conserva en su biblioteca; para el alumno queda archivada (puede duplicarla) y su historial se queda con él. |
| P-17 | `POST /sessions` dice «409 si ya hay una en curso de otro día». ¿Y si es del mismo día de rutina? | Una sola en curso por alumno (§Datos): cualquier id distinto da 409; el mismo id da 200 con la existente. |
| P-18 | ¿Cómo llega el aviso de conflicto y cómo se distingue un reintento de un conflicto? «Gana la primera copia cerrada»: ¿la primera en cerrarse o en llegar? | `POST /sync/sessions` responde un resultado por sesión: `aceptada`, `ya_estaba` (mismo id y mismo `device_id`) o `descartada_conflicto` (mismo id ya cerrado desde otro `device_id` o con series distintas). Gana la primera que llega cerrada al servidor. |
| P-19 | ¿Cuándo se «usa» una sugerencia, que desde ahí ya no se puede sobrescribir? | Al iniciar la sesión que la precarga (`POST /sessions`); después, `PATCH` da 409 `SUGGESTION_USED`. |
| P-20 | El tope es de 2 push al día, pero el dolor fuerte «avisa al entrenador al instante». ¿Qué gana? | El dolor de intensidad 7 o más siempre se envía y cuenta para el tope; lo demás que pase el tope no sale como push pero queda en Alertas. |
| P-21 | ¿Qué es la «hora habitual» del recordatorio? ¿Llega si ya entrenó hoy? | La que el alumno fija en Perfil; si no fijó, la mediana de la hora de inicio de sus últimas 10 sesiones; sin sesiones, no hay recordatorio. Si ya entrenó hoy, no llega. |
| P-22 | ¿Cómo se calculan la adherencia, la racha, «entrena hoy», «sin rutina» y el día de descanso? | Adherencia: sesiones cerradas de lunes a domingo en la zona del alumno dividido por los días de la rutina activa, con tope 100 %. Racha: como `rachaDias` de `selectors.ts`. «Entrena hoy»: el día que toca tiene `dia_semana` igual a hoy, o la rutina no tiene días fijos. Día de descanso: la rutina tiene días fijos y hoy no es uno. |
| P-23 | La alerta «sin sesiones» de un alumno solo, ¿a quién avisa? | Se crea sin `trainer_id` y solo dispara el recordatorio al alumno. |
| P-24 | Al borrar una cuenta: ¿se puede arrepentir en los 30 días? ¿Qué pasa con la sesión en curso, el vínculo, las rutinas que escribió un entrenador y el correo? | Ingresar da 401 `ACCOUNT_DELETED`; no hay arrepentimiento en la versión 1; la sesión en curso se descarta; el vínculo termina al marcar; los clientes de un entrenador borrado quedan solos con su historial y las rutinas que él escribió se archivan para ellos; el correo se libera después de la purga. |
| P-25 | ¿Dónde se guarda el consentimiento expreso? No hay campo en §Datos. | `client_profiles.consentimiento_salud_at`, `consentimiento_fotos_at` y la versión de la política aceptada. |
| P-26 | ¿Qué exporta el entrenador? §API lista sesiones, series, medidas, encuesta y observaciones; la maqueta del entrenador dice rutinas, ejercicios propios y observaciones. | Lo de la maqueta para el entrenador; lo de §API para el alumno. |
| P-27 | ¿Hay límite de intentos para el código de invitación? 6 caracteres se pueden adivinar. | 10 intentos fallidos por hora por alumno, además de los 60 por minuto generales. |
| P-28 | ¿Qué fechas del celular acepta la API? | `cerrada_at` hasta 5 minutos en el futuro respecto del servidor y después de `iniciada_at`; fuera de eso, 422. |
| P-29 | ¿Biblioteca base sembrada o desde cero (pregunta abierta del PRD)? ¿Cuántos ejercicios (60 en §Plan, 67 en el repo, 128 en el diseño)? ¿Con qué id? | Sembrada; la semilla conserva los ids actuales como `slug` único y les da un UUID v7 fijo; las pruebas cuentan contra la semilla, no contra un número fijo. |
| P-30 | ¿Cómo se calcula la tendencia de peso y medidas («desde el tercer registro, sin modelo predictivo») y el «cambio a 30 días»? | Desde el tercer registro se muestra el cambio a 30 días: último registro menos el registro más cercano a 30 días antes. |
| P-31 | ¿En qué orden procesa el servidor sesiones que llegan desordenadas (cola atrasada o dos teléfonos)? | En orden de `cerrada_at`; si llega una más antigua que la última procesada, se recalculan PRs y sugerencias desde ella. |
| P-32 | En libras, ¿cuánto suben los botones y cómo se redondea? | Paso de 5 lb; se guarda en kilos con 2 decimales; la vista redondea a 0,5 lb. |
| P-33 | ¿El resumen semanal por correo entra en la versión 1? | No; WRK-015 se activa solo si entra. |
| P-34 | ¿Dónde viven los umbrales configurables (3 sesiones, 10 %, 7 días, intensidad 7)? | Variables de entorno de la API y el worker, con esos valores por defecto. |
| P-35 | Borrar un ejercicio propio que está en una rutina activa, ¿da 409 o 422? | 409 `EXERCISE_IN_ACTIVE_ROUTINE` (es un estado, no una regla de la entrada). |
| P-36 | Correo ya registrado al crear cuenta: ¿qué código? La maqueta muestra el mensaje, lo que revela que la cuenta existe. | 409 `EMAIL_TAKEN`. |
| P-37 | ¿Se borran los datos EXIF y la ubicación de las fotos? | Sí: la app los quita al comprimir a 1600 px y la API rechaza imágenes con GPS. |
| P-38 | El criterio 2 dice «después de 3 sesiones del mismo ejercicio»; el flujo 10 dice que la sugerencia se calcula al cerrar cada sesión. | Hay sugerencia desde la primera sesión cerrada; el criterio 2 se prueba en la tercera. |
| P-39 | ¿Cómo se hace pasar «una semana completa» en Maestro? | Build `e2e` con reloj de prueba controlado desde el job (ver `datos-de-prueba.md`); se confirma en la fase 2. |
| P-40 | ¿Cuáles son los códigos de error? §API solo muestra `SESSION_CLOSED`. ¿Crear responde 201? | Los nombres de este plan son provisionales; las pruebas importan las constantes del paquete compartido. Crear responde 201; repetir con el mismo id, 200. |
| P-41 | ¿El alumno recibe push cuando su entrenador le deja un consejo? §Notificaciones no lo lista; la maqueta de Perfil sí. | Sí, cuenta para el tope de 2 al día, y se puede apagar en Perfil. |
| P-42 | ¿El 429 dice cuánto esperar? La maqueta de Ingreso muestra una cuenta regresiva. | Trae `Retry-After` en segundos y la app cuenta desde ese valor. |
| P-43 | Asignar una plantilla a dos clientes, ¿la comparte o la copia? | Crea una copia por cliente. |
| P-44 | ¿El entrenador puede editar una rutina que el alumno se hizo solo, o solo comentarla (pregunta abierta del PRD)? | Solo comentarla (observación o consejo sobre la rutina); editar da 403. |
| P-45 | ¿Los programas recomendados del diseño entran en la versión 1 (pregunta abierta del PRD)? | No; no hay pruebas para ellos. |
| P-46 | ¿Las referencias en video son archivos propios o enlaces a YouTube (pregunta abierta del PRD)? | Archivos propios de hasta 50 MB con URL firmada; los de la biblioteca base son enlaces. |
| P-47 | La baja compara «frente al promedio de las 4 semanas anteriores». ¿Contra todas las sesiones o contra el mismo día de rutina? Una sesión de pierna y una de brazos no se parecen. ¿Qué pasa con menos de 4 semanas? | Contra el mismo día de rutina, en los 28 días anteriores al día de la sesión, sin contarla; con menos de 2 semanas de historia no se evalúa. |
| P-48 | ¿Cómo va el CSV? Excel en Chile espera punto y coma y coma decimal. | UTF-8 con BOM, separador coma, punto decimal y fechas ISO 8601 con zona (portable); MAN-015 confirma si se lee bien. |
| P-49 | ¿La API va en snake_case (como el PRD) y `types.ts` en camelCase? ¿Quién convierte? | La API en snake_case; el paquete compartido tiene el único mapeo, probado por CON-009. |
| P-50 | ¿Desde qué pantalla sobrescribe su sugerencia el alumno solo? Ajustar cargas es del entrenador. | La misma Ajustar cargas, abierta desde el detalle de su rutina. |
| P-51 | Al cerrar sesión, ¿se borran los datos guardados en el teléfono? | Se borran la caché y los tokens; la cola sin enviar se conserva solo si el usuario eligió esperar a que salga. |
| P-52 | SEG-017 pide purgar una cuenta en staging en cada versión, pero staging usa el reloj real y no tiene rutas `/test/*`. ¿Cómo se adelanta la purga sin esperar 30 días? | El worker acepta `purga --ahora=<ISO>` solo cuando `NODE_ENV` no es `production` (SEG-032); `version.yml` lo pide en staging por SSH (la puerta SSH del VPS solo acepta `purgar staging <fecha>`) sobre la cuenta `humo.purga@gymtrack.test`. |
| P-53 | `POST /me/photos` entrega la URL para subir, pero el PRD no dice cuándo existe la fila ni cómo valida el servidor el tamaño o el EXIF (la media de ejercicios sí «confirma con PUT»). | La fila se crea al pedir la URL y la foto aparece en `GET /me/photos` solo si el objeto existe en el bucket. El EXIF lo quita la app (APP-048); la revisión del lado del servidor de P-37 queda sin prueba hasta que haya una ruta de confirmación. |
| P-54 | ¿Cuándo aparece el «recordatorio de peso» de Rutina completada? | Cuando el último peso corporal tiene 7 días o más. |
| P-55 | `users.email_verified_at` está en §Datos, pero ningún flujo ni endpoint verifica el correo. | En la versión 1 no se verifica: el campo queda nulo y nada lo exige. Si el equipo lo agrega, necesita su caso de uso y sus pruebas. |
| P-56 | ¿Qué pasa si el alumno archiva su rutina activa? | Se permite: queda sin rutina activa y Hoy muestra el estado vacío (INT-157). |
| P-57 | Con Cloud Storage para Firebase en vez de un bucket S3, ¿con qué se emula el almacenamiento en CI y en local? | El emulador de Storage de Firebase para subir, leer y borrar con el Admin SDK, y `@firebase/rules-unit-testing` para las reglas. Lo que un emulador no reproduce (que una firma vencida dé 403) se prueba contra el bucket de staging (INF-23, INF-24). Mientras la API no use el Admin SDK, las pruebas siguen con MinIO. |
| P-58 | Con el bucket de medios versionado, ¿cuánto puede quedar una foto después de la purga de los 30 días? | Hasta 7 días como versión no actual, sin eliminación temporal (INF-26). Si §Privacidad exige borrarla al instante, se apaga el versionado del bucket de medios. |
| P-59 | ¿En qué región van los buckets de medios y de respaldos? | `southamerica-west1` (Santiago), por latencia y por la Ley 21.719, aunque no tenga la cuota sin costo de las regiones de EE. UU. |
| P-60 | ¿En qué ubicación de Vultr va la instancia? | Santiago; si no está disponible para el plan, São Paulo. |

## WEB · App web instalable para iPhone (Firebase Hosting)

Sin cuenta de Apple, el iPhone usa la versión web exportada con Expo (`pnpm --filter mobile export:web`), publicada en el sitio `app` de Firebase Hosting (<https://gymtrack-app-5dd46.web.app>) e instalada desde Safari con «Agregar a pantalla de inicio». Habla con la API del VPS, que solo le da permiso a ese origen (`CORS_ORIGENES`).

| Id | Valida | Dado | Cuando | Entonces | Dónde |
| --- | --- | --- | --- | --- | --- |
| WEB-001 | Sesión en web | la app web (en Safari o instalada) | se ingresa, se cierra y se vuelve a abrir | los tokens y el usuario quedan en `localStorage` con las mismas claves que en el teléfono (`gymtrack.tokens`, `gymtrack.usuario`), se leen validados con el esquema (un valor roto cuenta como sin sesión) y Cerrar sesión los borra sin tocar otras claves | APP (`apps/mobile/src/lib/sesion/__tests__/almacenWeb.test.ts`) |
| WEB-002 | Sesión en web | un navegador sin `localStorage` o que lo bloquea (lleno, modo privado) | se ingresa y se cierra sesión | la sesión vive en memoria mientras dure la pestaña y nada lanza | APP (el mismo archivo) |
| WEB-003 | CORS | la API con `CORS_ORIGENES=https://gymtrack-app-5dd46.web.app` | piden el preflight y un `POST /v1/auth/login` desde ese origen; desde `http://localhost:8081`, `gymtrack-app-5dd46.firebaseapp.com`, la misma app por `http`, un dominio que termina o empieza parecido, las maquetas y `null`; y la app nativa sin `Origin` | solo el primero recibe `Access-Control-Allow-Origin` (también en el 400, con el sobre legible y `Retry-After` expuesto); todos llevan `Vary: Origin`; la app nativa no recibe cabeceras de CORS | API sin base (`apps/api/test/cors.test.ts`) |
| WEB-004 | CORS | `CORS_ORIGENES` con `*`, `https://*.web.app`, sin esquema, con ruta, con consulta, con usuario y clave, `null`, otro esquema, o `http` en producción | arranca la API | no arranca y el error nombra el origen; la barra final y las mayúsculas se normalizan; `http` se acepta solo fuera de producción | API sin base (el mismo archivo) |
| WEB-005 | Instalable | `apps/mobile/public/` y `app.json` | se revisan | `manifest.json` con GymTrack, `#0F1113` de fondo y tema, `standalone`, vertical e íconos de 192, 512 (también `maskable`) y 180 que existen con ese tamaño; `index.html` con el manifest, las etiquetas de Apple y `viewport-fit=cover`; salida `single` en español | APP (`apps/mobile/src/lib/__tests__/pwa.test.ts`) |
| WEB-006 | Publicación | `firebase.json` y `.firebaserc` | se revisan | dos sitios con target: `maquetas` sirve `docs/pantallas` sin los `.md` y `app` sirve la carpeta de `export:web` con toda ruta reescrita a `/index.html`; los targets van a `gymtrack-5dd46` y `gymtrack-app-5dd46` | APP (el mismo archivo) |
| WEB-007 | Web sin errores | `export:web` servido en local con reescritura a `index.html` y la API local | se abre `/`, se ingresa, se recarga en `/encuesta`, se recorren las 5 pestañas del alumno y se cierra sesión | Ingreso carga sin errores en la consola; la sesión sobrevive a la recarga; cada pestaña se pinta; Cerrar sesión vuelve a Ingreso y borra la sesión | Manual en el navegador (corrido el 18-11; ver pendientes de la Encuesta) |
| WEB-008 | iPhone | la app publicada y la API del VPS con `CORS_ORIGENES` | se abre en Safari, «Agregar a pantalla de inicio», se ingresa, se cierra la app desde el selector y se vuelve a abrir | abre a pantalla completa con el ícono y el nombre GymTrack, barra de estado negra, fondo grafito sin destello blanco y sigue con la sesión | Manual en un iPhone antes del 20-11 |
| WEB-009 | Service worker de los avisos | `apps/mobile/public/sw-avisos.js` y `firebase.json` | se revisan | el service worker atiende `push` y `notificationclick`, sale en la raíz del sitio con la exportación y se sirve sin caché y con `Service-Worker-Allowed: /` | APP (`apps/mobile/src/lib/__tests__/pwa.test.ts`) |

## GOO · Ingreso con Google

`POST /v1/auth/google` recibe el id_token que Google le da a la app (expo-auth-session: en Android con código y PKCE, en web con la página entera y vuelta a `/ingreso`), lo verifica con google-auth-library contra `GOOGLE_CLIENT_IDS` (web y Android) y exige el correo verificado. La cuenta queda atada a su cuenta de Google por `users.google_sub`: se busca primero por el `sub` y después por el correo. Si el correo tiene cuenta, entra, guarda el `sub` y la marca con `email_verified_at`; si no, responde `falta_rol` y un segundo envío con rol, nombre y apellido crea la cuenta sin contraseña conocida (se crea con «Olvidé mi contraseña»). Las pruebas de la API nunca llaman a Google: firman los tokens con una llave RSA de la corrida y el verificador real recibe esa llave pública. Las de la app prueban la lógica en Node; el botón y la vuelta en web se miraron en el export web con una API falsa, no en un teléfono.

| Id | Valida | Dado | Cuando | Entonces | Dónde |
| --- | --- | --- | --- | --- | --- |
| GOO-001 | Configuración | `GOOGLE_CLIENT_IDS` vacío, con espacios y repetidos, o con un valor que no es un client ID | se lee | vacío apaga el ingreso con Google; los demás se limpian sin repetidos; uno con otra forma no deja arrancar la API | `apps/api/test/google.test.ts` |
| GOO-002 | Verificador | un token válido de web y otro de Android, `email_verified` como booleano o texto | se verifica | entrega `sub`, el correo en minúsculas, si está verificado, nombre y apellido | ídem |
| GOO-003 | Verificador | un token de otro client ID, vencido, de otro emisor, firmado con otra llave, con un `kid` desconocido, basura o sin correo | se verifica | `cliente_ajeno`, `token_invalido` o `sin_correo` | ídem |
| GOO-004 | Verificador | los certificados de Google no se pueden bajar; un token rechazado | se verifica | `servicio_caido`; el mensaje del error nunca lleva el token | ídem |
| GOO-005 | Entrada | `id_token` solo, con rol, nombre y apellido, rol `admin`, rol sin nombre, nombre de espacios, apellido de 81, token sin forma de JWT o de 5.000 caracteres, un campo de más | se valida con `esquemaIngresoGoogle` | pasan los dos primeros; los demás fallan con el campo | ídem |
| GOO-006 | Cuenta existente | Martina registrada con contraseña | entra con un token de Google de su correo | 200 `sesion`, `cuenta_nueva: false`, access de 900 s y refresh de 30 días; `email_verified_at` lleno; su contraseña sigue sirviendo | ídem (con base) |
| GOO-007 | Cuenta nueva | un correo sin cuenta | manda solo el token | 200 `falta_rol` con correo, nombre y apellido de Google; no se crea ninguna fila | ídem |
| GOO-008 | Cuenta nueva | el mismo correo | manda token, rol `trainer`, nombre y apellido | 200 `sesion`, `cuenta_nueva: true`, hash Argon2id, `email_verified_at`, correo de bienvenida; el mismo token entra a esa cuenta; el ingreso con correo da 401 hasta que crea la contraseña con «Olvidé mi contraseña» | ídem |
| GOO-009 | Rol inválido | un correo sin cuenta | manda rol `admin`, rol sin nombre, apellido vacío, un campo de más o nada | 400 `VALIDATION_ERROR` con el campo; no se crea nada | ídem |
| GOO-010 | Correo sin verificar | un token con `email_verified: false`, de un correo con cuenta y de uno sin cuenta | lo manda (con rol en el segundo) | 422 `BUSINESS_RULE` con `regla: google_correo_sin_verificar`; ni entra ni crea | ídem |
| GOO-011 | Client ID ajeno | un token pedido por otra app, uno firmado con otra llave y uno vencido | los manda | 401 `INVALID_CREDENTIALS` con `motivo` (`cliente_ajeno`, `token_invalido`); no se emite sesión; el log no tiene el correo | ídem |
| GOO-012 | Cuenta por borrarse | Gonzalo marcado para borrado | entra con Google | 401 `ACCOUNT_DELETED` | ídem |
| GOO-013 | Límite por IP | una IP | manda 6 tokens en un minuto | el sexto da 429 con Retry-After; otra IP sigue; al minuto vuelve a responder | ídem |
| GOO-014 | Límite de registros | 5 cuentas creadas desde la misma IP en la hora | crea una con Google desde esa IP; y entra a una existente | 429 al crear (no se crea); entrar a la existente da 200 | ídem |
| GOO-015 | Doble toque | dos envíos con rol a la vez | llegan juntos | una sola cuenta; los dos entran a ella | ídem |
| GOO-016 | Sin configurar | `GOOGLE_CLIENT_IDS` vacío; o Google sin responder | se manda un token | 503 `SERVICE_UNAVAILABLE` con `motivo` `google_no_configurado` o `google_sin_respuesta` | ídem |
| GOO-017 | Cuenta atada a Google | Martina entra con Google (`sub` 111) | entra con la misma cuenta de Google y otro correo; y con otra cuenta de Google (`sub` 222) que dice tener su correo | la primera entra a la cuenta de Martina (por el `sub`); la segunda da 401 `INVALID_CREDENTIALS` con `motivo: otra_cuenta_google` y no se vincula; `google_sub` queda en 111 | ídem (con base) |
| GOO-020 | App: plataformas | `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` y `_ANDROID` con espacios, vacíos o con otra forma | se leen | web y Android usan el suyo; iPhone nativo, vacíos y mal formados no muestran el botón (tampoco Expo Go) | `apps/mobile/src/features/acceso/__tests__/google.test.ts` |
| GOO-021 | App: Android | lo que devuelve la pestaña de Google: código, cerrar, `access_denied`, otro error, éxito sin código, otra ventana abierta | se lee | código para canjear; cerrar y no aceptar son «cancelado»; el resto, «Google no respondió bien» o nada | ídem |
| GOO-022 | App: vuelta en web | `/ingreso#state=...&id_token=...` | se lee contra lo guardado | entra solo con el mismo `state` y el mismo `nonce` dentro del token; sin lo guardado o con otro, «No pudimos terminar el ingreso»; `access_denied` es «cancelado» | ídem |
| GOO-023 | App: mensajes | sin red, 422 sin verificar, 401 token o client ID ajeno, 429 con y sin Retry-After, cuenta por borrarse, 503, 400 de un campo, 500 | se traducen | cada uno con su mensaje (cancelado y sin red en gris); la espera sale del Retry-After o 60 s; ningún texto con guion largo | ídem |
| GOO-024 | App: «Completa tu cuenta» | el perfil de Google y el rol marcado | se arma y se valida el formulario | parte con nombre, apellido y rol; sin rol, nombre vacío o apellido de 81 dan los textos de Crear cuenta | ídem |
| GOO-025 | App: contrato | el gestor de sesión falso | se manda el token y el segundo envío | `POST /v1/auth/google` público, cuerpo recortado con el esquema de la API, respuesta leída con el mismo esquema; un rol sin nombre no sale del teléfono | ídem |
| GOO-026 | Manual en Android | el APK de `preview` con los dos client ID y `com.gymtrack.app` como esquema | se toca «Continuar con Google» en Ingreso y en Crear cuenta, se cancela, se prueba sin red y se entra con una cuenta nueva y con una existente | cada estado con su mensaje; la cuenta nueva pasa por «Completa tu cuenta» y queda en su inicio | MAN (pendiente) |
| GOO-027 | Manual en iPhone | la app web instalada desde Safari | se entra con Google | Google abre en la misma ventana, vuelve a `/ingreso` sin el token en la dirección y entra (o pide el rol) | MAN (pendiente) |
| GOO-028 | App: entrar con la sesión de Google | el gestor de sesión con un fetch falso | recibe la sesión de `POST /v1/auth/google` | guarda tokens y usuario igual que ingresar y la siguiente llamada lleva el access nuevo; la app entra al tiro, sin recargar ni reabrir | APP (`apps/mobile/src/lib/sesion/__tests__/gestor.test.ts`) |

## NOT · Avisos al celular y correo por Gmail

Los avisos de `apps/api/src/modulos/notificaciones` (push por Expo para la app Android y por Web Push para la app web del iPhone) y el correo por Gmail con clave de aplicación (`apps/api/src/correo/smtp.ts`). Las pruebas automáticas usan proveedores en memoria: nunca llaman a Expo, a Google, a Apple ni a Gmail. También cubren, con su id de siempre, INT-102, INT-145, INT-147, INT-150, WRK-006, WRK-007, WRK-012, WRK-014, WRK-016, WRK-017, SEG-003, CON-001 y CON-012.

| Id | Valida | Dado | Cuando | Entonces | Dónde |
| --- | --- | --- | --- | --- | --- |
| NOT-001 | Contrato: dispositivos | un token de Expo de Android y suscripciones web de Chrome (FCM), Safari (Apple) y Firefox | se validan con `esquemaDispositivoAvisoEntrada` | pasan, con o sin `expirationTime` | `apps/api/test/notificaciones.test.ts` |
| NOT-002 | Contrato: fondo del endpoint | endpoints `http`, a la IP de metadatos, a localhost, a un dominio parecido a FCM o a un sitio cualquiera | se validan | todos se rechazan: la API solo le pega a servicios de push conocidos | ídem |
| NOT-003 | Contrato: llaves | p256dh que no es una llave P-256 (65 bytes que empiezan en 0x04), auth que no mide 16 bytes, campos de más, token mal formado, plataforma o tipo desconocidos | se validan | se rechazan | ídem |
| NOT-004 | CON-001 del módulo | la API armada sin base | se revisan las rutas de `/v1/notificaciones` | usan los mismos esquemas de `RUTAS_NOTIFICACIONES` y las respuestas de error comunes; ninguna es pública | ídem |
| NOT-005 | Cifrado del destino | un token de Expo | se cifra y se descifra | lo cifrado no deja ver el token; otra clave, un cambio o basura dan null | ídem |
| NOT-006 | Configuración: PUSH_DRIVER | sin la variable en producción, pruebas y local; vacía; con un valor raro | se lee | real, memoria y consola; vacía cuenta como no puesta; el valor raro no deja arrancar | ídem |
| NOT-007 | Configuración: VAPID | las tres llaves; vacías; solo una; cambiadas de lugar; contacto sin mailto o con localhost | se lee | las tres juntas o ninguna; cada error con su motivo | ídem |
| NOT-008 | Configuración: AVISOS_URL_APP | con barra final; http en producción; sin esquema | se lee | se quita la barra; los otros dos no dejan arrancar | ídem |
| NOT-009 | Web Push real sin red | llaves VAPID y una suscripción generadas en la prueba | se arma el pedido con web-push sin mandarlo | lleva el endpoint, `Authorization: vapid` y la urgencia | ídem |
| NOT-010 | Expo: envío | 3 tokens y un fetch falso que responde ok, DeviceNotRegistered y MessageRateExceeded | se manda | va a `exp.host/--/api/v2/push/send` con el canal `avisos`, el ttl y el token de acceso; resultados enviado, inválido y fallido | ídem |
| NOT-011 | Expo: reintento y lotes | un 503, un 400, un tope de tiempo y 150 tokens | se manda | el 503 y el tope se reintentan una vez; el 400 no; los 150 van en lotes de 100 y 50 | ídem |
| NOT-012 | Web Push: envío | suscripciones que responden 201, 410, 404, 500 dos veces y 503 una vez | se manda | 404 y 410 son inválidos; el 500 falla después de un reintento; el 503 sale al segundo intento; la carga es la que lee el service worker | ídem |
| NOT-013 | Textos: alertas | un dolor 8 en espalda baja y un cierre con estancamiento y baja de volumen | se arma el aviso | el dolor dice cuánto y dónde y es urgente; las dos alertas van en un solo push y un solo correo | ídem |
| NOT-014 | Textos: privacidad y estilo | una observación de la alumna y un consejo largo de la entrenadora | se arma el push | lo de la alumna no va en el push; lo de la entrenadora va cortado a 140; ningún texto con guion largo ni «usted» | ídem |
| NOT-015 | Textos: correo | nombres y zona con HTML | se arma el correo | todo va escapado | ídem |
| NOT-016 | Hora habitual | horas de inicio de sesiones | se calcula | es la mediana (P-21); con dos al medio, su promedio | ídem |
| NOT-017 | Ventana del recordatorio | la hora objetivo y corridas cada 5 minutos | se revisa | cae en una sola corrida: (ahora - 5 min, ahora] | ídem |
| NOT-020 | SMTP: envío | el adaptador con un transporte falso | se manda una recuperación | va el mismo correo de la plantilla con el remitente de Gmail, el Reply-To y el tipo en una cabecera | `apps/api/test/notificaciones-correo.test.ts` |
| NOT-021 | SMTP: reintento | un tope de tiempo, un corte de red, una clave mala (535) y un 421 | se manda | el tope, el corte y el 421 se reintentan una sola vez; la clave mala no | ídem |
| NOT-022 | SMTP: secretos | un error de Gmail que trae la clave y el correo en el mensaje | se manda y se loguea | ni el error ni el log llevan la clave ni el destinatario; el log lleva `SMTP_535` | ídem |
| NOT-023 | SMTP: TLS y topes | el transporte real de nodemailer en 465 y en 587 | se arma sin conectarse | 465 con TLS desde el inicio, 587 con STARTTLS obligatorio, topes de 10 s y sin logger | ídem |
| NOT-024 | SMTP: configuración | `CORREO_DRIVER=smtp` sin cuenta, con la contraseña de la cuenta, con la clave en 4 grupos, con el puerto 25 y con todo vacío | se lee | pide cuenta y clave; la contraseña no pasa (16 letras); los espacios se quitan; el 25 no; vacío es como no puesto; el remitente es la cuenta | ídem |
| NOT-025 | SMTP en producción | `NODE_ENV=production` con smtp y con consola | se lee | smtp se acepta y respeta el remitente fijado; consola no | ídem |
| NOT-026 | SMTP: adaptador | la configuración con smtp | se arma el adaptador | es `smtp` y no tiene buzón | ídem |
| NOT-030 | Registrar el teléfono | Martina | registra su token de Expo dos veces y una suscripción web | 201, 200 con el mismo id y 201; en `push_tokens` no aparece el token, el endpoint ni las llaves (SEG-003) | `apps/api/test/notificaciones.int.test.ts` |
| NOT-031 | Llaves nuevas y otra cuenta | Martina con una suscripción; Diego en el teléfono de Martina | ella registra la misma suscripción con llaves nuevas; él registra el token de ella | 200 con el mismo id; el teléfono queda de Diego | ídem |
| NOT-032 | Borrar | el teléfono de Martina y el de Camila | Martina borra el de Camila, el suyo dos veces y un id mal escrito | 404, 200, 404 y 400; el de Camila sigue | ídem |
| NOT-033 | Validación | cuerpos con token malo, campo de más, endpoint a la IP de metadatos, llave corta y tipo desconocido; y sin sesión | se registran | 400 `VALIDATION_ERROR` con el campo (CON-012); sin sesión, 401; nada se guarda | ídem |
| NOT-034 | Alumno solo | Diego sin entrenador, con su teléfono | registra un dolor de 9 y cierra con dolor general de 9 | no sale ningún push ni correo (INT-145, WRK-017) | ídem |
| NOT-035 | Rutinas | Camila y Martina con sus teléfonos | Camila asigna y activa «Fuerza» a Martina; Martina activa una rutina suya | Martina recibe «Camila te asignó una rutina»; activar la propia no avisa a nadie | ídem |
| NOT-036 | Token inválido | el token de Martina dado por inválido | Camila le deja un consejo | no sale; el token se borra; el de Camila sigue | ídem |
| NOT-037 | Recordatorio: cuándo no | Martina con hora 19:00 | ya cerró una sesión hoy; tiene una en curso; no fijó hora y no tiene sesiones; tiene 3 sesiones que empezaron 19:10, 19:20 y 19:30 | no hay recordatorio en los tres primeros; en el último sale a las 18:50 con «19:20» (P-21) | ídem |
| NOT-038 | Correo de la noche | Martina y Diego con rutina activa y 10 días sin entrenar | corre `noche` con avisos, otra vez con el mismo «ahora» y a la noche siguiente | Camila recibe un correo «Martina tiene una alerta nueva» y ningún push; Diego no le avisa a nadie; repetir no repite el correo; la noche siguiente no hay correo | ídem |
| NOT-039 | Ruta de prueba | Martina con su teléfono | pide la prueba con correo, Camila sin cuerpo, un cuerpo con un campo raro, 9 más y una undécima | 200 con 1 enviado y el correo; Camila sin correo; 400; las 10 de la hora pasan y la undécima da 429 con Retry-After; las pruebas no gastan el cupo del día | ídem |
| NOT-040 | Prueba en producción | la API con `NODE_ENV=production` | Martina y Camila piden la prueba | Martina 403 `FORBIDDEN`; Camila 200 | ídem |
| NOT-041 | Registro en la base | la tabla `avisos_enviados` (migración `20261118000000_google_y_avisos`), compartida por la API y el worker | se reserva dos veces la misma clave y se cuentan los de hoy | la segunda reserva da false; cuentan solo los que cuentan para el tope y salieron | ídem |
| NOT-042 | Worker de punta a punta | Martina con hora habitual 19:00 | corre `recordatorios` a las 18:30 y `noche` con el arranque real del worker; y `recordatorios` con una llave VAPID mal copiada | terminan con 0; con la llave mala, 1 y el motivo en el log | `apps/api/test/notificaciones.int.test.ts` |
| NOT-050 | App: activar | la plataforma, la API y la memoria falsas | se toca Activar avisos | se pide el permiso antes que nada, el cuerpo cumple el contrato y el id queda guardado | `apps/mobile/src/lib/notificaciones/__tests__/registro.test.ts` |
| NOT-051 | App: web | la suscripción del navegador | se activa | va con endpoint y llaves | ídem |
| NOT-052 | App: sin permiso | la persona dice que no; el iPhone en Safari sin agregar a inicio | se activa | no se llama a la API; el texto explica qué hacer | ídem |
| NOT-053 | App: sin señal | la API no responde | se activa | estado error con su texto; no lanza ni guarda | ídem |
| NOT-054 | App: contrato | un token mal formado | se activa | no llega a la API | ídem |
| NOT-055 | App: renovar | sin permiso y con permiso | se abre la app | sin permiso no hace nada; con permiso registra sin preguntar | ídem |
| NOT-056 | App: desactivar | el teléfono registrado; la API caída | se cierra sesión | `DELETE` con el id, se olvida igual aunque la API falle | ídem |
| NOT-057 | App: ayudas | la clave VAPID y rutas de avisos | se convierten | la clave da 65 bytes; solo se abren rutas de la app | ídem |
| NOT-058 | App: textos | cada estado en Android y en web | se arman | tuteo y sin guion largo | ídem |
| NOT-063 | App: cerrar sesión borra el teléfono | el gestor de sesión con un paso previo (borrar el dispositivo) y otro que se cuelga | se cierra sesión | el paso previo corre con la sesión abierta y antes de `/auth/logout`; el que se cuelga no frena el cierre más de 5 s; uno quitado ya no corre | APP (`apps/mobile/src/lib/sesion/__tests__/gestor.test.ts`) |
| NOT-064 | App: probar avisos | la API falsa | el entrenador toca «Probar avisos» | `POST /v1/notificaciones/prueba` con `{ correo: true }`, respuesta leída con el contrato; el texto dice si salió el push, el correo o ninguno; una respuesta con otra forma no se muestra como éxito | `apps/mobile/src/lib/notificaciones/__tests__/registro.test.ts` |
| NOT-065 | App: probar avisos sin suerte | sin red, 429 con Retry-After y 403 | se pide la prueba | no lanza; dice revisar la conexión, cuántos minutos esperar o que es solo para entrenadores; tuteo y sin guion largo | ídem |
| NOT-060 | Manual en Android | el APK de `preview` con `google-services.json` y la llave de FCM V1 en EAS | se activan los avisos en Perfil, se pide la prueba, se cierra la app y Camila deja un consejo | llega «Prueba de avisos» y el consejo con la app cerrada; tocarlo abre Hoy | MAN (pendiente) |
| NOT-061 | Manual en iPhone | la app web agregada a la pantalla de inicio, con `EXPO_PUBLIC_VAPID_PUBLICA` y `sw-avisos.js` publicado | se toca Activar avisos y se pide la prueba | Safari pregunta, llega el aviso con la app cerrada y tocarlo la abre | MAN (pendiente) |
| NOT-062 | Manual con Gmail | `CORREO_DRIVER=smtp` con la clave de aplicación en el VPS | Camila pide la prueba con correo y Martina registra un dolor de 8 | los dos correos llegan a la bandeja de entrada (no a spam) desde la cuenta de Gmail | MAN (pendiente) |
