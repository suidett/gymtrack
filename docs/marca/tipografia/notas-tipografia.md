# GymTrack: comparación tipográfica

Fase 4, primera parte (elegir la fuente antes del logotipo). Fecha: 2026-11-16. Estado: en revisión.
Se apoya en `gymtrack-filosofia.md`, `gymtrack-filosofia-visual.md` y en el símbolo fijado `logo/exploracion-2/v07h.svg`.

Esta comparación no arma el logotipo final. Sirve para que elijas **una** familia sans («la voz que habla») con su mono («la voz que cuenta»). Esa elección define el logotipo y la letra de toda la app.

---

## Método

1. **Qué le pide la marca a la letra.** «Cuaderno Exacto»: calidez de libreta y exactitud de balanza. Dos voces: una sans que habla corto y de tú, y una mono de ancho fijo para que los kilos calcen en columna. La cifra manda. Nada de mayúsculas que gritan, cursivas de letra manuscrita ni pesos extremos. Se lee con una mano, cansado y con poca luz.
2. **Qué le pide el símbolo.** La G v07h está hecha de barras horizontales de 7 de alto, con esquinas de radio 2, y un solo trazo vertical que baja. Las formas que riman con eso: terminales planos u horizontales, curvas que tienden al rectángulo, esquinas apenas suavizadas, poco contraste de trazo.
3. **Seis familias de verdad distintas.** Elegí una por construcción, no seis geométricas parecidas: geométrica (Manrope, la actual), humanista (Source Sans 3), hiperlegible (Atkinson Hyperlegible Next), industrial de señalética (Barlow), grotesca firme (Chivo) y rectangular redondeada (Rubik).
4. **Requisitos duros.** Licencia abierta (SIL OFL), español completo, pesos de 400 a 800 y paquete `@expo-google-fonts/<familia>` publicado. Todo verificado (ver abajo).
5. **Emparejar la mono por altura de x.** Medí la altura de x y de mayúsculas de cada fuente leyendo sus tablas (sin guardar archivos). La mono propuesta es la que tiene la altura de x más cercana a la sans, o la que comparte diseño con ella. En la muestra de interfaz, la mono va escalada para igualar la altura de x de la sans (factor en la tabla).
6. **Comparar en igualdad de condiciones.** En los tableros, el logotipo usa el mismo símbolo, peso 700, espaciado de −1 % y la **misma altura de mayúsculas**: 29 de las 40 partes del símbolo. La línea base cae en el borde inferior del último renglón y la H sube hasta el borde superior del segundo, así que la palabra se apoya en el mismo renglón que la G. El tamaño de letra de cada familia se calculó desde su altura de mayúsculas medida, no a ojo. Los textos de los marcos van en la fuente del sistema para no favorecer a ninguna.

## Medidas (leídas de las fuentes servidas por Google Fonts)

Alturas en fracción del cuerpo (em). «Cifras parejas» indica si los números vienen de ancho fijo por defecto en la sans.

| # | Sans | Mayúsculas | Altura de x | x / mayúsculas | Cifras parejas | Mono | x de la mono | Factor de la mono |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Manrope | 0,720 | 0,540 | 0,75 | no | IBM Plex Mono | 0,516 | 1,047 |
| 2 | Source Sans 3 | 0,652 | 0,496 | 0,76 | sí | IBM Plex Mono | 0,516 | 0,961 |
| 3 | Atkinson Hyperlegible Next | 0,668 | 0,496 | 0,74 | no | Atkinson Hyperlegible Mono | 0,496 | 1,000 |
| 4 | Barlow | 0,700 | 0,514 | 0,73 | no | Chivo Mono | 0,511 | 1,006 |
| 5 | Chivo | 0,686 | 0,511 | 0,75 | sí | Chivo Mono | 0,511 | 1,000 |
| 6 | Rubik | 0,700 | 0,520 | 0,74 | no | IBM Plex Mono | 0,516 | 1,008 |

Monos usadas: tres (IBM Plex Mono, Atkinson Hyperlegible Mono, Chivo Mono), el máximo permitido.

---

## Los seis candidatos

### 01 · Manrope + IBM Plex Mono (la actual)
- **Aporta:** geométrica abierta, con la altura de x más alta de las seis (0,540): se lee grande a poco tamaño. Los terminales planos y la G con travesaño recto conversan con el renglón menta. Cambiarla no cuesta nada: ya está en la app.
- **Arriesga:** es una de las sans más vistas en apps de los últimos años; da orden, pero poca voz propia. Sus cifras son proporcionales y su x es más alta que la de Plex Mono, así que la mono tiene que ir un 5 % más grande para no verse chica al lado.
- **Mono:** IBM Plex Mono, la actual. Aspecto de instrumento, coma y × claros.

### 02 · Source Sans 3 + IBM Plex Mono
- **Aporta:** humanista de Adobe, la más cálida y la mejor para leer párrafos: la voz del margen del entrenador. Cifras de ancho fijo por defecto. Rima con el símbolo por contraste: la pluma junto a la regla.
- **Arriesga:** la altura de x más baja (0,496 con mayúsculas de 0,652): al mismo tamaño se ve más chica, y en el gimnasio pide subir un punto. Puede leerse como letra de documento o de software genérico.
- **Mono:** IBM Plex Mono, también humanista en su dibujo. Va al 96 % para igualar la x.

### 03 · Atkinson Hyperlegible Next + Atkinson Hyperlegible Mono
- **Aporta:** del Braille Institute, diseñada para que cada letra se distinga de la parecida (I, l, 1; O, 0). Es la única con una mono dibujada sobre las mismas medidas (mayúsculas 0,668 y x 0,496 en las dos): las dos voces son un solo sistema. Calza con «una mano, entre series, cansado y con poca luz» y con «la misma seriedad para todos».
- **Arriesga:** algunas formas son deliberadamente raras para ganar legibilidad; en el logotipo grande eso puede verse menos pulido o con aire de accesibilidad más que de marca. La versión Next es reciente (2025) y la mono es la más ancha de las tres (0,632 em por carácter), así que «30 kg × 10» ocupa más.
- **Mono:** Atkinson Hyperlegible Mono, su hermana.

### 04 · Barlow + Chivo Mono
- **Aporta:** viene de la señalética y las patentes de California. Sus curvas son casi rectángulos con esquinas suavizadas: es la rima de forma más fuerte con las barras de radio 2 del símbolo. Se lee como un instrumento, y su ritmo algo angosto deja espacio en botones y filas.
- **Arriesga:** puede irse a lo técnico o a camiseta deportiva y perder calidez de libreta. Cifras proporcionales.
- **Mono:** Chivo Mono: grotesca de ancho fijo, sin remates, con x casi igual (0,511 contra 0,514). Plex Mono, con sus remates, le pondría un acento de máquina de escribir que Barlow no tiene.

### 05 · Chivo + Chivo Mono
- **Aporta:** grotesca firme de Omnibus-Type, fundidora argentina. Terminales horizontales que siguen el renglón, presencia sin gritar y cifras de ancho fijo por defecto. Su mono hermana tiene exactamente la misma altura de x (0,511).
- **Arriesga:** es ancha (la palabra más larga después de Rubik), así que los textos de botón ocupan más. Su carácter es más de afiche que de conversación: puede sonar un poco serio para el saludo.
- **Mono:** Chivo Mono, su hermana.

### 06 · Rubik + IBM Plex Mono
- **Aporta:** cada esquina va apenas redondeada: la rima más literal con el radio 2 del símbolo. Es cercana y muy legible en pantalla.
- **Arriesga:** la más ancha (5,08 em para «GymTrack» en 700) y la más blanda. Se acerca a lo juguetón o infantil, y es muy usada en apps. En pesos altos el redondeo se nota más.
- **Mono:** IBM Plex Mono, con x casi igual (0,516 contra 0,520).

---

## Verificaciones

Todas hechas el 2026-11-16, solo consultas, sin instalar ni guardar archivos de fuentes.

**Google Fonts (`css2`, código HTTP):** todas en **200**.

| Familia | Pesos pedidos | Código |
| --- | --- | --- |
| Manrope | 400;500;600;700;800 | 200 |
| Source Sans 3 | 400;500;600;700;800 | 200 |
| Atkinson Hyperlegible Next | 400;500;600;700;800 | 200 |
| Barlow | 400;500;600;700;800 | 200 |
| Chivo | 400;500;600;700;800 | 200 |
| Rubik | 400;500;600;700;800 | 200 |
| IBM Plex Mono | 400;500;600 | 200 |
| Atkinson Hyperlegible Mono | 400;500;600 | 200 |
| Chivo Mono | 400;500;600 | 200 |

Además verifiqué las **nueve URL exactas** que usan los archivos (la del resumen, las seis de detalle y la del espécimen): todas dan 200, y en cada respuesta aparece cada familia con cada peso pedido y con el subconjunto latino (U+0000-00FF), que incluye á é í ó ú ñ ü ¿ ¡ × ·.

**Glifos en español:** leí la tabla de caracteres de cada fuente servida (400 y 800 en las sans; 400, 500 y 600 en las monos). Ninguna le falta ninguno de estos: á é í ó ú ñ ü Á É Í Ó Ú Ñ Ü ¿ ¡ × · 0 a 9 y la coma.

**Licencia:** las nueve están en la carpeta `ofl/` del repositorio de Google Fonts, con su `OFL.txt` (200). Son SIL Open Font License.

**Paquetes de Expo (`npm view @expo-google-fonts/<nombre> version`):**

| Paquete | Versión |
| --- | --- |
| @expo-google-fonts/manrope | 0.4.3 |
| @expo-google-fonts/source-sans-3 | 0.4.2 |
| @expo-google-fonts/atkinson-hyperlegible-next | 0.4.1 |
| @expo-google-fonts/barlow | 0.4.1 |
| @expo-google-fonts/chivo | 0.4.2 |
| @expo-google-fonts/rubik | 0.4.2 |
| @expo-google-fonts/ibm-plex-mono | 0.4.2 |
| @expo-google-fonts/atkinson-hyperlegible-mono | 0.4.1 |
| @expo-google-fonts/chivo-mono | 0.4.2 |

**Archivos:** los siete `.dc.html` y `especimen.html` pasan un analizador HTML sin etiquetas abiertas ni cierres cruzados, con los `&` del enlace de fuentes escritos como `&amp;`, sin `{{ }}`, sin iframes y sin emojis.

---

## Lo que elegiría yo (decides tú)

**Atkinson Hyperlegible Next con Atkinson Hyperlegible Mono.** Es la única opción en que las dos voces salen del mismo dibujo y miden lo mismo, así que la cifra y la frase conviven sin ajustes. Además su razón de ser, que cada letra se lea con poca vista, es literalmente el principio «una mano, entre series»: cansado, con poca luz y en dos segundos. Su riesgo es el logotipo: puede verse menos refinado que las demás en grande, y eso hay que mirarlo en el tablero 03 antes de decidir.

Si para ti pesa más que la palabra rime con el símbolo, la alternativa es **Barlow con Chivo Mono**. Si pesa más la continuidad y no tocar nada de la app, **Manrope con IBM Plex Mono** sigue siendo una buena voz.

La decisión es tuya. Después de que elijas, viene el ajuste de espaciado y caja, la alineación fina con el símbolo y las variantes del logotipo.

---

## Lo que quedó sin verificar

- **Cómo se ve.** No tuve navegador: no miré los tableros renderizados. Las posiciones salen de medidas de las fuentes, pero el orquestador tiene que abrir `especimen.html` y revisar que cada familia cargue y que nada se monte.
- **El ancho exacto de la palabra.** Lo calculé con los avances de cada letra, sin el interletrado de pares (kerning). Puede variar unos píxeles; los SVG tienen `overflow:visible`, así que no se corta.
- **El lienzo.** No sé si el visor de `.dc.html` aplica fuentes web al `<text>` de un SVG en línea. En un navegador normal sí. `support.js` no está en la carpeta del proyecto; lo referencio igual que la plantilla.
- **Descripciones de dibujo y origen.** Lo que digo del origen de cada familia (Braille Institute, Omnibus-Type, señalética de California) y de formas puntuales viene de lo que sé de ellas, no de una lectura de sus fichas en esta sesión.
- **Contenido de los paquetes de Expo.** Comprobé que existen y su versión, no que traigan cada peso (no los instalé).
- **El acento menta sobre papel** queda en 2,6:1 contra #F5F7F5. Es gráfico, no texto, y la G se lee por la tinta; igual conviene revisarlo en la Fase 5.
