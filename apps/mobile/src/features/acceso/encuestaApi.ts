// ─────────────────────────────────────────────────────────────────────────────
// Llamadas de la encuesta · Zona: Acceso
//
// Qué hace: las tres llamadas de la Encuesta inicial y cómo se lee lo que responden:
// - comprobar el código del entrenador en la pregunta 10 (para mostrar su nombre antes de
//   aceptar, como pide CU-12 por ser datos de salud);
// - POST /v1/me/survey con las 10 respuestas y el consentimiento (EP-09);
// - POST /v1/me/trainer/link con el código, si la encuesta no dejó el vínculo hecho (EP-18).
// Un error de la API sobre una respuesta lleva a esa pregunta; uno de red o del servidor deja
// la encuesta en «No pudimos guardar» con las respuestas intactas (APP-014).
// Tócalo cuando: cambie una de estas rutas o su respuesta en packages/shared/src/api.
// No lo toques para: las reglas de cada pregunta (encuesta.ts).
// Depende de: @gymtrack/shared (ErrorDeApi), ./encuesta y ./errores. Recibe el gestor de la
// sesión por parámetro (solo usa `llamar`), así se prueba en Node con uno falso.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import {
  MENSAJE_CODIGO_INVALIDO,
  preguntaDeCampo,
  PREGUNTAS,
  EDAD_MINIMA,
  type AccionEncuesta,
  type CuerpoEncuesta,
  type Entrenador,
  type EstadoCodigo,
} from './encuesta';
import { esErrorDeRed } from './errores';

/** Lo que estas llamadas usan del gestor de sesión (useSesion().api cumple). */
export interface Llamador {
  llamar<T = unknown>(metodo: string, ruta: string, op?: { cuerpo?: unknown }): Promise<T>;
}

export const RUTA_ENCUESTA = '/v1/me/survey';
export const RUTA_VINCULAR = '/v1/me/trainer/link';
/**
 * Vista previa del código: POST /v1/me/trainer/link con `vista_previa: true` devuelve a qué
 * entrenador pertenece sin vincular (RUTAS_PERFIL.vincular). Cuenta para el tope de P-27.
 */
export const RUTA_COMPROBAR_CODIGO = RUTA_VINCULAR;

const INDICE_CODIGO = PREGUNTAS.findIndex((p) => p.id === 'codigo');
const INDICE_NACIMIENTO = PREGUNTAS.findIndex((p) => p.id === 'nacimiento');

// ── Código del entrenador ────────────────────────────────────────────────────
/** Saca el nombre del entrenador de la respuesta, venga como `entrenador`, `trainer` o suelto. */
export function leerEntrenador(json: unknown): Entrenador | null {
  if (!json || typeof json !== 'object') return null;
  const o = json as Record<string, unknown>;
  const e = (o.entrenador ?? o.trainer ?? o) as Record<string, unknown> | null;
  if (!e || typeof e !== 'object' || typeof e.nombre !== 'string') return null;
  return { nombre: e.nombre, apellido: typeof e.apellido === 'string' ? e.apellido : '' };
}

/** El estado del código según lo que lanzó la llamada (APP-013). */
export function estadoCodigoDeError(e: unknown): EstadoCodigo {
  if (esErrorDeRed(e) || !(e instanceof ErrorDeApi)) return { tipo: 'sin-comprobar' };
  switch (e.codigo) {
    case 'INVITATION_NOT_FOUND':
      return { tipo: 'error', mensaje: MENSAJE_CODIGO_INVALIDO };
    case 'INVITATION_USED':
      return { tipo: 'error', mensaje: 'Ese código ya se usó. Pídele uno nuevo a tu entrenador o sigue sin él.' };
    case 'ALREADY_LINKED':
      return { tipo: 'error', mensaje: 'Ya tienes entrenador. Sigue sin código; lo ves en tu perfil.' };
    case 'RATE_LIMITED':
      return { tipo: 'error', mensaje: 'Probaste muchos códigos seguidos. Espera un momento y vuelve a escribirlo, o sigue sin él.' };
    default:
      // NOT_FOUND genérico (la ruta todavía no existe), 5xx: se revisa al terminar.
      return { tipo: 'sin-comprobar' };
  }
}

export async function comprobarCodigo(api: Llamador, codigo: string): Promise<EstadoCodigo> {
  try {
    const json = await api.llamar<unknown>('POST', RUTA_COMPROBAR_CODIGO, { cuerpo: { codigo, vista_previa: true } });
    const entrenador = leerEntrenador(json);
    return entrenador ? { tipo: 'valido', entrenador } : { tipo: 'sin-comprobar' };
  } catch (e) {
    return estadoCodigoDeError(e);
  }
}

// ── Guardar ──────────────────────────────────────────────────────────────────
export function enviarEncuesta(api: Llamador, cuerpo: CuerpoEncuesta): Promise<unknown> {
  return api.llamar('POST', RUTA_ENCUESTA, { cuerpo });
}

/** La acción para el reductor cuando POST /me/survey falla (APP-014). */
export function falloDeEncuesta(e: unknown): Extract<AccionEncuesta, { tipo: 'falloGuardar' }> {
  if (!(e instanceof ErrorDeApi)) return { tipo: 'falloGuardar' };
  if (e.codigo === 'INVITATION_NOT_FOUND' || e.codigo === 'INVITATION_USED' || e.codigo === 'ALREADY_LINKED') {
    return { tipo: 'falloGuardar', irA: INDICE_CODIGO, codigo: estadoCodigoDeError(e) };
  }
  const campo = typeof e.detalles?.campo === 'string' ? e.detalles.campo : '';
  if (e.codigo === 'BUSINESS_RULE' && (campo === '' || campo.includes('fecha_nacimiento'))) {
    return { tipo: 'falloGuardar', irA: INDICE_NACIMIENTO, err: `Para usar GymTrack necesitas tener ${EDAD_MINIMA} años o más.` };
  }
  if (e.codigo === 'VALIDATION_ERROR' || e.codigo === 'BUSINESS_RULE') {
    const i = preguntaDeCampo(campo);
    if (i != null && i >= 0) return { tipo: 'falloGuardar', irA: i, err: 'Revisa esta respuesta: no la pudimos guardar así.' };
  }
  return { tipo: 'falloGuardar' };
}

// ── Vincular después de guardar ──────────────────────────────────────────────
export type ResultadoVinculo = 'vinculado' | 'fallo';

/** Vincula con el código de la pregunta 10. «Ya vinculado» cuenta como hecho. */
export async function vincular(api: Llamador, codigo: string): Promise<ResultadoVinculo> {
  try {
    await api.llamar('POST', RUTA_VINCULAR, { cuerpo: { codigo } });
    return 'vinculado';
  } catch (e) {
    return e instanceof ErrorDeApi && e.codigo === 'ALREADY_LINKED' ? 'vinculado' : 'fallo';
  }
}
