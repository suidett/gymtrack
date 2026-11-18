// ─────────────────────────────────────────────────────────────────────────────
// Almacén crudo de la sesión en el teléfono · Zona: Sesión de cuenta
//
// Qué hace: lee, escribe y borra textos en expo-secure-store (llavero de iOS, Keystore de
// Android). Es la mitad nativa de la capa: Metro elige almacenCrudo.web.ts al armar la versión
// web, así el paquete web nunca carga secure-store (que en el navegador no existe).
// Tócalo cuando: cambien las opciones del llavero (por ejemplo, pedir el desbloqueo).
// No lo toques para: el formato de lo guardado o las claves (almacen.ts).
// Depende de: expo-secure-store.
// ─────────────────────────────────────────────────────────────────────────────
import * as SecureStore from 'expo-secure-store';

/** Lo mínimo que almacen.ts necesita de un lugar donde guardar textos. */
export interface AlmacenCrudo {
  leer(clave: string): Promise<string | null>;
  escribir(clave: string, valor: string): Promise<void>;
  borrar(clave: string): Promise<void>;
}

export const almacenCrudo: AlmacenCrudo = {
  leer: (k) => SecureStore.getItemAsync(k),
  escribir: (k, v) => SecureStore.setItemAsync(k, v),
  borrar: (k) => SecureStore.deleteItemAsync(k),
};
