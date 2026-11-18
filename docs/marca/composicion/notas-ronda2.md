# GymTrack: composición, ronda 2

Fase 5.5 del proceso de marca. Fecha: 2026-11-17. Estado: dos direcciones para elegir una. **Nada de esto está aplicado al código.**

La ronda 1 (A · La pauta, B · El margen, C · La balanza) se rechazó entera: no se entendía nada. Esta ronda parte de cero y tiene un solo lector: **alguien que nunca entrenó**, por ejemplo el profesor que evalúa el proyecto. Cada pantalla tiene que entenderse a la primera, sin que nadie la explique. Esa regla manda por sobre la estética densa y por sobre «la cifra manda».

| Archivo | Qué es |
| --- | --- |
| `especimen-ronda2.html` | Las ocho pantallas (D arriba, E abajo) y la prueba de comprensión. Ábrelo en un navegador. |
| `ronda2-tableros.json` | Posiciones de los nueve tableros en el lienzo (página «composicion», fila y = 1800). |
| `fuente/gen-ronda2.js` | Dibuja todo. `node docs/marca/composicion/fuente/gen-ronda2.js <carpeta-del-lienzo>`. |
| Tableros del lienzo | `Comp2DHoy`, `Comp2DAntes`, `Comp2DAnotar`, `Comp2DDescanso`, `Comp2EHoy`, `Comp2EAntes`, `Comp2EAnotar`, `Comp2EDescanso`, `Comp2Prueba` (`.dc.html`). |

Los datos son los de la ronda 1: Camila, alumna de Matías Soto; hoy le toca Pierna A, semana 3 de 8, 6 ejercicios, unos 55 minutos; lleva 3 días seguidos entrenando; ejercicio 2 de 6, peso muerto rumano, serie 2 de 3, 70 kg sugeridos, de 8 a 10 veces; la vez pasada, 67,5 kg con 10, 10 y 9; descanso de 1:30.

---

## Reglas que cumplen las dos

- **Una pantalla, una pregunta.** Hoy: «¿Qué me toca hoy?». Antes de la serie: «¿Qué hago ahora?». Anotar: «¿Cómo me fue en esta serie?». Descanso: «¿Cuánto descanso?».
- **Un solo botón principal**, de 56 de alto, abajo, al alcance del pulgar, con un verbo: «Empezar entrenamiento», «Ya hice la serie», «Guardar serie», «Saltar descanso». Menta con texto tinta; en el descanso, azul lapicera con texto tinta.
- **Cada número lleva su nombre.** «Levanta 70 kg entre 8 y 10 veces seguidas», «Serie 2 de 3», «Ejercicio 2 de 6», «Vas en la semana 3 de 8 de tu plan», «Queda 1 minuto y 24 segundos». Ningún «×», «RIR», «1RM» ni «volumen» a la vista.
- **«Serie» y «repetición» se explican una vez**, en la pantalla Antes de la serie: «Una serie es un grupo de repeticiones seguidas, sin parar. Una repetición es levantar el peso una vez.» Después, la app dice «veces».
- **Lo secundario se abre al tocar.** La lista de ejercicios es un enlace («Ver los 6 ejercicios»). Las cifras del mes, la semana, el volumen, los récords y el historial no están en Hoy: viven en Progreso.
- **Nada de tablas.** Ni una fila de bitácora. Todo el texto de cuerpo va en 16 o más; las preguntas, en 18; los títulos, de 24 a 40. La única excepción es el nombre de las pestañas, en 14 (la guía dice 13: se subió un punto).
- **Toques:** nada mide menos de 48; los más y menos de kilos y veces, 56. Contraste medido: tinta sobre menta 6,8:1, tinta sobre azul 5,0:1, grafito sobre azul suave 4,6:1, menta profunda sobre papel 5,3:1.
- Sin barra de estado simulada, sin emojis, sin frases motivacionales. «Ya la hice» del pedido se cambió por **«Ya hice la serie»**: leída en voz alta, «la» no decía qué.

---

## D · Paso a paso

**La idea.** Un asistente. Cada pantalla es un paso con una sola pregunta como título y su respuesta debajo. Avanzar es tocar el botón de abajo. No hay historial a la vista: lo de antes ya pasó y lo de después llega cuando tocas. Arriba, sin protagonismo, «Salir», «Ejercicio 2 de 6» y una barra de seis tramos.

**Qué gana.** Es la más fácil de leer en frío: el ojo no tiene dónde perderse. Cada pantalla trae su propia explicación («Trabaja la parte de atrás de las piernas», «Cuando llegue a cero, el teléfono vibra. No tienes que tocar nada»). El descanso pinta la pantalla entera de azul suave: se reconoce de lejos que es otro momento. El botón siempre cae en el mismo lugar.

**Qué arriesga.** Se pierde el contexto: en Anotar no ves cuántas series llevas ni qué hiciste en la anterior, y para revisarlo hay que retroceder. En el gimnasio, con práctica, tantos pasos pueden sentirse lentos: cuatro toques por serie. Y Hoy queda con mucho aire entre la nota y el botón; para el principiante es calma, para el que ya entrena puede parecer vacío.

## E · Una tarjeta a la vez

**La idea.** La sesión es una sola página que se va cerrando. Arriba, lo hecho, en líneas de 64 con un visto menta («Sentadilla · 4 series hechas», «Peso muerto rumano, serie 1 · Hecha: 70 kg, 10 veces»); se tocan para abrirlas. Abajo, una sola tarjeta abierta con borde menta profunda: el paso de ahora, con su botón al pie, donde cae el pulgar. En el descanso, la tarjeta se vuelve azul.

**Qué gana.** Ves dónde estás sin leer nada más: lo hecho arriba, lo de ahora abajo. La serie anterior queda a la vista justo cuando anotas la siguiente. Es la que mejor guarda la idea de la libreta (la página se va llenando) sin parecer planilla, porque cada renglón es una frase y no una columna de cifras.

**Qué arriesga.** La tarjeta abierta comparte la pantalla con las líneas cerradas, así que todo va más apretado: en Anotar se sacó la ayuda «Piensa cuántas veces más podías levantarlo» y las salidas van sin ícono. Con más ejercicios hechos, la pila de líneas crece y empuja la tarjeta; habría que agruparlas por ejercicio («Sentadilla · 4 series hechas») o hacerlas desplazar. Y las líneas cerradas tienen un visto menta que, mal medido, puede competir con el botón.

---

## Cómo cada pantalla responde a los cuatro problemas

| Pantalla | 1. Números sueltos | 2. Demasiada información | 3. No se ve qué hacer | 4. Parece planilla |
| --- | --- | --- | --- | --- |
| **Hoy** | «6 ejercicios para las piernas. Te toma unos 55 minutos.» «Vas en la semana 3 de 8 de tu plan.» El 82,5 queda solo en la frase de Matías, con su «kg». | Se sacaron la lista de 6 ejercicios con sus pesos, el mes, la semana y los récords. Quedan el saludo, qué toca, la nota y el botón. | Un botón menta, abajo: «Empezar entrenamiento». | Una tarjeta con un título de 40 y frases; ni una cifra en columna. |
| **Antes de la serie** | «Levanta 70 kg entre 8 y 10 veces seguidas.» La vez pasada, en una frase: «10 veces en la primera serie, 10 en la segunda y 9 en la tercera. Hoy son 2,5 kg más.» | Un ejercicio, una serie, una instrucción. El resto de la rutina está en «Ejercicio 2 de 6». | Un botón: «Ya hice la serie». «Cómo se hace» es de borde y no compite. | La instrucción es una oración con la cifra grande en medio, no un renglón de tabla. |
| **Anotar la serie** | Cada cifra tiene su pregunta y su unidad: «¿Cuántas veces lo levantaste? 9 veces», «¿Con cuánto peso? 70 kg». | Tres preguntas, una debajo de otra. Las salidas raras («No pude terminarla», «Anotar un dolor») van como texto subrayado, sin caja. | Más y menos de 56 a cada lado de la cifra; «Guardar serie» abajo. | Sin encabezados «kg · reps · RIR»: preguntas en 18. |
| **Descanso** | «1:24» con su nombre: «Queda 1 minuto y 24 segundos» (D) o «para la siguiente serie» (E). «El descanso es de 1 minuto y 30 segundos.» | Solo el tiempo, lo que viene y dos botones. | «Cuando llegue a cero, el teléfono vibra. No tienes que tocar nada.» Si quieres seguir antes, «Saltar descanso». | Azul suave, una cifra de 88 a 112 y frases. |

---

## «¿Te quedaban fuerzas para más?»: la equivalencia con el RIR

La pregunta en pantalla es «¿Te quedaban fuerzas para más repeticiones?», con la ayuda «Piensa cuántas veces más podías levantarlo» (en D). Las opciones son botones de 48, en dos filas de tres; la elegida va en menta suave con borde menta profunda y un visto, para no competir con el botón principal (la guía pide relleno menta en el chip activo: se cambió por eso).

| En pantalla | Por dentro (RIR) |
| --- | --- |
| No, ninguna | 0 |
| 1 más | 1 |
| 2 más | 2 |
| 3 más | 3 |
| 4 o más | 4+ |

Ojo: la app de hoy dibuja seis círculos, de 0 a 5, en `FilaActiva.tsx` (aunque el comentario del archivo dice «de 0 a 4»), y la guía también los dibuja de 0 a 5. Con esta propuesta, «4 o más» se guarda como 4 y absorbe el 5; el motor de progresión solo compara el RIR con un objetivo (`rir >= rirObjetivo` en `packages/shared/src/progression.ts`), así que mientras ese objetivo sea 4 o menos no cambia ninguna sugerencia. Igual hay que decidirlo antes de tocar el código. Sin respuesta, la serie se guarda igual, sin RIR, como hoy.

## Palabras de gimnasio que se sacaron o se tradujeron

| Antes | Ahora |
| --- | --- |
| 4 × 6 a 8 | 4 series de 6 a 8 repeticiones; en la serie, «Levanta 70 kg entre 8 y 10 veces» |
| RIR 2 | «¿Te quedaban fuerzas para más repeticiones?» → «2 más» |
| reps | veces («repetición» se explica una vez) |
| Serie hecha | Ya hice la serie |
| Fallé / Fallé la serie | No pude terminarla |
| Observación o dolor | Anotar un dolor |
| Técnica | Cómo se hace |
| Última vez: 67,5 × 10 | La vez pasada levantaste 67,5 kg: 10 veces en la primera serie… |
| Sugerencia de carga | Peso sugerido («Viene lleno con el peso sugerido») |
| Empezar rutina | Empezar entrenamiento |
| +30 s | +30 segundos |
| Saltar | Saltar descanso |
| Racha de 3 días | Llevas 3 días seguidos entrenando (solo en E) |
| Siguiente: Prensa | Lo que viene / Después: serie 3 de 3 |
| Volumen, toneladas, récords, sesiones del mes | Fuera de Hoy: van en Progreso |

---

## Propuesta para la marca: un principio nuevo

Para sumar a «Principios» en `gymtrack-filosofia.md` (no se editó: es solo la propuesta).

> **7. Se entiende sin saber de gimnasio.** Cada pantalla tiene que entenderla alguien que nunca entrenó, a la primera y sin que nadie se la explique. Cada número lleva su nombre en palabras («Levanta 70 kg entre 8 y 10 veces», no «70 × 8–10»), y la jerga se pregunta en castellano: el RIR es «¿Te quedaban fuerzas para más?». Una pantalla responde una sola pregunta y tiene un solo botón principal, abajo, con un verbo. Lo que sabe el que ya entrena (el mes, el volumen, el historial) se abre al tocar; no se le pone delante al que recién empieza.

Si se acepta, choca con dos líneas que hoy están en la marca y habría que ajustarlas: en «Lenguaje», «RIR. Se usa tal cual» pasaría a «RIR por dentro; en pantalla, la pregunta en palabras»; y en la voz, «"30 kg × 10" antes que "buen trabajo"» pasaría a «"30 kg, 10 veces"». El principio 1, «El número primero», puede quedarse si se lee como «el número con su nombre, primero».

---

## Cuál defendería

Defendería **E · Una tarjeta a la vez**. Para el que nunca entrenó se entiende igual que D (la tarjeta abierta es una sola pregunta con un solo botón), y además le muestra dónde está sin pedirle que recuerde nada: lo hecho arriba, lo de ahora abajo. D es más fácil de leer en frío, pero corta el hilo entre una serie y la siguiente. **Eliges tú.**

## Lo que quedó sin verificar

- Se miraron los nueve tableros en un navegador con Manrope e IBM Plex Mono cargadas: nada sale del marco de 412 × 892 (ni del de 1200 × 892), ningún bloque se monta sobre otro, ningún botón queda en dos líneas, ningún toque mide menos de 48 y cada pantalla tiene un solo botón relleno de 56. Ningún texto baja de 16, salvo el nombre de las pestañas (14). Los nueve archivos y el espécimen pasan un analizador de HTML (etiquetas cerradas, atributos con comillas, una raíz por tablero).
- No se probó en un teléfono Android real, ni con el texto del sistema agrandado, ni en el modo gimnasio oscuro.
- La prueba de comprensión es una lectura en voz alta hecha por mí, no una prueba con una persona que nunca entrenó. Antes de elegir, conviene mostrarle las dos a alguien así y anotar dónde duda.
- «Cómo se hace» supone un visor de técnica que la app todavía no tiene.
- El aviso con vibración al terminar el descanso existe en la app (`avisarFinDescanso`); la frase «el teléfono vibra» depende de que siga así.
