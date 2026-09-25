import * as Crypto from 'expo-crypto';

/**
 * Los ids nacen en el celular, así una sesión hecha sin señal no se duplica al sincronizar.
 * En web sobre http (una IP de la red, no localhost) no existe randomUUID: se arma un UUID v4
 * con getRandomValues, que sí está disponible.
 */
export function newId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // sigue abajo
  }
  const b = Crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
