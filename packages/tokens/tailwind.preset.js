// ─────────────────────────────────────────────────────────────────────────────
// Preset de Tailwind · Zona: Diseño
//
// Qué hace: traduce los tokens de index.js al formato de Tailwind para que en la app
// (NativeWind) existan las clases de la marca «Más»: bg-fondo, bg-sup, text-texto-2,
// bg-accion, text-accion-texto, border-borde, font-sans-bold, font-mono-bold, rounded-control.
// Los colores no son hexadecimales fijos: apuntan a variables CSS (--fondo, --texto...) que la
// raíz de la app llena con el tema activo (modo gimnasio o clara). Así una misma clase sirve en
// los dos temas y cambiar de tema no obliga a tocar ninguna pantalla.
// Tócalo cuando: agregues una clave nueva en index.js y quieras que exista como clase.
// No lo toques para: cambiar un valor (index.js) ni para agregar plugins o carpetas que escanea
// Tailwind (apps/mobile/tailwind.config.js).
// Depende de: ./index.js (temas, nombresColor, variablesTema, fonts, radius).
// ─────────────────────────────────────────────────────────────────────────────

const { nombresColor, variablesTema, fonts, radius, marca } = require('./index.js');

// ── Colores por variable ─────────────────────────────────────────────────────
// `rgb(var(--x) / <alpha-value>)` permite además la opacidad de Tailwind (bg-fondo/80).
const v = (nombre) => `rgb(var(--${nombre}) / <alpha-value>)`;
const coloresTema = Object.fromEntries(nombresColor.map((n) => [n, v(n)]));

// Nombres de la versión 0.1 (menta) apuntando a las variables nuevas, para que el código viejo
// (features/sesion, components/) se vea con la marca nueva sin reescribirlo. No los uses en
// pantallas nuevas.
const coloresViejos = {
  primary: { DEFAULT: v('accion'), deep: v('acento-texto'), soft: v('fila-hecha'), bright: v('accion') },
  accent: { DEFAULT: v('accion'), deep: v('acento-texto'), soft: v('fila-hecha'), bright: v('accion') },
  ink: { DEFAULT: v('texto'), muted: v('texto-2'), faint: v('desh-texto') },
  bg: v('fondo'),
  surface: v('sup'),
  line: v('sup-alta'),
  field: v('sup-alta'),
  danger: { DEFAULT: v('peligro'), soft: v('sup-alta') },
};

/**
 * Preset compartido. Todo va dentro de `theme.extend` para sumar a la paleta y las escalas por
 * defecto de Tailwind, no reemplazarlas.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        ...coloresTema,
        ...coloresViejos,
        // Fijos de la marca, sin tema: el ámbar del símbolo y el grafito.
        ambar: marca.ambar,
        grafito: marca.grafito,
      },
      // Una clave por peso: en React Native cada peso de una fuente cargada es una familia.
      // font-sans es Archivo 500 (el texto de la marca); font-mono-bold es la cifra.
      fontFamily: {
        sans: [fonts.sans.medium],
        'sans-regular': [fonts.sans.regular],
        'sans-medium': [fonts.sans.medium],
        'sans-semibold': [fonts.sans.semibold],
        'sans-bold': [fonts.sans.bold],
        'sans-extrabold': [fonts.sans.extrabold],
        mono: [fonts.mono.medium],
        'mono-regular': [fonts.mono.regular],
        'mono-medium': [fonts.mono.medium],
        'mono-semibold': [fonts.mono.semibold],
        'mono-bold': [fonts.mono.bold],
      },
      borderRadius: {
        control: `${radius.control}px`,
        perilla: `${radius.perilla}px`,
        hoja: `${radius.hoja}px`,
        field: `${radius.field}px`,
        button: `${radius.button}px`,
        card: `${radius.card}px`,
        tab: `${radius.tab}px`,
      },
    },
  },
  // ── Valores por defecto ──────────────────────────────────────────────────────
  // Las variables del modo gimnasio en :root, para que cualquier pieza que se pinte fuera del
  // proveedor de tema (o antes de que monte) tenga colores y no quede transparente.
  plugins: [
    function temaPorDefecto({ addBase }) {
      addBase({ ':root': variablesTema('gimnasio') });
    },
  ],
};
