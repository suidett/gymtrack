// ─────────────────────────────────────────────────────────────────────────────
// Ingreso con Google (lógica) · Zona: Acceso
//
// Qué hace: lo que el ingreso con Google decide sin React ni red, para probarlo en Node:
// - qué client ID usa cada plataforma (web y Android; en iPhone no hay app nativa);
// - cómo se lee lo que devuelve Google: la respuesta de expo-auth-session en Android (código o
//   cancelado) y el retorno a /ingreso en web (#id_token=..., con su state y su nonce);
// - qué mensaje muestra cada falla: cancelado, sin red, correo de Google sin verificar, token
//   rechazado, demasiados intentos, cuenta por borrarse, Google no disponible;
// - el formulario del paso «Completa tu cuenta» a partir del perfil que manda la API.
// Se decide por el código de la API, nunca por su texto (plan de validación, regla 4).
// Tócalo cuando: cambie un texto de error de Google o qué se acepta del retorno.
// No lo toques para: el botón (BotonGoogle.tsx), el estado de la pantalla (useIngresoGoogle.ts)
// ni la validación de rol, nombre y apellido (validacion.ts).
// Depende de: @gymtrack/shared (ErrorDeApi, PerfilGoogle), ./errores y ./validacion.
// ─────────────────────────────────────────────────────────────────────────────
import { detalleDeError, ErrorDeApi, type PerfilGoogle } from '@gymtrack/shared';
import { campoDeErrorDeForma, ESPERA_POR_DEFECTO_S, esErrorDeRed, type MensajePantalla } from './errores';
import type { FormCuentaGoogle, RolAcceso } from './validacion';

// ── Client ID por plataforma ─────────────────────────────────────────────────
export interface ClientIdsGoogle {
  web: string | null;
  android: string | null;
}

const FORMA_CLIENT_ID = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

/** Limpia los EXPO_PUBLIC_GOOGLE_CLIENT_ID_*: uno vacío o con otra forma cuenta como que no está. */
export function leerClientIdsGoogle(crudo: { web?: string; android?: string }): ClientIdsGoogle {
  const limpio = (v?: string) => {
    const t = v?.trim() ?? '';
    return FORMA_CLIENT_ID.test(t) ? t : null;
  };
  return { web: limpio(crudo.web), android: limpio(crudo.android) };
}

/** El client ID de la plataforma, o null si ahí no hay ingreso con Google (iPhone nativo, sin configurar). */
export function clientIdPara(plataforma: string, ids: ClientIdsGoogle): string | null {
  if (plataforma === 'web') return ids.web;
  if (plataforma === 'android') return ids.android;
  return null;
}

// ── Fallas antes de llegar a la API ──────────────────────────────────────────
/**
 * cancelado: la persona cerró la ventana de Google o no aceptó. red: no hubo internet.
 * proveedor: Google respondió con un error o sin id_token. estado: el retorno no corresponde a
 * un intento de este teléfono (state o nonce distintos, o se perdió lo guardado).
 */
export type FalloGoogle = 'cancelado' | 'red' | 'proveedor' | 'estado';

/** Lo mínimo de AuthSessionResult de expo-auth-session que se mira. */
export interface RespuestaAutorizacion {
  type: string;
  params?: Record<string, string>;
}

export type LecturaAutorizacion =
  | { tipo: 'codigo'; codigo: string }
  | { tipo: 'token'; idToken: string }
  | { tipo: 'fallo'; fallo: FalloGoogle }
  /** Otra ventana de Google ya estaba abierta, o en web se abrió y sigue: no hay nada que mostrar. */
  | { tipo: 'nada' };

/** Lee lo que devolvió promptAsync() en Android: el código para canjear, o por qué no hay. */
export function leerAutorizacion(r: RespuestaAutorizacion): LecturaAutorizacion {
  if (r.type === 'cancel' || r.type === 'dismiss') return { tipo: 'fallo', fallo: 'cancelado' };
  if (r.type === 'error') {
    return { tipo: 'fallo', fallo: r.params?.error === 'access_denied' ? 'cancelado' : 'proveedor' };
  }
  if (r.type !== 'success') return { tipo: 'nada' };
  if (r.params?.id_token) return { tipo: 'token', idToken: r.params.id_token };
  if (r.params?.code) return { tipo: 'codigo', codigo: r.params.code };
  return { tipo: 'fallo', fallo: 'proveedor' };
}

// ── Retorno en web ───────────────────────────────────────────────────────────
/** Lo que la versión web guarda en sessionStorage antes de irse a Google. */
export interface IntentoWeb {
  state: string;
  nonce: string;
  /** El rol que estaba marcado en Ingreso o Crear cuenta, para dejarlo elegido al volver. */
  rol: RolAcceso | null;
}

/** El nonce que Google copió dentro del id_token (sin verificar la firma: eso lo hace la API). */
export function nonceDeIdToken(idToken: string): string | null {
  const tramo = idToken.split('.')[1];
  if (!tramo) return null;
  try {
    const base64 = tramo.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(tramo.length / 4) * 4, '=');
    const datos = JSON.parse(globalThis.atob(base64)) as { nonce?: unknown };
    return typeof datos.nonce === 'string' ? datos.nonce : null;
  } catch {
    return null;
  }
}

/**
 * Lee el fragmento con que Google vuelve a /ingreso (`#state=...&id_token=...` o `#error=...`).
 * Sin nada de Google en el fragmento, 'nada'. Un state o un nonce que no son los guardados se
 * rechazan: así un enlace armado por otro no deja a nadie dentro de una cuenta ajena.
 */
export function leerRetornoWeb(fragmento: string, guardado: IntentoWeb | null): LecturaAutorizacion {
  const p = new URLSearchParams(fragmento.replace(/^#/, ''));
  if (!p.has('state') && !p.has('id_token') && !p.has('error')) return { tipo: 'nada' };
  if (!guardado || p.get('state') !== guardado.state) return { tipo: 'fallo', fallo: 'estado' };
  const error = p.get('error');
  if (error) return { tipo: 'fallo', fallo: error === 'access_denied' ? 'cancelado' : 'proveedor' };
  const idToken = p.get('id_token');
  if (!idToken) return { tipo: 'fallo', fallo: 'proveedor' };
  if (nonceDeIdToken(idToken) !== guardado.nonce) return { tipo: 'fallo', fallo: 'estado' };
  return { tipo: 'token', idToken };
}

// ── Mensajes ─────────────────────────────────────────────────────────────────
export type CampoCuentaGoogle = keyof FormCuentaGoogle;

export type ResultadoErrorGoogle =
  | { tipo: 'mensaje'; mensaje: MensajePantalla }
  | { tipo: 'bloqueo'; mensaje: MensajePantalla; esperaS: number }
  | { tipo: 'campo'; campo: CampoCuentaGoogle; mensaje: string };

const peligro = (titulo: string, texto: string): MensajePantalla => ({ titulo, texto, tono: 'peligro' });

export const MENSAJES_GOOGLE = {
  cancelado: { titulo: 'Ingreso con Google cancelado', texto: 'No se hizo nada. Puedes intentarlo de nuevo o usar tu correo.', tono: 'neutro' },
  red: { titulo: 'Sin conexión', texto: 'Para continuar con Google necesitas internet. Revisa la señal o el wifi e intenta de nuevo.', tono: 'neutro' },
  sinVerificar: peligro(
    'Tu correo de Google no está verificado',
    'Verifica el correo en tu cuenta de Google y vuelve a intentar, o crea tu cuenta con correo y contraseña.',
  ),
  token: peligro('No pudimos confirmar tu cuenta de Google', 'Vuelve a tocar «Continuar con Google». Si sigue pasando, usa tu correo.'),
  estado: peligro('No pudimos terminar el ingreso con Google', 'Vuelve a tocar «Continuar con Google» desde esta pantalla.'),
  proveedor: peligro('Google no respondió bien', 'Vuelve a intentar en un momento o usa tu correo.'),
  noDisponible: peligro('Google no está disponible', 'El ingreso con Google no está disponible ahora. Usa tu correo y contraseña.'),
  bloqueo: peligro('Demasiados intentos', 'Por seguridad, espera un minuto antes de volver a intentar.'),
  borrada: peligro('Esta cuenta está por borrarse', 'Pediste borrar tu cuenta y ya no se puede ingresar con ella. Si fue un error, escríbenos.'),
  otro: peligro('No pudimos continuar con Google', 'Algo falló de nuestro lado. Intenta de nuevo en un momento.'),
} as const satisfies Record<string, MensajePantalla>;

/** El mensaje de una falla que pasó antes de llamar a la API. */
export function mensajeDeFallo(f: FalloGoogle): MensajePantalla {
  return f === 'cancelado' ? MENSAJES_GOOGLE.cancelado : f === 'red' ? MENSAJES_GOOGLE.red : f === 'estado' ? MENSAJES_GOOGLE.estado : MENSAJES_GOOGLE.proveedor;
}

const CAMPOS: Record<string, CampoCuentaGoogle> = { rol: 'rol', nombre: 'nombre', apellido: 'apellido' };

/** Qué muestra la pantalla cuando falla POST /v1/auth/google. */
export function errorDeGoogle(e: unknown): ResultadoErrorGoogle {
  if (esErrorDeRed(e)) return { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.red };
  const forma = campoDeErrorDeForma(e);
  // El motivo es el texto de la misma regla de la API («Tu nombre solo puede tener letras...»).
  const motivo = detalleDeError(e).motivo ?? 'Revisa este dato.';
  if (forma !== null) {
    const campo = CAMPOS[forma];
    return campo ? { tipo: 'campo', campo, mensaje: motivo } : { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.token };
  }
  if (!(e instanceof ErrorDeApi)) return { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.otro };
  const d = e.detalles ?? {};
  switch (e.codigo) {
    case 'VALIDATION_ERROR': {
      const campo = CAMPOS[String(d.campo ?? '')];
      return campo ? { tipo: 'campo', campo, mensaje: motivo } : { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.token };
    }
    case 'BUSINESS_RULE':
      return { tipo: 'mensaje', mensaje: d.regla === 'google_correo_sin_verificar' ? MENSAJES_GOOGLE.sinVerificar : MENSAJES_GOOGLE.otro };
    case 'INVALID_CREDENTIALS':
      // Un client ID que la API no conoce es un problema de configuración, no de la persona.
      return { tipo: 'mensaje', mensaje: d.motivo === 'cliente_ajeno' ? MENSAJES_GOOGLE.noDisponible : MENSAJES_GOOGLE.token };
    case 'ACCOUNT_DELETED':
      return { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.borrada };
    case 'RATE_LIMITED':
      return { tipo: 'bloqueo', mensaje: MENSAJES_GOOGLE.bloqueo, esperaS: e.reintentarEnS ?? ESPERA_POR_DEFECTO_S };
    case 'SERVICE_UNAVAILABLE':
      return { tipo: 'mensaje', mensaje: d.motivo === 'google_no_configurado' ? MENSAJES_GOOGLE.noDisponible : MENSAJES_GOOGLE.proveedor };
    default:
      return { tipo: 'mensaje', mensaje: MENSAJES_GOOGLE.otro };
  }
}

// ── Paso «Completa tu cuenta» ────────────────────────────────────────────────
/** El formulario lleno con lo que dice Google y el rol que ya estaba marcado. */
export function formDesdePerfil(perfil: PerfilGoogle, rol: RolAcceso | null): FormCuentaGoogle {
  return { rol, nombre: perfil.nombre.trim(), apellido: perfil.apellido.trim() };
}
