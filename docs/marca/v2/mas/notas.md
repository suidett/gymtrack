# GymTrack · dirección «Más»

Logo y botones. Modo gimnasio (oscuro) es la versión principal; la clara es la secundaria.

## Concepto

El logo es el botón de más: entrenar es sumar un poco cada vez.
Un kilo más, una repetición más: el progreso dicho sin flechas ni escaleras, con el botón que GymTrack hace mejor que los líderes (más y menos de 56 dp en vez de teclado).

## Símbolo

Signo más delgado de tres piezas rectas, en una grilla de 24 × 24 («un menos al que se le suma un trazo»).

| Pieza | Rectángulo (x, y, ancho, alto) | Radio | Color sobre oscuro | Sobre claro |
|---|---|---|---|---|
| Trazo vertical | 10, 3, 4, 18 | 1 | `#F5B83D` | `#F5B83D` |
| Tramo izquierdo del menos | 3, 10, 5,5, 4 | 1 | `#F2F3F4` | `#0F1113` |
| Tramo derecho del menos | 15,5, 10, 5,5, 4 | 1 | `#F2F3F4` | `#0F1113` |

- Proporción grosor:largo 1:4,5. Entre el vertical y cada tramo queda un corte de 1,5 unidades: es lo propio del símbolo y se ve en todos los tamaños.
- Para que no parezca cruz de farmacia, de primeros auxilios ni bandera: trazos delgados, dos tonos, los cortes, nunca en verde ni rojo, nunca dentro de un círculo o un cuadrado dibujado.
- Versión de 16 px (`logo/simbolo-16-sobre-oscuro.svg`), ajustada a píxel: vertical 3 × 13, tramos 4 × 3, cortes de 1 px, sin radio. El encargo pedía 3 × 14, pero con un trazo de 3 px el más solo queda simétrico con un alto impar; 13 es lo más cercano. El dibujo ocupa 13 × 13 y queda medio píxel arriba a la izquierda del centro. Comprobado en `logo/png/simbolo-16-sobre-oscuro.png` (16 × 16 real): los cortes se ven.
- Agregué una versión de 32 px ajustada a píxel (`logo/simbolo-32-sobre-oscuro.svg`: vertical 5 × 23, tramos 7 × 5, cortes de 2 px) porque la grilla de 24 escalada a 32 deja bordes borrosos. Desde 48 px se usa el símbolo normal (la grilla cae en píxeles enteros).

**Tamaño mínimo.** Símbolo: 16 px con la versión ajustada. Logotipo horizontal: símbolo de 16 dp de alto (unos 113 dp de ancho).

**Área de respeto.** Un tercio del símbolo (6 unidades de la grilla) por lado, alrededor del símbolo y del logotipo. Está dibujada en la lámina.

**Sobre claro.** El ámbar sobre `#F3F4F5` da 1,62:1. Como logo no transmite información, pero se pierde en tamaños chicos: la versión de dos tonos sobre claro va solo desde 48 px; bajo 48 px, y dentro de la interfaz clara, se usa la versión de un color en grafito.

| Par del símbolo | Razón |
|---|---:|
| Ámbar `#F5B83D` sobre `#0F1113` | 10,64:1 |
| Tramos `#F2F3F4` sobre `#0F1113` | 17,03:1 |
| Grafito `#0F1113` sobre `#F3F4F5` | 17,18:1 |
| Ámbar `#F5B83D` sobre `#F3F4F5` | 1,62:1 (por eso, un color bajo 48 px) |
| Ámbar `#F5B83D` sobre el fondo del ícono `#1A1D20` | 9,52:1 |
| Tramos `#F2F3F4` sobre el fondo del ícono `#1A1D20` | 15,24:1 |

## Logotipo

«GymTrack» en Archivo 600, ancho normal, mayúsculas y minúsculas, espaciado 0 salvo el par «m T» (cerrado 100 unidades por em, 0,1 em), un solo color (`#F2F3F4` sobre oscuro, `#0F1113` sobre claro). Texto convertido a trazados en todos los SVG.

- Horizontal: el símbolo mide lo que la G más un 15 %, centrado en la altura de la G; separación de medio símbolo.
- Apilado: la G mide 1/2,2 del símbolo; separación de un tercio del símbolo.

## Ícono de app

512 × 512, fondo `#1A1D20` a sangre (antes `#0F1113`; la comparación está en `icono-lanzador.png`), símbolo en dos tonos de 252 px (49 % del ancho; unidad de 14 px, así todos los bordes caen en píxel entero). El punto más lejano del dibujo está a 127 px del centro: todo queda dentro del círculo central del 66 % (radio 169 px), medido sobre el PNG.

Capas: `icono-app-fondo.svg`, `icono-app-primer-plano.svg` y `icono-app-monocromo.svg` (Android usa solo el canal alfa para el ícono temático). Vistas previas con máscara circular y de cuadrado redondeado en SVG y PNG. Para el ícono adaptable de Expo (`adaptiveIcon`, lienzo de 108 dp con 72 dp visibles), el símbolo de 252/512 px cae dentro del círculo seguro de 66 dp.

## Paleta

| Uso | Modo gimnasio | Clara |
|---|---|---|
| Fondo | `#0F1113` | `#F3F4F5` |
| Superficie | `#1A1D20` | `#FFFFFF` |
| Superficie alta | `#24282C` | `#E4E6E8` (solo presionado y deshabilitado) |
| Texto | `#F2F3F4` | `#0F1113` |
| Texto secundario | `#A0A6AD` | `#555B62` |
| Acción (relleno) / su texto | `#F5B83D` / `#0F1113` | `#0F1113` / `#FFFFFF` |
| Acción presionada | `#D99A1F` | `#2B3035` |
| Acento como texto | `#F5B83D` | `#8A5A00` |
| Fila hecha | `#3A2F14` | `#FCEFC9` |
| Interruptor encendido | riel `#F5B83D`, perilla `#0F1113` | riel `#F5B83D` con borde 2 dp `#8A5A00`, perilla `#0F1113` |
| Borde de controles | `#767D85` | `#6F767E` |
| Peligro | `#FF6B5E` (relleno con texto `#0F1113`) | `#B42318` (relleno con texto blanco) |
| Deshabilitado | relleno `#24282C`, texto `#767D85` | relleno `#E4E6E8`, texto `#6F767E` |
| Foco (anillo 2 dp, separado 2 dp) | `#F2F3F4` | `#0F1113` |

**Nunca como texto:** el ámbar `#F5B83D` sobre fondos claros (1,78:1 sobre blanco). En clara el ámbar solo va como relleno, con contenido grafito encima y borde de 1,5 a 2 dp en `#8A5A00`; nunca como único borde de un control.

### Contraste calculado

Calculado con `contraste.py` (fórmula de luminancia relativa de WCAG 2; ejecútalo con `python3 contraste.py`). Texto: 4,5:1. Bordes y rellenos que identifican un control: 3:1. El texto deshabilitado queda exento (WCAG 1.4.3) y no se lista.

**Modo gimnasio**

| Par | Primer plano / fondo | Razón | Mínimo |
|---|---|---:|---|
| Texto sobre fondo | `#F2F3F4` / `#0F1113` | 17,03:1 | 4,5:1 (texto) |
| Texto sobre superficie | `#F2F3F4` / `#1A1D20` | 15,24:1 | 4,5:1 (texto) |
| Texto sobre superficie alta (secundario, más y menos) | `#F2F3F4` / `#24282C` | 13,36:1 | 4,5:1 (texto) |
| Texto sobre secundario presionado | `#F2F3F4` / `#2B3035` | 11,99:1 | 4,5:1 (texto) |
| Texto secundario sobre fondo | `#A0A6AD` / `#0F1113` | 7,71:1 | 4,5:1 (texto) |
| Texto secundario sobre superficie | `#A0A6AD` / `#1A1D20` | 6,89:1 | 4,5:1 (texto) |
| Texto secundario sobre superficie alta | `#A0A6AD` / `#24282C` | 6,04:1 | 4,5:1 (texto) |
| Etiqueta del primario sobre ámbar | `#0F1113` / `#F5B83D` | 10,64:1 | 4,5:1 (texto) |
| Etiqueta del primario presionado | `#0F1113` / `#D99A1F` | 7,74:1 | 4,5:1 (texto) |
| Acento (fantasma) sobre fondo | `#F5B83D` / `#0F1113` | 10,64:1 | 4,5:1 (texto) |
| Acento (fantasma) sobre superficie | `#F5B83D` / `#1A1D20` | 9,52:1 | 4,5:1 (texto) |
| Acento sobre fantasma presionado | `#F5B83D` / `#24282C` | 8,34:1 | 4,5:1 (texto) |
| Peligro (texto) sobre fondo | `#FF6B5E` / `#0F1113` | 6,77:1 | 4,5:1 (texto) |
| Peligro (texto) sobre superficie | `#FF6B5E` / `#1A1D20` | 6,06:1 | 4,5:1 (texto) |
| Peligro (texto) sobre presionado | `#FF6B5E` / `#24282C` | 5,31:1 | 4,5:1 (texto) |
| Etiqueta sobre peligro relleno | `#0F1113` / `#FF6B5E` | 6,77:1 | 4,5:1 (texto) |
| Etiqueta sobre peligro relleno presionado (grafito al 16 %) | `#0F1113` / `#D95D52` | 5,08:1 | 4,5:1 (texto) |
| Chip elegido | `#0F1113` / `#F2F3F4` | 17,03:1 | 4,5:1 (texto) |
| Texto sobre fila hecha | `#F2F3F4` / `#3A2F14` | 11,84:1 | 4,5:1 (texto) |
| Texto secundario sobre fila hecha | `#A0A6AD` / `#3A2F14` | 5,36:1 | 4,5:1 (texto) |
| Cifra sobre campo | `#F2F3F4` / `#0F1113` | 17,03:1 | 4,5:1 (texto) |
| Borde de controles sobre superficie | `#767D85` / `#1A1D20` | 4,06:1 | 3:1 (control) |
| Borde de controles sobre fondo | `#767D85` / `#0F1113` | 4,54:1 | 3:1 (control) |
| Relleno ámbar (primario, hecho) sobre fondo | `#F5B83D` / `#0F1113` | 10,64:1 | 3:1 (control) |
| Relleno ámbar (hecho) sobre fila hecha | `#F5B83D` / `#3A2F14` | 7,39:1 | 3:1 (control) |
| Visto grafito sobre ámbar | `#0F1113` / `#F5B83D` | 10,64:1 | 3:1 (control) |
| Borde del cuadrado de serie pendiente sobre la fila | `#767D85` / `#1A1D20` | 4,06:1 | 3:1 (control) |
| Barra del menos (18 × 4) sobre su botón | `#F2F3F4` / `#24282C` | 13,36:1 | 3:1 (control) |
| Trazo ámbar del más sobre su botón | `#F5B83D` / `#24282C` | 8,34:1 | 3:1 (control) |
| Perilla apagada sobre riel | `#A0A6AD` / `#24282C` | 6,04:1 | 3:1 (control) |
| Perilla encendida sobre riel ámbar | `#0F1113` / `#F5B83D` | 10,64:1 | 3:1 (control) |
| Borde del campo en edición (ámbar) | `#F5B83D` / `#0F1113` | 10,64:1 | 3:1 (control) |
| Anillo de foco sobre fondo | `#F2F3F4` / `#0F1113` | 17,03:1 | 3:1 (control) |
| Peligro (borde) sobre superficie | `#FF6B5E` / `#1A1D20` | 6,06:1 | 3:1 (control) |

**Clara**

| Par | Primer plano / fondo | Razón | Mínimo |
|---|---|---:|---|
| Texto sobre fondo | `#0F1113` / `#F3F4F5` | 17,18:1 | 4,5:1 (texto) |
| Texto sobre superficie | `#0F1113` / `#FFFFFF` | 18,92:1 | 4,5:1 (texto) |
| Texto sobre presionado (fantasma, secundario) | `#0F1113` / `#E4E6E8` | 15,12:1 | 4,5:1 (texto) |
| Texto secundario sobre superficie | `#555B62` / `#FFFFFF` | 6,86:1 | 4,5:1 (texto) |
| Texto secundario sobre fondo | `#555B62` / `#F3F4F5` | 6,23:1 | 4,5:1 (texto) |
| Etiqueta del primario (blanco sobre grafito) | `#FFFFFF` / `#0F1113` | 18,92:1 | 4,5:1 (texto) |
| Etiqueta del primario presionado | `#FFFFFF` / `#2B3035` | 13,32:1 | 4,5:1 (texto) |
| Texto de acento sobre superficie | `#8A5A00` / `#FFFFFF` | 5,93:1 | 4,5:1 (texto) |
| Texto de acento sobre fondo | `#8A5A00` / `#F3F4F5` | 5,38:1 | 4,5:1 (texto) |
| Texto de acento sobre fantasma presionado | `#8A5A00` / `#E4E6E8` | 4,74:1 | 4,5:1 (texto) |
| Peligro (texto) sobre superficie | `#B42318` / `#FFFFFF` | 6,57:1 | 4,5:1 (texto) |
| Peligro (texto) sobre fondo | `#B42318` / `#F3F4F5` | 5,97:1 | 4,5:1 (texto) |
| Peligro (texto) sobre presionado | `#B42318` / `#E4E6E8` | 5,25:1 | 4,5:1 (texto) |
| Etiqueta sobre peligro relleno | `#FFFFFF` / `#B42318` | 6,57:1 | 4,5:1 (texto) |
| Etiqueta sobre peligro relleno presionado (grafito al 16 %) | `#FFFFFF` / `#9A2017` | 8,10:1 | 4,5:1 (texto) |
| Chip elegido | `#FFFFFF` / `#0F1113` | 18,92:1 | 4,5:1 (texto) |
| Texto sobre fila hecha | `#0F1113` / `#FCEFC9` | 16,51:1 | 4,5:1 (texto) |
| Texto secundario sobre fila hecha | `#555B62` / `#FCEFC9` | 5,99:1 | 4,5:1 (texto) |
| Contenido grafito sobre relleno ámbar | `#0F1113` / `#F5B83D` | 10,64:1 | 4,5:1 (texto) |
| Borde de controles sobre fondo | `#6F767E` / `#F3F4F5` | 4,17:1 | 3:1 (control) |
| Borde de controles sobre superficie | `#6F767E` / `#FFFFFF` | 4,60:1 | 3:1 (control) |
| Borde del secundario (grafito) sobre fondo | `#0F1113` / `#F3F4F5` | 17,18:1 | 3:1 (control) |
| Borde #8A5A00 del relleno ámbar sobre superficie | `#8A5A00` / `#FFFFFF` | 5,93:1 | 3:1 (control) |
| Borde #8A5A00 del botón hecho sobre fila hecha | `#8A5A00` / `#FCEFC9` | 5,17:1 | 3:1 (control) |
| Relleno grafito (primario) sobre fondo | `#0F1113` / `#F3F4F5` | 17,18:1 | 3:1 (control) |
| Borde del cuadrado de serie pendiente sobre la fila | `#6F767E` / `#FFFFFF` | 4,60:1 | 3:1 (control) |
| Barra del menos (18 × 4) sobre su botón | `#0F1113` / `#FFFFFF` | 18,92:1 | 3:1 (control) |
| Perilla apagada sobre riel | `#6F767E` / `#FFFFFF` | 4,60:1 | 3:1 (control) |
| Borde #8A5A00 del riel encendido sobre superficie | `#8A5A00` / `#FFFFFF` | 5,93:1 | 3:1 (control) |
| Borde #8A5A00 del riel encendido sobre fondo | `#8A5A00` / `#F3F4F5` | 5,38:1 | 3:1 (control) |
| Perilla grafito sobre riel ámbar | `#0F1113` / `#F5B83D` | 10,64:1 | 3:1 (control) |
| Perilla grafito sobre riel ámbar presionado | `#0F1113` / `#D99A1F` | 7,74:1 | 3:1 (control) |
| Borde del campo en edición (#8A5A00) | `#8A5A00` / `#F3F4F5` | 5,38:1 | 3:1 (control) |
| Anillo de foco sobre fondo | `#0F1113` / `#F3F4F5` | 17,18:1 | 3:1 (control) |
| Ámbar como texto sobre blanco (prohibido) | `#F5B83D` / `#FFFFFF` | 1,78:1 | prohibido como texto |
| Ámbar como texto sobre fondo claro (prohibido) | `#F5B83D` / `#F3F4F5` | 1,62:1 | prohibido como texto |

## Tipografía

- Interfaz: Archivo 500 (texto) y 700 (etiquetas de botón, 16 sp; «Empezar entrenamiento» 18 sp). Solo la primera letra en mayúscula.
- Cifras: JetBrains Mono 700 (kilos, repeticiones, tiempo): 30 sp en el bloque de más y menos, 20 sp en las series. Ancho fijo, así los dígitos no bailan al cambiar.
- Unidades («kg», «rep») en Archivo 500, en texto secundario. Las dos familias vienen de Google Fonts (`@expo-google-fonts/archivo` y `@expo-google-fonts/jetbrains-mono`).

## Botones

Rectos, radio 8 dp, alto 48 o 56 dp, relleno horizontal 20 dp, bordes de 1,5 dp, sin sombras ni brillos. Presionar cambia el color, nunca la escala. Todas las piezas, con sus estados en las dos versiones, están en `botones.html`, `captura-botones.png` (página en modo gimnasio) y `captura-botones-clara.png` (página en clara).

## Movimiento: tokens para Reanimated

Seco, de instrumento. Ninguna animación pasa de 250 ms (salvo el ciclo de carga), sin rebote ni sobrepaso. Solo transformaciones, opacidad y color. Con «reducir movimiento» todo es instantáneo y las vibraciones se mantienen.

| Evento | Duración | Curva | Vibración (expo-haptics) | Con reducir movimiento |
|---|---|---|---|---|
| Presionar | 0 ms | — | `impactAsync(Light)`; `Medium` en «Empezar entrenamiento» | Igual |
| Soltar | 100 ms | `Easing.bezier(0, 0, 0.2, 1)` | Ninguna | 0 ms |
| Marcar serie: relleno | 80 ms | `Easing.bezier(0, 0, 1, 1)` | Android `Confirm`; si no está, `notificationAsync(Success)` | 0 ms |
| Marcar serie: visto (escala 0,85 → 1) | 100 ms | `Easing.bezier(0, 0, 0.2, 1)` | (la misma) | Aparece sin escala |
| Marcar serie: fila | 120 ms | `Easing.bezier(0, 0, 0.2, 1)` | — | 0 ms |
| Desmarcar | 80 ms | `Easing.bezier(0, 0, 1, 1)` | `selectionAsync()` | 0 ms |
| Más y menos (dígitos que giran; «,5» entra o sale) | 100 ms | `Easing.bezier(0, 0, 0.2, 1)` | `selectionAsync()`; Android `Clock_Tick` | Se reemplazan sin girar ni deslizarse |
| Mantener presionado | 400 ms, luego 100 ms; tras 10 pasos, 50 ms | — | Una por paso | Igual cadencia, sin girar |
| Límite | 0 ms, sin movimiento | — | `notificationAsync(Warning)`; Android `Reject` | Igual |
| Cargar | 200 ms por paso, ciclo de 600 ms; aparece tras 150 ms | por pasos | Al terminar: `Confirm` o `Success` | Texto fijo «Guardando…» |
| Cambio de estado (chip, interruptor, habilitar) | 100 ms | `Easing.bezier(0, 0, 0.2, 1)` | `selectionAsync()`; Android `Toggle_On` / `Toggle_Off` | La perilla salta |

```ts
import { Platform } from 'react-native';
import { Easing, ReduceMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export const curva = {
  salida: Easing.bezier(0, 0, 0.2, 1),
  lineal: Easing.bezier(0, 0, 1, 1),
};

// ReduceMotion.System deja la animación en 0 ms si el teléfono tiene «reducir movimiento».
const t = (duration: number, easing = curva.salida) => ({ duration, easing, reduceMotion: ReduceMotion.System });

export const mov = {
  presionar: t(0),
  soltar: t(100),
  marcarRelleno: t(80, curva.lineal),
  marcarVisto: t(100),        // escala 0,85 → 1 y opacidad 0 → 1
  marcarFila: t(120),
  desmarcar: t(80, curva.lineal),
  cifra: t(100),              // translateY de un alto de línea, dentro de overflow: 'hidden'
  estado: t(100),             // chip, interruptor (translateX de la perilla: 20 dp)
};

export const carga = { paso: 200, ciclo: 600, umbral: 150 };          // por pasos, sin suavizado
export const repeticion = { inicio: 400, paso: 100, rapido: 50, pasosAntesDeRapido: 10 };

const android = Platform.OS === 'android';
const conRespaldo = (tipo: Haptics.AndroidHaptics, respaldo: () => Promise<void>) =>
  android ? Haptics.performAndroidHapticsAsync(tipo).catch(respaldo) : respaldo();

export const vibrar = {
  presionar: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  empezar: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  paso: () => conRespaldo(Haptics.AndroidHaptics.Clock_Tick, Haptics.selectionAsync),
  limite: () => conRespaldo(Haptics.AndroidHaptics.Reject,
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  marcar: () => conRespaldo(Haptics.AndroidHaptics.Confirm,
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  desmarcar: () => Haptics.selectionAsync(),
  encender: () => conRespaldo(Haptics.AndroidHaptics.Toggle_On, Haptics.selectionAsync),
  apagar: () => conRespaldo(Haptics.AndroidHaptics.Toggle_Off, Haptics.selectionAsync),
  listo: () => conRespaldo(Haptics.AndroidHaptics.Confirm,
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
```

Notas de construcción en React Native:

- El cambio de color al presionar va en `Pressable` con el estilo `pressed` (0 ms), no con animación. Soltar anima solo el color de fondo con `withTiming(…, mov.soltar)`.
- El contador: el campo se parte en dos mitades iguales. La parte entera va en la izquierda, alineada a la derecha (termina en el centro); la coma, los decimales y la unidad, en la derecha. Cada dígito es un `Animated.View` dentro de una vista con `overflow: 'hidden'` y alto de 36 dp; solo se anima el que cambia. Los que aparecen o se van («,5», el 1 de 100) usan `entering`/`exiting` (giro de un alto de línea y opacidad, 100 ms) y la unidad, `layout={LinearTransition.duration(100).easing(curva.salida)}`; todos con `ReduceMotion.System`.
- La carga se arma con un índice (0, 1, 2) que avanza con `setInterval` de 200 ms y cambia la opacidad sin transición. Con `useReducedMotion()` se muestra «Guardando…».
- Anillo de foco: borde de 2 dp en una vista envolvente, separado 2 dp del botón (React Native no tiene `outline`).
- Todo usa colores planos: sin degradados, sombras, desenfoques ni modos de fusión.

## Decisiones fuera del encargo (para revisar)

1. **Secundario presionado (gimnasio):** el encargo no lo fija. Usé relleno `#2B3035` (de la paleta) con borde `#F2F3F4`, para que se note con poca luz. Botón de ícono y más y menos se presionan igual.
2. **Peligro con relleno, presionado:** el encargo no da un tono. Usé una capa grafito `#0F1113` al 16 % encima del rojo: `#D95D52` en gimnasio (texto 5,08:1) y `#9A2017` en clara (texto 8,10:1). Son los dos únicos tonos derivados de la página.
3. **Bordes en más y menos (gimnasio):** les puse el mismo borde 1,5 dp `#767D85` del secundario, para que el límite del botón tenga 4,06:1 sobre la superficie y no dependa solo del signo.
4. **Clara, campo en edición:** el borde de 2 dp va en `#8A5A00`, porque el ámbar no puede ser el único borde de un control en clara.
5. **Interruptor en clara, apagado:** riel blanco con borde 2 dp `#6F767E` y perilla `#6F767E` (el encargo solo fijaba el borde).
6. **Marcar serie:** al soltar se marca, así que el «soltar» de este botón dura lo mismo que el relleno (80 ms, lineal) en vez de 100 ms.
7. **Kilos enteros sin decimal** («85»; «82,5» solo cuando hay medio kilo), con la coma como ancla para que el giro siga funcionando. Reemplaza la decisión anterior de un decimal fijo («85,0»); ver «Cambios después de la revisión».
8. **Barra del menos de 18 × 4 dp** con radio 1 (antes 18 × 3), igual que los tramos del más.
9. **Campo de más y menos de 120 dp como mínimo** (antes 104): con la cifra partida en dos mitades, cada mitad tiene que caber «100» o «,5 kg». En el marco de 412 dp mide 226.
10. **Ícono con fondo `#1A1D20`** (antes `#0F1113`), elegido en la grilla de lanzador.

## Archivos

- `logo/`: símbolo y logotipos (horizontal y apilado) con esta regla de nombres: `-sobre-oscuro` y `-sobre-claro` son transparentes, para poner sobre ese fondo; `-con-fondo-oscuro` y `-con-fondo-claro` traen el fondo; `-mono-grafito` y `-mono-claro` son de un color. Además, versiones ajustadas a píxel de 16 y 32 px e ícono de app con capas y vistas previas. `logo/png/`: renders con rsvg-convert, con los mismos nombres.
- `lamina-logo.svg` y `lamina-logo.png`: lámina del logo.
- `icono-lanzador.png`: el ícono con fondo `#0F1113` y `#1A1D20` en una grilla de lanzador, sobre tres fondos de pantalla.
- `botones.html`: lámina interactiva de botones (selector de tema e interruptor de «reducir movimiento»). `captura-botones.png` (modo gimnasio) y `captura-botones-clara.png` (clara): sus capturas completas.
- `tokens.json`: colores, radios, medidas, duraciones y curvas (los mismos valores que el CSS de la página).
- `contraste.py`: cálculo de las razones de contraste.

## Cambios después de la revisión

Revisión del director de arte del 17-11 (`../revision.md`). El concepto no cambia: el logo sigue siendo el botón de más. Va cada arreglo, dónde se ve y cómo lo comprobé.

1. **Serie pendiente sin visto.** El cuadrado vacío ya no lleva el visto tenue: es solo el borde de 2 dp (`#767D85`, 4,06:1 sobre la fila; en clara `#6F767E`, 4,60:1). El visto aparece únicamente al marcar. El deshabilitado es un relleno sin borde, así que no se confunde con el pendiente. Se eliminó el token `vistoTenue`. Se ve en «Marcar serie» y en «Pruébalo», en las dos capturas.
2. **Kilos enteros.** Ahora se muestra «85» en vez de «85,0»; el medio kilo se escribe solo cuando existe («82,5»). Para que el giro siga funcionando, la coma pasa a ser el ancla: la parte entera se alinea a la izquierda del centro del campo y nunca se corre en horizontal; decimales y unidad van a la derecha. Las cifras se emparejan por su lugar (unidades, decenas, coma, décimas) y solo giran las que cambian. «,5» o el 1 de «100» entran girando con opacidad, las que sobran salen igual y solo «kg» se desliza para hacer lugar. Todo pasa en los mismos 100 ms, solo con transformaciones y opacidad; con «reducir movimiento», la cifra se reemplaza sin girar ni deslizarse. Lo probé en el navegador con 82,5 → 85 → 87,5 → 85 → 82,5, 97,5 → 100 → 97,5, repeticiones 8 → 10 → 9, el botón mantenido 1,5 s (llegó a 132,5) y reducir movimiento. La parte entera quedó en la misma posición en todos los pasos, «kg» se corrió 1,5 cifras y no hubo errores.
3. **Menos de 18 × 4 dp** con radio 1: el mismo grosor y radio que los tramos del más, y el mismo ancho que el símbolo entero. Contraste: 13,36:1 en gimnasio y 18,92:1 en clara.
4. **Par «m T».** «Track» se corre 100 unidades por em (0,1 em) hacia la izquierda. El brazo de la T queda 14 unidades por encima del hombro de la m, con 36 unidades de aire vertical, así que no se tocan. Probé −40, −70, −90, −100, −110 y −130: con −100 la palabra se lee entera a tamaño grande y a 24 px no se empasta. El logotipo horizontal quedó un 1,7 % más angosto (113 dp con el símbolo de 16 dp). Rehice todos los logotipos, la lámina y el logo de `botones.html`.
5. **Ámbar en clara.** Su segundo lugar fijo es el interruptor encendido: riel ámbar con borde 2 dp `#8A5A00` (5,93:1 sobre blanco y 5,38:1 sobre el fondo) y perilla grafito (10,64:1). Presionado, el riel pasa a `#D99A1F` (7,74:1 con la perilla). Antes era grafito con perilla blanca. Cumple la regla de clara: ámbar solo como relleno, con contenido grafito y borde `#8A5A00`. Ahora el ámbar está en la fila hecha y en el interruptor, que también es el de «Reducir movimiento» de la página. Token nuevo: `rielEncendidoBorde`.
6. **Ícono con fondo `#1A1D20`.** Lo comparé con el `#0F1113` en una grilla de lanzador (`icono-lanzador.png`): íconos de 56 dp con máscara circular sobre fondo de pantalla negro, gris azulado y claro, junto a marcadores genéricos (no son logos reales) y una fila con el patrón del rubro, negro con un color vivo. Sobre negro, el `#0F1113` desaparece y solo flota el símbolo; el `#1A1D20` conserva el borde del ícono. Sobre gris y sobre claro se lee grafito, no negro. Me quedo con `#1A1D20`, que además es la superficie de la app. La diferencia es chica: lo que separa a GymTrack del rubro es el símbolo, no el fondo. Contraste del símbolo: ámbar 9,52:1 y tramos 15,24:1.
7. **`captura-botones-clara.png`**: la página completa con el tema claro elegido, al mismo tamaño que la de gimnasio (1280 × 11728).
8. **Nombres de archivo.** Ya no hay un `simbolo.svg` a secas. La regla nueva (ver «Archivos») vale para el símbolo, los logotipos y las versiones de 16 y 32 px. Cambios de nombre:

| Antes | Ahora |
|---|---|
| `simbolo.svg` (transparente, tramos claros) | `simbolo-sobre-oscuro.svg` |
| `simbolo-sobre-oscuro.svg` (con fondo) | `simbolo-con-fondo-oscuro.svg` |
| `simbolo-sobre-claro.svg` (con fondo) | `simbolo-con-fondo-claro.svg` |
| — | `simbolo-sobre-claro.svg` (nuevo: transparente, dos tonos, desde 48 px) |
| `simbolo-16.svg` y `simbolo-32.svg` | `simbolo-16-sobre-oscuro.svg` y `simbolo-32-sobre-oscuro.svg` |
| `logotipo-horizontal.svg` y `logotipo-apilado.svg` | `logotipo-horizontal-sobre-oscuro.svg` y `logotipo-apilado-sobre-oscuro.svg` |
| `logotipo-…-sobre-oscuro.svg` y `-sobre-claro.svg` (con fondo) | `logotipo-…-con-fondo-oscuro.svg` y `-con-fondo-claro.svg` |
| — | `logotipo-…-sobre-claro.svg` (nuevo: transparente) |

Los PNG de `logo/png/` siguen la misma regla y están todos rehechos.

**Tres detalles que salieron al probar.** Congelé el contador a medio giro para revisar los cuadros. (a) La clase de las cifras que salen se llamaba igual que el botón fantasma y las pintaba de ámbar: la renombré. (b) En la primera versión, con la cifra centrada, la parte entera se corría hacia el lado mientras «,5» se abría al medio, y se montaban; por eso la coma pasó a ser el ancla. (c) Sin decimales, su caja se quedaba sin alto y «,5» salía desde más abajo; ahora tiene un alto fijo de 36 dp.

**Comprobado.** Contrastes recalculados con `contraste.py`: ningún par queda bajo el mínimo, salvo los dos prohibidos que están para mostrar la regla. A 412 px de ancho no hay desborde horizontal y ningún botón mide menos de 48 dp. `tokens.json` sale de las mismas variables CSS de `botones.html` y ningún color queda fuera de la paleta. Revisé con Read `lamina-logo.png`, todos los PNG de `logo/png/`, `icono-lanzador.png` y las dos capturas de botones.
