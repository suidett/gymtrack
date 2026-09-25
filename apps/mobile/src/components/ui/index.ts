// ─────────────────────────────────────────────────────────────────────────────
// Índice del kit · Zona: Kit de interfaz
//
// Qué hace: junta todas las piezas del kit (texto, botones, tarjetas, campos, stepper, pantalla,
// avisos y filas) para que las pantallas importen todo desde '@/components/ui' y no desde cada
// archivo por separado.
// Tócalo cuando: agregues una pieza nueva al kit. Un archivo nuevo en esta carpeta necesita su
// línea aquí; si no, las pantallas no lo ven con el import corto.
// No lo toques para: cambiar cómo se ve o se comporta una pieza; eso va en su propio archivo.
// Depende de: Txt, Boton, Tarjeta, Chip, Campo, Stepper, Pantalla, Vacio y Fila (esta carpeta).
// ─────────────────────────────────────────────────────────────────────────────
export * from './Txt';
export * from './Boton';
export * from './Tarjeta';
export * from './Chip';
export * from './Campo';
export * from './Stepper';
export * from './Pantalla';
export * from './Vacio';
export * from './Fila';
