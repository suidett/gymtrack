// ─────────────────────────────────────────────────────────────────────────────
// Preset de Tailwind · Zona: Diseño
//
// Qué hace: traduce los tokens de index.js al formato que entiende Tailwind, para que en la app
// (NativeWind) y en cualquier web futura existan las mismas clases: bg-primary-soft,
// text-ink-muted, font-sans-bold, rounded-card. Es un preset, no una config completa: la app
// lo carga desde apps/mobile/tailwind.config.js junto con el preset de NativeWind.
// Tócalo cuando: agregues una clave nueva en index.js y quieras que exista como clase, o
// necesites cambiar cómo se llama una clase (por ejemplo, exponer un radio nuevo).
// No lo toques para: cambiar un valor (un hexadecimal, el tamaño de un radio): eso va en
// index.js y acá se refleja solo. Tampoco para agregar plugins o cambiar qué carpetas escanea
// Tailwind: eso es de la config de la app (apps/mobile/tailwind.config.js).
// Depende de: ./index.js (colors, fonts, radius).
// ─────────────────────────────────────────────────────────────────────────────

const { colors, fonts, radius } = require('./index.js');

/**
 * Preset compartido. Todo va dentro de `theme.extend` para sumar a la paleta y las escalas por
 * defecto de Tailwind, no reemplazarlas: así siguen existiendo `bg-white`, `rounded-full` o
 * `text-xs` al lado de las nuestras.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  theme: {
    extend: {
      // Las familias van listadas una por una y no como `...colors`, para que se vea de un
      // vistazo cuáles existen como clase y agregar una sea una decisión explícita.
      // Un objeto con DEFAULT da la clase sin sufijo (bg-primary) y una por variante
      // (bg-primary-soft); un string da una sola clase (bg-bg, bg-surface, border-line).
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        ink: colors.ink,
        bg: colors.bg,
        surface: colors.surface,
        line: colors.line,
        field: colors.field,
        danger: colors.danger,
        gym: colors.gym,
      },
      // Hay una clave por peso y no una sola `sans` con varios pesos porque en React Native
      // cada peso de una fuente cargada es una familia distinta (ver index.js). Las clases
      // quedan como font-sans, font-sans-medium, font-mono-semibold. Si sumas un peso acá,
      // súmalo también en index.js y en el useFonts de apps/mobile/src/app/_layout.tsx.
      fontFamily: {
        sans: [fonts.sans.regular],
        'sans-medium': [fonts.sans.medium],
        'sans-semibold': [fonts.sans.semibold],
        'sans-bold': [fonts.sans.bold],
        'sans-extrabold': [fonts.sans.extrabold],
        mono: [fonts.mono.regular],
        'mono-medium': [fonts.mono.medium],
        'mono-semibold': [fonts.mono.semibold],
      },
      // Tailwind espera unidades, por eso el `px`; en React Native NativeWind lo vuelve el
      // número sin unidad de siempre. `pill` queda fuera a propósito: para eso está
      // `rounded-full`, que ya viene con Tailwind.
      borderRadius: {
        field: `${radius.field}px`,
        button: `${radius.button}px`,
        card: `${radius.card}px`,
        tab: `${radius.tab}px`,
      },
    },
  },
};
