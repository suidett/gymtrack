// ─────────────────────────────────────────────────────────────────────────────
// Contrato de Entrenar en la app · Zona: Entrenar
//
// Qué hace: traduce entre la app y las rutas de entrenar de §API. Lee GET /me/today y la
// respuesta de POST /sessions/:id/finish con tolerancia (si falta un campo se usa un valor por
// defecto y si llega con otro nombre conocido se acepta), y arma los cuerpos de POST /sessions,
// PUT /sessions/:id/sets, POST /sessions/:id/finish y POST /observations con los campos del PRD
// (§Datos y el ejemplo de cerrar de §API).
// Los cuerpos siguen los esquemas estrictos de RUTAS_SESIONES (packages/shared/src/api/sesiones.ts)
// y __tests__/contrato.test.ts lo comprueba contra ellos. Los lectores siguen tolerantes para que
// una caché vieja del teléfono no rompa Hoy.
// Tócalo cuando: la API cambie un nombre de campo o una ruta de entrenar.
// No lo toques para: qué hace la app con los datos (sesionLocal.ts, cola.ts).
// Depende de: ./modelo y @gymtrack/shared (METODOS). Es puro.
// ─────────────────────────────────────────────────────────────────────────────
import { METODOS, type MetodoProgresion } from '@gymtrack/shared';
import { cifra } from './formato';
import type {
  DiaHoy,
  EjercicioHoy,
  Hoy,
  MarcaDia,
  PrVista,
  ResumenCierre,
  SesionLocal,
  SugerenciaVista,
  TipoObservacion,
  UltimaVezEj,
} from './modelo';

// ── Rutas ────────────────────────────────────────────────────────────────────
export const RUTAS_APP = {
  hoy: '/v1/me/today',
  crear: '/v1/sessions',
  series: (id: string) => `/v1/sessions/${id}/sets`,
  cerrar: (id: string) => `/v1/sessions/${id}/finish`,
  descartar: (id: string) => `/v1/sessions/${id}/discard`,
  observaciones: '/v1/observations',
} as const;

// ── Lectores tolerantes ──────────────────────────────────────────────────────
type Obj = Record<string, unknown>;
const esObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Obj => (esObj(v) ? v : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
/** El primer valor que no sea undefined ni null. */
const primero = (...vs: unknown[]): unknown => vs.find((v) => v !== undefined && v !== null);
function num(v: unknown, porDefecto: number): number {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : porDefecto;
}
function numONulo(v: unknown): number | null {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}
function texto(v: unknown, porDefecto = ''): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : porDefecto;
}
function textoONulo(v: unknown): string | null {
  return typeof v === 'string' && v !== '' ? v : null;
}

const METODOS_VALIDOS = new Set<string>(METODOS.map((m) => m.id));
function metodo(v: unknown): MetodoProgresion {
  return typeof v === 'string' && METODOS_VALIDOS.has(v) ? (v as MetodoProgresion) : 'doble_progresion';
}

// ── GET /me/today ────────────────────────────────────────────────────────────
/**
 * Forma esperada (snake_case, §API «Rutina del día con la sugerencia por ejercicio, sesión en
 * curso si hay, semana, racha, cifras del mes, última acción del entrenador»):
 * { racha_dias, rutina: { id, nombre, metodo_progresion, version, semana_actual, semanas } | null,
 *   dia: { routine_day_id, nombre, minutos_estimados, ejercicios: [{ routine_exercise_id,
 *   exercise_id, nombre, grupo, series, reps_min, reps_max, rir_objetivo, descanso_s,
 *   incremento_kg, peso_inicial_kg, sugerencia: { peso_kg, reps_min, reps_max, rir, texto },
 *   ultima_vez: { fecha, series: [{ peso_kg, reps }] }, record: { peso_kg, reps, fecha },
 *   nota_entrenador }] } | null, proximo_dia: (igual que dia, con fecha), sesion_en_curso:
 *   { id, routine_day_id, nombre, iniciada_at, series_hechas, series_total } | null,
 *   semana: { dias: ['hecho'|'toca'|'plan'|'descanso' x7], hoy, hechas, plan },
 *   mes: { sesiones, volumen_kg, prs }, entrenador: { nombre, apellido } | null,
 *   ultima_accion_entrenador: { texto, created_at, total } | null,
 *   peso_corporal: { peso_kg, fecha } | null }
 */
export function normalizarHoy(json: unknown): Hoy {
  const r = obj(json);
  const rutinaCruda = primero(r.rutina, r.rutina_activa);
  const rut = esObj(rutinaCruda) ? rutinaCruda : null;
  // esquemaHoyApi (shared/api/sesiones.ts) manda `semana` como lista de 7 días { fecha, dia_semana,
  // estado, es_hoy } y la semana de la rutina en rutina.semana; se aceptan también las formas viejas.
  const semanaLista = Array.isArray(r.semana) ? r.semana : undefined;
  const semanaRut = obj(r.semana);
  const semanaActual = numONulo(primero(semanaRut.actual, r.semana_actual, rut?.semana_actual, rut?.semana));
  const semanaTotal = numONulo(primero(semanaRut.total, r.semanas, rut?.semanas, rut?.semana_total));

  const diasCrudos = lista(primero(semanaLista, semanaRut.dias, r.semana_dias, r.dias_semana));
  const semana_dias: MarcaDia[] = Array.from({ length: 7 }, (_, i) => marcaDia(diasCrudos[i]));
  const hoyEnLista = diasCrudos.findIndex((d) => esObj(d) && d.es_hoy === true);
  const hoyIdx = numONulo(primero(semanaRut.hoy, r.semana_hoy, hoyEnLista >= 0 ? hoyEnLista : undefined));
  const hechas = numONulo(primero(semanaRut.hechas, r.semana_hechas));
  const plan = numONulo(primero(semanaRut.plan, r.semana_plan, r.semana_planificadas));

  const mes = obj(primero(r.mes, r.cifras_mes));
  const ent = obj(r.entrenador);
  const accion = obj(primero(r.ultima_accion_entrenador, r.ultima_accion));
  const peso = obj(primero(r.peso_corporal, r.ultimo_peso));
  const curso = obj(r.sesion_en_curso);
  const pesoKg = numONulo(primero(peso.peso_kg, peso.kg));

  return {
    racha_dias: num(primero(r.racha_dias, r.racha), 0),
    rutina: rut
      ? {
          id: texto(rut.id),
          nombre: texto(rut.nombre),
          metodo: metodo(primero(rut.metodo_progresion, rut.metodo)),
          version: numONulo(rut.version),
        }
      : null,
    semana: semanaActual !== null && semanaTotal !== null ? { actual: semanaActual, total: semanaTotal } : null,
    dia: normalizarDia(primero(r.dia, r.rutina_del_dia, r.dia_de_hoy)),
    proximo: normalizarDia(primero(r.proximo_dia, r.proximo)),
    sesion_en_curso: texto(curso.id)
      ? {
          id: texto(curso.id),
          routine_day_id: textoONulo(curso.routine_day_id),
          nombre: texto(primero(curso.nombre, curso.nombre_dia)),
          iniciada_at: textoONulo(curso.iniciada_at),
          series_hechas: num(primero(curso.series_hechas, curso.series_completadas), 0),
          series_total: num(curso.series_total, 0),
        }
      : null,
    semana_dias,
    semana_hoy: hoyIdx ?? 0,
    semana_cuenta: hechas !== null && plan !== null ? { hechas, plan } : null,
    mes: {
      sesiones: num(mes.sesiones, 0),
      volumen_kg: num(primero(mes.volumen_kg, mes.volumen), 0),
      prs: num(primero(mes.prs, mes.records), 0),
    },
    entrenador: texto(ent.nombre) ? { nombre: texto(ent.nombre), apellido: texto(ent.apellido) } : null,
    ultima_accion: texto(accion.texto)
      ? { texto: texto(accion.texto), created_at: textoONulo(accion.created_at), total: num(accion.total, 1) }
      : null,
    peso_corporal: pesoKg !== null && pesoKg > 0 ? { kg: pesoKg, fecha: textoONulo(peso.fecha) } : null,
  };
}

function marcaDia(v: unknown): MarcaDia {
  const t = esObj(v) ? texto(v.estado) : texto(v);
  return t === 'hecho' || t === 'toca' || t === 'plan' ? t : 'descanso';
}

function normalizarDia(v: unknown): DiaHoy | null {
  if (!esObj(v)) return null;
  const id = texto(primero(v.routine_day_id, v.id));
  if (!id) return null;
  return {
    routine_day_id: id,
    nombre: texto(v.nombre),
    ejercicios: lista(v.ejercicios).map(normalizarEjercicio).filter((e): e is EjercicioHoy => e !== null),
    minutos: numONulo(primero(v.minutos_estimados, v.minutos)),
    fecha: textoONulo(primero(v.fecha, v.fecha_sugerida)),
  };
}

function normalizarEjercicio(v: unknown): EjercicioHoy | null {
  if (!esObj(v)) return null;
  const ej = obj(v.ejercicio);
  const exerciseId = texto(primero(v.exercise_id, ej.id));
  if (!exerciseId) return null;
  const sug = obj(v.sugerencia);
  const repsMin = num(primero(sug.reps_min, v.reps_min), 8);
  const repsMax = Math.max(repsMin, num(primero(sug.reps_max, v.reps_max), repsMin));
  const ultima = normalizarUltima(primero(v.ultima_vez, v.ultima));
  // La API manda el peso más alto de la última vez como ultimo_peso_kg (esquemaEjercicioHoy).
  const ultimoPeso = numONulo(primero(ultima?.peso_kg, v.ultimo_peso_kg));
  const pesoHoy = numONulo(primero(sug.peso_kg, v.peso_sugerido_kg, v.peso_kg, ultimoPeso, v.peso_inicial_kg));
  const subeDeclarado = numONulo(v.sube_kg);
  const sube = subeDeclarado ?? (pesoHoy !== null && ultimoPeso !== null ? Math.max(0, pesoHoy - ultimoPeso) : 0);
  const rec = obj(primero(v.record, v.pr));
  const recPeso = numONulo(rec.peso_kg);
  return {
    routine_exercise_id: textoONulo(primero(v.routine_exercise_id, v.id)),
    exercise_id: exerciseId,
    nombre: texto(primero(v.nombre, ej.nombre), 'Ejercicio'),
    grupo: texto(primero(v.grupo, ej.grupo, v.grupo_muscular)),
    series: Math.max(1, num(v.series, 3)),
    reps_min: repsMin,
    reps_max: repsMax,
    rir_objetivo: num(primero(sug.rir, v.rir_objetivo, v.rir), 2),
    descanso_s: Math.max(0, num(v.descanso_s, 90)),
    incremento_kg: num(v.incremento_kg, 2.5),
    peso_kg: pesoHoy,
    sube_kg: Math.round(sube * 100) / 100,
    ultima,
    record: recPeso !== null ? { peso_kg: recPeso, reps: num(rec.reps, 0), fecha: textoONulo(rec.fecha) } : null,
    nota: textoONulo(primero(sug.nota, v.nota_entrenador, v.nota)),
  };
}

function normalizarUltima(v: unknown): UltimaVezEj | null {
  if (!esObj(v)) return null;
  const series = lista(v.series).map(obj);
  const reps = series.length ? series.map((s) => num(s.reps, 0)) : lista(v.reps).map((x) => num(x, 0));
  const pesos = series.map((s) => num(s.peso_kg, 0));
  const peso = numONulo(v.peso_kg) ?? (pesos.length ? Math.max(...pesos) : null);
  if (peso === null || reps.length === 0) return null;
  return { fecha: textoONulo(primero(v.fecha, v.cerrada_at)), peso_kg: peso, reps };
}

// ── POST /sessions/:id/finish ────────────────────────────────────────────────
/**
 * La respuesta del ejemplo de §API: { session: { series_completadas, volumen_kg, kcal_estimadas,
 * duracion_s }, prs: [{ exercise_id, nombre, tipo, valor, anterior }], sugerencias:
 * [{ routine_exercise_id, nombre, metodo, sugerencia: { peso_kg, reps_min, reps_max, rir }, texto }],
 * alertas_creadas, proxima_sesion: { routine_day_id, nombre, fecha_sugerida } }.
 * `local` es lo calculado en el teléfono: completa lo que el servidor no mande (series totales,
 * ejercicios incompletos) y da el motivo corto de cada sugerencia.
 */
export function normalizarCierre(json: unknown, local: ResumenCierre): ResumenCierre {
  const r = obj(json);
  const s = obj(primero(r.session, r.sesion));
  const prs: PrVista[] = lista(r.prs).map(obj).map((p) => {
    const valor = num(p.valor, 0);
    const anterior = numONulo(p.anterior);
    const peso = numONulo(p.peso_kg);
    const reps = numONulo(p.reps);
    const esE1rm = texto(p.tipo) === 'e1rm';
    const marca = peso !== null && reps !== null ? `${cifra(peso)} kg × ${reps}` : esE1rm ? `1RM ${cifra(valor)} kg` : cifra(valor);
    return {
      exercise_id: texto(p.exercise_id),
      nombre: texto(p.nombre),
      marca,
      antes: anterior !== null ? `antes ${cifra(anterior)}${esE1rm || peso !== null ? ' kg' : ''}` : null,
      diferencia: anterior !== null ? `+${cifra(Math.max(0, valor - anterior))}${esE1rm ? ' kg' : ''}` : null,
    };
  });
  const sugerencias: SugerenciaVista[] = lista(r.sugerencias).map(obj).map((g) => {
    const d = obj(g.sugerencia);
    const reId = textoONulo(g.routine_exercise_id);
    const deLocal = local.sugerencias.find((x) => reId !== null && x.routine_exercise_id === reId);
    const peso = numONulo(d.peso_kg);
    const pesoHoy = deLocal && deLocal.peso_kg !== null ? deLocal.peso_kg - deLocal.sube_kg : null;
    return {
      routine_exercise_id: reId,
      nombre: texto(g.nombre, deLocal?.nombre ?? ''),
      peso_kg: peso,
      sube_kg: peso !== null && pesoHoy !== null ? Math.max(0, Math.round((peso - pesoHoy) * 100) / 100) : 0,
      reps_min: num(d.reps_min, deLocal?.reps_min ?? 0),
      reps_max: num(d.reps_max, deLocal?.reps_max ?? 0),
      por: deLocal?.por ?? texto(g.texto),
    };
  });
  const prox = obj(primero(r.proxima_sesion, r.proxima));
  const kcal = numONulo(primero(s.kcal_estimadas, r.kcal_estimadas));
  return {
    series_hechas: num(primero(s.series_completadas, r.series_completadas), local.series_hechas),
    series_total: local.series_total,
    volumen_kg: num(primero(s.volumen_kg, r.volumen_kg), local.volumen_kg),
    duracion_s: num(primero(s.duracion_s, r.duracion_s), local.duracion_s),
    kcal: kcal !== null ? Math.round(kcal) : null,
    prs,
    sugerencias: sugerencias.length ? sugerencias : local.sugerencias,
    ejercicios_incompletos: local.ejercicios_incompletos,
    proxima: texto(prox.nombre)
      ? { routine_day_id: textoONulo(prox.routine_day_id), nombre: texto(prox.nombre), fecha: textoONulo(prox.fecha_sugerida) }
      : local.proxima,
  };
}

// ── Cuerpos que manda la app ─────────────────────────────────────────────────
export interface CuerpoCrear {
  id: string;
  routine_day_id: string;
  iniciada_at: string;
  device_id: string;
  /** La versión de la rutina que tenía el teléfono al empezar (SYNC-012). */
  routine_version?: number;
}

export interface SerieEnviada {
  id: string;
  exercise_id: string;
  routine_exercise_id: string | null;
  serie_n: number;
  peso_kg: number;
  reps: number;
  rir: number | null;
  completada: boolean;
  fallo: boolean;
}

export interface CuerpoSeries {
  series: SerieEnviada[];
}

export interface CuerpoCerrar {
  cerrada_at: string;
  duracion_s: number;
  observacion?: string;
  dolor_general?: { zona: string; intensidad: number };
}

export interface CuerpoObservacion {
  tipo: TipoObservacion;
  texto: string;
  session_id?: string;
  exercise_id?: string;
  dolor_zona?: string;
  dolor_intensidad?: number;
}

export function cuerpoCrear(s: SesionLocal): CuerpoCrear {
  const c: CuerpoCrear = { id: s.id, routine_day_id: s.routine_day_id, iniciada_at: s.iniciada_at, device_id: s.device_id };
  if (typeof s.routine_version === 'number' && s.routine_version >= 1) c.routine_version = s.routine_version;
  return c;
}

/** Todas las series de la sesión; las pendientes van como no completadas (se guardan como no hechas). */
export function cuerpoSeries(s: SesionLocal): CuerpoSeries {
  return {
    series: s.ejercicios.flatMap((e) =>
      e.series.map((x) => ({
        id: x.id,
        exercise_id: e.exercise_id,
        routine_exercise_id: e.routine_exercise_id,
        serie_n: x.serie_n,
        peso_kg: x.peso_kg,
        reps: x.reps,
        rir: x.estado === 'pendiente' ? null : x.rir,
        completada: x.estado !== 'pendiente',
        fallo: x.estado === 'fallada',
      })),
    ),
  };
}

export function cuerpoCerrar(cerradaAt: string, duracionS: number): CuerpoCerrar {
  return { cerrada_at: cerradaAt, duracion_s: Math.max(0, Math.round(duracionS)) };
}

/** Las zonas de dolor de la hoja (las de la encuesta), con el valor que se guarda. */
export const ZONAS_DOLOR = [
  { id: 'hombro', nombre: 'Hombro' },
  { id: 'rodilla', nombre: 'Rodilla' },
  { id: 'espalda_baja', nombre: 'Espalda baja' },
  { id: 'muneca', nombre: 'Muñeca' },
  { id: 'cadera', nombre: 'Cadera' },
  { id: 'otra', nombre: 'Otra' },
] as const;

export function nombreZona(id: string | null): string {
  return ZONAS_DOLOR.find((z) => z.id === id)?.nombre.toLowerCase() ?? '';
}

/** Arma POST /observations. Un dolor sin texto lleva uno armado con la zona y la intensidad. */
export function cuerpoObservacion(o: {
  tipo: TipoObservacion;
  texto: string;
  zona: string | null;
  intensidad: number | null;
  sessionId?: string | null;
  exerciseId?: string | null;
}): CuerpoObservacion {
  const t = o.texto.trim();
  const c: CuerpoObservacion = { tipo: o.tipo, texto: t };
  if (o.sessionId) c.session_id = o.sessionId;
  if (o.exerciseId) c.exercise_id = o.exerciseId;
  if (o.tipo === 'dolor') {
    const intensidad = Math.min(10, Math.max(1, Math.round(o.intensidad ?? 1)));
    c.dolor_intensidad = intensidad;
    if (o.zona) c.dolor_zona = o.zona;
    if (!t) c.texto = `Dolor en ${nombreZona(o.zona) || 'una zona'}, ${intensidad} de 10.`;
  }
  return c;
}

/** «10 nov · 80 × 8 · 8 · 8 · 7» sin la fecha. */
export function textoUltima(u: UltimaVezEj): string {
  return `${cifra(u.peso_kg)} × ${u.reps.join(' · ')}`;
}

