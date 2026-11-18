// ─────────────────────────────────────────────────────────────────────────────
// Almacén de la sesión · Zona: Sesión de cuenta
//
// Qué hace: guarda los tokens y el último usuario en expo-secure-store (llavero de iOS, Keystore
// de Android). Nunca en AsyncStorage (§Seguridad, APP-005, SEG-023). En web, donde secure-store
// no existe, usa localStorage: sirve solo para probar en el navegador.
// Tócalo cuando: cambie dónde o con qué clave se guarda la sesión.
// No lo toques para: decidir cuándo renovar o cerrar (gestor.ts).
// Depende de: expo-secure-store y los tipos de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaTokens, esquemaUsuario, type Tokens, type Usuario } from '@gymtrack/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AlmacenSesion } from './gestor';

// ── Claves ───────────────────────────────────────────────────────────────────
// secure-store acepta letras, números, punto, guion y guion bajo.
const CLAVE_TOKENS = 'gymtrack.tokens';
const CLAVE_USUARIO = 'gymtrack.usuario';

// ── Lectura y escritura cruda ────────────────────────────────────────────────
interface Crudo {
  leer(k: string): Promise<string | null>;
  escribir(k: string, v: string): Promise<void>;
  borrar(k: string): Promise<void>;
}

const nativo: Crudo = {
  leer: (k) => SecureStore.getItemAsync(k),
  escribir: (k, v) => SecureStore.setItemAsync(k, v),
  borrar: (k) => SecureStore.deleteItemAsync(k),
};

const web: Crudo = {
  leer: async (k) => {
    try {
      return globalThis.localStorage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  escribir: async (k, v) => {
    try {
      globalThis.localStorage?.setItem(k, v);
    } catch {
      // Navegador sin almacenamiento: la sesión dura lo que dure la pestaña.
    }
  },
  borrar: async (k) => {
    try {
      globalThis.localStorage?.removeItem(k);
    } catch {
      // nada que borrar
    }
  },
};

const crudo = Platform.OS === 'web' ? web : nativo;

/** Lee un JSON y lo valida; si está roto o con otra forma, cuenta como que no hay nada. */
async function leerJson<T>(clave: string, esquema: { safeParse(d: unknown): { success: boolean; data?: T } }) {
  const texto = await crudo.leer(clave).catch(() => null);
  if (!texto) return null;
  try {
    const r = esquema.safeParse(JSON.parse(texto));
    return r.success ? (r.data as T) : null;
  } catch {
    return null;
  }
}

// ── Almacén ──────────────────────────────────────────────────────────────────
export const almacenSeguro: AlmacenSesion = {
  leerTokens: () => leerJson<Tokens>(CLAVE_TOKENS, esquemaTokens),
  guardarTokens: (t) => crudo.escribir(CLAVE_TOKENS, JSON.stringify(t)),
  leerUsuario: () => leerJson<Usuario>(CLAVE_USUARIO, esquemaUsuario),
  guardarUsuario: (u) => crudo.escribir(CLAVE_USUARIO, JSON.stringify(u)),
  borrar: async () => {
    await Promise.all([crudo.borrar(CLAVE_TOKENS), crudo.borrar(CLAVE_USUARIO)]);
  },
};
