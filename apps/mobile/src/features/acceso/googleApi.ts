// ─────────────────────────────────────────────────────────────────────────────
// Llamada del ingreso con Google · Zona: Acceso
//
// Qué hace: POST /v1/auth/google con el id_token (y, en el segundo envío, rol, nombre y
// apellido). El cuerpo se valida con el mismo esquema de la API antes de salir y la respuesta
// también: o trae la sesión (usuario y tokens, como el ingreso normal) o dice que falta el rol.
// Tócalo cuando: cambie la ruta en packages/shared/src/api/cuentas.ts (RUTAS_CUENTAS.google).
// No lo toques para: qué se muestra cuando falla (google.ts) ni cómo se guarda la sesión.
// Depende de: @gymtrack/shared. Recibe el gestor de la sesión por parámetro (solo usa
// `llamar`), así se prueba en Node con uno falso.
// ─────────────────────────────────────────────────────────────────────────────
import { RUTAS_CUENTAS, type EntradaIngresoGoogle, type RespuestaGoogle } from '@gymtrack/shared';

/** Lo que esta llamada usa del gestor de sesión (useSesion().api cumple). */
export interface LlamadorPublico {
  llamar<T = unknown>(
    metodo: string,
    ruta: string,
    op?: { cuerpo?: unknown; publica?: boolean; esquema?: { parse(d: unknown): T } },
  ): Promise<T>;
}

export const RUTA_GOOGLE = RUTAS_CUENTAS.google.ruta;

/**
 * Manda el token a la API. Lanza ZodError si el cuerpo no pasa el esquema (sin gastar una
 * llamada), ErrorDeApi con el código si la API dice que no, o el TypeError de fetch sin red.
 */
export async function enviarAGoogle(api: LlamadorPublico, cuerpo: EntradaIngresoGoogle): Promise<RespuestaGoogle> {
  const R = RUTAS_CUENTAS.google;
  return api.llamar<RespuestaGoogle>(R.metodo, R.ruta, { publica: true, cuerpo: R.cuerpo.parse(cuerpo), esquema: R.respuesta });
}
