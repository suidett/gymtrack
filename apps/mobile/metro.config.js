// ─────────────────────────────────────────────────────────────────────────────
// Config de Metro · Zona: Configuración
//
// Qué hace: configura Metro, el empaquetador que junta todo el código de la app para el
// teléfono y para web. Parte de la config que trae Expo (que desde el SDK 52 ya entiende el
// monorepo: encuentra @gymtrack/shared y @gymtrack/tokens sin nada extra) y le suma NativeWind,
// que compila global.css con Tailwind y mete el resultado en el bundle para que las clases
// funcionen.
// Tócalo cuando: cambies el archivo css de entrada, necesites que Metro resuelva una extensión
// nueva (por ejemplo .svg como componente) o agregues otra transformación al bundle.
// No lo toques para: decidir qué clases existen (packages/tokens/tailwind.preset.js) ni qué
// carpetas escanea Tailwind (apps/mobile/tailwind.config.js).
// Depende de: ./global.css (las tres directivas de Tailwind). De rebote lee tailwind.config.js,
// que es donde NativeWind busca los presets.
// ─────────────────────────────────────────────────────────────────────────────

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// `__dirname` es apps/mobile: Metro toma esta carpeta como raíz del proyecto y desde ahí sube
// a la raíz del monorepo para encontrar el node_modules plano (ver pnpm-workspace.yaml).
const config = getDefaultConfig(__dirname);

// `input` es el css que Tailwind procesa. Al arrancar, NativeWind también genera
// nativewind-env.d.ts en esta carpeta (el que habilita className en los tipos de React
// Native); por eso ese archivo no se edita a mano.
module.exports = withNativeWind(config, { input: './global.css' });
