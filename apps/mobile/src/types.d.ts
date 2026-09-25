// ─────────────────────────────────────────────────────────────────────────────
// Declaraciones de tipos del proyecto · Zona: Configuración
//
// Qué hace: le avisa a TypeScript que existen módulos que el código importa solo por efecto, como
// el global.css de NativeWind que carga src/app/_layout.tsx. Sin esto, `pnpm typecheck` reclama
// que no encuentra el módulo '*.css'.
// Tócalo cuando: importes otro tipo de archivo que TypeScript no conozca (por ejemplo '*.svg')
// y el typecheck lo rechace.
// No lo toques para: los tipos del negocio (rutina, serie, sesión), que viven en
// packages/shared/src/types.ts. Ni para que className acepte clases de NativeWind: eso lo da
// apps/mobile/nativewind-env.d.ts.
// Depende de: ninguno.
// ─────────────────────────────────────────────────────────────────────────────

// TypeScript 6 exige declarar los módulos importados solo por efecto (el CSS de NativeWind).
declare module '*.css';
