import * as Crypto from 'expo-crypto';

/** Los ids nacen en el celular, así una sesión hecha sin señal no se duplica al sincronizar. */
export function newId(): string {
  return Crypto.randomUUID();
}
