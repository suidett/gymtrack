// Preset de Tailwind compartido por la app (NativeWind) y cualquier web (Tailwind CSS).
// Las clases de fuente llevan el peso en el nombre (font-sans-bold) porque en
// React Native cada peso de una fuente cargada es una familia distinta.
const { colors, fonts, radius } = require('./index.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
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
      borderRadius: {
        field: `${radius.field}px`,
        button: `${radius.button}px`,
        card: `${radius.card}px`,
        tab: `${radius.tab}px`,
      },
    },
  },
};
