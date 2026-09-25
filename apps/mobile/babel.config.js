// ─────────────────────────────────────────────────────────────────────────────
// Config de Babel · Zona: Configuración
//
// Qué hace: le dice a Babel (el que traduce el código de la app antes de empaquetarlo) que use
// el preset de Expo y que pase el JSX por NativeWind. Sin esto, `className="bg-primary"` en un
// View o un Text no haría nada: NativeWind necesita interceptar cada elemento JSX para convertir
// las clases en estilos de React Native.
// Tócalo cuando: sumes una librería que pida su propio plugin de Babel o cambies de motor de
// estilos. Después de tocarlo arranca con `expo start -c` para limpiar la caché; si no, el
// cambio no se ve.
// No lo toques para: configurar Tailwind (apps/mobile/tailwind.config.js) ni para cambiar cómo
// se compila el css (apps/mobile/metro.config.js).
// Depende de: nada propio; solo babel-preset-expo y nativewind.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Babel llama a esta función una vez por proceso y le pasa `api`; devuelve la configuración.
 * `api.cache(true)` guarda el resultado para siempre en ese proceso: la config no depende del
 * entorno, así que no hay razón para recalcularla archivo por archivo.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    // `jsxImportSource: 'nativewind'` hace que cada <View> o <Text> se cree a través de
    // NativeWind y no de React directo; ahí es donde className se vuelve estilo.
    // 'nativewind/babel' es el plugin que lo acompaña (en NativeWind 4 es el de
    // react-native-css-interop). El plugin de reanimated no aparece porque babel-preset-expo
    // lo agrega solo cuando la librería está instalada.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
