# GymTrack: símbolo final

Fase 3, cierre. Fecha: 2026-11-16. Estado: fijado por el usuario (variante H de la ronda 2, versión principal sobre tinta).
Parte de `../exploracion-2/v07h.svg`. Esto es un pulido: la silueta y la lectura de la letra no cambian.

## Qué significa

Es la G de GymTrack escrita en los renglones de una libreta: el margen, las filas ya anotadas y, en menta, el renglón que completa la letra (la próxima serie), unido a la base sin levantar la pluma.

## Qué cambió respecto de v07h

Todas las medidas van en unidades de la grilla de 64.

1. **Base y trazo vertical, una sola forma en L.** En v07h eran dos rectángulos superpuestos con radio 2 cada uno (trazo x45–52, y37–52; base x12–52, y45–52). Ahora es un solo contorno: base x12–52, y45–52, y trazo x45–52 que sube hasta y41. Radio exterior 2 en las esquinas de afuera. Radio interior 1 en el ángulo entre el trazo y la base (x45, y45).
2. **Corte limpio entre menta y papel.** En v07h el travesaño menta tenía radio 2 también en su esquina inferior derecha, y por esa esquina asomaba una cuña de papel de 2 × 2 detrás del menta. Ahora esa esquina va a escuadra y el corte es una sola línea recta en y41, de x45 a x52, todo el ancho del trazo. El menta es el renglón completo del travesaño (x32–52, y34–41, largo 20), igual que en v07h.
3. **Radio interior también arriba.** El ángulo entre el travesaño y el trazo (x45, y41) lleva radio interior 1. En color, ese radio queda del lado del papel y no mueve la línea de corte.
4. **Versión en un solo color.** Travesaño, trazo y base son un solo gancho (un contorno), con los dos radios interiores de 1. En v07h esos ángulos eran a escuadra y quedaban como restos de rectángulos superpuestos.
5. **Lengüeta oculta (detalle de archivo, no se ve).** La L sube bajo el menta hasta y38, de x45 a x51,5. Evita la línea fina de fondo que deja el suavizado cuando dos formas solo se tocan. Queda media unidad adentro del borde derecho para que no asome por el canto del menta (medido en el render de 1024: con la lengüeta hasta x52, el pixel del canto derecho del menta salía en RGB 93,141,125 en vez de 39,88,72, en 38 px de alto).
6. **Centro óptico en el cuadro.** El centro de masa del símbolo, medido sobre el render, cae en x31,0 e y33,8 (el renglón de arriba termina en x48 y el peso está en la base y el gancho). Dentro de un cuadro (ícono, Android, favicon de 48, láminas) el símbolo se corre 0,5 a la derecha y 0,5 hacia arriba de su centro geométrico. Se probaron 0/0, 0,5/0, 0,5/−0,5 y 1/−1: 0/0 se ve bajo, 1/−1 se ve alto. Los archivos del símbolo suelto no llevan el corrimiento: su caja sigue en x12–52, y12–52, para alinearlo con el logotipo.
7. **Versión chica para 16 y 32 px** (`gymtrack-simbolo-16.svg`, grilla de 16). Ver abajo.

### Lo que no cambió (a propósito)

- Alto de renglón 7, interlínea 4, cuatro filas, caja de 40 × 40.
- Largos: 36 (arriba), 12, 12, travesaño 20 desde x32, base 40. Abertura de 4 arriba a la derecha y aire de 8 entre el margen y el travesaño.
- Radio exterior 2, trazo de 7 de ancho, colores.
- Se descartó cortar el menta en vertical (x45) con el papel subiendo hasta y34: el menta quedaba en 13 de largo, dejaba de ser un renglón y la esquina de papel acercaba la figura a una G cuadrada de rótulo (concepto 09, descartado).
- Se descartó un radio interior de 1,5: la contraforma de 4 de alto terminaba casi en píldora.

## Versión chica (16 y 32 px)

A 16 px la versión principal se empasta: la interlínea mide 1 px a medias y los renglones se juntan en una G gris (comprobado en el render). La versión chica está dibujada en una grilla de 16:

- Barras de 2 px con 1 px de aire. Caja de 11 × 11 px (x3–14, y2–13): queda 1 px a la derecha y 1 px arriba del centro exacto, el mismo corrimiento óptico llevado al pixel.
- Renglón de arriba x3–12: abertura de 2 px (en la principal es de 1,1 px a esta escala). Es el único ajuste de proporción, para que la boca de la G no se cierre.
- Margen de 3 px, aire de 2 px, travesaño de 6 px (x8–14), trazo de 2 px (x12–14).
- Radio 0,5: a 32 px da 1 px de canto; a 16 px casi no se nota.
- Se usa solo en cuadros de 16 y 32 px exactos.

## Archivos

| Archivo | Uso |
| --- | --- |
| `gymtrack-simbolo.svg` | Principal. Papel #F5F7F5 y travesaño menta #45B392, sin fondo, para fondo tinta #131A17. |
| `gymtrack-simbolo-sobre-papel.svg` | Tinta #131A17 y travesaño menta, para fondos claros. |
| `gymtrack-simbolo-mono-papel.svg` | Un solo color, papel, para fondos oscuros. |
| `gymtrack-simbolo-mono-tinta.svg` | Un solo color, tinta, para fondos claros. |
| `gymtrack-simbolo-16.svg` | Versión chica (grilla de 16), papel y menta, para fondo tinta. |
| `gymtrack-icono.svg` | Ícono de la app, 1024 × 1024, fondo tinta a sangre (la plataforma pone la máscara). Símbolo de 512 px de ancho, la mitad del lado. |
| `android-foreground.svg` | Ícono adaptativo, primer plano. Lienzo de 108 dp, fondo transparente. Símbolo de 40 dp; su punto más lejano queda a 27,5 dp del centro (zona segura: 33). |
| `android-monochrome.svg` | Ícono adaptativo, capa monocroma para íconos temáticos. Silueta blanca: Android usa solo la forma. |
| `android-fondo.md` | Nota con el color de la capa de fondo: #131A17. |
| `png/icono-1024.png`, `icono-512.png`, `icono-192.png` | Ícono de la app en PNG. |
| `png/favicon-48.png` | Versión principal sobre tinta, cuadro con esquinas de 6. |
| `png/favicon-32.png`, `favicon-16.png` | Versión chica sobre tinta, cuadro con esquinas de 2 (en la grilla de 16). |
| `png/simbolo-512.png` | Principal, fondo transparente. |
| `lamina-simbolo-final.png` / `.svg` | Las cuatro versiones, el ícono en tres máscaras, el primer plano de Android y la tira 64/32/16. |
| `lamina-construccion.png` / `.svg` | Grilla, módulos, cotas, área de respeto y tamaño mínimo. |
| `fuente/gen.py` | Genera todo lo anterior (`python3 gen.py`, necesita rsvg-convert y Pillow). `fuente/favicon-48.svg` y `favicon-16.svg` son las fuentes de los favicons. |

## Reglas de uso

**Qué versión va sobre qué fondo**

- Tinta #131A17 u otro fondo muy oscuro: la principal (papel y menta). Es la versión de la marca. Papel sobre tinta: 16,4:1; menta sobre tinta: 6,8:1.
- Papel #F5F7F5, blanco u otro fondo claro: la versión sobre papel (tinta y menta). El menta sobre papel queda en 2,4:1: el gancho se sigue leyendo por la forma, pero si el símbolo va chico o en una pantalla mala, conviene la mono tinta.
- Fotos, fondos de color o menta: la versión en un solo color que más contraste (papel sobre oscuro, tinta sobre claro). Nunca la versión con menta sobre un fondo menta o verde.
- Una sola tinta (timbre, bordado, grabado, notificación del sistema): mono.

**Área de respeto.** Un alto de renglón (7 de grilla, 17,5 % del ancho del símbolo) libre por los cuatro lados, medido desde la caja de 40 × 40. Con el símbolo a 40 px de ancho, son 7 px. Ahí no entra texto, borde ni otra marca. Los SVG ya traen 12 de aire por lado, más que el mínimo.

**Tamaño mínimo.**

- Principal: símbolo de 30 px de ancho o más (cuadros de 48 px en adelante).
- Bajo eso: versión chica, solo en cuadros de 16 y 32 px exactos (símbolo de 11 y 22 px). Otros tamaños bajo 48 se redondean a 32 o a 48.
- Bajo 16 px no se usa.

**Qué no hacer**

- No cambiar el color del travesaño ni pasar el menta a otro renglón (la variante E de la ronda 2 mostró que la G se debilita).
- No usar el menta para algo que no sea el travesaño ni poner texto en menta.
- No estirar, rotar, inclinar ni reflejar. No agregar contornos, sombras, brillos, gradientes ni texturas de papel.
- No volver a puntas de píldora ni a escuadra: el canto es de radio 2.
- No separar el trazo que baja de la base o del travesaño.
- No poner la principal sobre fondos claros (el papel desaparece) ni la versión sobre papel sobre fondos oscuros.
- No escalar la versión chica a otros tamaños ni usar la principal a 16 o 32 px.
- No encerrar el símbolo en una página o tarjeta (la variante G de la ronda 2 dejó de leerse como G).

## Lo que no se pudo verificar

- No se probó en un teléfono ni en un launcher real de Android. La lámina simula la máscara circular de 72 dp; no se probó la paralaje ni el ícono temático en un sistema con Material You.
- `android-foreground.svg` y `android-monochrome.svg` no se convirtieron a VectorDrawable (XML); eso se hace al integrarlos en la app.
- Los PNG de 16 y 32 salen de `rsvg-convert`. Un navegador puede escalar el favicon de otra forma si se le entrega un tamaño distinto del que pide.
- No se probó impresión ni un tamaño mínimo en milímetros.
- Las lecturas de «se ve bajo» o «se ve centrado» son un juicio sobre los renders, no una prueba con personas.
