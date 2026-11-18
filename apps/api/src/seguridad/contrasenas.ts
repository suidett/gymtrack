// ─────────────────────────────────────────────────────────────────────────────
// Contraseñas · Zona: Seguridad (API)
//
// Qué hace: calcula y verifica el hash de una contraseña con Argon2id (§Seguridad). Parámetros
// de la propuesta de SEG-001 (los mínimos de OWASP): 19 MiB de memoria, 2 iteraciones,
// paralelismo 1. El hash guarda sus parámetros, así subirlos después no rompe los viejos.
// Tócalo cuando: el equipo fije otros parámetros (cambia también SEG-001).
// No lo toques para: el largo permitido (8 a 128): eso lo valida el esquema compartido antes de
// llegar aquí, para no gastar CPU en una contraseña de 10.000 caracteres (SEG-002).
// Depende de: argon2.
// ─────────────────────────────────────────────────────────────────────────────
import argon2 from 'argon2';

export const PARAMETROS_ARGON2 = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashearContrasena(clara: string): Promise<string> {
  return argon2.hash(clara, PARAMETROS_ARGON2);
}

export async function verificarContrasena(hash: string, clara: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, clara);
  } catch {
    return false;
  }
}

// Un hash fijo para verificar cuando el correo no existe: así el ingreso tarda lo mismo con un
// correo inventado y con uno real, y el tiempo no cuenta qué cuentas existen.
let hashSenuelo: Promise<string> | undefined;
export async function verificarSenuelo(clara: string): Promise<void> {
  hashSenuelo ??= hashearContrasena('contrasena-senuelo-que-nadie-usa');
  await verificarContrasena(await hashSenuelo, clara);
}
