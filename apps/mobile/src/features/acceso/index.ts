// ─────────────────────────────────────────────────────────────────────────────
// Puerta del área Acceso · Zona: Acceso
//
// Qué hace: junta lo que las rutas importan del área: las pantallas de Ingreso, Crear cuenta,
// Recuperar, Restablecer y la Encuesta inicial. Las rutas de src/app solo las montan.
// Tócalo cuando: sumes una pantalla al área.
// No lo toques para: cambiar una pantalla (su archivo) ni quién la ve (src/app/_layout.tsx).
// Depende de: los archivos Pantalla*.tsx de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export { PantallaIngreso } from './PantallaIngreso';
export { PantallaCrearCuenta } from './PantallaCrearCuenta';
export { PantallaRecuperar } from './PantallaRecuperar';
export { PantallaRestablecer } from './PantallaRestablecer';
export { PantallaEncuesta } from './PantallaEncuesta';
