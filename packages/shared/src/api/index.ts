// ─────────────────────────────────────────────────────────────────────────────
// Puerta del contrato de la API · Zona: Contrato
//
// Qué hace: junta los esquemas Zod de la API, los códigos de error y el cliente tipado. La API
// los importa desde '@gymtrack/shared' y la app también: así validan con el mismo objeto.
// Tócalo cuando: agregues un archivo de contrato nuevo (una línea `export * from`).
// No lo toques para: cambiar un esquema (va en su archivo).
// Depende de: errores.ts, cuentas.ts y cliente.ts de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export * from './errores';
export * from './cuentas';
export * from './cliente';
