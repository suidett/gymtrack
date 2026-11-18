# GymTrack: guía de diseño

Fase 5 del proceso de marca (sistema de diseño). Fecha: 2026-11-16. Estado: propuesta para revisar. **No está aplicada al código.**
Se apoya en `gymtrack-filosofia-visual.md` («Cuaderno Exacto»), en el símbolo fijado (`logo/final/simbolo-final.md`) y en la tipografía elegida (Manrope e IBM Plex Mono).

Archivos de esta fase:

| Archivo | Qué es |
| --- | --- |
| `docs/marca/sistema/tokens-propuestos.js` | La propuesta para reemplazar `packages/tokens/index.js`. Misma forma, más `type`, `spacing`, `motion` y el registro de las dos decisiones. |
| `docs/marca/sistema/contraste.js` | Calcula la razón WCAG de cada par. `node docs/marca/sistema/contraste.js`. |
| `docs/marca/sistema/fuente/` | `piezas.js` y `gen-tableros.js`: dibujan los tableros y el espécimen desde los tokens. |
| `docs/marca/sistema/especimen-sistema.html` | Los cinco tableros en una página, para abrir en un navegador. |
| `docs/marca/sistema/sistema-tableros.json` | Posiciones de los tableros en el lienzo. |
| Tableros del lienzo | `MColores`, `MTipoEscala`, `MBotones`, `MComponentes`, `MAnimaciones` (`.dc.html`). |

---

## Las dos decisiones (cerradas el 2026-11-17)

### 1. El segundo acento: azul lapicera

El violeta de hoy juntaba celebrar y descansar sin una razón de libreta. El segundo acento es **la voz del entrenador**: la raya del margen, la firma de la nota, el subrayado del récord y la barra del descanso. El texto va en tinta. Se compararon tres opciones; queda como registro:

| Opción | Base | Profundo (texto) | Suave (fondo) | Claro (modo gimnasio) | Estado | Lectura |
| --- | --- | --- | --- | --- | --- | --- |
| A · Violeta (el de hoy) | `#8B7BE8` | `#5B4CB8` | `#EDE9FD` | `#A895FF` | Comparada | Pasaba los contrastes, pero no sale de la libreta. |
| **B · Azul lapicera** | `#5D87DC` | `#2A4E9C` | `#E6EDFA` | `#8FB0F5` | **Elegida** | La lapicera azul del profe. El margen queda escrito en su color. No se confunde con el menta ni con el ámbar del aviso. |
| C · Ocre lápiz | `#B08530` | `#7C5810` | `#F6EEDA` | `#E0B862` | Comparada | Cálido, pero choca con el ámbar del aviso y se acerca al dorado de una medalla. |

**Por qué el azul.** Es la única de las tres que tiene un lugar literal en la metáfora: en una libreta de entrenamiento, el alumno escribe con lo que tenga y el profe corrige al margen con lapicera azul. Las tres opciones pasaban todos los contrastes; la matriz las conserva como registro. En `MColores` siguen lado a lado, con el azul marcado como elegido.

### 2. El radio de las esquinas: punto medio

Se compararon dos opciones y elegiste un punto medio entre ellas. Queda como registro:

| Opción | Botón | Campo | Tarjeta y aviso | Chip | Pestaña | Etiqueta | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A · Canto | 8 | 8 | 12 | 8 | 8 | 4 | Comparada |
| **Punto medio** | **12** | **12** | **14** | **12** | **12** | **5** | **Elegida** |
| B · Proporción del símbolo | 16 (56 de alto) / 14 (48) | 14 | 16 | redondo | 12 | 6 | Comparada |

A daba esquinas de canto de libreta, pero a tamaño de pantalla quedaban secas. B seguía la proporción de las barras del símbolo (radio 2 en barra de 7) y se leía blanda, cerca de Material. El punto medio es más suave que A sin llegar a B, y botón, campo y chip comparten 12, así que se apilan parejos. Los únicos círculos siguen siendo los que se tocan con el pulgar (más y menos, RIR, interruptor). En `MBotones` están las tres columnas con las mismas piezas y la esquina ampliada 4 veces. Al verlo dibujado no hizo falta ningún ajuste de ±1.

---

## 1. Principios del sistema

1. **La tinta escribe, el color subraya.** Todo texto va en tinta o grafito, también sobre un botón de color. El color rellena, marca o subraya y nunca carga una palabra solo.
2. **La cifra manda.** En la fila activa, «30» (40 dp) es más grande que el título de la pantalla (28 dp).
3. **Una mano, entre series.** Nada que se toque mide menos de 48 dp. Kilos, repeticiones y «Serie hecha» miden 56.
4. **Plano y mate.** Sin sombras en tarjetas, sin gradientes, sin texturas. La profundidad es una línea.
5. **Solo se mueve lo que informa.** Una serie marcada, el descanso que corre, un récord. Lo demás se queda quieto.
6. **La misma libreta con la luz baja.** El modo gimnasio invierte la página y no cambia nada más.

---

## 2. Color

### 2.1 La regla, en concreto

- Sobre un relleno de color (botón menta, chip activo, RIR elegido, botón de acento) el texto va en **tinta** `#131A17`. Nunca en blanco: blanco sobre menta da 2,59:1.
- Las únicas variantes de color que llevan texto son las **profundas** (`deep`): menta profunda, error texto, aviso texto, acento profundo. Siempre acompañadas de algo más que el color: un ícono, la palabra o un subrayado.
- La **menta base** `#45B392` no es un color de texto ni de trazo fino sobre papel (2,40:1). Es un relleno que lleva tinta encima. Para el anillo de foco, la barra de progreso o un borde que es el único indicador, se usa la menta profunda.
- Éxito usa la familia menta. No hay un segundo verde.

### 2.2 Papel y tinta

Las clases son las que genera el preset propuesto (las mismas de hoy, más `stroke`).

| Rol | Token | Clase | Claro | Modo gimnasio | Uso | Lleva |
| --- | --- | --- | --- | --- | --- | --- |
| Papel | `bg` / `gym.bg` | `bg-bg` | `#F5F7F5` | `#131A17` | Fondo de todas las pantallas | Tinta, grafito, tenue |
| Superficie | `surface` / `gym.card` | `bg-surface` | `#FFFFFF` | `#1C2521` | Tarjetas, campos, barra de pestañas | Tinta, grafito, tenue |
| Campo | `field` / `gym.field` | `bg-field` | `#E9EDEA` | `#242E2A` | Chip y etiqueta neutros, pista del selector, deshabilitado | Tinta, grafito (no tenue) |
| Línea | `line` / `gym.line` | `border-line` | `#E6ECE8` | `#2C3833` | Separa renglones. Decorativa | Nada |
| Trazo | `stroke` / `gym.stroke` | `border-stroke` | `#7F8B86` | `#71817A` | Borde de campos, del botón de borde, de los círculos de más y menos | Nada (3:1 o más) |
| Tinta | `ink` / `gym.text` | `text-ink` | `#131A17` | `#F5F7F5` | Todo el texto: títulos, cuerpo y cifras | — |
| Grafito | `ink.muted` / `gym.muted` | `text-ink-muted` | `#5E6D67` | `#A9B5B0` | Texto secundario, etiquetas | — |
| Tenue | `ink.faint` / `gym.faint` | `text-ink-faint` | `#64736D` | `#8E9C96` | Serie pendiente, placeholder. Solo sobre papel y superficie | — |

Una nota honesta sobre el tenue: para pasar 4,5:1 sobre papel, el gris más claro posible queda en `#66756F`, casi igual al grafito. El tenue elegido (`#64736D`, 4,63:1) se distingue del grafito por el contexto y el peso (400 contra 500 en las cifras), no por el color. No hay un gris que pase y se vea mucho más claro.

### 2.3 Menta

| Rol | Token | Clase | Valor | Uso | Lleva |
| --- | --- | --- | --- | --- | --- |
| Menta | `primary` | `bg-primary` | `#45B392` | Relleno de la acción y de lo hecho: botón primario, serie hecha, chip activo, RIR elegido, pista del interruptor, ficha de la pestaña activa | Tinta (6,83:1) |
| Menta profunda | `primary.deep` | `text-primary-deep`, `border-primary-deep` | `#28735E` | Enlace, «correcto», foco del campo, borde de la fila activa, barra de progreso | Va sobre papel, superficie y menta suave |
| Menta suave | `primary.soft` | `bg-primary-soft` | `#E3F3ED` | Fila activa, aviso de éxito, botón secundario | Tinta, grafito, menta profunda |
| Menta presionada | `primary.pressed` | `active:bg-primary-pressed` | `#3A9F81` | Botón primario presionado | Tinta (5,44:1) |
| Menta suave presionada | `primary.softPressed` | `active:bg-primary-softPressed` | `#D2E2DC` | Botón secundario presionado | Tinta |
| Menta clara | `primary.bright` | `text-primary-bright` | `#7BE0BE` | Enlace y «correcto» en modo gimnasio | Va sobre fondo y superficie oscuros |
| Menta noche | `primary.night` | `bg-primary-night` | `#1E3A31` | Fila activa y botón secundario en modo gimnasio | Texto claro, secundario |

El menta profundo de hoy (`#2f7f68`) daba 4,48:1 sobre papel: no llegaba a 4,5. El nuevo `#28735E` da 5,27:1.

### 2.4 Semánticos

| Rol | Token | Claro | Modo gimnasio | Uso |
| --- | --- | --- | --- | --- |
| Éxito | `primary.*` | familia menta | familia menta | Sesión guardada, campo correcto, serie hecha |
| Error | `danger` | `#B4544E` | `#F0968D` (claro) | Borde del campo con error, ícono |
| Error texto | `danger.deep` | `#A2453F` | `#F0968D` | Mensaje de error, texto del botón de peligro |
| Error suave | `danger.soft` | `#FBEAE8` | `#3B2422` (noche) | Fondo del aviso de error y del botón de peligro |
| Error suave presionado | `danger.softPressed` | `#F2E2E0` | campo oscuro | Botón de peligro presionado |
| Aviso | `warning` | `#A87A1F` | `#E8B65A` (claro) | Ícono y borde de aviso |
| Aviso texto | `warning.deep` | `#8A5D0A` | `#E8B65A` | Etiqueta de aviso |
| Aviso suave | `warning.soft` | `#FBF1DC` | `#352B16` (noche) | Fondo del aviso: estancamiento, sin señal, datos por revisar |

El rojo es apagado y no grita. Una serie con fallo no pinta la fila de rojo: lleva un círculo de error suave con su ícono.

### 2.5 El segundo acento: azul lapicera

El acento tiene seis piezas: base (relleno con tinta encima y raya del margen), profundo (firma de la nota y etiqueta del récord), suave (fondo del descanso), presionado, claro y noche para el modo gimnasio. El azul es el elegido; el violeta y el ocre quedan como registro de lo comparado.

| | Violeta (comparada) | **Azul lapicera (elegida)** | Ocre (comparada) |
| --- | --- | --- | --- |
| `DEFAULT` | `#8B7BE8` | `#5D87DC` | `#B08530` |
| `deep` | `#5B4CB8` | `#2A4E9C` | `#7C5810` |
| `soft` | `#EDE9FD` | `#E6EDFA` | `#F6EEDA` |
| `pressed` | `#8372E3` | `#5581D7` | `#A97F2C` |
| `bright` | `#A895FF` | `#8FB0F5` | `#E0B862` |
| `night` | `#262238` | `#1B2638` | `#2E2716` |

Dónde aparece el acento:

- **Nota al margen.** Raya de 3 dp en base a la izquierda, firma («Nota de Javier, tu entrenador · ayer») en profundo, 13 dp en negrita. El texto de la nota, en tinta.
- **Récord.** Punto de 8 dp y etiqueta en profundo. La cifra en tinta, con un subrayado de 3 dp en base debajo («el color subraya»).
- **Descanso.** Fondo suave, etiqueta «Descanso» con reloj en profundo, cronómetro en tinta, barra en profundo sobre una pista de superficie. Botón «Saltar» en base con texto tinta.

La sugerencia de carga no usa el acento: usa la misma forma que la nota, con la raya menta. Así la libreta tiene dos voces al margen que se distinguen: la app (menta) y el entrenador (acento).

### 2.6 Modo gimnasio

«La misma libreta con la luz baja», no negro con naranja.

- El fondo es la tinta del símbolo (`#131A17`), no negro. El texto es el papel (`#F5F7F5`, 16,42:1). La página se invierte; la estructura no cambia.
- Los rellenos de color no cambian: el botón menta sigue con texto tinta y el acento base también.
- Lo que cambia son las variantes de texto (pasan a `bright`) y los fondos teñidos (pasan a `night`).
- Sin sombras. La superficie se separa del fondo por su tono (`#1C2521`) y una línea.

La paleta oscura de hoy (`gym`) usaba un fondo casi negro (`#08120E`) y un gris (`#6E807A`) que daba 3,95:1 sobre su tarjeta. Se reemplaza entera.

| Rol | Token | Valor |
| --- | --- | --- |
| Fondo | `gym.bg` | `#131A17` |
| Superficie | `gym.card` | `#1C2521` |
| Campo | `gym.field` | `#242E2A` |
| Línea | `gym.line` | `#2C3833` |
| Trazo | `gym.stroke` | `#71817A` |
| Texto | `gym.text` | `#F5F7F5` |
| Secundario | `gym.muted` | `#A9B5B0` |
| Tenue | `gym.faint` | `#8E9C96` |
| Menta clara, menta noche | `primary.bright`, `primary.night` | `#7BE0BE`, `#1E3A31` |
| Error claro, error noche | `danger.bright`, `danger.night` | `#F0968D`, `#3B2422` |
| Aviso claro, aviso noche | `warning.bright`, `warning.night` | `#E8B65A`, `#352B16` |

**Cómo se activa.** Queda para decidir con el producto. La propuesta: un interruptor «Modo gimnasio» en Perfil, con una tercera opción «Igual que el teléfono». La app hoy es solo clara (`userInterfaceStyle: light`).

**Cómo se implementa sin tocar las pantallas.** Con NativeWind 4, los colores del preset apuntan a variables y un proveedor cambia las variables. Las clases del kit no cambian (`bg-bg`, `text-ink`).

```js
// packages/tokens/tailwind.preset.js (propuesta)
const v = (nombre) => `rgb(var(--c-${nombre}) / <alpha-value>)`;
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        field: v('field'),
        line: v('line'),
        stroke: v('stroke'),
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), faint: v('ink-faint') },
        primary: { DEFAULT: colors.primary.DEFAULT, deep: v('primary-deep'), soft: v('primary-soft'), pressed: colors.primary.pressed },
        // … el resto igual: lo que no cambia de modo queda en hexadecimal.
      },
    },
  },
};
```

```tsx
// apps/mobile/src/components/ui/Tema.tsx (propuesta)
import { vars } from 'nativewind';
import { colors as c } from '@gymtrack/tokens';

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
const claro = vars({ '--c-bg': rgb(c.bg), '--c-surface': rgb(c.surface), '--c-ink': rgb(c.ink.DEFAULT), '--c-primary-deep': rgb(c.primary.deep) /* … */ });
const gimnasio = vars({ '--c-bg': rgb(c.gym.bg), '--c-surface': rgb(c.gym.card), '--c-ink': rgb(c.gym.text), '--c-primary-deep': rgb(c.primary.bright) /* … */ });

export function Tema({ modo, children }: { modo: 'claro' | 'gimnasio'; children: React.ReactNode }) {
  return <View style={modo === 'gimnasio' ? gimnasio : claro} className="flex-1">{children}</View>;
}
```

En web (Tailwind) es lo mismo con CSS: las variables van en `:root` y en `[data-tema="gimnasio"]`.

### 2.7 Validación de contraste

Script: `node docs/marca/sistema/contraste.js` (sale con código 1 si un par no pasa; `--json` da los datos). Fórmula WCAG 2.x de luminancia relativa. Mínimos: **texto 4,5:1**; **gráficos de interfaz** (bordes de control, foco, íconos, barras de progreso) **3:1**. No usé la excepción de texto grande: todo el texto pasa 4,5.

**Resultado: 117 pares, 117 pasan.** 66 de la base (37 en claro, 29 en modo gimnasio) y 17 por cada opción comparada del acento (51; los del azul son los que quedan).

Lo que tuve que cambiar para que pasara:

| Par | Antes | Ahora |
| --- | --- | --- |
| Menta profunda sobre papel | `#2f7f68`: 4,48 | `#28735E`: 5,27 |
| Menta profunda sobre menta suave | `#2f7f68`: 4,20 | `#28735E`: 4,94 |
| Tenue sobre papel | `#8B9A94`: 2,73 | `#64736D`: 4,63 |
| Secundario oscuro sobre su tarjeta | `#6E807A` en `#18211E`: 3,95 | `#A9B5B0` en `#1C2521`: 7,43 |
| Tinta sobre acento presionado (las tres opciones) | primera prueba, más oscura: 4,23 a 4,47 | 4,61 a 4,85 |
| Error texto sobre error suave presionado | primera prueba `#E9D9D7`: 4,44 | `#F2E2E0`: 4,84 |

Ya venían corregidos de los mockups: grafito `#5E6D67` (el `#71817B` de hoy da 3,80), error texto `#A2453F` y el botón menta con texto tinta.

Matriz completa (generada por el script):

| Modo | Grupo | Primer plano | Fondo | Uso | Tipo | Razón | Mínimo | Pasa |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| claro | Base | Tinta `#131A17` | Papel `#F5F7F5` | Todo el texto | texto | 16,42 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Superficie `#FFFFFF` | Texto en tarjetas y campos | texto | 17,68 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Campo `#E9EDEA` | Chip inactivo, etiqueta, selector | texto | 14,96 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Menta `#45B392` | Botón primario, chip activo, RIR | texto | 6,83 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Menta presionada `#3A9F81` | Botón primario presionado | texto | 5,44 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Menta suave `#E3F3ED` | Fila activa, aviso de éxito | texto | 15,41 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Menta suave presionada `#D2E2DC` | Botón secundario presionado | texto | 13,18 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Campo `#E9EDEA` | Botón de borde presionado | texto | 14,96 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Error suave `#FBEAE8` | Aviso de error | texto | 15,18 | 4,50 | sí |
| claro | Base | Tinta `#131A17` | Aviso suave `#FBF1DC` | Aviso de estancamiento | texto | 15,76 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Papel `#F5F7F5` | Texto secundario | texto | 5,05 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Superficie `#FFFFFF` | Secundario en tarjetas | texto | 5,44 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Campo `#E9EDEA` | Segmento sin elegir | texto | 4,60 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Menta suave `#E3F3ED` | Etiquetas en la fila activa | texto | 4,74 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Error suave `#FBEAE8` | Detalle en aviso de error | texto | 4,67 | 4,50 | sí |
| claro | Base | Grafito `#5E6D67` | Aviso suave `#FBF1DC` | Detalle en aviso | texto | 4,85 | 4,50 | sí |
| claro | Base | Tenue `#64736D` | Papel `#F5F7F5` | Serie pendiente | texto | 4,63 | 4,50 | sí |
| claro | Base | Tenue `#64736D` | Superficie `#FFFFFF` | Placeholder del campo | texto | 4,98 | 4,50 | sí |
| claro | Base | Menta profunda `#28735E` | Papel `#F5F7F5` | Enlace, «Correcto» | texto | 5,27 | 4,50 | sí |
| claro | Base | Menta profunda `#28735E` | Superficie `#FFFFFF` | Enlace en tarjeta | texto | 5,67 | 4,50 | sí |
| claro | Base | Menta profunda `#28735E` | Menta suave `#E3F3ED` | «Serie 2» en la fila activa | texto | 4,94 | 4,50 | sí |
| claro | Base | Error texto `#A2453F` | Papel `#F5F7F5` | Mensaje de error | texto | 5,64 | 4,50 | sí |
| claro | Base | Error texto `#A2453F` | Superficie `#FFFFFF` | Error en tarjeta | texto | 6,07 | 4,50 | sí |
| claro | Base | Error texto `#A2453F` | Error suave `#FBEAE8` | Botón de peligro | texto | 5,21 | 4,50 | sí |
| claro | Base | Error texto `#A2453F` | Error suave presionado `#F2E2E0` | Botón de peligro presionado | texto | 4,84 | 4,50 | sí |
| claro | Base | Aviso texto `#8A5D0A` | Papel `#F5F7F5` | Etiqueta de aviso | texto | 5,34 | 4,50 | sí |
| claro | Base | Aviso texto `#8A5D0A` | Aviso suave `#FBF1DC` | Título del aviso | texto | 5,13 | 4,50 | sí |
| claro | Base | Trazo `#7F8B86` | Papel `#F5F7F5` | Borde de campo y botón de borde | gráfico | 3,28 | 3,00 | sí |
| claro | Base | Trazo `#7F8B86` | Superficie `#FFFFFF` | Borde de campo en tarjeta | gráfico | 3,54 | 3,00 | sí |
| claro | Base | Menta profunda `#28735E` | Superficie `#FFFFFF` | Foco del campo, barra de progreso | gráfico | 5,67 | 3,00 | sí |
| claro | Base | Menta profunda `#28735E` | Menta suave `#E3F3ED` | Borde de la fila activa | gráfico | 4,94 | 3,00 | sí |
| claro | Base | Tinta `#131A17` | Menta `#45B392` | Visto de la serie hecha | gráfico | 6,83 | 3,00 | sí |
| claro | Base | Tinta `#131A17` | Papel `#F5F7F5` | Anillo de foco | gráfico | 16,42 | 3,00 | sí |
| claro | Base | Error `#B4544E` | Papel `#F5F7F5` | Ícono de error | gráfico | 4,52 | 3,00 | sí |
| claro | Base | Error `#B4544E` | Superficie `#FFFFFF` | Borde del campo con error | gráfico | 4,86 | 3,00 | sí |
| claro | Base | Aviso `#A87A1F` | Papel `#F5F7F5` | Ícono de aviso | gráfico | 3,57 | 3,00 | sí |
| claro | Base | Aviso `#A87A1F` | Superficie `#FFFFFF` | Borde de aviso | gráfico | 3,84 | 3,00 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Fondo `#131A17` | Todo el texto | texto | 16,42 | 4,50 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Superficie `#1C2521` | Texto en tarjetas | texto | 14,60 | 4,50 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Campo `#242E2A` | Chip inactivo, selector | texto | 13,01 | 4,50 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Menta noche `#1E3A31` | Fila activa | texto | 11,44 | 4,50 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Error noche `#3B2422` | Aviso de error | texto | 13,35 | 4,50 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Aviso noche `#352B16` | Aviso | texto | 12,93 | 4,50 | sí |
| gimnasio | Base | Tinta `#131A17` | Menta `#45B392` | Botón primario (igual que en claro) | texto | 6,83 | 4,50 | sí |
| gimnasio | Base | Tinta `#131A17` | Menta presionada `#3A9F81` | Botón primario presionado | texto | 5,44 | 4,50 | sí |
| gimnasio | Base | Secundario `#A9B5B0` | Fondo `#131A17` | Texto secundario | texto | 8,35 | 4,50 | sí |
| gimnasio | Base | Secundario `#A9B5B0` | Superficie `#1C2521` | Secundario en tarjetas | texto | 7,43 | 4,50 | sí |
| gimnasio | Base | Secundario `#A9B5B0` | Campo `#242E2A` | Segmento sin elegir | texto | 6,62 | 4,50 | sí |
| gimnasio | Base | Secundario `#A9B5B0` | Menta noche `#1E3A31` | Etiquetas en la fila activa | texto | 5,82 | 4,50 | sí |
| gimnasio | Base | Tenue `#8E9C96` | Fondo `#131A17` | Serie pendiente | texto | 6,18 | 4,50 | sí |
| gimnasio | Base | Tenue `#8E9C96` | Superficie `#1C2521` | Placeholder | texto | 5,50 | 4,50 | sí |
| gimnasio | Base | Menta clara `#7BE0BE` | Fondo `#131A17` | Enlace, «Correcto» | texto | 11,15 | 4,50 | sí |
| gimnasio | Base | Menta clara `#7BE0BE` | Superficie `#1C2521` | Enlace en tarjeta | texto | 9,92 | 4,50 | sí |
| gimnasio | Base | Menta clara `#7BE0BE` | Menta noche `#1E3A31` | «Serie 2» en la fila activa | texto | 7,77 | 4,50 | sí |
| gimnasio | Base | Error claro `#F0968D` | Fondo `#131A17` | Mensaje de error | texto | 7,96 | 4,50 | sí |
| gimnasio | Base | Error claro `#F0968D` | Superficie `#1C2521` | Error en tarjeta | texto | 7,08 | 4,50 | sí |
| gimnasio | Base | Error claro `#F0968D` | Error noche `#3B2422` | Botón de peligro | texto | 6,47 | 4,50 | sí |
| gimnasio | Base | Aviso claro `#E8B65A` | Fondo `#131A17` | Etiqueta de aviso | texto | 9,49 | 4,50 | sí |
| gimnasio | Base | Aviso claro `#E8B65A` | Aviso noche `#352B16` | Título del aviso | texto | 7,47 | 4,50 | sí |
| gimnasio | Base | Trazo noche `#71817A` | Fondo `#131A17` | Borde de campo | gráfico | 4,31 | 3,00 | sí |
| gimnasio | Base | Trazo noche `#71817A` | Superficie `#1C2521` | Borde de campo en tarjeta | gráfico | 3,83 | 3,00 | sí |
| gimnasio | Base | Menta `#45B392` | Fondo `#131A17` | Foco, barra de progreso | gráfico | 6,83 | 3,00 | sí |
| gimnasio | Base | Menta `#45B392` | Superficie `#1C2521` | Foco en tarjeta | gráfico | 6,08 | 3,00 | sí |
| gimnasio | Base | Texto `#F5F7F5` | Fondo `#131A17` | Anillo de foco | gráfico | 16,42 | 3,00 | sí |
| gimnasio | Base | Error claro `#F0968D` | Superficie `#1C2521` | Borde del campo con error | gráfico | 7,08 | 3,00 | sí |
| gimnasio | Base | Aviso claro `#E8B65A` | Superficie `#1C2521` | Ícono de aviso | gráfico | 8,44 | 3,00 | sí |
| claro | Acento violeta | Tinta `#131A17` | Acento `#8B7BE8` | Botón de acento | texto | 5,13 | 4,50 | sí |
| claro | Acento violeta | Tinta `#131A17` | Acento presionado `#8372E3` | Botón de acento presionado | texto | 4,61 | 4,50 | sí |
| claro | Acento violeta | Tinta `#131A17` | Acento suave `#EDE9FD` | Panel de descanso, nota | texto | 14,88 | 4,50 | sí |
| claro | Acento violeta | Grafito `#5E6D67` | Acento suave `#EDE9FD` | «Siguiente: serie 3» | texto | 4,58 | 4,50 | sí |
| claro | Acento violeta | Acento profundo `#5B4CB8` | Papel `#F5F7F5` | Firma de la nota al margen | texto | 6,15 | 4,50 | sí |
| claro | Acento violeta | Acento profundo `#5B4CB8` | Superficie `#FFFFFF` | Etiqueta del récord | texto | 6,62 | 4,50 | sí |
| claro | Acento violeta | Acento profundo `#5B4CB8` | Acento suave `#EDE9FD` | Etiqueta «Descanso» | texto | 5,57 | 4,50 | sí |
| claro | Acento violeta | Acento `#8B7BE8` | Papel `#F5F7F5` | Raya del margen, subrayado del récord | gráfico | 3,20 | 3,00 | sí |
| claro | Acento violeta | Acento `#8B7BE8` | Superficie `#FFFFFF` | Subrayado en tarjeta | gráfico | 3,44 | 3,00 | sí |
| claro | Acento violeta | Acento profundo `#5B4CB8` | Acento suave `#EDE9FD` | Barra del descanso | gráfico | 5,57 | 3,00 | sí |
| gimnasio | Acento violeta | Tinta `#131A17` | Acento `#8B7BE8` | Botón de acento | texto | 5,13 | 4,50 | sí |
| gimnasio | Acento violeta | Texto `#F5F7F5` | Acento noche `#262238` | Panel de descanso | texto | 14,25 | 4,50 | sí |
| gimnasio | Acento violeta | Acento claro `#A895FF` | Fondo `#131A17` | Firma de la nota | texto | 7,08 | 4,50 | sí |
| gimnasio | Acento violeta | Acento claro `#A895FF` | Superficie `#1C2521` | Etiqueta del récord | texto | 6,29 | 4,50 | sí |
| gimnasio | Acento violeta | Acento claro `#A895FF` | Acento noche `#262238` | Etiqueta «Descanso» | texto | 6,14 | 4,50 | sí |
| gimnasio | Acento violeta | Acento `#8B7BE8` | Fondo `#131A17` | Raya del margen | gráfico | 5,13 | 3,00 | sí |
| gimnasio | Acento violeta | Acento `#8B7BE8` | Superficie `#1C2521` | Subrayado del récord | gráfico | 4,56 | 3,00 | sí |
| claro | Acento azul | Tinta `#131A17` | Acento `#5D87DC` | Botón de acento | texto | 5,02 | 4,50 | sí |
| claro | Acento azul | Tinta `#131A17` | Acento presionado `#5581D7` | Botón de acento presionado | texto | 4,64 | 4,50 | sí |
| claro | Acento azul | Tinta `#131A17` | Acento suave `#E6EDFA` | Panel de descanso, nota | texto | 15,03 | 4,50 | sí |
| claro | Acento azul | Grafito `#5E6D67` | Acento suave `#E6EDFA` | «Siguiente: serie 3» | texto | 4,63 | 4,50 | sí |
| claro | Acento azul | Acento profundo `#2A4E9C` | Papel `#F5F7F5` | Firma de la nota al margen | texto | 7,31 | 4,50 | sí |
| claro | Acento azul | Acento profundo `#2A4E9C` | Superficie `#FFFFFF` | Etiqueta del récord | texto | 7,87 | 4,50 | sí |
| claro | Acento azul | Acento profundo `#2A4E9C` | Acento suave `#E6EDFA` | Etiqueta «Descanso» | texto | 6,69 | 4,50 | sí |
| claro | Acento azul | Acento `#5D87DC` | Papel `#F5F7F5` | Raya del margen, subrayado del récord | gráfico | 3,27 | 3,00 | sí |
| claro | Acento azul | Acento `#5D87DC` | Superficie `#FFFFFF` | Subrayado en tarjeta | gráfico | 3,52 | 3,00 | sí |
| claro | Acento azul | Acento profundo `#2A4E9C` | Acento suave `#E6EDFA` | Barra del descanso | gráfico | 6,69 | 3,00 | sí |
| gimnasio | Acento azul | Tinta `#131A17` | Acento `#5D87DC` | Botón de acento | texto | 5,02 | 4,50 | sí |
| gimnasio | Acento azul | Texto `#F5F7F5` | Acento noche `#1B2638` | Panel de descanso | texto | 14,12 | 4,50 | sí |
| gimnasio | Acento azul | Acento claro `#8FB0F5` | Fondo `#131A17` | Firma de la nota | texto | 8,16 | 4,50 | sí |
| gimnasio | Acento azul | Acento claro `#8FB0F5` | Superficie `#1C2521` | Etiqueta del récord | texto | 7,26 | 4,50 | sí |
| gimnasio | Acento azul | Acento claro `#8FB0F5` | Acento noche `#1B2638` | Etiqueta «Descanso» | texto | 7,02 | 4,50 | sí |
| gimnasio | Acento azul | Acento `#5D87DC` | Fondo `#131A17` | Raya del margen | gráfico | 5,02 | 3,00 | sí |
| gimnasio | Acento azul | Acento `#5D87DC` | Superficie `#1C2521` | Subrayado del récord | gráfico | 4,46 | 3,00 | sí |
| claro | Acento ocre | Tinta `#131A17` | Acento `#B08530` | Botón de acento | texto | 5,26 | 4,50 | sí |
| claro | Acento ocre | Tinta `#131A17` | Acento presionado `#A97F2C` | Botón de acento presionado | texto | 4,85 | 4,50 | sí |
| claro | Acento ocre | Tinta `#131A17` | Acento suave `#F6EEDA` | Panel de descanso, nota | texto | 15,29 | 4,50 | sí |
| claro | Acento ocre | Grafito `#5E6D67` | Acento suave `#F6EEDA` | «Siguiente: serie 3» | texto | 4,71 | 4,50 | sí |
| claro | Acento ocre | Acento profundo `#7C5810` | Papel `#F5F7F5` | Firma de la nota al margen | texto | 5,98 | 4,50 | sí |
| claro | Acento ocre | Acento profundo `#7C5810` | Superficie `#FFFFFF` | Etiqueta del récord | texto | 6,44 | 4,50 | sí |
| claro | Acento ocre | Acento profundo `#7C5810` | Acento suave `#F6EEDA` | Etiqueta «Descanso» | texto | 5,57 | 4,50 | sí |
| claro | Acento ocre | Acento `#B08530` | Papel `#F5F7F5` | Raya del margen, subrayado del récord | gráfico | 3,12 | 3,00 | sí |
| claro | Acento ocre | Acento `#B08530` | Superficie `#FFFFFF` | Subrayado en tarjeta | gráfico | 3,36 | 3,00 | sí |
| claro | Acento ocre | Acento profundo `#7C5810` | Acento suave `#F6EEDA` | Barra del descanso | gráfico | 5,57 | 3,00 | sí |
| gimnasio | Acento ocre | Tinta `#131A17` | Acento `#B08530` | Botón de acento | texto | 5,26 | 4,50 | sí |
| gimnasio | Acento ocre | Texto `#F5F7F5` | Acento noche `#2E2716` | Panel de descanso | texto | 13,76 | 4,50 | sí |
| gimnasio | Acento ocre | Acento claro `#E0B862` | Fondo `#131A17` | Firma de la nota | texto | 9,43 | 4,50 | sí |
| gimnasio | Acento ocre | Acento claro `#E0B862` | Superficie `#1C2521` | Etiqueta del récord | texto | 8,38 | 4,50 | sí |
| gimnasio | Acento ocre | Acento claro `#E0B862` | Acento noche `#2E2716` | Etiqueta «Descanso» | texto | 7,90 | 4,50 | sí |
| gimnasio | Acento ocre | Acento `#B08530` | Fondo `#131A17` | Raya del margen | gráfico | 5,26 | 3,00 | sí |
| gimnasio | Acento ocre | Acento `#B08530` | Superficie `#1C2521` | Subrayado del récord | gráfico | 4,67 | 3,00 | sí |

Pares que no se usan, a propósito (no están en la matriz):

- Blanco #FFFFFF sobre Menta #45B392: 2,59. El texto blanco del botón menta de hoy.
- Menta #45B392 sobre Papel #F5F7F5: 2,40. Menta como texto o como único indicador sobre papel.
- Tenue #64736D sobre Campo #E9EDEA: 4,22. Placeholder sobre un relleno gris.
- Grafito de hoy #71817B sobre Papel #F5F7F5: 3,80. El gris secundario anterior.
- Tenue de hoy #8B9A94 sobre Papel #F5F7F5: 2,73. El gris tenue anterior.
- Menta profunda de hoy #2f7f68 sobre Papel #F5F7F5: 4,48. La menta profunda anterior.
- Gris de hoy (gym) #6E807A sobre Tarjeta gym de hoy #18211E: 3,95. El secundario oscuro anterior.

---

## 3. Tipografía

Manrope habla, IBM Plex Mono cuenta. Nada baja de 13 dp. Extrabold (800) queda cargado para el logotipo, no para la interfaz.

| Rol | Token `type.` | Fuente y peso | Tamaño / interlínea | Espaciado | Uso | Ejemplo |
| --- | --- | --- | --- | --- | --- | --- |
| Título | `titulo` | Manrope 700 | 28 / 34 | −0,3 | Saludo, título de pantalla | Hola, Camila |
| Subtítulo | `subtitulo` | Manrope 700 | 20 / 26 | −0,2 | Sección, día de rutina | Día A · Piernas |
| Título de tarjeta | `tituloTarjeta` | Manrope 600 | 17 / 22 | 0 | Ejercicio, alumno | Sentadilla |
| Cuerpo | `cuerpo` | Manrope 400 | 16 / 24 | 0 | Textos, la sugerencia de carga | Intenta 30 kg × 10 a 12. |
| Cuerpo medio | `cuerpoMedio` | Manrope 600 | 16 / 24 | 0 | Lo destacado de una fila | Press banca |
| Secundario | `secundario` | Manrope 400 | 14 / 20 | 0 | Detalle bajo un título | Serie 2 de 3 |
| Nota | `nota` | Manrope 400 | 13 / 18 | 0 | Lo mínimo | Última vez: martes 11 |
| Etiqueta | `etiqueta` | Plex Mono 500, mayúsculas | 13 / 16 | 0,8 | Encabezados de columna y sección | SUGERENCIA DE CARGA |
| Botón | `boton` | Manrope 700 | 16 / 20 | 0 | Botón normal y grande | Serie hecha |
| Botón chico | `botonChico` | Manrope 700 | 14 / 18 | 0 | Botón de 40 | +30 s |
| Cifra grande | `cifraGrande` | Plex Mono 600 | 40 / 44 | −0,5 | Kilos y reps de la fila activa | 32,5 |
| Cifra | `cifra` | Plex Mono 600 | 24 / 28 | −0,2 | Récord, dato del resumen | 45 kg × 8 |
| Cifra de fila | `cifraFila` | Plex Mono 500 | 17 / 24 | 0 | Kilos y reps en la bitácora | 30 · 10 |
| Cifra de tabla | `cifraTabla` | Plex Mono 400 | 15 / 20 | 0 | Historial, Progreso, RIR | 27,5 · 30 · 32,5 |
| Cronómetro | `cronometro` | Plex Mono 600 | 56 / 60 | −1 | El descanso | 1:24 |

Junto a Manrope, la mono se ve un 5 % más chica (altura de x 0,516 contra 0,540). Por eso la cifra de fila (17) va un punto sobre el cuerpo (16).

### Reglas de las cifras

| Sí | No | Regla |
| --- | --- | --- |
| `32,5 kg` | `32.5kg` | Coma decimal. Espacio que no se corta (U+00A0) antes de la unidad: «kg» nunca queda solo en la línea siguiente. |
| `30 kg × 10` | `30kg x 10` | Signo × (U+00D7), con un espacio a cada lado. |
| `10 a 12` | `10-12` | Los rangos se escriben con «a». |
| `−2,5 kg` | `-2,5 kg` | Signo menos tipográfico (U+2212), que mide lo mismo que el más. El Stepper ya lo usa. |
| `1:24` | `84 s` | Cronómetro en minutos y segundos. Lo agregado, en segundos: «+30 s». |
| `4,3 t` | `4.300 kg` | Volumen desde 1.000 kg en toneladas, como ya hace `fmtVolumen`. |
| `RIR 2` | `rir: 2` | RIR siempre en mayúsculas y con espacio. Sin valor: «–». |

- **Ancho fijo.** Toda cifra que se compara en columna va en Plex Mono, alineada a la derecha si tiene decimales. Si alguna vez una cifra va en Manrope, usa `fontVariant: ['tabular-nums']`.
- **Una sola fuente de formato.** `fmtNum`, `fmtKg`, `fmtVolumen` y `fmtDuracion` de `@gymtrack/shared` aplican estas reglas. Falta el espacio que no se corta: `fmtKg` hoy usa un espacio normal.

### Implementación

En el preset, cada rol se vuelve una clase de tamaño con su interlínea; la familia sigue en las clases `font-*` de hoy.

```js
// tailwind.preset.js (propuesta)
const { type } = require('./index.js');
const tam = (r) => [`${r.size}px`, { lineHeight: `${r.line}px`, letterSpacing: `${r.tracking}px` }];
fontSize: {
  titulo: tam(type.titulo),        // text-titulo
  cuerpo: tam(type.cuerpo),        // text-cuerpo
  'cifra-grande': tam(type.cifraGrande),
  cronometro: tam(type.cronometro),
  // …
},
```

```tsx
// Txt.tsx (propuesta): mismas variantes, valores nuevos
const VARIANTES = {
  titulo: 'font-sans-bold text-titulo text-ink',
  secundario: 'font-sans text-secundario text-ink-muted',
  pequeno: 'font-sans text-nota text-ink-muted',
  etiqueta: 'font-mono-medium text-etiqueta uppercase text-ink-muted',
  cifraGrande: 'font-mono-semibold text-cifra-grande text-ink',
  // …
} as const;
```

---

## 4. Espacio y forma

### Espacio

Base de 4. La escala es la misma de Tailwind, así que ya existe en NativeWind: `p-1` = 4, `p-2` = 8, `p-4` = 16.

| Paso | dp | Uso típico |
| --- | --- | --- |
| 0,5 | 2 | Separación entre cifra y subrayado |
| 1 | 4 | Entre círculos de RIR |
| 2 | 8 | Entre botones de una fila, entre chips |
| 3 | 12 | Entre filas de una tarjeta |
| 4 | 16 | Relleno de tarjeta y de aviso |
| 5 | 20 | Margen lateral de la pantalla |
| 6 | 24 | Entre secciones |
| 8 | 32 | Entre bloques grandes |
| 12 | 48 | Final de la pantalla |

Medidas con nombre propio (`spacing` en los tokens; en el preset, `h-toque`, `h-renglon`, `h-fila`, `px-margen`):

| Nombre | dp | Qué |
| --- | --- | --- |
| `toque` | 48 | Mínimo de cualquier cosa que se toca |
| `renglon` | 56 | Más y menos de kilos y reps; «Serie hecha» y «Fallé» |
| `fila` | 48 | Alto de un renglón de la bitácora |
| `barra` | 64 | Barra de pestañas, sin la zona segura |
| `margen` | 20 | Margen lateral (el `px-5` de `Pantalla`) |

Para lo que se ve más chico que 48 (botón chico de 40, RIR de 44), se agranda la zona de toque con `hitSlop` hasta 48.

### Radios

Punto medio (decisión cerrada el 2026-11-17):

| Token | Clase | dp | Dónde |
| --- | --- | --- | --- |
| `button` | `rounded-button` | 12 | Botones de los tres tamaños |
| `field` | `rounded-field` | 12 | Campos de texto, la cifra editable del Stepper |
| `chip` | `rounded-chip` | 12 | Chips de filtro |
| `tab` | `rounded-tab` | 12 | Ficha de la pestaña activa (56 × 30) |
| `card` | `rounded-card` | 14 | Tarjetas, avisos, fila activa, panel de descanso, tarjeta de récord |
| `tag` | `rounded-tag` | 5 | Etiquetas chicas (`Etiqueta`) |
| `pill` | `rounded-full` | 999 | Más y menos, RIR, interruptor, barras de progreso y subrayados |

El selector segmentado usa el radio del botón por fuera (12) y 3 menos por dentro (9), para que las dos esquinas queden concéntricas con los 4 de relleno. Una tarjeta que contiene otra pieza con radio de tarjeta (la fila activa dentro de la bitácora) no se compensa: con 14 de relleno la diferencia no se nota.

```js
// tailwind.preset.js (propuesta)
borderRadius: {
  field: `${radius.field}px`,   // 12
  button: `${radius.button}px`, // 12
  card: `${radius.card}px`,     // 14
  tab: `${radius.tab}px`,       // 12
  chip: `${radius.chip}px`,     // 12
  tag: `${radius.tag}px`,       // 5
},
```

```tsx
<Pressable className="h-toque items-center justify-center rounded-button bg-primary active:bg-primary-pressed" />
<TextInput className="h-toque rounded-field border-[1.5px] border-stroke bg-surface px-3.5 font-sans text-cuerpo text-ink" />
<View className="rounded-card border border-line bg-surface p-4" />
<Pressable className="h-10 flex-row items-center gap-1.5 rounded-chip bg-primary px-3.5" />
```

### Bordes

| Grosor | Color | Uso |
| --- | --- | --- |
| 1 | Línea | Separa renglones, borde de tarjeta |
| 1,5 | Trazo | Borde de campo, del botón de borde, de los círculos de más y menos |
| 1,5 | Menta profunda | Borde de la fila activa, campo correcto |
| 2 | Menta profunda | Campo con foco |
| 2 | Error | Campo con error |
| 2 + 2 de aire | Tinta (papel en modo gimnasio) | Anillo de foco de un botón |
| 3 | Acento o menta | Raya del margen y subrayado del récord |

### Elevación

Mínima. Las tarjetas no llevan sombra: se separan por la superficie blanca y una línea. Solo lo que flota sobre la página lleva sombra, y una sola:

| Nivel | Qué | Sombra |
| --- | --- | --- |
| 0 | Todo: tarjetas, filas, barra de pestañas | Ninguna |
| 1 | Hoja inferior, menú, aviso flotante | `shadowColor` tinta, opacidad 0,08, desplazamiento 0/2, radio 8. Android: `elevation: 2` |

En modo gimnasio no hay sombras: lo que flota usa la superficie.

---

## 5. Botones y controles

### Variantes

| Variante | Relleno | Texto | Presionado | Uso |
| --- | --- | --- | --- | --- |
| Primario | Menta `bg-primary` | Tinta | `bg-primary-pressed` | La acción de la pantalla. Una por pantalla |
| Secundario | Menta suave | Tinta | `bg-primary-softPressed` | Acción que acompaña: «Agregar serie» |
| De borde | Transparente, borde 1,5 de trazo | Tinta | `bg-field` | Salida o alternativa: «Cancelar», «+30 s» |
| De peligro | Error suave, con ícono de basurero | Error texto | `bg-danger-softPressed` | Borrar, «Fallé» |
| De acento | Acento base | Tinta | `bg-accent-pressed` | Después de un récord, «Saltar» el descanso |

El `fantasma` del kit pasa a llamarse «de borde» (o se deja el nombre y cambia el valor). `acentoSuave` se retira: donde se usa, va el secundario o el de acento.

### Tamaños

| Tamaño | Alto | Relleno lateral | Texto | Uso |
| --- | --- | --- | --- | --- |
| Grande | 56 | 24 | 16 / 700 | «Serie hecha», «Fallé», «Empezar rutina» |
| Normal | 48 | 20 | 16 / 700 | El resto |
| Chico | 40 (+ 4 de `hitSlop`) | 16 | 14 / 700 | Dentro de un panel: «+30 s», «Saltar» |

### Estados

| Estado | Cómo se ve |
| --- | --- |
| Normal | Como en la tabla de variantes |
| Presionado | Baja a 97 % y el relleno pasa a su tono presionado (90 ms) |
| Deshabilitado | Relleno campo, texto grafito, sin borde. Sin opacidad, para que se lea igual |
| Cargando | Mismo ancho, círculo que gira y «Guardando…». No responde al toque. Solo si tarda más de 300 ms |
| Con foco | Anillo de tinta de 2 dp separado 2 dp. Para teclado, lector de pantalla y web |

```tsx
// Boton.tsx (propuesta): el texto pasa a tinta y cada variante tiene su presionado
const BOTONES = {
  primario: { caja: 'bg-primary active:bg-primary-pressed', texto: 'text-ink' },
  secundario: { caja: 'bg-primary-soft active:bg-primary-softPressed', texto: 'text-ink' },
  borde: { caja: 'bg-transparent border-[1.5px] border-stroke active:bg-field', texto: 'text-ink' },
  peligro: { caja: 'bg-danger-soft active:bg-danger-softPressed', texto: 'text-danger-deep' },
  acento: { caja: 'bg-accent active:bg-accent-pressed', texto: 'text-ink' },
} as const;
const ALTO = { grande: 'h-renglon px-6', normal: 'h-toque px-5', chico: 'h-10 px-4' } as const;
// Deshabilitado: 'bg-field' + 'text-ink-muted', en vez de opacity-40.
// Cargando: <ActivityIndicator color={colors.ink.DEFAULT} /> + «Guardando…», accessibilityState={{ busy: true }}.
```

### Más y menos

- Círculo de 56 en kilos y reps (`renglon`), 48 en el resto.
- Superficie con borde 1,5 de trazo y el signo en tinta (trazo de 2,5). Se cambió el menta suave de hoy porque sobre la fila activa, que también es menta suave, el círculo desaparecía.
- Presionado: relleno menta, signo tinta, escala 97 %. En el mínimo: relleno campo y signo grafito, deshabilitado.
- `accessibilityLabel` con el paso: «bajar 2,5 kg», «subir 1».

### RIR

Seis círculos de 44 (0 a 5) con 4 de separación y `hitSlop` de 2: 48 de toque. Elegido: menta con número tinta (hoy es blanco). Sin elegir: superficie, borde de trazo de 1, número tinta. `accessibilityState={{ selected }}`.

### Chips

Alto 40 (+ `hitSlop`), radio de chip. Inactivo: superficie, borde de trazo de 1, texto tinta 600. Activo: menta, texto tinta 700 y un visto delante, para que no dependa del color.

### Selector segmentado

Pista de campo de 48 con 4 de relleno. Segmento elegido: superficie, borde de trazo de 1, texto tinta 700. Sin elegir: texto grafito 600. Para 2 a 4 opciones que se excluyen: «Alumno / Entrenador», «Semana / Mes / Año». `accessibilityRole="radiogroup"` y `radio` en cada segmento.

### Interruptor

Pista de 52 × 32. Apagado: superficie con borde 1,5 de trazo y perilla grafito de 16. Encendido: pista menta y perilla tinta de 24 con un visto menta adentro. La etiqueta va a la izquierda y la fila entera mide 48. `accessibilityRole="switch"`.

---

## 6. Componentes

### Campo de texto (`Campo`, `CampoDiferido`)

- Etiqueta arriba: Manrope 600, 14 / 20, tinta. Reemplaza la etiqueta mono en mayúsculas de hoy: un campo es una pregunta, no una columna.
- Caja de 48 de alto, superficie, borde 1,5 de trazo, radio de campo, relleno lateral 14. Texto cuerpo en tinta. Placeholder en tenue (pasa 4,5 sobre superficie; no va sobre campo).

| Estado | Borde | Debajo |
| --- | --- | --- |
| Vacío | 1,5 trazo | Ayuda en grafito, si hace falta |
| Con foco | 2 menta profunda | — |
| Con error | 2 error | Ícono de error y mensaje en error texto, nota 600: dice qué hacer («Falta el final del correo, por ejemplo camila@correo.cl.») |
| Correcto | 1,5 menta profunda, visto a la derecha | Visto y texto en menta profunda («8 caracteres o más.») |
| Deshabilitado | Sin borde, relleno campo | Texto grafito |

El error se muestra al salir del campo o al enviar, nunca mientras se escribe.

### Tarjeta (`Tarjeta`)

Superficie, borde de línea de 1, radio de tarjeta, relleno 16. Sin sombra. Los tonos de hoy se ordenan: `primario` (menta suave sin borde), `acento` (acento suave sin borde), `peligro` (error suave sin borde). Ninguna tarjeta teñida lleva borde de color: el borde de color se reserva para la fila activa y los campos.

### La nota al margen (nueva)

La voz del entrenador. No es una tarjeta: es el margen de la página.

- Raya de 3 dp en acento base a la izquierda, 14 de aire.
- Firma: «Nota de Javier, tu entrenador · ayer», Manrope 700, 13 / 18, acento profundo.
- Texto: Manrope 400, 15 / 22, tinta.
- Quien entrena solo también puede escribir en el margen: la firma dice «Tu nota».

```tsx
<View className="border-l-[3px] border-accent pl-3.5">
  <Text className="font-sans-bold text-nota text-accent-deep">Nota de Javier, tu entrenador · ayer</Text>
  <Text className="mt-1 font-sans text-[15px] leading-[22px] text-ink">Baja hasta la paralela…</Text>
</View>
```

### La sugerencia de carga

Misma forma que la nota, con la raya en menta y la firma «Sugerencia de carga» en grafito. Es la página siguiente que escribe la app.

### Tarjeta de récord

Tarjeta normal. Arriba, punto de 8 y etiqueta «Récord · Press banca» en acento profundo. La cifra («45 kg × 8») en Plex Mono 600 de 30, tinta, con un subrayado de 3 dp en acento base. Debajo, en secundario: «Antes: 42,5 kg × 8 · hace 3 semanas». Reemplaza el «Felicidades» y el círculo violeta del `Resumen`: lo nota y sigue.

### La fila de bitácora: el renglón (`FilaSet`, `FilaActiva`)

Columnas fijas: serie (64), kg (flexible), reps (flexible), RIR (56), estado (40). Encabezado en etiqueta grafito. Cada fila mide 48 y se separa con una línea.

| Estado | Cifras | Marca a la derecha |
| --- | --- | --- |
| Hecha | Tinta, cifra de fila 500 | Círculo menta de 28 con visto tinta (hoy es blanco) |
| Con fallo | Tinta | Círculo error suave con ícono en error texto. La fila no se pinta de rojo |
| Pendiente | Tenue, 400 | Círculo vacío con borde 1,5 de trazo |

La fila activa (`FilaActiva`): menta suave, borde 1,5 de menta profunda, radio de tarjeta, relleno 14. Arriba, «Serie 3 de 4» en etiqueta menta profunda y «Última vez: 30 kg × 10» en nota grafito. Kilos y reps con steppers de 56 y la cifra grande de 40. RIR con los seis círculos. Abajo, «Serie hecha» (primario grande, ancho flexible) y «Fallé» (peligro grande).

### Panel de descanso (`PanelDescanso`)

Fondo acento suave, radio de tarjeta, relleno 16. Reloj y «Descanso» en acento profundo; el cronómetro en tinta (hoy va en acento profundo: con la regla, la cifra la escribe la tinta). Barra de 6 dp en acento profundo sobre pista de superficie. «Siguiente: Sentadilla, serie 3 · 30 kg × 10» en secundario. Botones chicos «+30 s» (de borde) y «Saltar» (de acento).

### Barra de pestañas

- Hoy, Rutinas, Progreso, Ejercicios, Perfil. 64 de alto más la zona segura. Superficie con línea arriba.
- Activa: ficha menta de 56 × 30 detrás del ícono, ícono tinta, nombre tinta 700. Inactiva: ícono y nombre grafito 500. El nombre en 13 (hoy es 11,5).
- Hoy la barra no tiene íconos. Los íconos de trazo del tablero necesitan `react-native-svg` o una librería de íconos; si no se suma ninguna, la ficha menta va detrás del nombre.

### Avisos

En línea, sobre el contenido. Radio de tarjeta, relleno 12 / 14, ícono de 20 a la izquierda, texto secundario en tinta con la primera frase en negrita. El color está en el fondo y el ícono, no en el texto.

| Tipo | Fondo | Ícono | Ejemplo |
| --- | --- | --- | --- |
| Información | Campo | Info, grafito | **Sin señal.** Tus series se guardan en el teléfono. |
| Éxito | Menta suave | Visto, menta profunda | **Sesión guardada.** Javier la ve esta noche. |
| Aviso | Aviso suave | Triángulo, aviso texto | **Tres sesiones en 30 kg.** Revisa la sugerencia de carga. |
| Error | Error suave | Error, error texto | **No se pudo guardar.** Revisa la conexión y vuelve a intentar. |

`accessibilityRole="alert"` para el error; los demás se anuncian con `accessibilityLiveRegion="polite"`.

---

## 7. Movimiento

### Principios

1. **Solo se mueve lo que informa.** Una serie marcada, el descanso que corre, un récord. Lo demás se queda quieto hasta que alguien lo toca.
2. **Corto y sin rebote.** Nada pasa de 300 ms salvo el descanso. Ninguna curva se pasa de largo. Nada de confeti, partículas ni brillos.
3. **La vibración confirma.** Vibra lo que pasó de verdad: una serie, el fin del descanso, un récord. Nunca mientras escribes.
4. **Reducir movimiento manda.** Si está activado en el teléfono, nada se desplaza ni escala. Queda el cambio de color, el texto y la vibración.

### Fichas

| Duración | ms | Uso |
| --- | --- | --- |
| `instante` | 90 | Presionar |
| `corto` | 150 | Soltar, marcar, error en un campo |
| `medio` | 220 | Aparecer: panel, tarjeta, pantalla |
| `largo` | 300 | Subrayado del récord, fin del descanso |

| Curva | Bézier | Uso |
| --- | --- | --- |
| `salida` | 0,2, 0, 0, 1 | Lo que entra o responde |
| `entrada` | 0,4, 0, 1, 1 | Lo que sale |
| `cambio` | 0,4, 0, 0,2, 1 | Un estado que cambia en el lugar |
| `lineal` | 0, 0, 1, 1 | Tiempo real (descanso) y giros |

### Por evento

| Evento | Qué se mueve | Duración | Curva | Vibración | Con «reducir movimiento» |
| --- | --- | --- | --- | --- | --- |
| Presionar un botón | Baja a 97 % y el relleno pasa al tono presionado. Al soltar, vuelve | 90 ms al bajar, 150 al soltar | salida | Ninguna. Más y menos: `selectionAsync` | Sin escala: solo cambia el relleno |
| Marcar una serie | El círculo se llena de menta (de 60 % a 100 %) y aparece el visto. Las cifras pasan de tenue a tinta. La fila activa baja a la serie siguiente | 150 ms el círculo, 220 ms el cambio de fila | salida | `impactAsync(Light)`. Con «Fallé», `Medium` | Cambio inmediato, sin escala |
| Empieza el descanso | El panel sube 8 dp y aparece | 220 ms | salida | Ninguna: ya vibró la serie | Solo opacidad, 120 ms |
| Corre el descanso | La barra se acorta en línea recta con el tiempo real. La cifra cambia una vez por segundo, sin animarse | Lo que dura el descanso | lineal | Ninguna | La barra avanza a saltos, una vez por segundo |
| Termina el descanso | El panel se ilumina una vez con el acento (30 % de opacidad) y la etiqueta cambia a «Listo: serie 3». No se repite | 300 ms de ida y 300 de vuelta | cambio | `notificationAsync(Success)`, una vez | Sin destello: cambia la etiqueta. La vibración se mantiene |
| Aparece un récord | La tarjeta sube 6 dp y aparece; después, el subrayado de acento se dibuja bajo la cifra. Queda quieta | 220 ms la tarjeta; 300 ms el subrayado, desde los 120 ms | salida | `notificationAsync(Success)`, una vez por sesión | Opacidad 120 ms, ya subrayada |
| Pasar de pantalla | La pantalla nueva sube 16 dp y aparece; al volver, al revés. Entre pestañas, nada | 220 ms al entrar, 180 al volver | salida / entrada | Ninguna | Fundido de 120 ms o nada |
| Error en un campo | El borde pasa a error y el mensaje aparece debajo. Sin sacudida | 150 ms | cambio | `notificationAsync(Warning)`, solo al tocar «Entrar» o «Guardar» con errores | Cambio inmediato |
| Cargar | El botón mantiene su ancho, cambia el texto («Guardando…») y gira un círculo. Solo si tarda más de 300 ms. Listas: renglones grises quietos | Una vuelta cada 900 ms | lineal | Ninguna | El círculo no gira: queda el texto |

Hoy la app ya vibra con impacto leve al marcar una serie (`Bitacora.tsx`) y con éxito al terminar el descanso (`utilidades.ts`). La tabla los mantiene y suma el récord, el fallo, los pasos de más y menos, y el error al enviar.

### Implementación (Reanimated 4 y expo-haptics)

Curvas y reducir movimiento, en un solo lugar:

```ts
// apps/mobile/src/lib/movimiento.ts (propuesta)
import { motion } from '@gymtrack/tokens';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Easing, ReduceMotion } from 'react-native-reanimated';

export const curva = {
  salida: Easing.bezier(...motion.curva.salida),
  entrada: Easing.bezier(...motion.curva.entrada),
  cambio: Easing.bezier(...motion.curva.cambio),
  lineal: Easing.linear,
};
// ReduceMotion.System: si el teléfono pide reducir movimiento, la animación salta al final.
export const t = (duracion: keyof typeof motion.duracion, c: keyof typeof curva = 'salida') => ({
  duration: motion.duracion[duracion],
  easing: curva[c],
  reduceMotion: ReduceMotion.System,
});

export const vibrar = {
  paso: () => Haptics.selectionAsync(),
  serieHecha: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  fallo: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  exito: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  aviso: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
// En web expo-haptics no hace nada; se envuelve para no ensuciar las pantallas.
export function siVibra(f: () => Promise<void>) {
  if (Platform.OS !== 'web') f().catch(() => {});
}
```

Presionar un botón:

```tsx
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const escala = useSharedValue(1);
const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

<AnimatedPressable
  onPressIn={() => (escala.value = withTiming(motion.presion.escala, t('instante')))}
  onPressOut={() => (escala.value = withTiming(1, t('corto')))}
  style={estilo}
  className="h-toque items-center justify-center rounded-button bg-primary active:bg-primary-pressed"
/>
```

Marcar una serie (el círculo de la fila):

```tsx
const lleno = useSharedValue(hecha ? 1 : 0);
useEffect(() => { lleno.value = withTiming(hecha ? 1 : 0, t('corto')); }, [hecha]);
const circulo = useAnimatedStyle(() => ({ opacity: lleno.value, transform: [{ scale: 0.6 + 0.4 * lleno.value }] }));
// Al tocar «Serie hecha»: siVibra(vibrar.serieHecha). La fila que baja usa layout={LinearTransition.duration(220).easing(curva.salida).reduceMotion(ReduceMotion.System)}.
```

El descanso:

```tsx
const reducir = useReducedMotion();
const avance = useSharedValue(restante / total);
useEffect(() => {
  if (reducir) { avance.value = restante / total; return; } // salta una vez por segundo, con el render
  avance.value = withTiming(0, { duration: restante * 1000, easing: Easing.linear });
}, [inicio, reducir]); // se reinicia cuando empieza un descanso o se suman 30 s
const barra = useAnimatedStyle(() => ({ transform: [{ scaleX: avance.value }] }));
// El panel entra con entering={FadeInDown.duration(220).withInitialValues({ transform: [{ translateY: 8 }] }).reduceMotion(ReduceMotion.System)}.
// Al llegar a 0: siVibra(vibrar.exito) y un destello de opacidad 0 → 0,3 → 0 (300 + 300 ms, curva cambio), salvo con reducir.
```

El récord:

```tsx
<Animated.View entering={FadeInDown.duration(220).easing(curva.salida).withInitialValues({ transform: [{ translateY: 6 }] }).reduceMotion(ReduceMotion.System)}>
  …
  <Animated.View style={subrayado} className="h-[3px] rounded-full bg-accent" />
</Animated.View>
// subrayado: scaleX de 0 a 1 con withDelay(120, withTiming(1, t('largo'))) y transformOrigin 'left'.
```

Pasar de pantalla: en la pila de expo-router (native-stack de Android) la duración la pone el sistema. Lo más cercano a «sube 16 dp y aparece» es `animation: 'fade_from_bottom'`; con `useReducedMotion()` en `true`, `animation: 'fade'`. Entre pestañas no hay animación (lo de hoy).

Cargar: `ActivityIndicator` en tinta dentro del botón, mostrado solo si la espera pasa de 300 ms (`setTimeout` de `motion.carga.retraso`). Con reducir movimiento, sin indicador: queda «Guardando…».

---

## 8. Cómo pasarlo al código (cuando lo apruebes)

Nada de esto está hecho. El orden sugerido, por zonas de la guía del equipo:

1. **Diseño.** Copiar los valores de `tokens-propuestos.js` a `packages/tokens/index.js` (el acento ya es el azul lapicera y el radio, el punto medio; `decisiones` es solo registro y no se copia). Actualizar `index.d.ts` (tipos nuevos: `stroke`, `warning`, `pressed`, `softPressed`, `night`, `type`, `spacing`, `motion`) y `tailwind.preset.js` (colores nuevos, `fontSize`, `spacing` con nombre, radios nuevos `chip` y `tag` en `borderRadius`). `app.json` repite `bg` y `primary.soft` a mano: no cambian.
2. **Kit de interfaz.** `Boton` (texto tinta, presionados, estados; `rounded-button` pasa solo de 14 a 12), `Chip` (activo con tinta y visto; de `rounded-full` a `rounded-chip`), `Stepper` (círculos de superficie con borde; la cifra editable sigue en `rounded-field`, ahora 12), `Campo` (etiqueta y estados; `rounded-field` de 13 a 12), `Tarjeta` (tonos sin borde de color; `rounded-card` de 16 a 14; `Etiqueta` a 13 dp y de `rounded-full` a `rounded-tag`), `Txt` (escala nueva). La barra de pestañas usa `rounded-tab` (12) para la ficha. `Cabecera` y `BotonRedondo` quedan en `rounded-full`.
3. **Sesión.** `FilaSet` (visto tinta), `FilaActiva` (RIR con tinta, 44 + hitSlop), `PanelDescanso` (cronómetro en tinta, barra profunda), `Resumen` (tarjeta de récord en vez de «Felicidades»).
4. **Rutas.** La barra de pestañas de `(tabs)/_layout.tsx` (ficha menta, 13 dp) y `rutinas.tsx`, que también usa `text-white`.
5. **Movimiento.** `src/lib/movimiento.ts` y los cuatro eventos con demo.
6. **Modo gimnasio.** Las variables de NativeWind y el interruptor en Perfil, cuando se decida cómo se activa.

Lo que hoy rompe la regla de la tinta y hay que tocar sí o sí: `text-white` en `Boton`, `Chip`, `FilaActiva`, `FilaSet` y `rutinas.tsx`; el gris tenue `#8B9A94` como texto (placeholders, series pendientes, pestañas inactivas); y los textos de 11 y 11,5 dp (`Txt` etiqueta, `Etiqueta`, la barra de pestañas y varias pantallas).

---

## 9. Qué cambia respecto de los tokens de hoy

| Token | Hoy | Propuesta | Por qué |
| --- | --- | --- | --- |
| `primary.deep` | `#2f7f68` | `#28735E` | 4,48:1 sobre papel; ahora 5,27 |
| `primary.pressed`, `primary.softPressed`, `primary.night` | — | `#3A9F81`, `#D2E2DC`, `#1E3A31` | Presionados y modo gimnasio |
| `accent.*` | violeta | azul lapicera | Decisión 1 cerrada: azul lapicera |
| `ink.muted` | `#71817B` | `#5E6D67` | 3,80:1 sobre papel (ya corregido en los mockups) |
| `ink.faint` | `#8B9A94` | `#64736D` | 2,73:1: no servía como texto |
| `stroke` | — | `#7F8B86` | Borde de controles con 3:1; `line` queda para separar |
| `danger.deep`, `softPressed`, `bright`, `night` | — | `#A2453F`, `#F2E2E0`, `#F0968D`, `#3B2422` | Texto de error y modo gimnasio |
| `warning.*` | — | ámbar `#A87A1F` y familia | El aviso no existía |
| `gym.*` | fondo `#08120E`, gris `#6E807A` | fondo `#131A17`, gris `#A9B5B0`, más `field`, `stroke`, `faint` | «La misma libreta con la luz baja» |
| `radius` | campo 13, botón 14, tarjeta 16, pestaña 12 | campo 12, botón 12, tarjeta 14, pestaña 12 + `chip` 12, `tag` 5 | Decisión 2 cerrada: punto medio |
| `type`, `spacing`, `motion` | — | nuevos | Escala tipográfica, medidas con nombre, duraciones, curvas y vibraciones |

No cambian: `bg`, `surface`, `line`, `field`, `ink`, `primary`, `primary.soft`, `primary.bright`, `danger`, `danger.soft` y las fuentes.

---

## 10. Lo que quedó sin verificar

- **En un teléfono.** Nada se probó en Android. Los tableros se revisaron en un navegador de escritorio; el contraste se calculó, no se midió con luz de gimnasio ni con brillo bajo.
- **NativeWind.** No comprobé en esta app que `vars()`, `active:` con colores nuevos, `border-[1.5px]` y `fontSize` con interlínea funcionen como en el ejemplo. Son patrones documentados de NativeWind 4, no probados acá.
- **Reanimated 4.** Los fragmentos usan `ReduceMotion.System`, `useReducedMotion` y `FadeInDown.withInitialValues`. No los compilé contra la versión 4.5.1 del proyecto.
- **Transición de pantalla.** La duración en Android la decide el sistema; los 220 ms son la intención, no algo que se pueda fijar con native-stack.
- **`tabular-nums` en Manrope.** No verifiqué que Manrope traiga cifras tabulares por `fontVariant` en Android. Por eso la regla es usar Plex Mono para toda cifra en columna.
- **Íconos.** La barra de pestañas del tablero usa íconos de trazo que la app no tiene; sumarlos pide una dependencia.
- **El lienzo.** Revisé los tableros abriéndolos en un navegador (las fuentes cargaron y nada se sale del marco). No los abrí en el visor de `.dc.html`; `support.js` no está en la carpeta y lo referencio igual que la plantilla.
- **`gt.css`.** La hoja de los mockups indicada (`gt-canvas/project/gt.css`) no existe en el disco: la carpeta está vacía. Tomé las correcciones de `login.css` y del encargo.
