// ─────────────────────────────────────────────────────────────────────────────
// Generador de ids · Zona: Utilidades
//
// Qué hace: inventa el id único de cada cosa que se guarda (rutina, día, ejercicio propio, sesión,
// serie). Todo lo que el store crea pasa por aquí.
// Tócalo cuando: cambie el formato del id (por ejemplo, si el servidor futuro pide otro tipo de id
// o un prefijo). Ojo: los datos ya guardados en los teléfonos conservan los ids viejos.
// No lo toques para: los ids de la biblioteca base de ejercicios ("base-..."), que son fijos y viven
// en packages/shared/src/exercises.seed.ts.
// Depende de: ninguno propio (solo expo-crypto, que es librería).
// ─────────────────────────────────────────────────────────────────────────────
import * as Crypto from 'expo-crypto';

/**
 * Devuelve un UUID v4 nuevo (36 caracteres, tipo "3b241101-e2bb-4255-8caf-4136c566a962").
 * No recibe nada; cada llamada da un id distinto.
 *
 * Los ids nacen en el celular, así una sesión hecha sin señal no se duplica al sincronizar.
 * En web sobre http (una IP de la red, no localhost) no existe randomUUID: se arma un UUID v4
 * con getRandomValues, que sí está disponible.
 */
export function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // sigue abajo: randomUUID falló (web sin https), así que armamos el UUID a mano
  }
  // 16 bytes al azar. Los dos ajustes de abajo son lo que hace que sea un v4 de verdad:
  // el byte 6 lleva la versión (0100 en los bits altos) y el byte 8 la variante (10 en los bits altos).
  // El `?? 0` es solo para que TypeScript no reclame por un índice que podría no existir.
  const b = Crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  // Cada byte a dos dígitos hex, y se corta en los grupos 8-4-4-4-12 del formato UUID.
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
