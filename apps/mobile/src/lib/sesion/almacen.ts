// ─────────────────────────────────────────────────────────────────────────────
// Almacén de la sesión · Zona: Sesión de cuenta
//
// Qué hace: guarda los tokens y el último usuario. En el teléfono van en expo-secure-store
// (llavero de iOS, Keystore de Android), nunca en AsyncStorage (§Seguridad, APP-005, SEG-023). En
// la versión web (la app instalada desde Safari) van en localStorage: almacenCrudo.ts y
// almacenCrudo.web.ts son las dos mitades y Metro elige la que toca al armar cada plataforma.
// Tócalo cuando: cambie con qué clave o en qué formato se guarda la sesión.
// No lo toques para: decidir cuándo renovar o cerrar (gestor.ts) ni dónde se guarda en cada
// plataforma (almacenCrudo.ts y almacenCrudo.web.ts).
// Depende de: ./almacenCrudo y los tipos de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaTokens, esquemaUsuario, type Tokens, type Usuario } from '@gymtrack/shared';
import type { AlmacenSesion } from './gestor';
import { almacenCrudo as crudo } from './almacenCrudo';

// ── Claves ───────────────────────────────────────────────────────────────────
// secure-store acepta letras, números, punto, guion y guion bajo.
const CLAVE_TOKENS = 'gymtrack.tokens';
const CLAVE_USUARIO = 'gymtrack.usuario';

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
