// ─────────────────────────────────────────────────────────────────────────────
// Generador de ids de Entrenar · Zona: Entrenar
//
// Qué hace: el generador de UUID v7 que usa la app para sesiones, series, entradas de la cola y
// el id de este teléfono (device_id), con el azar de expo-crypto.
// Tócalo cuando: cambie de dónde sale el azar.
// No lo toques para: el formato del id (uuid7.ts).
// Depende de: expo-crypto y ./uuid7.
// ─────────────────────────────────────────────────────────────────────────────
import * as Crypto from 'expo-crypto';
import { crearGeneradorUuidV7 } from './uuid7';

function aleatorio(n: number): Uint8Array {
  try {
    return Crypto.getRandomValues(new Uint8Array(n));
  } catch {
    // Sin generador seguro (web sobre http): el contador y la hora siguen garantizando el orden.
    return Uint8Array.from({ length: n }, () => Math.floor(Math.random() * 256));
  }
}

/** Un UUID v7 nuevo. */
export const nuevoId: () => string = crearGeneradorUuidV7({ ahora: () => Date.now(), aleatorio });
