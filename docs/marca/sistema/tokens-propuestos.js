// ─────────────────────────────────────────────────────────────────────────────
// Tokens de diseño propuestos · Zona: Diseño · PROPUESTA, NO APLICADA
//
// Qué hace: es la propuesta de la Fase 5 de marca (sistema de diseño) para reemplazar
// packages/tokens/index.js. Tiene la misma forma que hoy (colors, fonts, radius) y suma
// spacing, type y motion. Los nombres de las familias de color no cambian (primary, accent,
// ink, bg, surface, line, field, danger, gym), así que las clases que ya usa el kit siguen
// existiendo; cambian valores y se suman variantes.
// Tócalo cuando: haya que ajustar un valor antes de aplicarlo. Las dos decisiones de esta fase
// están cerradas desde el 2026-11-17: el segundo acento es el azul lapicera y el radio es el
// punto medio. Lo comparado queda como registro en `decisiones`.
// No lo toques para: aplicarlo a la app. Eso se hace copiando los valores a
// packages/tokens/index.js, actualizando index.d.ts y tailwind.preset.js, y revisando el kit
// (ver docs/marca/gymtrack-guia-de-diseno.md, sección «Cómo pasarlo al código»).
// Depende de: nada. Lo leen docs/marca/sistema/contraste.js (valida cada par texto/fondo) y
// docs/marca/sistema/fuente/gen-tableros.js (dibuja los tableros).
// ─────────────────────────────────────────────────────────────────────────────

// ── Qué cambia respecto de hoy ───────────────────────────────────────────────
//
// | Token                 | Hoy        | Propuesta  | Por qué                                         |
// | --------------------- | ---------- | ---------- | ----------------------------------------------- |
// | primary.deep          | #2f7f68    | #28735E    | #2f7f68 sobre papel da 4,48:1, no llega a 4,5.  |
// | primary.pressed       | (no había) | #3A9F81    | Estado presionado del botón menta.              |
// | *.softPressed         | (no había) | 2 tonos    | Presionado del secundario y del de peligro.     |
// | accent.*              | violeta    | azul       | Decisión 1 cerrada: azul lapicera.              |
// | accent.pressed        | (no había) | #5581D7    | Estado presionado del botón de acento.          |
// | ink.muted             | #71817B    | #5E6D67    | #71817B daba 3,8:1 sobre papel.                 |
// | ink.faint             | #8B9A94    | #64736D    | #8B9A94 daba 2,7:1: no servía para texto.       |
// | stroke                | (no había) | #7F8B86    | Borde de controles (campo, botón de borde):     |
// |                       |            |            | 3,3:1. La línea #E6ECE8 queda para separar.     |
// | danger.deep           | (no había) | #A2453F    | Texto de error (ya se usaba en los mockups).    |
// | danger.bright         | (no había) | #F0968D    | Texto de error en modo gimnasio.                |
// | warning.*             | (no había) | ámbar      | Aviso: estancamiento, sin señal, datos viejos.  |
// | gym.*                 | negro      | tinta      | «La misma libreta con la luz baja»: el fondo es |
// |                       | #08120E    | #131A17    | la tinta del símbolo, no negro. gym.muted       |
// |                       |            |            | #6E807A daba 3,9:1 sobre su tarjeta; ahora      |
// |                       |            |            | #A9B5B0 (8,3:1 sobre el fondo).                 |
// | radius                | 13 a 16    | 12 y 14    | Decisión 2 cerrada: «Punto medio».              |
// | spacing, type, motion | (no había) | nuevos     | Escala de 4, alturas de renglón, escala         |
// |                       |            |            | tipográfica con roles, duraciones y curvas.     |
//
// Sin cambio: bg #F5F7F5, surface #FFFFFF, line #E6ECE8, field #E9EDEA, ink #131A17,
// primary #45B392, primary.soft #E3F3ED, primary.bright #7BE0BE, danger #B4544E,
// danger.soft #FBEAE8 y las dos familias tipográficas con sus pesos.
//
// Regla que ordena todo: la tinta escribe, el color subraya. Sobre un relleno de color
// (botón menta, chip activo, RIR elegido) el texto va en tinta, nunca en blanco. Las
// variantes `deep` son las únicas de color que pueden llevar texto, y siempre acompañadas de
// algo más que el color (un ícono, la palabra, un subrayado).

// ── Colores ──────────────────────────────────────────────────────────────────
/**
 * Familias con DEFAULT: el color de raíz y sus variantes.
 * - DEFAULT: relleno. Lleva tinta encima (≥ 4,5:1). Igual en claro y en modo gimnasio.
 * - deep: texto y trazos finos (foco, barras, subrayados) sobre fondos claros.
 * - soft: fondo teñido en claro. Lleva tinta, grafito y su `deep`.
 * - pressed: relleno presionado. Lleva tinta.
 * - softPressed: el fondo teñido presionado (botón secundario, botón de peligro).
 * - bright: texto de ese color sobre el fondo del modo gimnasio.
 * - night: fondo teñido en modo gimnasio. Lleva el texto claro (gym.text).
 * Ojo: primary (#45B392) sobre papel da 2,4:1. No sirve como trazo fino ni como único
 * indicador: para eso está primary.deep.
 */
const colors = {
  // Menta. La acción y lo hecho: botón principal, serie marcada, pestaña activa, sugerencia de
  // carga. Es el color fijo del símbolo y no cambia. Éxito usa esta misma familia.
  primary: {
    DEFAULT: '#45B392',
    deep: '#28735E',
    soft: '#E3F3ED',
    pressed: '#3A9F81',
    softPressed: '#D2E2DC',
    bright: '#7BE0BE',
    night: '#1E3A31',
  },
  // Segundo acento: la voz del entrenador al margen y los momentos que salen de la fila (un
  // récord, el descanso). Azul lapicera (decisión 1, cerrada el
  // 2026-11-17). El violeta y el ocre comparados quedan en `decisiones`.
  accent: {
    DEFAULT: '#5D87DC',
    deep: '#2A4E9C',
    soft: '#E6EDFA',
    pressed: '#5581D7',
    bright: '#8FB0F5',
    night: '#1B2638',
  },
  // Tinta. DEFAULT para títulos, cuerpo y cifras; muted (grafito) para lo secundario; faint
  // para placeholders y series pendientes. faint pasa 4,5:1 solo sobre papel y superficie:
  // no va sobre campo ni sobre fondos teñidos.
  ink: { DEFAULT: '#131A17', muted: '#5E6D67', faint: '#64736D' },
  // Papeles. bg es la página; surface, tarjetas y campos; field, rellenos neutros (chip
  // inactivo, etiqueta, pista del selector); line, separadores (decorativa, sin requisito de
  // contraste); stroke, el borde de los controles (3:1 o más).
  bg: '#F5F7F5',
  surface: '#FFFFFF',
  field: '#E9EDEA',
  line: '#E6ECE8',
  stroke: '#7F8B86',
  // Error apagado: borrar, serie con fallo, campo inválido, variación negativa. DEFAULT para
  // bordes e íconos; deep para el texto del error.
  danger: { DEFAULT: '#B4544E', deep: '#A2453F', soft: '#FBEAE8', softPressed: '#F2E2E0', bright: '#F0968D', night: '#3B2422' },
  // Aviso ámbar: estancamiento, sin señal, algo que revisar. No es alarma ni error.
  warning: { DEFAULT: '#A87A1F', deep: '#8A5D0A', soft: '#FBF1DC', bright: '#E8B65A', night: '#352B16' },
  // Modo gimnasio: la misma libreta con la luz baja. La página se invierte (fondo tinta, texto
  // papel), la estructura no cambia y el botón menta sigue llevando texto tinta.
  gym: {
    bg: '#131A17',
    card: '#1C2521',
    field: '#242E2A',
    line: '#2C3833',
    stroke: '#71817A',
    text: '#F5F7F5',
    muted: '#A9B5B0',
    faint: '#8E9C96',
  },
};

// ── Fuentes ──────────────────────────────────────────────────────────────────
/**
 * Sin cambios: Manrope para el texto, IBM Plex Mono para las cifras. Cada peso es una familia
 * porque React Native no combina fontWeight con una fuente cargada.
 */
const fonts = {
  sans: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
  mono: {
    regular: 'IBMPlexMono_400Regular',
    medium: 'IBMPlexMono_500Medium',
    semibold: 'IBMPlexMono_600SemiBold',
  },
};

// ── Escala tipográfica ───────────────────────────────────────────────────────
/**
 * Un rol por uso, en dp. `size` y `line` (interlínea) en dp; `tracking` en dp para
 * letterSpacing. Nada baja de 13. La cifra manda la jerarquía: en la fila activa, «30» (40)
 * es más grande que el título de la pantalla (28).
 * extrabold (800) queda cargado pero fuera de la escala: no se usa para texto de interfaz.
 */
const type = {
  titulo: { font: fonts.sans.bold, size: 28, line: 34, tracking: -0.3 },
  subtitulo: { font: fonts.sans.bold, size: 20, line: 26, tracking: -0.2 },
  tituloTarjeta: { font: fonts.sans.semibold, size: 17, line: 22, tracking: 0 },
  cuerpo: { font: fonts.sans.regular, size: 16, line: 24, tracking: 0 },
  cuerpoMedio: { font: fonts.sans.semibold, size: 16, line: 24, tracking: 0 },
  secundario: { font: fonts.sans.regular, size: 14, line: 20, tracking: 0 },
  nota: { font: fonts.sans.regular, size: 13, line: 18, tracking: 0 },
  etiqueta: { font: fonts.mono.medium, size: 13, line: 16, tracking: 0.8, upper: true },
  boton: { font: fonts.sans.bold, size: 16, line: 20, tracking: 0 },
  botonChico: { font: fonts.sans.bold, size: 14, line: 18, tracking: 0 },
  cifraGrande: { font: fonts.mono.semibold, size: 40, line: 44, tracking: -0.5 },
  cifra: { font: fonts.mono.semibold, size: 24, line: 28, tracking: -0.2 },
  cifraFila: { font: fonts.mono.medium, size: 17, line: 24, tracking: 0 },
  cifraTabla: { font: fonts.mono.regular, size: 15, line: 20, tracking: 0 },
  cronometro: { font: fonts.mono.semibold, size: 56, line: 60, tracking: -1 },
};

// ── Radios ───────────────────────────────────────────────────────────────────
/**
 * Decisión 2 cerrada el 2026-11-17: «Punto medio» entre «Canto» (8 y 12) y «Proporción del
 * símbolo» (14 a 16). 12 en botones, campos, chips y la ficha de la pestaña; 14 en tarjetas,
 * avisos, la fila activa y el panel de descanso; 5 en etiquetas. Los botones de más y menos,
 * el RIR y el interruptor siguen siendo círculos (`rounded-full`): ahí la forma redonda dice
 * «se toca con el pulgar». Las dos opciones comparadas quedan en `decisiones.radio`.
 */
const radius = { field: 12, button: 12, card: 14, tab: 12, chip: 12, tag: 5, pill: 999 };

// ── Espacio ──────────────────────────────────────────────────────────────────
/**
 * Base de 4. Los números son los mismos de Tailwind (p-4 = 16), así que la escala ya existe en
 * NativeWind; acá se agregan las medidas con nombre propio.
 * - toque: mínimo de cualquier cosa que se toca (48).
 * - renglon: botones de más y menos de kilos y repeticiones, y el botón «Serie hecha» (56).
 * - fila: alto de un renglón de la bitácora (48).
 * - barra: alto de la barra de pestañas sin la zona segura (64).
 * - margen: margen lateral de la pantalla (20).
 */
const spacing = {
  escala: [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64],
  toque: 48,
  renglon: 56,
  fila: 48,
  barra: 64,
  margen: 20,
  bordeFino: 1,
  bordeControl: 1.5,
  bordeFoco: 2,
};

// ── Movimiento ───────────────────────────────────────────────────────────────
/**
 * Solo se mueve lo que informa. Duraciones en ms y curvas como [x1, y1, x2, y2] para
 * Easing.bezier de Reanimated. Sin rebotes: ninguna curva pasa de 1.
 * `haptica` dice qué vibración acompaña cada evento (nombres de expo-haptics).
 */
const motion = {
  duracion: { instante: 90, corto: 150, medio: 220, largo: 300 },
  curva: {
    salida: [0.2, 0, 0, 1],
    entrada: [0.4, 0, 1, 1],
    cambio: [0.4, 0, 0.2, 1],
    lineal: [0, 0, 1, 1],
  },
  presion: { escala: 0.97 },
  carga: { retraso: 300, vuelta: 900 },
  haptica: {
    paso: 'selectionAsync',
    serieHecha: 'impactAsync:Light',
    fallo: 'impactAsync:Medium',
    finDescanso: 'notificationAsync:Success',
    record: 'notificationAsync:Success',
    errorAlEnviar: 'notificationAsync:Warning',
  },
};

// ── Decisiones ───────────────────────────────────────────────────────────────
/**
 * acento: cerrada el 2026-11-17. Elegido el azul lapicera, que ya está en `colors.accent`. El
 * violeta y el ocre quedan solo como registro de lo comparado. `recomendadoAcento` conserva su
 * nombre para no cambiar la forma del objeto: hoy indica la opción elegida.
 * radio: cerrada. Las dos opciones quedan solo como registro de lo comparado; el valor elegido
 * («Punto medio») ya está en `radius`.
 */
const decisiones = {
  acento: {
    violeta: { nombre: 'Violeta (el de hoy)', DEFAULT: '#8B7BE8', deep: '#5B4CB8', soft: '#EDE9FD', pressed: '#8372E3', bright: '#A895FF', night: '#262238' },
    azul: { nombre: 'Azul lapicera', DEFAULT: '#5D87DC', deep: '#2A4E9C', soft: '#E6EDFA', pressed: '#5581D7', bright: '#8FB0F5', night: '#1B2638' },
    ocre: { nombre: 'Ocre lápiz', DEFAULT: '#B08530', deep: '#7C5810', soft: '#F6EEDA', pressed: '#A97F2C', bright: '#E0B862', night: '#2E2716' },
  },
  recomendadoAcento: 'azul',
  radio: {
    canto: { nombre: 'Canto', field: 8, button: 8, card: 12, tab: 8, chip: 8, tag: 4, pill: 999 },
    proporcion: { nombre: 'Proporción del símbolo', field: 14, button: 16, card: 16, tab: 12, chip: 999, tag: 6, pill: 999 },
  },
  radioCerrado: { elegido: 'Punto medio', fecha: '2026-11-17' },
};

module.exports = { colors, fonts, type, radius, spacing, motion, decisiones };
