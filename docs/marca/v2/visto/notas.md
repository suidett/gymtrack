# GymTrack · dirección «Visto» · notas

Fecha: 17 de noviembre de 2026. Alcance: logo y botones. Nada de pantallas completas ni backend.

## Concepto

El logo de GymTrack es el botón que tocas al terminar una serie: un círculo menta con un visto.
Cada vez que cumples una serie, la marca aparece en tu mano.

## Símbolo: cómo está construido

- Grilla de 24 × 24. Círculo lleno de centro (12, 12) y radio 11 en menta `#45B392`. Sin borde, sin sombra, sin degradado.
- Visto de un solo trazo en tinta `#131A17`, grosor 2,75, puntas y unión redondas.
- Vértices finales: (7; 12) → (10,6; 15,6) → (17,3; 8,2). El encargo daba (6,75; 12,5) → (10,5; 16,25) → (17,5; 8,5), pero así el visto se veía caído. Lo subí unas 0,4 unidades y acorté el brazo largo. Ahora el centro de la caja queda 0,1 sobre el centro del círculo y el centroide del trazo, 0,5 bajo él: a la vista queda centrado. Comparé las cuatro opciones a 240, 64, 32 y 24 px.
- Brazo corto 5,09 y brazo largo 9,98: proporción 1 : 1,96.
- Aire entre el trazo y el borde del círculo: 3,10 unidades como mínimo, en la punta del brazo largo.
- Versión de un color: círculo en tinta (o blanco sobre oscuro) con el visto calado. El calado no usa máscaras: es un solo trazado con `fill-rule="evenodd"` (círculo + contorno del visto), que react-native-svg dibuja tal cual.
- Versión de 16 px (`logo/simbolo-16.svg`): está dibujada sobre una grilla propia de 16. Círculo de radio 7,5, trazo de 2,25 px (equivale a 3,375 unidades de la grilla de 24) y vértices en medios píxeles: (4,5; 7,5) → (7; 10) → (11,5; 5,5). Abrí el PNG real de 16 × 16 (`logo/png/simbolo-16.png`) y también lo revisé ampliado píxel a píxel (en la lámina). El visto se lee.
- El botón «Marcar serie» hecho es este mismo dibujo a 56 dp: círculo de radio 28, trazo de 7 dp y vértices (15,27; 28) → (24,44; 37,16) → (41,49; 18,33). Largo del trazo: 38,37 dp, que es el valor que usa `strokeDasharray` para animar el dibujo.

## Tamaño mínimo y área de respeto

- Símbolo: 16 px como mínimo. Bajo 24 px usa `simbolo-16.svg`; de 24 px hacia arriba, `simbolo.svg`.
- Logotipo horizontal: el símbolo nunca baja de 20 dp, lo que deja el conjunto en unos 125 dp de ancho. Más chico que eso, usa el símbolo solo.
- Área de respeto: alrededor del logotipo, medio diámetro del símbolo por lado; alrededor del símbolo solo, un cuarto de su diámetro.

## Logotipo

- «GymTrack» en Manrope 700, con G y T mayúsculas, espaciado −1,5 % y el kerning de la fuente (el par «Tr» va −100/2000). Toda la palabra va en un solo color: tinta `#131A17`, o `#ECF2EF` sobre oscuro.
- Horizontal: el diámetro del símbolo mide 1,3 veces la altura de la G (con su rebase), y entre el símbolo y la palabra queda medio diámetro. El símbolo va centrado en la altura de la G.
- Apilado: el símbolo mide 2,4 veces la altura de la G y queda centrado arriba, con 0,6 alturas de G de separación.
- En todos los SVG el texto está convertido a trazados. Los saqué con fontTools desde los TTF que ya trae `node_modules/@expo-google-fonts`, así que no hubo que descargar nada.

## Ícono de app (Android)

- `icono-app.svg` (512 × 512, para la tienda y las vistas previas): fondo menta a sangre, sin círculo dibujado. Visto en tinta con trazo de 74 px, puntas y unión redondas, a 34 px por unidad de la grilla de 24 (1,6 veces el tamaño anterior). El ángulo va abajo a la izquierda, en (196; 372), y la punta del brazo corto en (73,6; 249,6). El brazo largo no termina: sigue con el mismo ángulo del símbolo (47,8°) hasta que el borde lo corta en la esquina superior derecha (su eje cruza el borde derecho en y = 23).
- Por qué así: contenido y centrado en un cuadrado redondeado, el visto se leía como una casilla marcada. Una casilla es un marco con un visto chico adentro; aquí el visto es más grande que el marco y se sale. Con máscara circular queda el símbolo con el visto escapándose del círculo.
- La punta del brazo corto y el ángulo quedan a 219,5 px del centro como máximo, dentro de la zona segura (66 dp equivalen a 234,7 px en el lienzo de 72 dp). Lo que corta el borde es solo el brazo largo, a propósito.
- Capas del ícono adaptativo (`icono-app-capa-fondo.svg`, `icono-app-capa-frente.svg` y `icono-app-capa-monocromo.svg`): el lienzo de 512 representa 108 dp y el sistema muestra solo los 72 dp del centro. Por eso el primer plano es el mismo dibujo reducido a 72/108 (trazo de 49,33 px). El brazo largo llega hasta el borde de la capa de 108 dp, así que lo corta cualquier máscara, también durante el efecto de paralaje. El ángulo y la punta corta quedan a 146,3 px del centro, dentro de la zona segura de 66 dp (156,4 px).
- La capa monocroma, para el ícono temático de Android 13, es solo el visto: el sistema la tiñe.
- Vistas previas con máscara circular y con cuadrado redondeado: `icono-app-vista-circulo.svg` y `icono-app-vista-cuadrado.svg`, con sus PNG.
- Comparé seis variantes con las dos máscaras, a 240 y a 48 px: la actual, una más grande y descentrada pero contenida, y cuatro que se salen (por la esquina, por el borde derecho, más gruesa y más grande). La contenida seguía pareciendo casilla. La más grande cortaba también la punta del brazo corto en la máscara circular. Elegí la que sale por la esquina: es la única en que el corte cae en la curva del cuadrado redondeado y se ve deliberado, sin una astilla de menta encima del brazo.

## Paleta

Clara: fondo `#F5F7F5` · superficie `#FFFFFF` · texto `#131A17` · texto secundario `#56635D` · acción `#45B392` (con texto tinta) · acción presionada `#37997C` · acento de texto `#1F6B56` · acento de bordes `#2F7F68` · tonal y fila hecha `#DDF3EC` · tonal presionado `#A0D9C8` (con texto tinta) · borde de control `#7C8983` · peligro `#B3261E` · peligro presionado `#8C1D18` · deshabilitado `#E3E8E5` con texto `#6F7C76`.

Modo gimnasio: fondo `#0E1412` · superficie `#18211D` · superficie alta `#222D28` · texto `#ECF2EF` · texto secundario `#9DADA6` · acción `#45B392` (con texto `#0E1412`) · acción presionada `#6FD0B2` · acento `#6FD0B2` · tonal y fila hecha `#1D3A31` · tonal presionado `#295E4E` (con texto `#ECF2EF`) · borde de control `#74857E` · peligro `#FF8A80` · peligro presionado `#FFB4AB` · deshabilitado `#222D28` con texto `#74857E`.

**Nunca como texto:** la menta `#45B392` sobre fondo claro (2,40:1) ni sobre blanco (2,59:1). Tampoco sirve como único borde de un control sobre claro. Por eso el primario claro lleva un borde interior de 1,5 dp en `#2F7F68`. `#2F7F68` da 4,48:1 sobre el fondo: alcanza para bordes (3:1), pero no para texto chico.

**Cuatro valores que no venían en el encargo**, todos ya como tokens en `tokens.json`: peligro presionado (`#8C1D18` en clara y `#FFB4AB` en gimnasio) y tonal presionado (`#A0D9C8` y `#295E4E`). El peligro presionado espeja a la acción: en clara oscurece y en gimnasio aclara. El tonal presionado es un tono intermedio entre el tonal y la acción.

Los estados presionados siguen una «escalera de presión»: al presionar, cada pieza sube un peldaño. La superficie pasa a tonal (`#DDF3EC` / `#1D3A31`), el tonal pasa a tonal presionado (`#A0D9C8` / `#295E4E`) y la acción pasa a acción presionada (`#37997C` / `#6FD0B2`). El peligro de contorno se llena de peligro, y el relleno de la confirmación pasa a peligro presionado.

### Contraste calculado

Lo calculé con `herramientas/contraste.py` (fórmula WCAG 2.x). El script falla si algún par obligatorio no alcanza su mínimo, y hoy pasan todos.

| Modo | Par | Primer plano | Fondo | Razón | Mínimo | ¿Cumple? |
|---|---|---|---|---|---|---|
| Clara | Texto sobre fondo | `#131A17` | `#F5F7F5` | 16,42:1 | 4,5 (texto) | sí |
| Clara | Texto sobre superficie | `#131A17` | `#FFFFFF` | 17,68:1 | 4,5 (texto) | sí |
| Clara | Texto secundario sobre fondo | `#56635D` | `#F5F7F5` | 5,84:1 | 4,5 (texto) | sí |
| Clara | Texto secundario sobre superficie | `#56635D` | `#FFFFFF` | 6,29:1 | 4,5 (texto) | sí |
| Clara | Etiqueta tinta sobre primario | `#131A17` | `#45B392` | 6,83:1 | 4,5 (texto) | sí |
| Clara | Etiqueta tinta sobre primario presionado | `#131A17` | `#37997C` | 5,06:1 | 4,5 (texto) | sí |
| Clara | Acento texto sobre superficie | `#1F6B56` | `#FFFFFF` | 6,37:1 | 4,5 (texto) | sí |
| Clara | Acento texto sobre fondo | `#1F6B56` | `#F5F7F5` | 5,92:1 | 4,5 (texto) | sí |
| Clara | Etiqueta secundario sobre tonal | `#1F6B56` | `#DDF3EC` | 5,49:1 | 4,5 (texto) | sí |
| Clara | Etiqueta tinta sobre tonal presionado (secundario y chip elegido) | `#131A17` | `#A0D9C8` | 11,16:1 | 4,5 (texto) | sí |
| Clara | Texto sobre fila hecha / chip elegido | `#131A17` | `#DDF3EC` | 15,24:1 | 4,5 (texto) | sí |
| Clara | Texto secundario sobre fila hecha | `#56635D` | `#DDF3EC` | 5,42:1 | 4,5 (texto) | sí |
| Clara | Texto blanco sobre peligro (contorno presionado y confirmación) | `#FFFFFF` | `#B3261E` | 6,54:1 | 4,5 (texto) | sí |
| Clara | Texto blanco sobre peligro presionado (confirmación) | `#FFFFFF` | `#8C1D18` | 9,11:1 | 4,5 (texto) | sí |
| Clara | Etiqueta del peligro contorno sobre superficie | `#B3261E` | `#FFFFFF` | 6,54:1 | 4,5 (texto) | sí |
| Clara | Etiqueta del peligro contorno sobre fondo | `#B3261E` | `#F5F7F5` | 6,07:1 | 4,5 (texto) | sí |
| Clara | Subrayado de cifra #2F7F68 sobre fondo | `#2F7F68` | `#F5F7F5` | 4,48:1 | 3 (componente) | sí |
| Clara | Borde del primario #2F7F68 sobre fondo | `#2F7F68` | `#F5F7F5` | 4,48:1 | 3 (componente) | sí |
| Clara | Borde del primario #2F7F68 sobre superficie | `#2F7F68` | `#FFFFFF` | 4,82:1 | 3 (componente) | sí |
| Clara | Borde de control sobre superficie | `#7C8983` | `#FFFFFF` | 3,64:1 | 3 (componente) | sí |
| Clara | Borde de control sobre fondo | `#7C8983` | `#F5F7F5` | 3,38:1 | 3 (componente) | sí |
| Clara | Aro de serie pendiente / perilla apagada sobre superficie | `#7C8983` | `#FFFFFF` | 3,64:1 | 3 (componente) | sí |
| Clara | Visto tinta sobre menta (símbolo) | `#131A17` | `#45B392` | 6,83:1 | 3 (componente) | sí |
| Clara | Anillo de foco tinta sobre fondo | `#131A17` | `#F5F7F5` | 16,42:1 | 3 (componente) | sí |
| Clara | Perilla tinta sobre riel menta | `#131A17` | `#45B392` | 6,83:1 | 3 (componente) | sí |
| Clara | Borde del peligro contorno sobre superficie | `#B3261E` | `#FFFFFF` | 6,54:1 | 3 (componente) | sí |
| Clara | Borde del peligro contorno / relleno de confirmación sobre fondo | `#B3261E` | `#F5F7F5` | 6,07:1 | 3 (componente) | sí |
| Clara | Deshabilitado: texto sobre relleno (exento) | `#6F7C76` | `#E3E8E5` | 3,51:1 | no aplica | — |
| Clara | NUNCA texto: menta sobre superficie | `#45B392` | `#FFFFFF` | 2,59:1 | no aplica | — |
| Clara | NUNCA texto: menta sobre fondo | `#45B392` | `#F5F7F5` | 2,40:1 | no aplica | — |
| Clara | Menta sola contra fila hecha (por eso el visto lleva tinta) | `#45B392` | `#DDF3EC` | 2,23:1 | no aplica | — |
| Clara | Tonal presionado contra tonal en reposo (paso visible) | `#A0D9C8` | `#DDF3EC` | 1,37:1 | no aplica | — |
| Clara | Tonal presionado contra primario en reposo (ya no son iguales) | `#A0D9C8` | `#45B392` | 1,63:1 | no aplica | — |
| Gimnasio | Texto sobre fondo | `#ECF2EF` | `#0E1412` | 16,42:1 | 4,5 (texto) | sí |
| Gimnasio | Texto sobre superficie | `#ECF2EF` | `#18211D` | 14,53:1 | 4,5 (texto) | sí |
| Gimnasio | Texto sobre superficie alta | `#ECF2EF` | `#222D28` | 12,56:1 | 4,5 (texto) | sí |
| Gimnasio | Texto secundario sobre fondo | `#9DADA6` | `#0E1412` | 7,95:1 | 4,5 (texto) | sí |
| Gimnasio | Texto secundario sobre superficie | `#9DADA6` | `#18211D` | 7,03:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta #0E1412 sobre primario | `#0E1412` | `#45B392` | 7,20:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta #0E1412 sobre primario presionado | `#0E1412` | `#6FD0B2` | 10,06:1 | 4,5 (texto) | sí |
| Gimnasio | Acento #6FD0B2 sobre fondo | `#6FD0B2` | `#0E1412` | 10,06:1 | 4,5 (texto) | sí |
| Gimnasio | Acento #6FD0B2 sobre superficie | `#6FD0B2` | `#18211D` | 8,90:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta secundario sobre tonal | `#6FD0B2` | `#1D3A31` | 6,66:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta #ECF2EF sobre tonal presionado (secundario y chip elegido) | `#ECF2EF` | `#295E4E` | 6,60:1 | 4,5 (texto) | sí |
| Gimnasio | Texto sobre fila hecha / chip elegido | `#ECF2EF` | `#1D3A31` | 10,88:1 | 4,5 (texto) | sí |
| Gimnasio | Texto secundario sobre fila hecha | `#9DADA6` | `#1D3A31` | 5,27:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta del peligro contorno sobre fondo | `#FF8A80` | `#0E1412` | 8,16:1 | 4,5 (texto) | sí |
| Gimnasio | Etiqueta del peligro contorno sobre superficie | `#FF8A80` | `#18211D` | 7,22:1 | 4,5 (texto) | sí |
| Gimnasio | Texto #131A17 sobre peligro (contorno presionado y confirmación) | `#131A17` | `#FF8A80` | 7,74:1 | 4,5 (texto) | sí |
| Gimnasio | Texto #131A17 sobre peligro presionado (confirmación) | `#131A17` | `#FFB4AB` | 10,41:1 | 4,5 (texto) | sí |
| Gimnasio | Primario (relleno) sobre fondo | `#45B392` | `#0E1412` | 7,20:1 | 3 (componente) | sí |
| Gimnasio | Primario (relleno) sobre superficie | `#45B392` | `#18211D` | 6,37:1 | 3 (componente) | sí |
| Gimnasio | Borde de control sobre superficie | `#74857E` | `#18211D` | 4,24:1 | 3 (componente) | sí |
| Gimnasio | Borde de control sobre fondo | `#74857E` | `#0E1412` | 4,79:1 | 3 (componente) | sí |
| Gimnasio | Borde del chip elegido #6FD0B2 sobre fondo | `#6FD0B2` | `#0E1412` | 10,06:1 | 3 (componente) | sí |
| Gimnasio | Visto #0E1412 sobre menta (símbolo) | `#0E1412` | `#45B392` | 7,20:1 | 3 (componente) | sí |
| Gimnasio | Anillo de foco #ECF2EF sobre fondo | `#ECF2EF` | `#0E1412` | 16,42:1 | 3 (componente) | sí |
| Gimnasio | Borde del peligro contorno / relleno de confirmación sobre fondo | `#FF8A80` | `#0E1412` | 8,16:1 | 3 (componente) | sí |
| Gimnasio | Borde del peligro contorno sobre superficie | `#FF8A80` | `#18211D` | 7,22:1 | 3 (componente) | sí |
| Gimnasio | Aro punteado de serie bloqueada sobre superficie (exento) | `#74857E` | `#18211D` | 4,24:1 | no aplica | — |
| Gimnasio | Deshabilitado: texto sobre relleno (exento) | `#74857E` | `#222D28` | 3,66:1 | no aplica | — |
| Gimnasio | Tonal sin borde contra fondo (lo identifica la etiqueta) | `#1D3A31` | `#0E1412` | 1,51:1 | no aplica | — |
| Gimnasio | Tonal presionado contra tonal en reposo (paso visible) | `#295E4E` | `#1D3A31` | 1,65:1 | no aplica | — |
| Gimnasio | Tonal presionado contra primario en reposo (ya no son iguales) | `#295E4E` | `#45B392` | 2,89:1 | no aplica | — |

Notas sobre la tabla:
- Los controles deshabilitados quedan exentos del mínimo según WCAG. Igual les quité el borde, para que el estado no dependa solo del color.
- El secundario tonal del modo gimnasio no lleva borde (1,51:1 contra el fondo). Lo identifica su etiqueta, que da 6,66:1.
- En la fila hecha, el disco menta contra `#DDF3EC` da 2,23:1. Lo que identifica el estado es el visto tinta sobre menta (6,83:1) y el cambio de forma: de aro vacío a disco lleno con visto.
- El tonal presionado no necesita 3:1 contra el tonal en reposo: es un estado de un instante y además el botón se achica a 0,97. Lo que importa es que ya no es igual al primario en reposo (1,63:1 en clara y 2,89:1 en gimnasio, más el cambio de etiqueta).

## Tipografía

- Interfaz: Manrope 500 para el texto, 700 para las etiquetas de botón (16 sp, solo la primera letra en mayúscula) y 800 únicamente en «Empezar entrenamiento» (18 sp).
- Cifras: IBM Plex Mono 600, de ancho fijo. En más y menos van a 28 sp, con la unidad en Manrope 500 de 13 sp y en texto secundario.
- Las dos son de Google Fonts y ya están en el proyecto (`@expo-google-fonts/manrope` y `@expo-google-fonts/ibm-plex-mono`).

## Botones (resumen)

Radio 16 dp, alto 48 (56 en entrenamiento), relleno lateral 20 dp e ícono opcional de 20 dp a 8 dp de la etiqueta. Sin sombras. Pastilla completa solo en los chips, que van en una sola fila que se desliza de lado (en React Native, un `ScrollView` horizontal sin indicador, con 16 dp de relleno a cada lado). Más y menos son círculos de 56 dp, con la cifra en una caja de 112 dp: así «102,5» no mueve los botones (el mínimo es 96). «Marcar serie» mide 56 dp: pendiente es un aro vacío, hecha es el símbolo, y al marcarla se pinta toda la fila. Bloqueada lleva el aro punteado. «Empezar entrenamiento» mide 64 dp, con radio 20 y sin ícono.

Peligro: en los dos modos, «Borrar rutina» y cualquier acción destructiva van con contorno (borde 1,5 dp y texto rojo, sin relleno). El relleno rojo aparece solo en la confirmación («Sí, borrar»), que es también donde ocurre la carga.

Estados: reposo; presionado (escala 0,97 más un peldaño de color); foco (anillo de 2 dp separado 2 dp; en React Native se hace con una vista envolvente, porque no existe `outline`); deshabilitado (relleno `#E3E8E5`, texto `#6F7C76`, sin borde); y cargando. Al cargar, el botón conserva su ancho y muestra un aro de 20 dp que no responde a toques. El aro aparece solo si la espera pasa de 150 ms.

Con «reducir movimiento», el aro se cambia por texto fijo. Uso «Guardando…» por defecto y una variante según la acción cuando «Guardando…» no calza: «Borrando…» en la confirmación de peligro y «Preparando…» en «Empezar entrenamiento». Elegí etiquetas más anchas que su texto de carga para que el ancho no cambie.

Todos los toques miden al menos 48 dp; lo revisé por código en la página. Ningún botón queda en dos líneas (`white-space: nowrap`, revisado en la captura).

## Movimiento, listo para Reanimated

```ts
import { Easing, useReducedMotion, withDelay, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const curva = {
  suave: Easing.bezier(0.2, 0, 0, 1),      // presionar, soltar, disco, cifra
  estandar: Easing.bezier(0.4, 0, 0.2, 1), // visto, fila, desmarcar, cambio de estado
};

export const mov = {
  presionar:  { duration: 90,  easing: curva.suave },    // escala 1 -> 0,97 + color presionado
  soltar:     { duration: 180, easing: curva.suave },
  disco:      { duration: 200, easing: curva.suave },    // escala 0,6 -> 1 y opacidad 0 -> 1
  visto:      { duration: 160, easing: curva.estandar }, // withDelay(60, ...) sobre strokeDashoffset 38,37 -> 0
  fila:       { duration: 240, easing: curva.estandar },
  desmarcar:  { duration: 120, easing: curva.estandar },
  paso:       { duration: 120, easing: curva.suave },    // cifra: sale 6 dp, entra la nueva
  estado:     { duration: 160, easing: curva.estandar }, // chip, interruptor, habilitar; perilla 160 ms
  fundido:    { duration: 80,  easing: Easing.linear },  // solo con «reducir movimiento»
  cargaEspera: 150, cargaVuelta: 900,                    // aro: 1 vuelta cada 900 ms, lineal
  repetirInicio: 400, repetirCada: 90,                   // mantener presionado
};

const android = Platform.OS === 'android';
export const vibrar = {
  // Android: Virtual_Key es propuesta mía; el encargo solo fija impactAsync(Light)
  presionarPrimario: () => android
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  marcarSerie: () => android
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  desmarcar: () => Haptics.selectionAsync(),
  paso: () => android
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
    : Haptics.selectionAsync(),
  limite: () => android
    ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
    : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  cambio: (encendido: boolean) => android
    ? Haptics.performAndroidHapticsAsync(encendido ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off)
    : Haptics.selectionAsync(),
  cargaLista: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};
```

Con `useReducedMotion()` en verdadero: la escala queda en 1, no hay desplazamiento ni dibujo del visto (`strokeDashoffset` en 0 y solo opacidad en 80 ms), la cifra se reemplaza sin deslizar, la perilla salta, el aro se cambia por texto y las vibraciones se mantienen todas. Ninguna animación pasa de 250 ms, salvo la vuelta del aro de carga. Tampoco hay rebote ni sobrepaso: las dos curvas terminan en 1 sin pasarse.

Los nombres de la API de expo-haptics los revisé contra la versión instalada (57.0.3): `performAndroidHapticsAsync`, `AndroidHaptics.Confirm`, `Reject`, `Clock_Tick`, `Toggle_On` y `Toggle_Off` existen.

## Archivos

- `logo/`: símbolo en todas sus variantes (claro, oscuro, un color tinta, un color blanco, solo el visto, 16 px), logotipo horizontal y apilado (claro, oscuro, un color), ícono de app con sus capas y vistas previas. Los PNG están en `logo/png/`.
- `lamina-logo.svg` y `lamina-logo.png`: símbolo, construcción, logotipos, ícono con máscaras, tamaños de 64, 32 y 16 px (y la ampliación del de 16) y versiones.
- `botones.html`: página autocontenida; solo carga Google Fonts desde afuera. Para abrirla en modo gimnasio usa `#gimnasio`, y para forzar «reducir movimiento», `#reducir`. Capturas: `captura-botones.png` y `captura-botones-gimnasio.png`.
- `tokens.json`: colores, radios, altos, bordes, tipografía, movimiento y geometría del logo.
- `herramientas/`: los scripts que generan todo (`generar_logo.py`, `generar_botones.py`, `contraste.py`). Se corren con `python3` y necesitan fontTools y rsvg-convert.

## Riesgos que veo

- Un visto es un signo muy común. Lo propio lo ponen el menta, el visto en tinta (nunca blanco ni azul) y que sea exactamente el botón de la app.
- El ícono ya no es una casilla: el visto se sale por la esquina. Pero a 48 dp el corte se ve chico, así que conviene probarlo en un Samsung real (cuadrado redondeado) y en un Pixel (círculo).
- El arreglo del ícono no resuelve lo de fondo: un visto en un círculo sigue siendo el signo universal de «listo». Lo propio está en el uso, no en la forma. Si eso no alcanza, hay que cambiar el concepto, y eso queda fuera de esta ronda.

## Cambios después de la revisión

El director de arte la vio bien ejecutada y fiel a los tokens del PRD, pero encontró que el logo no es propio: un visto en un círculo es el signo universal de «listo» y, con máscara cuadrada, parece app de tareas. Apliqué los ocho arreglos sin cambiar el concepto.

1. **Ícono que dejó de ser casilla.** El visto es 1,6 veces más grande (34 px por unidad, trazo de 74 px) y bajó a la izquierda (ángulo en 196; 372). El brazo largo sigue hasta que el borde lo corta en la esquina superior derecha. Probé seis variantes con las dos máscaras a 240 y a 48 px y elegí la que sale por la esquina (detalle en «Ícono de app»). Afecta a `icono-app.svg`, a las tres capas y a las dos vistas previas, con sus PNG. El símbolo y los logotipos no cambian.
2. **Serie pendiente sin visto tenue.** Pendiente es ahora un aro vacío y hecha es el disco lleno con visto: cambian de forma, no solo de color. Para la serie bloqueada usé un aro punteado. Sin el visto tenue, el disco deshabilitado casi desaparecía en modo gimnasio (1,16:1 contra la fila).
3. **Secundario tonal presionado con un tono propio.** Pasa a `#A0D9C8` en clara y a `#295E4E` en gimnasio, y la etiqueta pasa al color de texto (11,16:1 y 6,60:1). Antes pasaba a `#45B392` con texto tinta, igual que el primario en reposo. El chip elegido usa el mismo tono al presionarlo.
4. **Chips en una sola fila.** En la zona de prueba van en un carril que se desliza de lado. Llega hasta el borde del marco, así que el último chip queda cortado y eso avisa que hay más. Agregué «Brazos», «Glúteos» y «Abdomen» para que el desborde se vea. Revisé en Brave sin interfaz que quedan en una fila: 750 dp de contenido en 410 visibles.
5. **Peligro con contorno; relleno solo en la confirmación.** «Borrar rutina» va con contorno y abre una tarjeta de confirmación; solo «Sí, borrar» va relleno (`#FF8A80` en gimnasio). Lo apliqué también en clara (`#B3261E`) para que el componente no cambie de variante según el tema. La carga («Borrando…») ocurre en la confirmación. En la zona de prueba, «Borrar rutina» abre la tarjeta y lleva el foco a «Cancelar».
6. **Rojos presionados aprobados como tokens.** Dejé `#8C1D18` y `#FFB4AB` como `peligroPresionado` en `tokens.json` y en el panel de paleta. No los quité: espejan a la acción (en clara oscurece y en gimnasio aclara), y sin ellos el relleno de confirmación sería el único botón sin cambio de color al presionarlo. Ahora solo se ven en ese relleno.
7. **Rótulo «7 · 12» de la lámina.** Ahora va encima del vértice, dentro del círculo de aire, y ya no cruza la línea punteada.
8. **Texto de «Peligro».** El que estaba mal era el texto, no la captura. Se podía leer como si el suave del modo gimnasio llevara texto `#131A17`, cuando lleva el rojo del modo. Lo reescribí con las dos variantes por separado. Contorno: texto `#B3261E` en clara y `#FF8A80` en gimnasio. Relleno: texto blanco en clara y `#131A17` en gimnasio.

Rehíce `lamina-logo.svg`/`.png`, todos los PNG de `logo/png/`, `botones.html`, `captura-botones.png` y `captura-botones-gimnasio.png`, y actualicé `tokens.json`. Corrí `contraste.py` de nuevo: pasan todos los pares obligatorios.
