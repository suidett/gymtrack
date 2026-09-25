// ─────────────────────────────────────────────────────────────────────────────
// Config de Tailwind · Zona: Configuración
//
// Qué hace: es la config de Tailwind que usa la app. Casi no define nada propio: carga el
// preset de NativeWind (lo que hace que las clases funcionen en React Native) y el preset de
// @gymtrack/tokens (los colores, fuentes y radios del diseño), y le dice a Tailwind en qué
// archivos buscar las clases que se usan.
// Tócalo cuando: muevas componentes fuera de src/ (hay que sumar la carpeta a `content`, si no
// sus clases no se generan), agregues un plugin de Tailwind o necesites una clase que solo
// exista en la app y no en el diseño compartido.
// No lo toques para: cambiar un color, una fuente o un radio (packages/tokens/index.js) ni
// para agregar una clase del diseño (packages/tokens/tailwind.preset.js).
// Depende de: @gymtrack/tokens/tailwind.preset (packages/tokens/tailwind.preset.js).
// ─────────────────────────────────────────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
module.exports = {
  // La app es solo clara (userInterfaceStyle light). Con 'media', NativeWind en web
  // lanza error cuando Expo fija el esquema de color al arrancar.
  darkMode: 'class',
  // Solo se generan las clases que Tailwind encuentra escritas en estos archivos. Por eso una
  // clase armada por partes (`bg-${color}`) no funciona: escribe siempre la clase completa.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  // El orden importa: primero NativeWind (la base para React Native) y después nuestros
  // tokens, que se suman encima.
  presets: [require('nativewind/preset'), require('@gymtrack/tokens/tailwind.preset')],
  // Vacío a propósito: lo que comparte el diseño vive en el preset de tokens. Acá solo iría
  // algo que necesite la app y nadie más.
  theme: {
    extend: {},
  },
  plugins: [],
};
