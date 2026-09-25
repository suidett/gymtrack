// ─────────────────────────────────────────────────────────────────────────────
// Config de ESLint · Zona: Configuración
//
// Qué hace: define qué revisa `pnpm lint` (que corre `expo lint`) en la app. Usa las reglas que
// recomienda Expo, que ya traen TypeScript, React, los hooks y las del compilador de React que
// menciona la guía del equipo (nada de Date.now() en el cuerpo de un componente, nada de
// setState directo dentro de un efecto, nada de escribir una ref durante el render), más el
// orden de los imports. Y le dice qué carpetas ignorar: lo que genera `expo export` y la caché
// de Expo.
// Tócalo cuando: quieras apagar o endurecer una regla para todo el proyecto, sumar un plugin
// o ignorar una carpeta nueva con código generado.
// No lo toques para: saltarte una regla en un solo lugar; para eso va un
// eslint-disable-next-line con el motivo al lado, y con moderación.
// Depende de: nada propio; solo eslint y eslint-config-expo. Los paquetes de packages/ no
// tienen lint propio, así que `pnpm lint` desde la raíz revisa solo apps/mobile.
// ─────────────────────────────────────────────────────────────────────────────

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Config "flat" de ESLint 9: un arreglo de bloques que se aplican en orden. Primero todo lo de
 * Expo y después nuestros ajustes. Un bloque con solo `ignores` (sin `files`) es global: esas
 * carpetas no se revisan nunca, ni aunque las pidas explícitamente.
 */
module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
]);
