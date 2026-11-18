// ─────────────────────────────────────────────────────────────────────────────
// Validación de los formularios de acceso · Zona: Acceso
//
// Qué hace: revisa en el teléfono, antes de llamar a la API, lo que se escribe en Ingreso,
// Crear cuenta, Recuperar y «Completa tu cuenta» (después de Google): correo (con los tres
// mensajes de las maquetas), contraseña, nombre, apellido y rol. También arma la línea de la regla de la contraseña («Al menos 8
// caracteres · te faltan 2») que se ve en Crear cuenta y en Nueva contraseña.
// Es lógica pura, sin React: se prueba en Node (APP-001, APP-006).
// Tócalo cuando: cambie un texto de error de las maquetas o una regla de los campos.
// No lo toques para: la regla del servidor (packages/shared/src/api/cuentas.ts); el mínimo de
// caracteres sale de ahí (CONTRASENA_MIN) para que la app y la API digan lo mismo.
// Depende de: @gymtrack/shared (CONTRASENA_MIN, CONTRASENA_MAX).
// ─────────────────────────────────────────────────────────────────────────────
import { CONTRASENA_MAX, CONTRASENA_MIN } from '@gymtrack/shared';

export const MINIMO_CONTRASENA = CONTRASENA_MIN;

/** Rol como lo dicen las pantallas de acceso. La API dice 'client' y 'trainer'. */
export type RolAcceso = 'cliente' | 'entrenador';

export const rolApi = (r: RolAcceso): 'client' | 'trainer' => (r === 'entrenador' ? 'trainer' : 'client');

// ── Correo ───────────────────────────────────────────────────────────────────
const FORMA_CORREO = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/** El error del correo, o null si sirve. Los tres textos son los de las maquetas. */
export function errorCorreo(texto: string): string | null {
  const c = texto.trim();
  if (!c) return 'Escribe tu correo.';
  if (!c.includes('@')) return 'Revisa el correo: le falta la @.';
  if (!FORMA_CORREO.test(c)) return 'Revisa el correo: le falta el final, como .cl o .com.';
  if (c.length > 254) return 'El correo es demasiado largo.';
  return null;
}

/** El correo como lo guarda la API: sin espacios y en minúsculas. */
export const limpiarCorreo = (texto: string) => texto.trim().toLowerCase();

// ── Contraseña ───────────────────────────────────────────────────────────────
export interface Regla {
  cumple: boolean;
  /** «Al menos 8 caracteres» o, con error, «Al menos 8 caracteres · te faltan 2». */
  texto: string;
  /** «6/8» mientras no se cumple; null cuando ya se cumple. */
  cuenta: string | null;
  /** Lo que lee el lector de pantalla para la cuenta («6 de 8»). */
  cuentaVoz: string | null;
}

/** La regla visible de la contraseña. `conError` es true después de intentar enviar. */
export function reglaContrasena(clave: string, conError: boolean): Regla {
  const n = clave.length;
  const cumple = n >= MINIMO_CONTRASENA;
  const falta = MINIMO_CONTRASENA - n;
  const base = `Al menos ${MINIMO_CONTRASENA} caracteres`;
  const texto = !cumple && conError ? `${base} · te ${falta === 1 ? 'falta 1' : `faltan ${falta}`}` : base;
  return {
    cumple,
    texto,
    cuenta: cumple ? null : `${n}/${MINIMO_CONTRASENA}`,
    cuentaVoz: cumple ? null : `${n} de ${MINIMO_CONTRASENA}`,
  };
}

/** Error de la contraseña nueva (registro y restablecer), o null. */
export function errorContrasenaNueva(clave: string): string | null {
  if (clave.length < MINIMO_CONTRASENA) return 'corta';
  if (clave.length > CONTRASENA_MAX) return `La contraseña puede tener hasta ${CONTRASENA_MAX} caracteres.`;
  return null;
}

// ── Formularios ──────────────────────────────────────────────────────────────
export type Errores<K extends string> = Partial<Record<K, string>>;

export interface FormIngreso {
  correo: string;
  clave: string;
}

/** Ingreso: solo se exige que venga algo en la contraseña (una vieja más corta tiene que dar 401). */
export function validarIngreso(f: FormIngreso): Errores<keyof FormIngreso> {
  const err: Errores<keyof FormIngreso> = {};
  const c = errorCorreo(f.correo);
  if (c) err.correo = c;
  if (!f.clave) err.clave = 'Escribe tu contraseña.';
  else if (f.clave.length > CONTRASENA_MAX) err.clave = `La contraseña puede tener hasta ${CONTRASENA_MAX} caracteres.`;
  return err;
}

export interface FormRegistro {
  rol: RolAcceso | null;
  nombre: string;
  apellido: string;
  correo: string;
  clave: string;
}

export type CampoRegistro = keyof FormRegistro;

/** El error de un nombre o un apellido (1 a 80 caracteres sin contar los espacios de los bordes). */
function errorNombre(texto: string, que: 'nombre' | 'apellido'): string | null {
  const t = texto.trim();
  if (!t) return `Escribe tu ${que}.`;
  if (t.length > 80) return `Tu ${que} puede tener hasta 80 caracteres.`;
  return null;
}

/** Crear cuenta. El error de la contraseña corta es 'corta': lo dibuja la regla, no un texto aparte. */
export function validarRegistro(f: FormRegistro): Errores<CampoRegistro> {
  const err: Errores<CampoRegistro> = {};
  if (!f.rol) err.rol = 'Elige cómo vas a usar GymTrack.';
  const n = errorNombre(f.nombre, 'nombre');
  if (n) err.nombre = n;
  const a = errorNombre(f.apellido, 'apellido');
  if (a) err.apellido = a;
  const c = errorCorreo(f.correo);
  if (c) err.correo = c;
  const k = errorContrasenaNueva(f.clave);
  if (k) err.clave = k;
  return err;
}

/** «Completa tu cuenta» después de Google: el correo y la contraseña no se piden. */
export interface FormCuentaGoogle {
  rol: RolAcceso | null;
  nombre: string;
  apellido: string;
}

export function validarCuentaGoogle(f: FormCuentaGoogle): Errores<keyof FormCuentaGoogle> {
  const err: Errores<keyof FormCuentaGoogle> = {};
  if (!f.rol) err.rol = 'Elige cómo vas a usar GymTrack.';
  const n = errorNombre(f.nombre, 'nombre');
  if (n) err.nombre = n;
  const a = errorNombre(f.apellido, 'apellido');
  if (a) err.apellido = a;
  return err;
}

export const ORDEN_CUENTA_GOOGLE: (keyof FormCuentaGoogle)[] = ['rol', 'nombre', 'apellido'];

export const sinErrores = (e: object) => Object.keys(e).length === 0;

/** El orden en que se recorren los campos para llevar el foco al primero con error. */
export const ORDEN_REGISTRO: CampoRegistro[] = ['rol', 'nombre', 'apellido', 'correo', 'clave'];

export function primerError<K extends string>(err: Errores<K>, orden: readonly K[]): K | null {
  return orden.find((k) => err[k]) ?? null;
}
