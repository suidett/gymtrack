// ─────────────────────────────────────────────────────────────────────────────
// Puerta del paquete shared · Zona: Configuración
//
// Qué hace: junta en un solo lugar todo lo que el paquete @gymtrack/shared le ofrece a la app (y
// a la API futura): tipos, fórmulas, formatos, motor de progresión, historial, cierre de sesión,
// biblioteca de ejercicios y rutina de ejemplo. La app importa siempre desde '@gymtrack/shared',
// nunca desde un archivo interno del paquete.
// Tócalo cuando: agregues un módulo nuevo a packages/shared/src (una línea `export * from`) o
// quieras dejar de exponer uno. Si dos módulos exportan el mismo nombre, TypeScript reclama en
// este archivo: la solución es renombrar en el módulo, no tocar esta lista.
// No lo toques para: cambiar qué hace una fórmula, una regla o un tipo; eso va en su archivo.
// Depende de: types.ts, formulas.ts, format.ts, progression.ts, historial.ts, cierre.ts,
// exercises.seed.ts y rutina-ejemplo.ts (todos de esta misma carpeta).
// ─────────────────────────────────────────────────────────────────────────────

// Tipos del dominio: ejercicio, rutina, sesión, serie, récord, sugerencia y las listas cerradas.
export * from './types';
// Fórmulas puras: 1RM estimado (Epley), volumen, calorías, redondeo de cargas.
export * from './formulas';
// Formato para mostrar: kilos con coma decimal, fechas en español, duraciones m:ss.
export * from './format';
// Motor de progresión: qué intentar la próxima sesión según lo que se hizo hoy.
export * from './progression';
// Lecturas del historial: la última vez que se hizo un ejercicio, el día que toca, la semana en curso.
export * from './historial';
// Cierre de sesión: descarta series sin completar, calcula totales, detecta récords y sugerencias.
export * from './cierre';
// Biblioteca base de ejercicios (los ids "base-...").
export * from './exercises.seed';
// La rutina de cuatro días que se siembra la primera vez que se abre la app.
export * from './rutina-ejemplo';
