# GymTrack · Dupla: notas

**Concepto.** Un aro vacío y un disco lleno, lado a lado: lo planeado y lo hecho, tu entrenador y tú. El aro es más grande: el plan contiene lo que haces.
La misma regla ordena los botones: contorno es «por hacer» o secundario; relleno es principal o «hecho».

## Símbolo

- Grilla de 24 × 24. Aro: centro (6,9; 12), radio exterior **5,8**, trazo **2,3** hacia adentro (hueco de radio 3,5). Disco: centro (18,55; 12), radio **4,35** (0,75 del aro). Separación entre ambos: **1,5**. Caja del dibujo: x 1,1 a 22,9 (21,8 de ancho) por 11,6 de alto, centrada en 12.
- El aro es más grande que el disco para que no sean «dos círculos iguales lado a lado», que es la construcción de otras marcas (ver «Cambios después de la revisión»). Los dos llevan casi la misma tinta (aro π × 21,4; disco π × 18,9), así que el par no se carga hacia un lado.
- Un solo color, sin superponer, sin unir, sin inclinar. El aro va en un solo trazado con `fill-rule="evenodd"` (sirve igual en `react-native-svg` y en un vector de Android con `fillType="evenOdd"`).
- **16 px** (`logo/simbolo-16.svg`): dibujo propio ajustado a píxel. Aro de 8 px con trazo de **2 px** (hueco de 4 px), disco de 6 px y 1 px de separación: 15 px de ancho, con la misma razón de 0,75. Todos los bordes caen en la grilla de píxeles (aro x 0–8 e y 4–12; disco x 9–15 e y 5–11). Lo comprobé en `logo/png/simbolo-16.png` a tamaño real y ampliado: se lee «uno vacío y grande, uno lleno», sobre claro y sobre oscuro.
- Tamaño mínimo: símbolo de 16 px (usa la versión de 16); logotipo horizontal de 80 px de ancho; impreso, símbolo de 5 mm y logotipo de 25 mm.
- Área de respeto: un disco por lado, alrededor de todo el logotipo.

## Logotipo

- «GymTrack» en **Instrument Sans 600**, G y T altas, espaciado −2 %, sin cursiva y en un solo color. En los SVG va convertido a trazados: saqué los contornos de la fuente de Google Fonts, con su interletraje.
- Horizontal: el aro mide lo mismo que la G (0,74 em: la altura de mayúscula, 0,72, más la compensación de la curva) y comparte su centro; el disco mide 0,555 em. Entre el símbolo y la palabra va un disco.
- Apilado: aro de 1,25 × altura de mayúscula, símbolo centrado sobre la palabra, separación de medio aro.
- Sobre claro va en tinta `#111111` y sobre oscuro en hueso `#F4F4F2`. La versión a un color es el mismo dibujo con `currentColor` (por defecto `#111111`). El violeta nunca va en el logo.

## Ícono de app (Android)

- `logo/icono-app.svg`, de 512 × 512: fondo hueso `#F4F4F2` a sangre y símbolo en tinta centrado, con un ancho del **64 %** (328 px). Lo medí en el PNG: la tinta llega a un radio de 163,6 px del centro y el 66 % central tiene un radio de 169 px, así que no hay ni un píxel afuera (quedan 5,3 px). Como los dos círculos están sobre el eje horizontal, el punto más lejano es el borde izquierdo del aro, a medio ancho del centro. Lo comprobé con máscara circular, cuadrado redondeado (radio de 20 %) y gota.
- Hay una sola versión: fondo claro y símbolo en tinta. La invertida (fondo `#111111`) salió de la entrega porque dentro del círculo se leía como un par de ojos.
- Capas del ícono adaptable (`icono-app-fondo`, `-frente` y `-monocromo`): el lienzo es la **capa completa de 108 dp**. El launcher muestra los 72 dp centrales, así que el símbolo mide 220 px de 512 (el 64 % de lo visible) y llega a un radio de 109,6 px: dentro del 66 % de lo visible (112,6 px) y de la zona segura de 66 dp de Android (156 px). Hay PNG de 512 y de 1024 (el de 1024 es el que pide Expo en `android.adaptiveIcon`). La capa monocroma es la del ícono temático de Android 13 en adelante.
- Ojo con el ícono temático: con el teléfono en modo oscuro, Android lo pinta claro sobre fondo oscuro, es decir, invertido, y eso no lo controlamos. Con la proporción nueva (aro más grande que el disco) la lectura de ojos se debilita, pero conviene mirarlo en un teléfono real.

## Paleta

| Token | Clara | Modo gimnasio |
|---|---|---|
| Fondo (`fondo`) | `#F4F4F2` | `#0C0C0C` |
| Superficie (`superficie`) | `#FFFFFF` | `#1A1A19` |
| Superficie alta (`superficieAlta`) | `#FFFFFF` | `#2A2A28` |
| Texto (`texto`) | `#111111` | `#F4F4F2` |
| Texto secundario (`textoSecundario`) | `#5C5C58` | `#A3A39E` |
| Acción (relleno) (`accion`) | `#111111` | `#F4F4F2` |
| Texto sobre acción (`accionTexto`) | `#FFFFFF` | `#111111` |
| Acción presionada (`accionPresionada`) | `#3A3A38` | `#CFCFCB` |
| Acento (foco, enlaces, avisos) (`acento`) | `#5A45E0` | `#A698FF` |
| Relleno suave (`suave`) | `#E7E7E3` | `#2A2A28` |
| Fila hecha (`filaHecha`) | `#E7E7E3` | `#2A2A28` |
| Borde de control (`borde`) | `#8A8A85` | `#7A7A75` |
| Contorno protagonista (`bordeFuerte`) | `#111111` | `#F4F4F2` |
| Peligro (`peligro`) | `#C0271D` | `#FF7A70` |
| Texto sobre peligro (`peligroTexto`) | `#FFFFFF` | `#111111` |
| Peligro presionado (nuevo) (`peligroPresionado`) | `#961E17` | `#D6665E` |
| Deshabilitado, relleno (`deshabilitadoRelleno`) | `#E7E7E3` | `#2A2A28` |
| Deshabilitado, texto (`deshabilitadoTexto`) | `#767671` | `#A3A39E` |

**Nunca como texto:** el gris de bordes `#8A8A85` (y `#7A7A75` en modo gimnasio) y el violeta claro `#A698FF` sobre fondos claros. El violeta nunca es relleno de botón.

**Lo que resolví del encargo:** el encargo pedía `#7A7A75` como texto deshabilitado en modo gimnasio, pero ese mismo color está en la lista de «nunca como texto». Usé el texto secundario `#A3A39E`. Un control deshabilitado igual se reconoce porque pierde el contorno o el relleno y queda en `#2A2A28`, y además la etiqueta se lee con poca luz. Queda anotado en `tokens.json`, en `cambiosRespectoDelEncargo`.

**Rojo presionado:** `peligroPresionado` (`#961E17` en clara, `#D6665E` en modo gimnasio) es un token nuevo, agregado en la revisión para «Sí, borrar» presionado.

## Contraste calculado (WCAG 2.x, con `contraste.py`)

Clara:

| Uso | Primer plano | Fondo | Razón | Mínimo |
|---|---|---|---|---|
| Texto sobre fondo | `#111111` | `#F4F4F2` | 17,15:1 | 4,5:1 |
| Texto sobre superficie | `#111111` | `#FFFFFF` | 18,88:1 | 4,5:1 |
| Texto sobre fila hecha / fantasma presionado | `#111111` | `#E7E7E3` | 15,23:1 | 4,5:1 |
| Texto secundario sobre fondo | `#5C5C58` | `#F4F4F2` | 6,1:1 | 4,5:1 |
| Texto secundario sobre superficie | `#5C5C58` | `#FFFFFF` | 6,72:1 | 4,5:1 |
| Texto secundario sobre fila hecha | `#5C5C58` | `#E7E7E3` | 5,42:1 | 4,5:1 |
| Etiqueta de primario (blanco sobre tinta) | `#FFFFFF` | `#111111` | 18,88:1 | 4,5:1 |
| Etiqueta de primario presionado | `#FFFFFF` | `#3A3A38` | 11,4:1 | 4,5:1 |
| Acento (enlace, aviso) sobre superficie | `#5A45E0` | `#FFFFFF` | 6,25:1 | 4,5:1 |
| Acento sobre fondo | `#5A45E0` | `#F4F4F2` | 5,67:1 | 4,5:1 |
| Peligro sobre superficie | `#C0271D` | `#FFFFFF` | 5,92:1 | 4,5:1 |
| Peligro sobre fondo | `#C0271D` | `#F4F4F2` | 5,37:1 | 4,5:1 |
| Peligro de contorno presionado (sobre relleno suave) | `#C0271D` | `#E7E7E3` | 4,77:1 | 4,5:1 |
| «Sí, borrar» (blanco sobre peligro) | `#FFFFFF` | `#C0271D` | 5,92:1 | 4,5:1 |
| «Sí, borrar» presionado (blanco sobre peligro presionado) | `#FFFFFF` | `#961E17` | 8,42:1 | 4,5:1 |
| Elegido de chip (blanco sobre tinta) | `#FFFFFF` | `#111111` | 18,88:1 | 4,5:1 |
| Deshabilitado (exento de AA) | `#767671` | `#E7E7E3` | 3,68:1 | exento |
| Borde gris de chip sobre superficie | `#8A8A85` | `#FFFFFF` | 3,47:1 | 3:1 |
| Borde gris de chip sobre fondo | `#8A8A85` | `#F4F4F2` | 3,15:1 | 3:1 |
| Contorno tinta sobre superficie | `#111111` | `#FFFFFF` | 18,88:1 | 3:1 |
| Contorno tinta sobre fondo | `#111111` | `#F4F4F2` | 17,15:1 | 3:1 |
| Relleno de acción sobre fondo | `#111111` | `#F4F4F2` | 17,15:1 | 3:1 |
| Acción presionada sobre fondo | `#3A3A38` | `#F4F4F2` | 10,35:1 | 3:1 |
| Anillo de foco sobre superficie | `#5A45E0` | `#FFFFFF` | 6,25:1 | 3:1 |
| Anillo de foco sobre fondo | `#5A45E0` | `#F4F4F2` | 5,67:1 | 3:1 |
| Contorno de peligro sobre superficie | `#C0271D` | `#FFFFFF` | 5,92:1 | 3:1 |
| Relleno de «Sí, borrar» presionado sobre superficie | `#961E17` | `#FFFFFF` | 8,42:1 | 3:1 |
| Disco hecho sobre fila hecha | `#111111` | `#E7E7E3` | 15,23:1 | 3:1 |
| Visto blanco sobre disco tinta | `#FFFFFF` | `#111111` | 18,88:1 | 3:1 |
| Perilla blanca sobre riel tinta | `#FFFFFF` | `#111111` | 18,88:1 | 3:1 |
| Subrayado de edición sobre superficie | `#5A45E0` | `#FFFFFF` | 6,25:1 | 3:1 |

Modo gimnasio:

| Uso | Primer plano | Fondo | Razón | Mínimo |
|---|---|---|---|---|
| Texto sobre fondo | `#F4F4F2` | `#0C0C0C` | 17,76:1 | 4,5:1 |
| Texto sobre superficie | `#F4F4F2` | `#1A1A19` | 15,82:1 | 4,5:1 |
| Texto sobre superficie alta / fila hecha | `#F4F4F2` | `#2A2A28` | 13,06:1 | 4,5:1 |
| Texto secundario sobre fondo | `#A3A39E` | `#0C0C0C` | 7,72:1 | 4,5:1 |
| Texto secundario sobre superficie | `#A3A39E` | `#1A1A19` | 6,88:1 | 4,5:1 |
| Texto secundario sobre fila hecha | `#A3A39E` | `#2A2A28` | 5,68:1 | 4,5:1 |
| Etiqueta de primario (#111111 sobre hueso) | `#111111` | `#F4F4F2` | 17,15:1 | 4,5:1 |
| Etiqueta de primario presionado | `#111111` | `#CFCFCB` | 12,09:1 | 4,5:1 |
| Acento sobre superficie | `#A698FF` | `#1A1A19` | 7,1:1 | 4,5:1 |
| Acento sobre fondo | `#A698FF` | `#0C0C0C` | 7,97:1 | 4,5:1 |
| Peligro sobre superficie | `#FF7A70` | `#1A1A19` | 6,86:1 | 4,5:1 |
| Peligro sobre fondo | `#FF7A70` | `#0C0C0C` | 7,7:1 | 4,5:1 |
| Peligro de contorno presionado (sobre #2A2A28) | `#FF7A70` | `#2A2A28` | 5,66:1 | 4,5:1 |
| «Sí, borrar» (#111111 sobre peligro) | `#111111` | `#FF7A70` | 7,44:1 | 4,5:1 |
| «Sí, borrar» presionado (#111111 sobre peligro presionado) | `#111111` | `#D6665E` | 5,32:1 | 4,5:1 |
| Deshabilitado: #A3A39E sobre #2A2A28 (exento; cambio respecto del encargo) | `#A3A39E` | `#2A2A28` | 5,68:1 | exento |
| Referencia: #7A7A75 sobre #2A2A28 (no se usa como texto) | `#7A7A75` | `#2A2A28` | 3,33:1 | exento |
| Borde gris de chip sobre superficie | `#7A7A75` | `#1A1A19` | 4,04:1 | 3:1 |
| Borde gris de chip sobre fondo | `#7A7A75` | `#0C0C0C` | 4,53:1 | 3:1 |
| Contorno hueso sobre superficie | `#F4F4F2` | `#1A1A19` | 15,82:1 | 3:1 |
| Contorno hueso sobre fondo | `#F4F4F2` | `#0C0C0C` | 17,76:1 | 3:1 |
| Relleno de acción sobre fondo | `#F4F4F2` | `#0C0C0C` | 17,76:1 | 3:1 |
| Acción presionada sobre fondo | `#CFCFCB` | `#0C0C0C` | 12,52:1 | 3:1 |
| Anillo de foco sobre superficie | `#A698FF` | `#1A1A19` | 7,1:1 | 3:1 |
| Anillo de foco sobre fondo | `#A698FF` | `#0C0C0C` | 7,97:1 | 3:1 |
| Contorno de peligro sobre superficie | `#FF7A70` | `#1A1A19` | 6,86:1 | 3:1 |
| Relleno de «Sí, borrar» presionado sobre superficie | `#D6665E` | `#1A1A19` | 4,91:1 | 3:1 |
| Disco hecho sobre fila hecha | `#F4F4F2` | `#2A2A28` | 13,06:1 | 3:1 |
| Visto #111111 sobre disco hueso | `#111111` | `#F4F4F2` | 17,15:1 | 3:1 |
| Perilla #111111 sobre riel hueso | `#111111` | `#F4F4F2` | 17,15:1 | 3:1 |
| Subrayado de edición sobre superficie | `#A698FF` | `#1A1A19` | 7,1:1 | 3:1 |
| Disco presionado de más y menos sobre superficie | `#F4F4F2` | `#1A1A19` | 15,82:1 | 3:1 |

Todos los pares de texto pasan 4,5:1 y todos los de control pasan 3:1. El más justo es el borde de chip `#8A8A85` sobre el fondo `#F4F4F2` (3,15:1); los chips van sobre la superficie blanca siempre que se pueda (3,47:1).

## Tipografía

- Interfaz: **Instrument Sans** 500 para texto y 600 para etiquetas de botón (16 sp, solo la primera letra en mayúscula; 18 sp en «Empezar entrenamiento»).
- Cifras: **DM Mono** 500, de ancho fijo: kilos, repeticiones y tiempo no saltan al cambiar. En más y menos van a 26 sp y la unidad, en Instrument Sans 500 de 13 sp.
- La coma decimal de DM Mono ocupa una celda entera y «62,5» se veía abierto. Se cierra con **0,10 em antes y 0,16 em después** (es asimétrico porque la coma de DM Mono está corrida a la izquierda en su celda). En la lámina es `.coma { margin-left: -0.1em; margin-right: -0.16em }`. En React Native: tres `Text` en una fila (entero, coma, decimales) y la coma con `marginLeft: -0.10 * tamaño * fontScale` y `marginRight: -0.16 * tamaño * fontScale` (a 26 sp, −2,6 y −4,2 dp). Las cifras siguen sin saltar: el espacio de la cifra tiene ancho fijo y va alineado a la derecha. Mientras se escribe en el campo, la coma queda normal.
- Las dos fuentes vienen de Google Fonts (`@expo-google-fonts/instrument-sans` y `@expo-google-fonts/dm-mono`).

## Botones: decisiones

- Todo es pastilla (radio = mitad del alto). El contorno mide siempre 1,5 dp; el aro de marcar serie y el riel del interruptor, 2 dp. Sin sombras ni degradados.
- Presionado sin escala: el primario pasa a `#3A3A38`; el secundario, el fantasma y el peligro de contorno se llenan con el relleno suave. La confirmación «Sí, borrar» se oscurece a `#961E17` (modo gimnasio `#D6665E`) y la etiqueta no cambia: un relleno presionado sigue siendo relleno.
- Chip: una marca de 8 dp que pasa de aro a disco acompaña al relleno, así el estado elegido no depende solo del color. El ancho se reserva para el peso 600 y el chip no cambia de tamaño al elegirlo.
- Más y menos: kilos y repeticiones miden lo mismo, **232 × 56 dp**, así el + queda en el mismo lugar bajo el pulgar al bajar de una pastilla a la otra. El espacio de la cifra tiene ancho fijo (5 caracteres en kilos, 2 en repeticiones) para que la unidad no se mueva durante el fundido. Al llegar al límite, el signo se apaga (`aria-disabled`) y el toque vibra con Warning.
- Marcar serie: el visto mide **30 dp** con trazo de 3 dp, centrado en el disco de 56. Aparece en los últimos 80 ms con fundido y un barrido de izquierda a derecha, hecho con dos `translateX` dentro de un recorte. No anima el trazo.
- Cargar: los tres aros se llenan por turno (cada uno se llena en su tramo de 300 ms y se vacía en el siguiente), así el ciclo no salta. Con «reducir movimiento» se ve «Guardando…»; en «Empezar entrenamiento» dice «Preparando…».
- Interruptor: la perilla de aro (20 dp) y la de disco (22 dp) se cruzan con fundido mientras recorren 24 dp, así que no hay cambio de tamaño animado.

## Movimiento (para Reanimated)

| Evento | ms | Curva | Vibración | Reducir movimiento |
|---|---|---|---|---|
| Presionar | 60 | `Easing.bezier(0, 0, 1, 1)` | Haptics.impactAsync(ImpactFeedbackStyle.Light) en primario y «Empezar entrenamiento»; el resto, sin vibración | 0 ms: el color cambia de inmediato. La vibración se mantiene. |
| Soltar | 140 | `Easing.bezier(0.3, 0, 0, 1)` | Sin vibración | 0 ms. |
| Marcar serie: el disco crece desde el centro del aro y la fila cambia de fondo | 180 | `Easing.bezier(0.3, 0, 0, 1)` | Haptics.notificationAsync(NotificationFeedbackType.Success) · Android: `AndroidHaptics.Confirm` | El aro pasa a disco sin crecer; fila y visto cambian de inmediato. La vibración se mantiene. |
| Marcar serie: el visto aparece (fundido y barrido) en los últimos 80 ms | 80 (retraso 100) | `Easing.bezier(0, 0, 1, 1)` | (la misma de marcar) | Aparece de inmediato. |
| Desmarcar serie | 100 | `Easing.bezier(0.3, 0, 0, 1)` | Haptics.selectionAsync() | 0 ms. La vibración se mantiene. |
| Más y menos: fundido cruzado de la cifra, sin desplazarse; la zona tocada se invierte | 80 | `Easing.bezier(0, 0, 1, 1)` | Haptics.selectionAsync() por paso; en el límite, Haptics.notificationAsync(NotificationFeedbackType.Warning), sin sacudida · Android: `AndroidHaptics.Clock_Tick; en el límite, AndroidHaptics.Reject` | La cifra se reemplaza. La vibración se mantiene. |
| Cargar: cada aro se llena por turno | 300 | `Easing.bezier(0.3, 0, 0, 1)` | Sin vibración | Sin aros: texto fijo «Guardando…». |
| Cambio de estado: chip (relleno) | 120 | `Easing.bezier(0.3, 0, 0, 1)` | Haptics.selectionAsync() · Android: `AndroidHaptics.Toggle_On / Toggle_Off` | 0 ms. La vibración se mantiene. |
| Cambio de estado: interruptor (la perilla recorre mientras el riel se llena) | 180 | `Easing.bezier(0.3, 0, 0, 1)` | Haptics.selectionAsync() · Android: `AndroidHaptics.Toggle_On / Toggle_Off` | La perilla salta. La vibración se mantiene. |
| Cargar, ciclo completo (aparece pasados 150 ms) | 900 | `Easing.bezier(0.3, 0, 0, 1)` | Sin vibración | Texto fijo «Guardando…» |
| Mantener presionado más o menos | 400, luego cada 90 | — | `Haptics.selectionAsync()` por paso · Android: `AndroidHaptics.Clock_Tick` | Igual |

```ts
import { Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const llenar = Easing.bezier(0.3, 0, 0, 1);
const lineal = Easing.bezier(0, 0, 1, 1);
export const mov = {
  presionar:   { duration: 60,  easing: lineal },
  soltar:      { duration: 140, easing: llenar },
  marcar:      { duration: 180, easing: llenar },           // disco: escala 0 → 1; fila: interpolateColor
  visto:       { duration: 80,  delay: 100, easing: lineal }, // opacidad + barrido con translateX
  desmarcar:   { duration: 100, easing: llenar },
  cifra:       { duration: 80,  easing: lineal },           // fundido cruzado entre dos Text
  cargaPaso:   { duration: 300, easing: llenar },           // ciclo 900, aparece pasados 150 ms
  chip:        { duration: 120, easing: llenar },
  interruptor: { duration: 180, easing: llenar },           // translateX 24 + fundido aro/disco
  repetir:     { primero: 400, cada: 90 },
};
// Con «reducir movimiento» (ajuste de la app o useReducedMotion()): duration 0 en todo; la vibración se mantiene.
```

## Archivos

- `logo/`: símbolo (y su versión de 16 px), logotipos horizontal y apilado sobre claro, sobre oscuro y a un color, ícono de app, capas del ícono adaptable, vistas previas con máscara y `png/` con los renders.
- `lamina-logo.svg` y `lamina-logo.png`: construcción, logotipos, ícono con máscaras (circular, redondeada, gota y temático), zona segura, capa de primer plano, tira de 64, 32 y 16 px y versiones.
- `botones.html`: lámina interactiva (claro o modo gimnasio, interruptor de «reducir movimiento» que también respeta `prefers-reduced-motion`, estados estáticos, piezas para tocar, teléfono de 412 × 892, tablas de movimiento y contraste). Para abrirla en modo gimnasio, agrega `#gimnasio` a la dirección.
- `captura-botones.png` (clara) y `captura-botones-gimnasio.png`.
- `tokens.json`: colores, radios, altos, trazos, duraciones, curvas, vibraciones, el ajuste de la coma y los cambios respecto del encargo. Es la misma fuente que usa el CSS de la lámina.

## Riesgos que revisé

- Pausa, ojos, interruptor genérico o dos puntos de carga: los círculos ya no son del mismo tamaño, uno está claramente vacío y no se tocan. La lectura de «ojos» aparecía sobre todo en la variante invertida dentro de un círculo, que salió de la entrega. Queda el caso del ícono temático en modo oscuro, que pinta Android.
- Marcas ajenas: ver la comparación en «Cambios después de la revisión». No es la inicial G ni un objeto de gimnasio.

## Cambios después de la revisión

El director de arte revisó la dirección. Su veredicto: el sistema de botones es el más coherente (una sola regla, contorno o relleno, lo explica todo) y el logo es el punto débil, chico y anónimo en el ícono, con una construcción de dos círculos que ya usan otras marcas. El concepto no cambió. Estos son los ocho arreglos; los revisé en los PNG nuevos (el 7, en `tokens.json`):

1. **Ícono más grande.** El símbolo pasó del 58 % al **64 %** del ancho (328 px de 512). Medido en `logo/png/icono-app-512.png`: radio máximo de tinta 163,6 px, contra 169 px del 66 % central (sobran 5,3 px). En la capa adaptable mide 220 px de 512 (64 % de los 72 dp visibles) y llega a 109,6 px, dentro del 66 % de lo visible (112,6 px).
2. **Proporción del símbolo.** Lo comparé con marcas de dos círculos. La más cercana es Flickr: dos puntos llenos, iguales, lado a lado y casi juntos; con dos círculos iguales y separación de 1, Dupla tenía esa misma construcción aunque uno fuera vacío. Mastercard junta dos círculos iguales que se superponen. OpenTable pone un círculo chico a la izquierda de un aro rojo grueso. Cambié la proporción: el **aro es más grande que el disco (razón 0,75)** y la **separación sube de 1 a 1,5**. No llegué más lejos porque un disco mucho más chico que el aro se acercaría al punto con aro de OpenTable. Lo que queda distinto de esa marca: el orden es el inverso (aro primero), el disco es grande (0,75 del aro, no un punto), el aro tiene un hueco amplio (60 % del radio) y todo es de un color. Probé en PNG razones de 0,7, 0,75 y 0,82, y dos círculos iguales con separación de 3: 0,82 todavía se lee como par igual y la separación de 3 con círculos iguales se lee más como ojos. Con el cambio se rehicieron la versión de 16 px (aro 8 px, disco 6 px), los logotipos (el aro mide lo mismo que la G) y la lámina.
3. **Sin variante invertida.** Salieron `icono-app-invertido.svg`, sus capas, sus vistas previas y sus PNG. En la lámina, sus dos lugares los ocupan la máscara de gota y el ícono temático. El logotipo sobre oscuro se queda: lo necesita el encabezado en modo gimnasio y no va dentro de un círculo.
4. **Visto de 30 dp.** El visto de la serie hecha pasó de 24 a **30 dp** (el mismo dibujo escalado 1,25) y su trazo de 2,5 a **3 dp**, para no quedar delgado al crecer. Va centrado en el disco de 56 (11 dp por lado). Medido en la lámina: la ventana del visto mide 30 × 30.
5. **Pastillas iguales.** Kilos y repeticiones miden **232 × 56 dp** las dos; antes repeticiones medía 208. Medido en la lámina: el + de las dos queda en x = 593, el mismo lugar bajo el pulgar.
6. **«Sí, borrar» presionado.** Ya no se vacía a contorno: se oscurece con el token nuevo `peligroPresionado`, `#961E17` en clara (blanco encima: 8,42:1) y `#D6665E` en modo gimnasio (`#111111` encima: 5,32:1). Entre el rojo normal y el presionado hay una razón de 1,4:1, la misma que entre el primario y su presionado en modo gimnasio.
7. **Texto deshabilitado de modo gimnasio.** `#A3A39E` quedó anotado en `tokens.json` como cambio respecto del encargo (`cambiosRespectoDelEncargo`: el encargo pedía `#7A7A75`, que está en «nunca como texto» y da 3,33:1 sobre `#2A2A28`; `#A3A39E` da 5,68:1). En la misma lista va `peligroPresionado`, como token agregado.
8. **Coma de DM Mono cerrada.** «62,5» ya no se ve abierto: la coma se acerca 0,10 em por la izquierda y 0,16 em por la derecha. Lo probé a 26 px con cinco ajustes (de −0,10/−0,10 a −0,14/−0,20); con −0,14/−0,20 la cola de la coma casi toca el 2. Va en la lámina de botones (más y menos, filas de serie, el teléfono y las tablas), en las cotas de la lámina de logo y en `tokens.json` con la receta para React Native.

También se volvieron a generar `logo/png/`, `lamina-logo.png`, `captura-botones.png` y `captura-botones-gimnasio.png`, y la tabla de contraste suma los cuatro pares nuevos del rojo presionado. Todos los pares de texto siguen sobre 4,5:1 y todos los de control sobre 3:1.
