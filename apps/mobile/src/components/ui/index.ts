// ─────────────────────────────────────────────────────────────────────────────
// Índice del kit · Zona: Kit de interfaz
//
// Qué hace: junta todas las piezas del kit para que las pantallas importen desde
// '@/components/ui' y no desde cada archivo por separado.
// Tócalo cuando: agregues una pieza nueva al kit (una línea por archivo).
// No lo toques para: cambiar cómo se ve o se comporta una pieza; eso va en su propio archivo.
// Depende de: los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────

// Marca «Más» (sistema.css).
export * from './Txt';
export * from './Boton';
export * from './Icono';
export * from './Simbolo';
export * from './Paso';
export * from './Chip';
export * from './Tarjeta';
export * from './Fila';
export * from './Aviso';
export * from './Hoja';
export * from './Avance';
export * from './CampoTexto';
export * from './Interruptor';
export * from './Pestanas';
export * from './Pantalla';
// De la versión 0.1, con los colores nuevos: Campo, EntradaDiferida, CampoDiferido, Stepper,
// Vacio y Confirmar. Siguen sirviendo al código de features/ y components/.
export * from './Campo';
export * from './Stepper';
export * from './Vacio';
