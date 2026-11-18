# GymTrack: exploración del símbolo, ronda 2

Fase 3, SVG a mano. Fecha: 2026-11-16. Estado: en revisión.
Punto de partida: el concepto 07 «G de renglones» de la ronda 1, el único que el usuario dejó vivo. Los otros nueve están descartados y no se mezclan acá.

## Qué buscaba esta ronda

Que el símbolo se lea G primero y renglones después, en grande y en chico; que siga hecho solo de renglones (con una ruptura nombrada); que funcione en un solo color; que aguante 16 px y quepa en el círculo seguro del ícono de Android; y elegir la forma de las puntas según «Cuaderno Exacto».

## Archivos

- `v07a.svg` a `v07h.svg`: una variante por archivo, `viewBox="0 0 64 64"`, sin texto, sin fuentes, sin filtros ni gradientes. La tinta usa `currentColor` (por defecto #131A17); el acento lleva `class="acento"` y menta #45B392.
- `render/v07X-256.png` (papel, con acento), `v07X-256-tinta.png` (tinta, con acento) y `v07X-64.png`, `-32.png`, `-16.png` (un solo color, sin acento), todos con `rsvg-convert`.
- `lamina-exploracion-2.svg` y `.png` (2400 × 1450): grilla de 4 × 2, con la 07 original chica arriba a la izquierda como referencia.
- `lamina-icono-android-2.svg` y `.png` (2104 × 920): las ocho en la máscara circular sobre menta, tinta y papel.
- `fuente/gen.py` y `fuente/lamina.py`: generan las variantes, los renders y las láminas. Sirven para la ronda 3.

## Decisiones comunes

- **Puntas.** Todas pasan de píldora (ronda 1) a radio 2 sobre barras de 7, salvo F, que va a escuadra. Comparadas lado a lado: la píldora hace que cada renglón parezca un botón o un interruptor, y ahí está el juguete; el canto recto se vuelve frío y de pixel; el radio 2 se ve como el canto de una libreta. Recomiendo radio 2 (entre 1,5 y 2 da casi lo mismo a la vista; 2 se nota mejor a 64 px).
- **Acento.** El menta va en el travesaño, leído como «la sugerencia de la página siguiente»: el renglón que no parte en el margen, el que completa la letra. E prueba la otra lectura (el renglón de abajo como «el que se está escribiendo») y pierde (ver abajo). Sin acento, todas siguen siendo la misma figura; la tira de tamaños de la lámina va sin menta para probarlo.
- **Tamaño.** Radio máximo ocupado, medido sobre el render (en unidades de 64): A 28,0 · B 28,9 · C 24,4 · D 27,5 · E 27,5 · F 28,2 · G 30,1 · H 27,5. En la lámina de Android van todas a la misma escala; la más grande (G) llega a 58 dp de diámetro, dentro de la zona segura de 66 dp.

## Variantes

### A · Interlínea fina
- **Cambia:** barras de 8,5 e interlínea de 2,5 (antes 7 y 4). Mismo dibujo, otro ritmo.
- **Gana:** la columna izquierda deja de verse como viñetas y se arma como un asta. A 256 px es, de las variantes que siguen siendo solo renglones, la que más se acerca a «G primero». A 32 y 16 px la G se ve llena.
- **Pierde:** a 16 px la interlínea mide 0,6 px y queda gris: no se empasta del todo, pero los renglones desaparecen y queda una G maciza. Se siente menos libreta y más bloque.

### B · Cinco renglones
- **Cambia:** pasa de 4 a 5 filas (barras de 6, interlínea de 3,5) y la cuarta fila suma un renglón corto a la derecha, el espolón de la G.
- **Gana:** es la única variante que completa la estructura de la G sin salirse de la regla: margen, abertura, travesaño, espolón y base, todo con renglones. A 32 y 16 px es la G de renglones más clara de la ronda.
- **Pierde:** a 256 px hay más rayas y vuelve a asomar la lista o el menú; se lee G al segundo vistazo, no al primero. Las barras de 6 dan 1,5 px a 16 px y la interlínea queda en 0,9 px: aguanta, pero al límite.

### C · Borde redondo
- **Cambia:** los extremos de los renglones siguen un círculo: arriba y abajo entran, al medio salen.
- **Gana:** la silueta es redonda y deja de parecer el ícono de «alinear a la izquierda». A 16 px se lee como una G redonda, la más tipográfica.
- **Pierde:** a 256 px se lee como texto centrado (un título y un párrafo). Es la que menos ocupa (radio 24,4), así que en el ícono se ve chica. La curva se sugiere solo con cuatro puntos y no alcanza a dibujar la letra.

### D · Abertura amplia
- **Cambia:** el renglón de arriba se acorta a x12–40 y el travesaño entra hasta x29.
- **Gana:** la boca de la G se ve más abierta y el travesaño pesa más.
- **Pierde:** casi no se distingue de la 07. El travesaño queda a 5 unidades del renglón corto y la tercera fila se lee como una línea cortada, lo que acerca la figura a una E. No resuelve el problema.

### E · Renglón en curso
- **Cambia:** el menta pasa del travesaño al renglón de abajo, «la serie de hoy», la que se está escribiendo.
- **Gana:** la idea es linda: la última línea de la página es la de hoy.
- **Pierde:** con acento, la base de la G queda pintada y el ojo la separa del resto; se lee como un párrafo con una línea destacada y la G se debilita. En un solo color es idéntica a la base. Confirma que el acento va mejor en el travesaño.

### F · Canto recto
- **Cambia:** puntas a escuadra, sin radio.
- **Gana:** es la más exacta y la que mejor calza en la grilla de pixeles a 16 px: bordes nítidos.
- **Pierde:** se pone rígida y fría, más planilla que libreta (un antirreferente de la filosofía). Se acerca a una E de pixel o a un bloque de videojuego antiguo. Sirve como prueba para descartar el canto recto.

### G · Página entera
- **Cambia:** la G va calada dentro de una página en tinta (esquinas de 6), en vez de suelta.
- **Gana:** es la que mejor llena el círculo del ícono y la más sólida a 64 px.
- **Pierde:** **dejó de leerse como G.** Se lee como el ícono genérico de un documento o un formulario. Además se acerca al territorio del concepto 02 (la página), que está descartado. No la recomiendo.

### H · Ruptura: trazo que baja
- **Ruptura deliberada:** es la única que agrega un trazo vertical, de 7 de ancho, que baja del travesaño a la base, como si la pluma no se hubiera levantado.
- **Gana:** se lee G primero, a todos los tamaños. Los renglones siguen ahí (cuatro filas y el margen), así que la libreta se lee después, que era el orden pedido.
- **Pierde:** rompe la regla del concepto: la G ya no está solo «escrita en renglones», tiene una unión dibujada. La esquina del espolón la acerca a una G cuadrada de rótulo, cerca del concepto 09 (descartado), aunque acá no hay T.

## Lectura en el primer segundo (256 px y 32 px)

| | 256 px | 32 px |
| --- | --- | --- |
| A | G maciza con rayas, casi | G |
| B | lista; G al segundo vistazo | G |
| C | texto centrado | G redonda |
| D | líneas de texto (como la 07) | G, algo de E |
| E | párrafo con línea destacada | G |
| F | E de pixel | G |
| G | documento o formulario | documento |
| H | G | G |

## Recomendación para la ronda 3

Ninguna de las variantes de solo renglones gana sola a 256 px. Lo que más ayuda es el espolón (B y H) y, en segundo lugar, cerrar la interlínea (A). Propongo que el usuario elija entre:

1. **H** si acepta la ruptura: es la única que se lee G primero sin discusión.
2. **B** si quiere conservar la regla del concepto. En la ronda 3 se combinaría con el ritmo más apretado de A para que también gane en grande.

## Lo que no se pudo verificar

- No se probó en un teléfono ni en un launcher de Android; la lámina simula solo la máscara circular (no la cuadrada redondeada ni la de gota).
- Los 16 px son los de `rsvg-convert` con antialiasing; el navegador y Android pueden alinear los pixeles de otra forma. En A y B la interlínea a 16 px queda bajo 1 px y depende de ese ajuste.
- La lectura de «G primero o renglones primero» es un juicio propio sobre los renders, no una prueba con personas.
- El contraste del menta sobre papel sigue en 2,6:1; por eso el menta nunca lleva la forma solo.
