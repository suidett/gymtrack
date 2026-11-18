# GymTrack: exploración del símbolo, ronda 1

Fase 3, Modo C (SVG a mano, sin generador de imágenes). Fecha: 2026-11-16. Estado: en revisión.
Se apoya en «la libreta compartida» y en la estética «Cuaderno Exacto».

Esta ronda busca divergencia: diez ideas con estructura distinta para que el usuario descarte. Ninguna está refinada ni elegida.

## Archivos

- `v01.svg` a `v10.svg`: un concepto por archivo, `viewBox="0 0 64 64"`, sin texto, sin filtros ni gradientes. La tinta usa `currentColor` (por defecto #131A17) y el acento es menta #45B392.
- `render/vNN-256.png`, `vNN-32.png`, `vNN-16.png`: cada concepto renderizado con `rsvg-convert`.
- `lamina-exploracion-1.svg` y `.png` (2400 × 1206): grilla de 5 × 2. Cada celda muestra el símbolo en papel y en tinta, y una tira de 64, 32 y 16 px en un solo color.
- `lamina-icono-android.svg` y `.png` (2280 × 690): los diez símbolos dentro de la máscara circular, sobre menta con tinta y sobre tinta con papel.

## Reglas comunes de esta ronda

- Trazo base de 7 unidades sobre 64, o sea 1,75 px a 16 px. La excepción es el × de la 04, que lleva 9.
- Esquinas con radio de 2 unidades: suavizadas, no redondas. Los renglones de la 07 son la excepción, con puntas de píldora.
- Todos los dibujos caben en un círculo de radio 28 alrededor del centro, medido sobre el render. Por eso entran en la zona segura del ícono adaptativo sin depender de las esquinas.
- El menta es solo acento. La tira de tamaños de la lámina va sin menta para demostrar que cada símbolo funciona en un solo color.

## Conceptos

### 01 · Renglones y margen
- **Idea:** el margen vertical del entrenador y tres renglones del alumno; el último es más corto porque la página se está escribiendo.
- **Contradice:** el logo de fitness diagonal y en movimiento. Este es estático, horizontal y ordenado como una página.
- **Punto débil:** se lee como el ícono de «alinear a la izquierda» o de lista. Cuesta adueñárselo.

### 02 · La página siguiente
- **Idea:** dos páginas lado a lado. La de hoy está llena y tiene un renglón calado; la siguiente es un contorno con su primer renglón ya escrito, a la misma altura.
- **Contradice:** el foco en el esfuerzo de ahora. El símbolo muestra lo que viene, no el sudor.
- **Punto débil:** a 16 px el renglón de la página derecha se funde con el contorno. En chico se parece a un ícono de columnas o de «pausa».

### 03 · Series marcadas
- **Idea:** tres series en fila: dos hechas (llenas) y la que sigue (vacía).
- **Contradice:** el anillo de progreso que se cierra. Acá el avance se cuenta por unidades enteras, no por porcentaje.
- **Punto débil:** la silueta es baja y ancha, y en el ícono queda chica. Se confunde con los puntos de carga o de paginación. A 16 px el hueco del tercer cuadrado queda gris.

### 04 · El signo por
- **Idea:** el × de «30 kg × 10», subrayado. Es el signo que une la carga con las repeticiones.
- **Contradice:** el logo de fitness que muestra un cuerpo o un objeto. Este es un signo tipográfico de la planilla.
- **Punto débil:** un × solo dice «cerrar», «error» o «cancelar». El subrayado lo salva solo a medias. Es el que mejor aguanta a 16 px.

### 05 · La coma decimal
- **Idea:** la coma de «2,5» sentada en un renglón: la precisión de la unidad mínima.
- **Contradice:** la potencia y el tamaño. Elige el signo más chico de la cifra.
- **Punto débil:** a 16 y 32 px la coma se lee como un «9» o un «?», y junto al renglón como «–9». En ícono queda descentrada a la vista.

### 06 · La balanza en el fiel
- **Idea:** un brazo nivelado sobre su apoyo, con la aguja vertical en menta: el equilibrio entre dos y el dato exacto.
- **Contradice:** la inclinación hacia adelante que usan los logos deportivos para sugerir velocidad. Este está quieto y en equilibrio.
- **Punto débil:** puede leerse como un balancín de plaza o como símbolo legal. La aguja suelta es la pieza más chica de la ronda y casi desaparece a 16 px.

### 07 · G de renglones
- **Idea:** una G hecha solo de renglones, como si la letra estuviera escrita en la bitácora.
- **Contradice:** el monograma en cursiva o inclinado «a toda velocidad». Esta G está derecha y pautada.
- **Punto débil:** en grande se lee primero como líneas de texto y después como G. En chico, en cambio, la G aparece. Cuatro filas son el máximo antes de que se empasten.

### 08 · El círculo del profe
- **Idea:** el círculo abierto que el entrenador traza alrededor de la cifra del alumno: dos letras en la misma página.
- **Contradice:** el anillo cerrado de meta cumplida (tipo Activity). Este anillo no se completa: marca atención, no logro.
- **Punto débil:** en un solo color se lee como «⊖» (quitar) o como botón de encendido. A 32 px aparece además una G, lo que puede jugar a favor o en contra.

### 09 · Dos letras, un renglón
- **Idea:** la G y la T unidas por el mismo renglón superior, en menta. Las dos letras comparten una línea, como alumno y entrenador.
- **Contradice:** el monograma deportivo agresivo y biselado. Este es recto y de oficina de planos.
- **Punto débil:** la G cuadrada parece una greca o un laberinto. Es el más pesado de la ronda y el más cercano a un logotipo con letras, que es tarea de la Fase 4.

### 10 · El marcapáginas
- **Idea:** la cinta que cuelga del renglón y marca dónde se quedó; la próxima sesión parte ahí. De paso, la cinta y el renglón forman una T.
- **Contradice:** el movimiento y la explosión. Este símbolo trata de memoria y continuidad.
- **Punto débil:** el marcapáginas es el ícono genérico de «guardar» en cualquier app. La muesca de la cinta casi se pierde a 16 px.

## Lo que no se pudo verificar

- No se probó en un teléfono real ni en el launcher de Android. La lámina del ícono simula la máscara circular; otras máscaras (redondeada o en gota) no se probaron.
- El renderizado a 16 px es el de `rsvg-convert` con antialiasing. Android y los navegadores pueden alinear los píxeles de otra forma.
- El contraste del menta como trazo fino sobre papel es bajo (2,6:1). Por eso en ningún concepto el menta lleva solo la idea.
