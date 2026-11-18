# GymTrack: logotipo

Fase 4, cierre. Fecha: 2026-11-16. Estado: en revisión (tratamiento y variantes por confirmar con el usuario).
Fuente elegida por el usuario el 2026-11-16: opción 1, Manrope para el texto e IBM Plex Mono para las cifras. El logotipo usa solo Manrope; la mono queda para las cifras de la app.
El símbolo es el fijado en la Fase 3 (`simbolo-final.md`) y no se toca.

## Tratamientos comparados

Lámina: `../lamina-logotipo-tratamientos.png` (y `.svg`), sobre tinta, cada uno en grande y con el símbolo a 24 px de alto, sobre tinta y sobre papel.

| # | Qué cambia | Lectura |
| --- | --- | --- |
| 01 | Base: «GymTrack», 700, espaciado −1 %, mayúscula de 29 (del 2.º al 4.º renglón), separación 11 | La palabra vive en los renglones de la G. Trazo de la letra (4,9) más fino que el renglón (7): el símbolo manda y la palabra escribe. |
| 02 | Peso 800 | Más negra sin ganar lectura a 24 px; la palabra empieza a pesar lo mismo que el símbolo. |
| 03 | Espaciado −3 % | Más denso: en grande «Tr» y «ck» quedan casi pegados; a 24 px la diferencia con 01 casi no se ve, así que no gana nada. |
| 04 | Espaciado +2 % | Más aire y algo más de lectura en chico, pero la palabra se alarga y se suelta del bloque compacto de la G. |
| 05 | «gymtrack» en minúscula | Pierde el corte entre «Gym» y «Track»; la «g» y la «y» juntas cargan dos colas bajo la línea. |
| 06 | Palabra más chica: mayúscula de 18 (3.º y 4.º renglón), separación 7 | Equilibrio más clásico en grande, pero a 24 px la mayúscula queda en 10,8 px y se pierde la regla de los renglones. |

**Elegido: 01.** Es el único en que la palabra sube exactamente del segundo al último renglón con un peso que no compite con el símbolo, y a 24 px se sigue leyendo entero. Los demás mueven una sola cosa y ninguna mejora la lectura ni el calce con la G.

Para regenerar con otro tratamiento: `python3 fuente/logotipo.py todo 02` (o el número que se elija). Los parámetros están en `TRATAMIENTOS`, al comienzo de `fuente/logotipo.py`.

## El tratamiento elegido, en números

Todas las medidas van en unidades de la grilla del símbolo (caja de 40 × 40, renglón 7, interlínea 4, paso 11).

| Medida | Valor |
| --- | --- |
| Fuente | Manrope Bold (700), de `@expo-google-fonts/manrope` 0.4.3 |
| Caja | «GymTrack»: G y T mayúsculas, el resto minúscula. Nunca todo en mayúsculas. |
| Espaciado | −1 % del cuerpo entre letras, más el kerning de la fuente (m–T −120, T–r −100, r–a −25 en unidades de 2000) |
| Cuerpo | 40,28 (la mayúscula de Manrope mide 0,72 del cuerpo) |
| Mayúscula | 29: de y23 (borde superior del 2.º renglón) a y52 (borde inferior del 4.º) |
| Línea base | y52, el borde inferior del último renglón (la base de la G) |
| Altura de x | 21,75: llega a y30,25, un cuarto de unidad bajo el borde inferior del 2.º renglón |
| Cola de la «y» | baja 9,7 bajo la línea base (hasta y61,7) |
| Separación símbolo–palabra | 11, un paso de renglón, del borde derecho del símbolo (x52) a la tinta de la G |
| Ancho total | 239,6 (6 veces el símbolo); la palabra sola mide 188,6 |
| Apilado | palabra con mayúscula de 11 (un paso), a 11 bajo el símbolo, centrada en el ancho del símbolo; ancho total 71,5 |

El texto está convertido a trazos con fontTools. Las posiciones de las letras salen de HarfBuzz (`hb-shape`), que aplica el kerning de la fuente. Comparé la palabra en trazos contra el render de HarfBuzz (`hb-view`) a 200 px de cuerpo: 0 pixeles distintos.

## Área de respeto

Un alto de renglón (7) libre por los cuatro lados, igual que el símbolo, medido desde la tinta: arriba desde el renglón superior, abajo desde la cola de la «y», a la izquierda desde el margen de la G y a la derecha desde la «k». Con el símbolo a 40 px de alto son 7 px. Los SVG ya traen exactamente ese margen en su `viewBox`.

## Tamaños mínimos (en pantalla)

| Versión | Mínimo | Ancho resultante |
| --- | --- | --- |
| Horizontal | símbolo de 30 px de alto (el mínimo del símbolo principal) | 180 px |
| Apilado | símbolo de 48 px (la mayúscula queda en 13,2 px) | 86 px |
| Palabra sola | mayúscula de 10 px | 65 px |

Bajo esos tamaños se usa el símbolo solo, con sus propias reglas (versión chica en cuadros de 16 y 32 px). En la comparación, el horizontal con símbolo de 24 px se leyó bien, pero se mantiene 30 para no contradecir el mínimo del símbolo.

## Cuándo usar cada versión

- **Horizontal (principal).** Encabezados, pantalla de inicio de sesión, web, firmas, presentaciones: todo espacio más ancho que alto.
- **Apilado.** Formatos cuadrados o verticales: avatar, portada de documento, pantalla de bienvenida, afiche.
- **Palabra sola.** Cuando el símbolo ya está cerca (la barra de la app junto al ícono, un pie de página) o en una mención dentro de una línea.
- **Compacta.** La versión compacta del logotipo es el símbolo solo (`gymtrack-simbolo.svg` y sus variantes): ícono, favicon, espacios chicos.
- **Colores.** Igual que el símbolo: principal (papel y menta) sobre tinta u otro fondo muy oscuro; sobre papel (tinta y menta) en fondos claros; mono papel o mono tinta en fotos, fondos de color, menta y en impresión a una tinta.
- **Avatar.** `png/avatar-400.png` lleva el apilado. Las redes muestran el avatar a 40 a 110 px; ahí la palabra queda bajo su mínimo. Si se ve chico, usar el ícono (`png/icono-512.png`).

## Qué no hacer

- No escribir la palabra en mayúsculas sostenidas ni en «gymtrack» o «Gymtrack».
- No volver a escribir la palabra con una fuente instalada: usar siempre los archivos en trazos (la fuente del sistema o un sustituto cambia el ancho y el kerning).
- No cambiar el peso, el espaciado, el tamaño relativo ni la separación. No mover la palabra fuera de los renglones: la base va en el último y la mayúscula sube hasta el segundo.
- No poner la palabra en menta ni en otro color: la palabra va en la misma tinta que el símbolo. El menta es solo el travesaño.
- No estirar, inclinar, rotar, reflejar, contornear ni sombrear. Sin gradientes ni texturas.
- No poner el símbolo a la derecha ni arriba de la palabra en horizontal, ni armar otras combinaciones.
- No meter texto, bordes ni otras marcas dentro del área de respeto.
- No usar el horizontal ni el apilado bajo su mínimo.

## Archivos

| Archivo | Uso |
| --- | --- |
| `gymtrack-logotipo-horizontal.svg` | Principal: papel y travesaño menta, para fondo tinta |
| `gymtrack-logotipo-horizontal-sobre-papel.svg` | Tinta y menta, para fondos claros |
| `gymtrack-logotipo-horizontal-mono-papel.svg` | Un solo color, papel, para fondos oscuros |
| `gymtrack-logotipo-horizontal-mono-tinta.svg` | Un solo color, tinta, para fondos claros |
| `gymtrack-logotipo-apilado.svg` | Apilado principal, para fondo tinta |
| `gymtrack-logotipo-apilado-sobre-papel.svg` | Apilado para fondos claros |
| `gymtrack-palabra.svg` / `gymtrack-palabra-sobre-papel.svg` | Solo la palabra, papel o tinta |
| `png/logotipo-horizontal-1200.png`, `-600.png` (y `-sobre-papel-`) | Horizontal, fondo transparente |
| `png/logotipo-apilado-1200.png`, `-600.png` (y `-sobre-papel-`) | Apilado, fondo transparente |
| `png/compartir-1200x630.png` | Imagen para compartir (Open Graph), horizontal sobre tinta |
| `png/avatar-400.png` | Avatar, apilado sobre tinta |
| `lamina-logotipo-final.png` / `.svg` | Todas las versiones sobre tinta y papel, construcción, área de respeto y mínimos |
| `../lamina-logotipo-tratamientos.png` / `.svg` | Comparación de los seis tratamientos |
| `fuente/logotipo.py`, `fuente/final.py`, `fuente/palabra.py` | Generan todo lo anterior. Necesitan `hb-shape`, `rsvg-convert`, fontTools y Pillow, y las fuentes en `node_modules`. |

Los SVG no tienen `<text>`, fuentes externas, filtros ni gradientes.

## Lo que no se pudo verificar

- No se vio en un navegador, un teléfono ni impreso: los renders son de `rsvg-convert`. El tamaño mínimo en milímetros para impresión no está definido.
- El intento de comparar contra `rsvg-convert` con un `FONTCONFIG_FILE` temporal no sirvió: en esta Mac `rsvg-convert` dibuja el texto con CoreText y cayó en una Helvetica. La comparación válida fue contra `hb-view` (HarfBuzz con la misma fuente), que coincide pixel a pixel.
- Las lecturas de equilibrio («la palabra no compite», «se suelta») son un juicio sobre los renders, no una prueba con personas.
