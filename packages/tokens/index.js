// ─────────────────────────────────────────────────────────────────────────────
// Tokens de diseño · Zona: Diseño
//
// Qué hace: es la única fuente de verdad de la apariencia de GymTrack, dirección «Más». Define
// los dos temas (modo gimnasio, oscuro y principal, y clara, secundario) con los mismos nombres
// de color que docs/pantallas/sistema.css, las dos tipografías (Archivo para la interfaz y
// JetBrains Mono para las cifras), el radio único de 8 dp, las medidas de toque y los tiempos
// de movimiento. Los valores salen de docs/marca/v2/mas/tokens.json.
// Tócalo cuando: cambie un color de la marca, se sume un token de sistema.css o haga falta un
// peso de fuente nuevo. Un cambio acá se ve en toda la app sin tocar ninguna pantalla.
// No lo toques para: cambiar cómo se ve una pieza en particular (apps/mobile/src/components/ui/)
// ni para elegir el tema activo (apps/mobile/src/lib/tema.tsx).
// Depende de: nada propio. Lo leen tailwind.preset.js (mismo paquete) y la app vía
// @gymtrack/tokens; index.d.ts describe sus tipos para TypeScript.
// ─────────────────────────────────────────────────────────────────────────────

// Es CommonJS (module.exports) y no ESM porque tailwind.config.js lo carga con require en
// Node, sin transpilar. La app lo importa igual, como un objeto normal.

// ── Marca ────────────────────────────────────────────────────────────────────
/** Colores fijos de la marca: no cambian con el tema. */
const marca = {
  ambar: '#F5B83D',
  grafito: '#0F1113',
  claro: '#F2F3F4',
  fondoClaro: '#F3F4F5',
  fondoIcono: '#1A1D20',
  // Rectángulos del símbolo en una grilla de 24: [x, y, ancho, alto], radio 1.
  simbolo: {
    grilla: 24,
    vertical: [10, 3, 4, 18],
    tramoIzquierdo: [3, 10, 5.5, 4],
    tramoDerecho: [15.5, 10, 5.5, 4],
    radio: 1,
  },
};

// ── Temas ────────────────────────────────────────────────────────────────────
/**
 * Los dos temas con las mismas claves. Los nombres calzan con las variables de sistema.css
 * (--fondo, --sup, --texto-2...) para que pasar de la maqueta al código sea copiar el nombre.
 * Regla de la marca: el ámbar nunca va como texto sobre fondos claros (1,78:1 sobre blanco);
 * por eso en clara `acento-texto` es #8A5A00 y la acción es grafito.
 */
const temas = {
  gimnasio: {
    fondo: '#0F1113',
    sup: '#1A1D20',
    'sup-alta': '#24282C',
    texto: '#F2F3F4',
    'texto-2': '#A0A6AD',
    accion: '#F5B83D',
    'accion-texto': '#0F1113',
    'accion-pres': '#D99A1F',
    'acento-texto': '#F5B83D',
    'fila-hecha': '#3A2F14',
    borde: '#767D85',
    peligro: '#FF6B5E',
    'peligro-sobre': '#0F1113',
    'peligro-pres': '#D95D52',
    'desh-fondo': '#24282C',
    'desh-texto': '#767D85',
    foco: '#F2F3F4',
    'sec-fondo': '#24282C',
    'sec-borde': '#767D85',
    'sec-pres': '#2B3035',
    'sec-pres-borde': '#F2F3F4',
    'fantasma-pres': '#24282C',
    'chip-fondo': '#F2F3F4',
    'chip-texto': '#0F1113',
    'riel-apagado': '#24282C',
    'riel-apagado-borde': '#767D85',
    'perilla-apagada': '#A0A6AD',
    'riel-encendido': '#F5B83D',
    'riel-encendido-borde': '#F5B83D',
    'riel-encendido-pres': '#D99A1F',
    'perilla-encendida': '#0F1113',
    'marcar-borde': '#767D85',
    'hecho-fondo': '#F5B83D',
    'hecho-borde': '#F5B83D',
    'hecho-pres': '#D99A1F',
    visto: '#0F1113',
    'simb-v': '#F5B83D',
    'simb-h': '#F2F3F4',
    'campo-fondo': '#0F1113',
    'campo-borde': '#767D85',
    'campo-edicion': '#F5B83D',
    // La pestaña activa lleva el trazo ámbar en los dos temas (sistema.css, .pestana).
    'trazo-pestana': '#F5B83D',
    // Fondo del aviso flotante: el texto del tema invertido.
    'aviso-fondo': '#F2F3F4',
    'aviso-texto': '#0F1113',
  },
  clara: {
    fondo: '#F3F4F5',
    sup: '#FFFFFF',
    'sup-alta': '#E4E6E8',
    texto: '#0F1113',
    'texto-2': '#555B62',
    accion: '#0F1113',
    'accion-texto': '#FFFFFF',
    'accion-pres': '#2B3035',
    'acento-texto': '#8A5A00',
    'fila-hecha': '#FCEFC9',
    borde: '#6F767E',
    peligro: '#B42318',
    'peligro-sobre': '#FFFFFF',
    'peligro-pres': '#9A2017',
    'desh-fondo': '#E4E6E8',
    'desh-texto': '#6F767E',
    foco: '#0F1113',
    'sec-fondo': '#FFFFFF',
    'sec-borde': '#0F1113',
    'sec-pres': '#E4E6E8',
    'sec-pres-borde': '#0F1113',
    'fantasma-pres': '#E4E6E8',
    'chip-fondo': '#0F1113',
    'chip-texto': '#FFFFFF',
    'riel-apagado': '#FFFFFF',
    'riel-apagado-borde': '#6F767E',
    'perilla-apagada': '#6F767E',
    'riel-encendido': '#F5B83D',
    'riel-encendido-borde': '#8A5A00',
    'riel-encendido-pres': '#D99A1F',
    'perilla-encendida': '#0F1113',
    'marcar-borde': '#6F767E',
    'hecho-fondo': '#F5B83D',
    'hecho-borde': '#8A5A00',
    'hecho-pres': '#D99A1F',
    visto: '#0F1113',
    // Bajo 48 px, sobre claro, el símbolo va en un color (grafito).
    'simb-v': '#0F1113',
    'simb-h': '#0F1113',
    'campo-fondo': '#FFFFFF',
    'campo-borde': '#6F767E',
    'campo-edicion': '#8A5A00',
    'trazo-pestana': '#F5B83D',
    'aviso-fondo': '#0F1113',
    'aviso-texto': '#F3F4F5',
  },
};

/** Lista de los nombres de color, en el orden de arriba. La usa el preset para crear las clases. */
const nombresColor = Object.keys(temas.gimnasio);

/** '#F5B83D' a '245 184 61', el formato que pide `rgb(var(--x) / <alpha-value>)`. */
function canales(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}

/**
 * Variables CSS de un tema: { '--fondo': '15 17 19', ... }. La app las pasa por `vars()` de
 * NativeWind en la raíz (src/lib/tema.tsx) y las clases bg-fondo, text-texto-2... las leen.
 */
function variablesTema(nombre) {
  const t = temas[nombre];
  const salida = {};
  for (const k of nombresColor) salida[`--${k}`] = canales(t[k]);
  return salida;
}

// ── Fuentes ──────────────────────────────────────────────────────────────────
/**
 * Familias por peso, con los nombres exactos que registra expo-font (los de
 * @expo-google-fonts/archivo y jetbrains-mono). Cada peso es una familia distinta porque React
 * Native no combina `fontWeight` con una fuente cargada; por eso las clases llevan el peso
 * (`font-sans-bold`, `font-mono-bold`) y nunca se usa `font-bold` a secas.
 * Archivo 500 es el texto, 600 el botón y el logotipo, 700 títulos y etiquetas.
 * JetBrains Mono 700 es la cifra (kilos, repeticiones, cronómetro).
 * Si agregas un peso, súmalo acá, en tailwind.preset.js y en apps/mobile/src/lib/fuentes.ts.
 */
const fonts = {
  sans: {
    regular: 'Archivo_400Regular',
    medium: 'Archivo_500Medium',
    semibold: 'Archivo_600SemiBold',
    bold: 'Archivo_700Bold',
    extrabold: 'Archivo_800ExtraBold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semibold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
};

// ── Radios ───────────────────────────────────────────────────────────────────
/**
 * La marca usa un solo radio de 8 dp para todo control (botón, chip, campo, tarjeta).
 * `hoja` es la esquina superior de la hoja inferior (12) y `pill` lo totalmente redondo.
 * field, button, card y tab quedan como alias del radio de control para el código viejo.
 */
const radius = { control: 8, perilla: 6, hoja: 12, pill: 999, field: 8, button: 8, card: 8, tab: 8 };

// ── Medidas ──────────────────────────────────────────────────────────────────
/** Altos y anchos en dp (tokens.json, alto, ancho y medida). */
const medidas = {
  boton: 48,
  botonAlto: 56,
  empezar: 64,
  paso: 56,
  marcar: 56,
  chipVisible: 40,
  chipToque: 48,
  toqueMinimo: 48,
  icono: 24,
  rielInterruptor: [52, 32],
  perilla: 24,
  margenPantalla: 16,
  pestanas: 64,
};

// ── Movimiento ───────────────────────────────────────────────────────────────
/** Duraciones en ms. Al presionar no hay animación (0); al soltar, 100 ms con curva de salida. */
const movimiento = {
  soltar: 100,
  marcarRelleno: 80,
  marcarVisto: 100,
  marcarFila: 120,
  cifra: 100,
  estado: 100,
  curvaSalida: [0, 0, 0.2, 1],
  repeticion: { inicio: 400, paso: 100, rapido: 50, pasosAntesDeRapido: 10 },
};

// ── Compatibilidad ───────────────────────────────────────────────────────────
/**
 * Paleta con los nombres de la versión 0.1 (menta), ahora con los valores de «Más» en modo
 * gimnasio. Existe solo para que el código viejo que pide `colors.bg` siga compilando. En
 * código nuevo usa `useTema().c` (apps/mobile/src/lib/tema.tsx), que sigue el tema activo.
 */
const g = temas.gimnasio;
const colors = {
  primary: { DEFAULT: g.accion, deep: g['acento-texto'], soft: g['fila-hecha'], bright: g.accion },
  accent: { DEFAULT: g.accion, deep: g['acento-texto'], soft: g['fila-hecha'], bright: g.accion },
  ink: { DEFAULT: g.texto, muted: g['texto-2'], faint: g['desh-texto'] },
  bg: g.fondo,
  surface: g.sup,
  line: g['sup-alta'],
  field: g['sup-alta'],
  danger: { DEFAULT: g.peligro, soft: g['sup-alta'] },
  gym: { bg: g.fondo, card: g.sup, line: g['sup-alta'], text: g.texto, muted: g['texto-2'] },
};

// Lo que se exporta es exactamente lo que tipa index.d.ts: si agregas una clave acá, agrégala
// allá también o TypeScript no la va a ver desde la app.
module.exports = { marca, temas, nombresColor, variablesTema, fonts, radius, medidas, movimiento, colors };
