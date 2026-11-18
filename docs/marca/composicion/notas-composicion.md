# GymTrack: composición

Fase 5.5 del proceso de marca (composición e identidad visual). Fecha: 2026-11-17. Estado: tres variantes para descartar. **Nada de esto está aplicado al código.**
Se apoya en `gymtrack-filosofia-visual.md` (el renglón, el margen, la cifra que manda, los dos tiempos) y en la guía de diseño aprobada. Los tokens son exactamente los de `sistema/tokens-propuestos.js`: no se inventó ningún color ni radio.

| Archivo | Qué es |
| --- | --- |
| `especimen-composicion.html` | Las seis pantallas lado a lado, los antirreferentes y la prueba de desenfoque. Ábrelo en un navegador. |
| `composicion-tableros.json` | Posiciones de los siete tableros en el lienzo (página «3 · Composición»). |
| `fuente/gen-composicion.js` | Dibuja todo desde las piezas del sistema. `node docs/marca/composicion/fuente/gen-composicion.js <carpeta-del-lienzo>`. |
| Tableros del lienzo | `CompAHoy`, `CompARegistro`, `CompBHoy`, `CompBRegistro`, `CompCHoy`, `CompCRegistro`, `CompAntirreferentes` (`.dc.html`). |

Las tres usan el mismo contenido: Hoy de Camila (Pierna A, semana 3 de 8, la nota de Matías Soto, 9 sesiones, 38,4 t y 3 récords) y la serie 2 de 3 del peso muerto rumano a los 24:18. Lo único que cambia es cómo se ocupa la pantalla.

Una advertencia antes de leer: yo genero variantes, pero no sé distinguir cuál es distintiva y cuál es un promedio bien hecho. Eso lo decides tú. La regla es no mezclar: se deja viva una (dos como mucho) y se descartan las otras.

---

## Antirreferentes

| Convención | Por qué no |
| --- | --- |
| La pila de tarjetas | Cada dato en su caja y todas pesan igual: la cifra que importa se pierde entre bordes y sombras. |
| El panel de anillos | Doce métricas peleando por el ojo. Mide actividad y no dice qué levantar en la próxima serie. |
| El héroe centrado | Un cuerpo de portada y un botón que grita. Promete transformación y no dice cuántos kilos. |
| La planilla gris | El riesgo de la propia libreta: todo en columnas y nada manda. |

---

## A · La pauta

**La idea.** No hay tarjetas. La pantalla es una hoja pautada: renglones de 48 de borde a borde, separados por una línea, con las palabras a la izquierda y las cifras en una sola columna a la derecha, con la coma alineada (82,5 sobre 70 sobre 140). Las secciones se separan con una regla doble de tinta, no con cajas. La nota del entrenador se escribe entre renglones, justo debajo de la sentadilla que comenta. En el registro, la fila activa es el mismo renglón de la tabla pero más alto: el «70» y el «10» grandes caen en las mismas columnas que los kilos y las repeticiones de las series 1 y 3, y los más y menos quedan debajo de su cifra. Hasta «Observación o dolor» y «Siguiente: Prensa» son renglones que se tocan enteros.

**Pelea con:** la pila de tarjetas redondeadas.
**Viene de:** el libro de caja del almacén de barrio.

**Qué gana en el gimnasio.** Es la que mejor se lee de un vistazo: el ojo baja por una sola columna de cifras. Todos los toques miden lo mismo y la fila activa no salta de lugar al marcar una serie, porque es la misma tabla. «Serie hecha» y «Fallé la serie» quedan en la mitad baja, al alcance del pulgar.

**Qué arriesga.** Es la más cercana a la planilla gris. Si los renglones pesan todos igual, Hoy se vuelve una hoja de cálculo. La jerarquía depende de que la cifra de 24 domine sobre el nombre de 16 y de la regla doble; si eso se diluye al implementar, volvimos al Excel. En el registro le sobra aire abajo (unos 90 dp vacíos) que no supe usar sin inventar contenido.

---

## B · El margen

**La idea.** Una línea azul lapicera fija, de 3 dp, a 136 dp del borde izquierdo, de arriba abajo, como en un cuaderno. A la derecha está el registro: el saludo, la rutina, la tabla y la pluma de la serie en curso. A la izquierda está todo lo que comenta: la fecha, la semana de la rutina, la nota de Matías a la altura exacta de la sentadilla, la racha, la última vez como una cuenta chica, la sugerencia al lado de la tabla que va a llenar, los rótulos «kg», «reps» y «RIR» (con «reps en reserva» explicado una vez) y las salidas secundarias: «Fallé la serie» y «Observación o dolor». La línea azul hace de raya de la nota: no hace falta otra.

**Pelea con:** el entrenador metido en un chat o en una tarjeta más del feed.
**Viene de:** la prueba corregida al margen con lápiz azul.

**Qué gana.** Es la única donde la voz del entrenador tiene un lugar fijo en la pantalla, no un turno en una lista. La metáfora de la libreta compartida se vuelve estructura: dos letras en la misma página. Con la mano derecha, todo lo principal («Empezar rutina», más y menos, «Serie hecha») queda del lado del pulgar.

**Qué arriesga.** La página queda de 240 dp: los nombres largos rozan el borde y un peso de cinco caracteres (102,5) en la cifra grande no cabe entre los botones de 56. El texto del margen va en 13 y 14 dp en una columna de 108: se lee bien en la casa, cuesta con la mano sudada y poca luz. «Fallé la serie» y «Observación o dolor» quedan lejos del pulgar derecho y sus etiquetas van en dos líneas. Con la mano izquierda, todo se invierte. En teléfonos de 360 dp el margen se come demasiado.

---

## C · La balanza

**La idea.** Una sola cifra ocupa la pantalla, como el visor de una pesa. En Hoy es la carga con que empiezas: «82,5 kg» de sentadilla, en Plex Mono de 136 dp, subrayada en azul porque la subió el entrenador; su nota va pegada debajo, explicando el número. En el registro son los kilos y las repeticiones de la serie en curso, «70» y «10» de 144 dp cada uno, con el más y el menos apilados a la derecha, en el pulgar. Todo lo demás (el saludo, el resto de la rutina, la semana, el mes, la sugerencia, la última vez, la tabla de series) se achica y baja en filas chicas.

**Pelea con:** el panel de anillos y métricas que pesan igual.
**Viene de:** el visor de la pesa de la feria.

**Qué gana.** Es la que cumple más literal la estrella del norte: levantas el teléfono, lees «70 × 10» a un metro y vuelves a la barra. Funciona con poca luz y sin lentes. Los controles quedan en el borde derecho, donde cae el pulgar.

**Qué arriesga.** Elegir la cifra equivocada: si la pantalla manda con un número que no es el que importa, miente en grande. Los números largos (102,5 kg, 1:30 de tiempo) obligan a achicar la fuente. En Hoy deja poco para el tiempo largo de la casa, que pide densidad. Y está a un paso del héroe centrado: si alguien centra la cifra y agranda el botón, se vuelve el cartel que la marca rechaza.

---

## Prueba de desenfoque

La hice en `especimen-composicion.html`, con las seis pantallas en `filter: blur(12px)` y al lado de los antirreferentes. Resultado honesto:

- **C se reconoce sin dudar.** Las cifras gigantes quedan como dos manchas negras arriba, y no se parece a ningún antirreferente. Hoy y Registro se ven de la misma familia.
- **B se reconoce, pero por poco.** La línea azul casi desaparece con el desenfoque. Lo que la delata es el tercio izquierdo vacío y claro, con el botón y la banda menta corridos a la derecha. La pantalla de Registro es más clara: la banda menta empieza en la línea y el rojo de «Fallé» queda solo en el margen.
- **A es la más débil.** Desenfocada se ve como franjas claras parejas con manchas oscuras a la derecha y el botón menta abajo de lado a lado. Se distingue de C sin problema, de B por el ancho completo, y de la pila, los anillos y el héroe. Pero es la que más se acerca al esquema de la planilla gris. Si sobrevive, la siguiente mutación tiene que darle más contraste a la jerarquía.
- **El par más difícil es A Hoy contra B Hoy.** Comparten la textura de renglones con cifras a la derecha; los separa el vacío del margen.

---

## Cuál defendería

Defendería **B · El margen**. Es la única de las tres que convierte la libreta compartida en estructura y no en adorno: el entrenador tiene un lugar en la página, y eso no lo tiene ninguna otra app de fitness. Sus riesgos (el ancho, el texto chico, la zurda) son de ajuste, no de concepto. C es la más fuerte de las tres al desenfocarla y la más útil en el gimnasio, pero su idea la puede copiar cualquiera y se queda sin voz.

Esto es mi lectura, no la decisión. **Eliges tú**: deja viva una, dos como mucho, y descarta las demás sin mezclarlas. Si te incomoda alguna, mírala dos veces antes de matarla: a veces lo incómodo es lo distintivo.

## Lo que quedó sin verificar

- Lo vi en un navegador (Manrope e IBM Plex Mono cargadas, nada fuera del marco de 412 × 892, ningún botón de menos de 44 de alto o ancho), no en un teléfono Android real ni con el escalado de texto del sistema.
- Las cifras de 136 y 144 dp no se probaron con pesos de cinco caracteres.
- El RIR va de 0 a 4+ como pediste; la app de hoy lo tiene de 0 a 5 y la guía, en seis círculos.
- No se dibujó el modo gimnasio oscuro ni el panel de descanso de ninguna de las tres.
