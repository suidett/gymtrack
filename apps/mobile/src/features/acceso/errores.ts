// ─────────────────────────────────────────────────────────────────────────────
// Errores de la API en las pantallas de acceso · Zona: Acceso
//
// Qué hace: traduce lo que lanza una llamada (ErrorDeApi con su código del catálogo, o el error
// de red de fetch) al estado que muestra cada pantalla: el mensaje con barra de Ingreso
// («No pudimos ingresar», «Sin conexión», «Demasiados intentos»), el error bajo el correo de
// Crear cuenta y los pasos de Recuperar (límite de envíos, enlace vencido). Se decide por el
// código, nunca por el texto que manda la API (plan de validación, regla 4).
// Es lógica pura: se prueba en Node (APP-002, APP-003, APP-004, APP-007, APP-009, APP-010).
// Tócalo cuando: la API sume un código que estas pantallas tengan que mostrar distinto.
// No lo toques para: los textos de validación local (validacion.ts).
// Depende de: @gymtrack/shared (ErrorDeApi, CodigoError).
// ─────────────────────────────────────────────────────────────────────────────
import { detalleDeError, ErrorDeApi, type CodigoError } from '@gymtrack/shared';

/** Espera por defecto si un 429 llega sin Retry-After: el límite de ingreso es por minuto. */
export const ESPERA_POR_DEFECTO_S = 60;

/** true si fetch no llegó a la API (sin señal, sin wifi, API caída sin respuesta). */
export function esErrorDeRed(e: unknown): boolean {
  return !(e instanceof ErrorDeApi) && e instanceof Error && (e.name === 'TypeError' || /network/i.test(e.message));
}

const codigoDe = (e: unknown): CodigoError | null => (e instanceof ErrorDeApi ? e.codigo : null);

/**
 * El cliente de cuentas valida con Zod antes de salir: si algo no pasa (un correo que la regla
 * local dejó pasar), lanza un ZodError sin llamar a la API. Devuelve el campo de la API que
 * falló ('email', 'password', 'nombre'...) o null si el error no es de forma.
 */
export function campoDeErrorDeForma(e: unknown): string | null {
  if (!(e instanceof Error) || e.name !== 'ZodError') return null;
  const issues = (e as Error & { issues?: { path?: PropertyKey[] }[] }).issues;
  return String(issues?.[0]?.path?.[0] ?? '');
}

export const TEXTO_CORREO_FORMATO = 'Revisa el correo: no tiene el formato nombre@dominio.';

// ── Mensaje con barra (Ingreso, Encuesta) ────────────────────────────────────
export interface MensajePantalla {
  titulo: string;
  texto: string;
  /** 'neutro' pinta la barra gris (sin conexión); 'peligro', en rojo. */
  tono: 'peligro' | 'neutro';
}

export const MENSAJE_SIN_RED_INGRESO: MensajePantalla = {
  titulo: 'Sin conexión',
  texto: 'Para ingresar necesitas internet. Revisa la señal o el wifi e intenta de nuevo.',
  tono: 'neutro',
};

// ── Ingreso ──────────────────────────────────────────────────────────────────
export type ResultadoErrorIngreso =
  | { tipo: 'credenciales'; mensaje: MensajePantalla }
  | { tipo: 'bloqueo'; mensaje: MensajePantalla; esperaS: number }
  | { tipo: 'red'; mensaje: MensajePantalla }
  | { tipo: 'correo'; texto: string }
  | { tipo: 'otro'; mensaje: MensajePantalla };

/**
 * Qué muestra Ingreso cuando falla. Las credenciales malas no dicen cuál de los dos campos está
 * mal (APP-002); el 429 trae la espera de Retry-After (APP-003, P-42).
 */
export function errorDeIngreso(e: unknown): ResultadoErrorIngreso {
  if (esErrorDeRed(e)) return { tipo: 'red', mensaje: MENSAJE_SIN_RED_INGRESO };
  if (campoDeErrorDeForma(e) === 'email') return { tipo: 'correo', texto: TEXTO_CORREO_FORMATO };
  const codigo = codigoDe(e);
  if (codigo === 'VALIDATION_ERROR' && (e as ErrorDeApi).detalles?.campo === 'email') {
    return { tipo: 'correo', texto: TEXTO_CORREO_FORMATO };
  }
  if (codigo === 'INVALID_CREDENTIALS' || codigo === 'VALIDATION_ERROR') {
    return {
      tipo: 'credenciales',
      mensaje: {
        titulo: 'No pudimos ingresar',
        texto: 'El correo o la contraseña no coinciden. Revisa que estén bien escritos; con «Mostrar» ves la contraseña.',
        tono: 'peligro',
      },
    };
  }
  if (codigo === 'RATE_LIMITED') {
    const esperaS = (e as ErrorDeApi).reintentarEnS ?? ESPERA_POR_DEFECTO_S;
    return {
      tipo: 'bloqueo',
      esperaS,
      mensaje: {
        titulo: 'Demasiados intentos',
        texto: 'Por seguridad, espera un minuto antes de volver a intentar. Si no recuerdas tu contraseña, recupérala.',
        tono: 'peligro',
      },
    };
  }
  if (codigo === 'ACCOUNT_DELETED') {
    return {
      tipo: 'otro',
      mensaje: {
        titulo: 'Esta cuenta está por borrarse',
        texto: 'Pediste borrar tu cuenta y ya no se puede ingresar con ella. Si fue un error, escríbenos.',
        tono: 'peligro',
      },
    };
  }
  return {
    tipo: 'otro',
    mensaje: {
      titulo: 'No pudimos ingresar',
      texto: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.',
      tono: 'peligro',
    },
  };
}

/**
 * El formulario después de un error de ingreso: el correo queda escrito y, si las credenciales
 * no coinciden, la contraseña se borra (APP-002).
 */
export function formTrasErrorIngreso<F extends { correo: string; clave: string }>(f: F, r: ResultadoErrorIngreso): F {
  return r.tipo === 'credenciales' ? { ...f, clave: '' } : f;
}

// ── Crear cuenta ─────────────────────────────────────────────────────────────
export type ResultadoErrorRegistro =
  | { tipo: 'correo-usado' }
  | { tipo: 'campo'; campo: 'nombre' | 'apellido' | 'correo' | 'clave' | 'rol'; mensaje: string }
  | { tipo: 'bloqueo'; esperaS: number; mensaje: MensajePantalla }
  | { tipo: 'mensaje'; mensaje: MensajePantalla };

const CAMPOS_API: Record<string, 'nombre' | 'apellido' | 'correo' | 'clave' | 'rol'> = {
  nombre: 'nombre',
  apellido: 'apellido',
  email: 'correo',
  password: 'clave',
  rol: 'rol',
};

/** Texto del correo repetido (APP-007): va bajo el campo de correo. */
export const TEXTO_CORREO_USADO = 'Ya hay una cuenta con este correo.';

export function errorDeRegistro(e: unknown): ResultadoErrorRegistro {
  if (esErrorDeRed(e)) {
    return {
      tipo: 'mensaje',
      mensaje: {
        titulo: 'Sin conexión',
        texto: 'Para crear tu cuenta necesitas internet. Revisa la señal o el wifi e intenta de nuevo.',
        tono: 'neutro',
      },
    };
  }
  const forma = campoDeErrorDeForma(e);
  const codigo = codigoDe(e);
  if (codigo === 'EMAIL_TAKEN') return { tipo: 'correo-usado' };
  if (forma !== null || codigo === 'VALIDATION_ERROR') {
    const campo = CAMPOS_API[forma ?? String((e as ErrorDeApi).detalles?.campo ?? '')];
    // El motivo es el mismo texto de la regla (nombre con números, contraseña fácil de adivinar).
    const motivo = detalleDeError(e).motivo;
    if (campo) return { tipo: 'campo', campo, mensaje: campo === 'correo' ? TEXTO_CORREO_FORMATO : (motivo ?? 'Revisa este dato.') };
  }
  if (codigo === 'RATE_LIMITED') {
    return {
      tipo: 'bloqueo',
      esperaS: (e as ErrorDeApi).reintentarEnS ?? ESPERA_POR_DEFECTO_S,
      mensaje: { titulo: 'Demasiados intentos', texto: 'Por seguridad, espera un momento antes de volver a intentar.', tono: 'peligro' },
    };
  }
  return {
    tipo: 'mensaje',
    mensaje: { titulo: 'No pudimos crear tu cuenta', texto: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.', tono: 'peligro' },
  };
}

// ── Recuperar y restablecer ──────────────────────────────────────────────────
export type ResultadoErrorRecuperar =
  | { tipo: 'limite'; esperaS: number | null }
  | { tipo: 'red' }
  | { tipo: 'correo'; mensaje: string }
  | { tipo: 'otro' };

/** Pedir el enlace: 429 lleva a «Límite de envíos» (APP-009). */
export function errorDePedirEnlace(e: unknown): ResultadoErrorRecuperar {
  if (esErrorDeRed(e)) return { tipo: 'red' };
  const codigo = codigoDe(e);
  if (codigo === 'RATE_LIMITED') return { tipo: 'limite', esperaS: (e as ErrorDeApi).reintentarEnS ?? null };
  if (codigo === 'VALIDATION_ERROR' || campoDeErrorDeForma(e) !== null) return { tipo: 'correo', mensaje: TEXTO_CORREO_FORMATO };
  return { tipo: 'otro' };
}

export type ResultadoErrorRestablecer = { tipo: 'vencido' } | { tipo: 'clave'; mensaje: string } | { tipo: 'red' } | { tipo: 'otro' };

/** Guardar la contraseña nueva: un enlace vencido, usado o inventado da «Enlace vencido» (APP-010). */
export function errorDeRestablecer(e: unknown): ResultadoErrorRestablecer {
  if (esErrorDeRed(e)) return { tipo: 'red' };
  const codigo = codigoDe(e);
  if (codigo === 'RESET_TOKEN_INVALID') return { tipo: 'vencido' };
  const forma = campoDeErrorDeForma(e);
  if (codigo === 'VALIDATION_ERROR' || forma !== null) {
    const campo = forma ?? String((e as ErrorDeApi).detalles?.campo ?? '');
    if (campo === 'token') return { tipo: 'vencido' };
    return { tipo: 'clave', mensaje: detalleDeError(e).motivo ?? 'Revisa la contraseña: necesita entre 8 y 128 caracteres.' };
  }
  return { tipo: 'otro' };
}

// ── Formatos de tiempo ───────────────────────────────────────────────────────
/** Segundos como reloj: 48 → «0:48», 3725 → «1:02:05» (maqueta.js, fmtReloj). */
export function formatoReloj(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`;
}

/** Hora local corta, como en las maquetas: «10:41», «9:20». */
export function horaCorta(d: Date): string {
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Segundos que faltan hasta `finMs` (0 si ya pasó). */
export const restaHasta = (finMs: number, ahoraMs: number) => Math.max(0, Math.ceil((finMs - ahoraMs) / 1000));
