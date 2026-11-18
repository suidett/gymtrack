// ─────────────────────────────────────────────────────────────────────────────
// Llamadas a la API del alumno · Zona: Alumno
//
// Qué hace: una función por ruta de §API que usan Rutinas, Ejercicios, Progreso, Perfil y
// Motivos. Todas pasan por `api.llamar` de la sesión (pone el token, renueva y repite ante un
// 401) y devuelven los tipos de ./datos ya normalizados. Las rutas salen del PRD (§API) porque el
// contrato de packages/shared/src/api de estos módulos se está llenando en paralelo: cuando esté,
// conviene cambiar los textos de ruta por `RUTAS_*.x.ruta`.
// Tócalo cuando: cambie una ruta, un cuerpo o se necesite una llamada nueva.
// No lo toques para: leer un campo nuevo de la respuesta (va en ./datos.ts).
// Depende de: @/lib/sesion (api) y ./datos.
// ─────────────────────────────────────────────────────────────────────────────
import { api, ErrorDeApi, esSinConexion } from '@/lib/sesion';
import {
  aAlerta,
  aConsejos,
  aEjercicio,
  aFotos,
  aHistorial,
  aInvitacion,
  aMedidas,
  aObservacion,
  aRecords,
  aRutina,
  aSemanas,
  desenvolver,
  lista,
  numero,
  siguienteCursor,
  texto,
  type Alerta,
  type Ejercicio,
  type Invitacion,
  type Rutina,
} from './datos';

/** El texto que se muestra cuando una acción falla. */
export function mensajeDeError(e: unknown): string {
  if (esSinConexion(e)) return 'Sin conexión. Inténtalo cuando vuelva la señal.';
  if (e instanceof ErrorDeApi && e.message) return e.message;
  return 'Algo falló. Inténtalo de nuevo.';
}

type Consulta = Record<string, string | number | boolean | undefined | null>;

/** Junta todas las páginas de una lista por cursor (hasta 10 páginas de 100). */
async function todas(ruta: string, consulta: Consulta = {}): Promise<unknown[]> {
  const items: unknown[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 10; i++) {
    const r: unknown = await api.llamar('GET', ruta, { consulta: { ...consulta, limit: 100, cursor: cursor ?? undefined } });
    items.push(...lista(r));
    cursor = siguienteCursor(r);
    if (!cursor) break;
  }
  return items;
}

// ── Rutinas ──────────────────────────────────────────────────────────────────
export async function listarRutinas(): Promise<Rutina[]> {
  return (await todas('/v1/routines')).map(aRutina);
}

export async function leerRutina(id: string): Promise<Rutina> {
  return aRutina(await api.llamar('GET', `/v1/routines/${id}`));
}

export async function crearRutina(cuerpo: object): Promise<Rutina> {
  return aRutina(await api.llamar('POST', '/v1/routines', { cuerpo }));
}

export async function cambiarRutina(id: string, cuerpo: { nombre: string; metodo_progresion: string; semanas: number }) {
  return api.llamar('PATCH', `/v1/routines/${id}`, { cuerpo });
}

export async function reemplazarDias(id: string, dias: object[]) {
  return api.llamar('PUT', `/v1/routines/${id}/days`, { cuerpo: { dias } });
}

export async function activarRutina(id: string) {
  return api.llamar('POST', `/v1/routines/${id}/activate`);
}

export async function duplicarRutina(id: string): Promise<Rutina> {
  return aRutina(await api.llamar('POST', `/v1/routines/${id}/duplicate`));
}

/** Archiva (o borra el borrador que nunca se usó; lo decide la API). */
export async function archivarRutina(id: string) {
  return api.llamar('DELETE', `/v1/routines/${id}`);
}

/** POST /routines/:id/assign va de a un cliente (esquemaAsignarRutina): crea una copia para cada uno (P-43). */
export async function asignarRutina(id: string, clientIds: string[], activar = false) {
  const copias: unknown[] = [];
  for (const client_id of clientIds) {
    copias.push(await api.llamar('POST', `/v1/routines/${id}/assign`, { cuerpo: { client_id, activar } }));
  }
  return copias;
}

// ── Ejercicios ───────────────────────────────────────────────────────────────
export async function listarEjercicios(): Promise<Ejercicio[]> {
  return (await todas('/v1/exercises')).map(aEjercicio);
}

export async function leerEjercicio(id: string): Promise<Ejercicio> {
  return aEjercicio(await api.llamar('GET', `/v1/exercises/${id}`));
}

export async function crearEjercicio(cuerpo: object): Promise<Ejercicio> {
  return aEjercicio(await api.llamar('POST', '/v1/exercises', { cuerpo }));
}

export async function cambiarEjercicio(id: string, cuerpo: object): Promise<Ejercicio> {
  return aEjercicio(await api.llamar('PATCH', `/v1/exercises/${id}`, { cuerpo }));
}

/** Serie de 1RM estimado y mejor serie por sesión (26 semanas). */
export async function historialEjercicio(id: string, clientId?: string) {
  return aHistorial(await api.llamar('GET', `/v1/me/progress/exercises/${id}`, { consulta: { client_id: clientId } }));
}

export async function observacionesDe(exerciseId: string) {
  return (await todas('/v1/observations', { exercise_id: exerciseId })).map(aObservacion);
}

export async function crearObservacion(cuerpo: {
  tipo: 'observacion' | 'dolor' | 'consejo';
  exercise_id: string;
  texto: string;
  dolor_zona?: string;
  dolor_intensidad?: number;
}) {
  return aObservacion(desenvolver(await api.llamar('POST', '/v1/observations', { cuerpo }), 'observation', 'observacion'));
}

// ── Progreso ─────────────────────────────────────────────────────────────────
export async function volumenSemanas(semanas = 8) {
  return aSemanas(await api.llamar('GET', '/v1/me/progress/volume', { consulta: { weeks: semanas } }));
}

export async function recordsVigentes() {
  return aRecords(await api.llamar('GET', '/v1/me/prs'));
}

export async function medidasCorporales() {
  return aMedidas(await todas('/v1/me/body-metrics'));
}

/** Una fila por día: la segunda del mismo día reemplaza (§Modelo). */
export async function registrarMedida(cuerpo: object) {
  return api.llamar('POST', '/v1/me/body-metrics', { cuerpo });
}

export async function fotosProgreso() {
  return aFotos(await todas('/v1/me/photos'));
}

// ── Perfil ───────────────────────────────────────────────────────────────────
export async function cambiarPerfil(cuerpo: object) {
  return api.llamar('PATCH', '/v1/me', { cuerpo });
}

/** Lo que muestra la cabeza del perfil del alumno; sale de GET /me/today. */
export async function cifrasAlumno(): Promise<{ sesiones: number | null; racha: number | null; adherencia: number | null }> {
  const r = desenvolver(await api.llamar('GET', '/v1/me/today'));
  const mes = desenvolver(r.mes ?? r.cifras ?? {});
  return {
    sesiones: numero(r.sesiones_total ?? r.total_sesiones ?? mes.sesiones_total),
    racha: numero(r.racha_dias ?? r.racha ?? mes.racha),
    adherencia: numero(r.adherencia_4_semanas ?? r.adherencia_pct ?? mes.adherencia_pct),
  };
}

/** Lo que muestra la cabeza del perfil del entrenador; sale de GET /trainer/clients. */
export async function cifrasEntrenador(): Promise<{ clientes: number; conRutina: number; adherencia: number | null }> {
  const items = await todas('/v1/trainer/clients');
  let con = 0;
  let suma = 0;
  let n = 0;
  for (const c of items) {
    const o = desenvolver(c);
    const sinRutina = o.sin_rutina === true || (o.rutina_activa === null && o.sin_rutina !== false);
    if (!sinRutina) con++;
    const a = numero(o.adherencia_semana ?? o.adherencia_pct ?? o.adherencia);
    if (a !== null) {
      suma += a <= 1 ? a * 100 : a;
      n++;
    }
  }
  return { clientes: items.length, conRutina: con, adherencia: n ? Math.round(suma / n) : null };
}

/** Clientes vinculados del entrenador, para la hoja de asignar. */
export async function clientesEntrenador(): Promise<{ id: string; nombre: string; rutina: string | null; rutinaId: string | null }[]> {
  return (await todas('/v1/trainer/clients')).map((c) => {
    const o = desenvolver(c);
    const u = desenvolver(o.cliente ?? o.client ?? o.usuario ?? o);
    const r = desenvolver(o.rutina_activa ?? {});
    return {
      id: texto(o.client_id ?? u.id ?? o.id),
      nombre: [texto(u.nombre), texto(u.apellido)].filter(Boolean).join(' ') || 'Cliente',
      rutina: texto(r.nombre) || null,
      rutinaId: texto(r.id) || null,
    };
  });
}

export async function vincularConCodigo(codigo: string): Promise<string | null> {
  const r = desenvolver(await api.llamar('POST', '/v1/me/trainer/link', { cuerpo: { codigo } }));
  const e = desenvolver(r.entrenador ?? r.trainer ?? {});
  return [texto(e.nombre), texto(e.apellido)].filter(Boolean).join(' ') || null;
}

export async function desvincular() {
  return api.llamar('DELETE', '/v1/me/trainer');
}

/** GET /me/export: la URL firmada del ZIP. */
export async function exportarDatos(): Promise<string | null> {
  const r = desenvolver(await api.llamar('GET', '/v1/me/export'));
  return texto(r.url ?? r.url_firmada) || null;
}

export async function borrarCuenta() {
  return api.llamar('DELETE', '/v1/me');
}

export async function generarInvitacion(): Promise<Invitacion | null> {
  return aInvitacion(await api.llamar('POST', '/v1/trainer/invitations'));
}

// ── Alertas y motivos ────────────────────────────────────────────────────────
export async function alertasPropias(): Promise<Alerta[]> {
  return (await todas('/v1/me/alerts')).map(aAlerta);
}

export async function enviarMotivos(cuerpo: { alert_id: string; motivos: string[]; comentario?: string }) {
  return aConsejos(await api.llamar('POST', '/v1/me/drop-reports', { cuerpo }));
}
