// ─────────────────────────────────────────────────────────────────────────────
// Almacén crudo de la sesión en el navegador · Zona: Sesión de cuenta
//
// Qué hace: la mitad web de la capa (Metro la elige en vez de almacenCrudo.ts al armar para web).
// Guarda en localStorage, que en la app instalada desde Safari («Agregar a pantalla de inicio»)
// sobrevive a cerrar la app. Si el navegador no deja usar localStorage (modo privado viejo,
// almacenamiento bloqueado), guarda en memoria: la sesión dura lo que dure la pestaña.
// Ojo: localStorage lo puede leer cualquier script de la página. La app no carga scripts de
// terceros y el refresh rota en cada uso (un refresh robado se detecta al reusarse).
// Tócalo cuando: cambie dónde guarda la versión web.
// No lo toques para: el formato de lo guardado o las claves (almacen.ts).
// Depende de: nada (solo la API del navegador).
// ─────────────────────────────────────────────────────────────────────────────
import type { AlmacenCrudo } from './almacenCrudo';

const enMemoria = new Map<string, string>();

/** localStorage si existe y responde; si no, null. */
function disco(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const almacenCrudo: AlmacenCrudo = {
  leer: async (k) => {
    try {
      const v = disco()?.getItem(k);
      if (v != null) return v;
    } catch {
      // sigue con la copia en memoria
    }
    return enMemoria.get(k) ?? null;
  },
  escribir: async (k, v) => {
    enMemoria.set(k, v);
    try {
      disco()?.setItem(k, v);
    } catch {
      // Lleno o bloqueado: queda la copia en memoria.
    }
  },
  borrar: async (k) => {
    enMemoria.delete(k);
    try {
      disco()?.removeItem(k);
    } catch {
      // nada que borrar
    }
  },
};
