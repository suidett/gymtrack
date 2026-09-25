/** @type {import('tailwindcss').Config} */
module.exports = {
  // La app es solo clara (userInterfaceStyle light). Con 'media', NativeWind en web
  // lanza error cuando Expo fija el esquema de color al arrancar.
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset'), require('@gymtrack/tokens/tailwind.preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
