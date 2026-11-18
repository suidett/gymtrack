// ─────────────────────────────────────────────────────────────────────────────
// Tokens · Zona: Seguridad (API)
//
// Qué hace: firma y verifica el JWT de acceso (HS256, 15 minutos) y genera los tokens opacos del
// refresh (30 días) y del enlace de recuperación (1 hora). Los opacos se guardan en la base solo
// como hash SHA-256, nunca en claro (§Datos; SEG-003). El access lleva el «sello» de la
// contraseña con que se emitió (un HMAC del hash, no el hash): al cambiar la contraseña el sello
// cambia y los access viejos dejan de servir aunque no hayan vencido.
// Tócalo cuando: cambie la duración de un token o el algoritmo.
// No lo toques para: la rotación del refresh y la detección de reuso (src/cuentas/servicio.ts).
// Depende de: jose y node:crypto. La hora sale del reloj inyectado (SEG-004).
// ─────────────────────────────────────────────────────────────────────────────
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { errors, jwtVerify, SignJWT } from 'jose';

export const DURACION_ACCESS_S = 15 * 60;
export const DURACION_REFRESH_MS = 30 * 24 * 3_600_000;
export const DURACION_ENLACE_MS = 3_600_000;

const EMISOR = 'gymtrack-api';
const AUDIENCIA = 'gymtrack-app';

export interface ClaimsAccess {
  sub: string;
  rol: 'trainer' | 'client';
  /** Sello de la contraseña vigente al emitir (selloDeContrasena). */
  sello: string;
}

export function crearFirmador(secreto: string) {
  const clave = new TextEncoder().encode(secreto);
  const selloDeContrasena = (passwordHash: string) =>
    createHmac('sha256', clave).update(`sello-contrasena:${passwordHash}`).digest('base64url').slice(0, 22);
  return {
    /** HMAC del hash de la contraseña con el secreto del JWT: no dice nada del hash sin el secreto. */
    selloDeContrasena,
    /** true si el sello del access corresponde a la contraseña que el usuario tiene hoy. */
    selloVigente(sello: string, passwordHash: string): boolean {
      const esperado = Buffer.from(selloDeContrasena(passwordHash));
      const recibido = Buffer.from(sello);
      return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
    },
    async firmarAccess(claims: ClaimsAccess, ahora: Date): Promise<{ token: string; venceAt: Date }> {
      const iat = Math.floor(ahora.getTime() / 1000);
      const exp = iat + DURACION_ACCESS_S;
      const token = await new SignJWT({ rol: claims.rol, sello: claims.sello })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(claims.sub)
        .setIssuer(EMISOR)
        .setAudience(AUDIENCIA)
        .setIssuedAt(iat)
        .setExpirationTime(exp)
        .sign(clave);
      return { token, venceAt: new Date(exp * 1000) };
    },
    /** Devuelve los claims o 'vencido' o 'invalido'. Solo acepta HS256: `alg: none` no pasa (SEG-005). */
    async verificarAccess(token: string, ahora: Date): Promise<ClaimsAccess | 'vencido' | 'invalido'> {
      try {
        const { payload } = await jwtVerify(token, clave, {
          algorithms: ['HS256'],
          issuer: EMISOR,
          audience: AUDIENCIA,
          currentDate: ahora,
          clockTolerance: 0,
        });
        if (typeof payload.sub !== 'string' || (payload.rol !== 'trainer' && payload.rol !== 'client')) return 'invalido';
        if (typeof payload.sello !== 'string') return 'invalido';
        return { sub: payload.sub, rol: payload.rol, sello: payload.sello };
      } catch (e) {
        if (e instanceof errors.JWTExpired) return 'vencido';
        return 'invalido';
      }
    },
  };
}

export type Firmador = ReturnType<typeof crearFirmador>;

/** Token opaco de 32 bytes al azar, en base64url (43 caracteres). */
export function tokenOpaco(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Para logs: nunca el token completo. */
export function enmascararToken(token: string): string {
  return `${token.slice(0, 4)}…(${token.length})`;
}
