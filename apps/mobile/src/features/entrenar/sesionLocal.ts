// ─────────────────────────────────────────────────────────────────────────────
// Sesión en curso · Zona: Entrenar
//
// Qué hace: todas las reglas del registro de sesión (pantallas 11 y 12), sin React ni red:
// armar la sesión desde el día de Hoy, mover kilos, repeticiones y RIR de la serie activa, marcar
// «Serie hecha» o «Fallé» (la serie que sigue hereda kilos y RIR), deshacer, añadir serie, pasar
// de ejercicio y calcular el resumen al terminar (series, volumen, tiempo, kcal, récords de peso y
// la sugerencia para la próxima vez con el motor de packages/shared). Cada función devuelve una
// sesión nueva y no toca la que recibe.
// Tócalo cuando: cambie una regla del registro o del resumen local.
// No lo toques para: cómo se guarda (almacen.ts), cómo se sube (cola.ts) ni cómo se ve.
// Depende de: ./modelo, ./formato y @gymtrack/shared (sugerirProgresion, WorkoutSet). Es puro.
// ─────────────────────────────────────────────────────────────────────────────
import { sugerirProgresion, type MotivoSugerencia, type WorkoutSet } from '@gymtrack/shared';
import { cifra, fechaCorta, isoConZona } from './formato';
import type {
  DiaHoy,
  EjercicioLocal,
  Hoy,
  PrVista,
  ResumenCierre,
  SerieLocal,
  SesionLocal,
  SugerenciaVista,
} from './modelo';

/** Pasos y límites de los más y menos (registro.html). */
export const PASO_KG = 2.5;
export const PASO_REPS = 1;
export const LIMITES = { kg: [0, 500], reps: [1, 60] } as const;
export const RIRS = [0, 1, 2, 3, 4] as const;

// ── Armar la sesión ──────────────────────────────────────────────────────────
export interface OpcionesCrear {
  id: string;
  nuevoId: () => string;
  ahoraMs: number;
  deviceId: string;
}

/** Arma la sesión del día con todas las series pendientes y los kilos que tocan hoy. */
export function crearSesion(hoy: Hoy, dia: DiaHoy, op: OpcionesCrear): SesionLocal {
  return {
    id: op.id,
    routine_id: hoy.rutina?.id ?? null,
    routine_day_id: dia.routine_day_id,
    routine_version: hoy.rutina?.version ?? null,
    nombre_dia: dia.nombre,
    metodo: hoy.rutina?.metodo ?? 'doble_progresion',
    semana: hoy.semana,
    iniciada_at: isoConZona(op.ahoraMs),
    iniciada_ms: op.ahoraMs,
    ejercicio_actual: 0,
    peso_corporal_kg: hoy.peso_corporal?.kg ?? null,
    entrenador_nombre: hoy.entrenador?.nombre ?? null,
    device_id: op.deviceId,
    ejercicios: dia.ejercicios.map((e) => {
      const peso = e.peso_kg ?? 0;
      return {
        exercise_id: e.exercise_id,
        routine_exercise_id: e.routine_exercise_id,
        nombre: e.nombre,
        grupo: e.grupo,
        objetivo: {
          series: e.series,
          reps_min: e.reps_min,
          reps_max: e.reps_max,
          rir_objetivo: e.rir_objetivo,
          descanso_s: e.descanso_s,
          incremento_kg: e.incremento_kg,
        },
        peso_hoy_kg: peso,
        sube_kg: e.sube_kg,
        ultima: e.ultima,
        record: e.record,
        // Cada serie parte con los kilos de hoy, el tope del rango y el RIR que pide la rutina.
        series: Array.from({ length: e.series }, (_, n) => serieNueva(op.nuevoId(), n + 1, peso, e.reps_max, e.rir_objetivo)),
      };
    }),
  };
}

function serieNueva(id: string, n: number, peso: number, reps: number, rir: number): SerieLocal {
  return { id, serie_n: n, peso_kg: peso, reps, rir, estado: 'pendiente', marcada_at: null };
}

// ── Lecturas ─────────────────────────────────────────────────────────────────
export function ejercicioActual(s: SesionLocal): EjercicioLocal | null {
  return s.ejercicios[s.ejercicio_actual] ?? null;
}
/** Índice de la primera serie pendiente del ejercicio, o -1 si ya están todas marcadas. */
export function indiceActiva(e: EjercicioLocal | null): number {
  return e ? e.series.findIndex((x) => x.estado === 'pendiente') : -1;
}
export function totalSeries(s: SesionLocal): number {
  return s.ejercicios.reduce((a, e) => a + e.series.length, 0);
}
export function seriesMarcadas(s: SesionLocal): number {
  return s.ejercicios.reduce((a, e) => a + e.series.filter((x) => x.estado !== 'pendiente').length, 0);
}
export function ejercicioListo(e: EjercicioLocal): boolean {
  return e.series.every((x) => x.estado !== 'pendiente');
}
/** El próximo ejercicio con series pendientes, dando la vuelta desde el actual. -1 si no queda ninguno. */
export function siguientePendiente(s: SesionLocal): number {
  const n = s.ejercicios.length;
  for (let k = 1; k <= n; k++) {
    const j = (s.ejercicio_actual + k) % n;
    const e = s.ejercicios[j];
    if (e && !ejercicioListo(e)) return j;
  }
  return -1;
}

// ── Cambios ──────────────────────────────────────────────────────────────────
function conEjercicio(s: SesionLocal, j: number, fn: (e: EjercicioLocal) => EjercicioLocal): SesionLocal {
  return { ...s, ejercicios: s.ejercicios.map((e, k) => (k === j ? fn(e) : e)) };
}

/** Cambia kilos, repeticiones o RIR de la serie activa del ejercicio actual, dentro de los límites. */
export function cambiarActiva(s: SesionLocal, cambio: { peso_kg?: number; reps?: number; rir?: number }): SesionLocal {
  const e = ejercicioActual(s);
  const i = indiceActiva(e);
  if (!e || i === -1) return s;
  const acotar = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v));
  return conEjercicio(s, s.ejercicio_actual, (x) => ({
    ...x,
    series: x.series.map((serie, k) => {
      if (k !== i) return serie;
      return {
        ...serie,
        ...(cambio.peso_kg !== undefined ? { peso_kg: Math.round(acotar(cambio.peso_kg, LIMITES.kg) * 100) / 100 } : {}),
        ...(cambio.reps !== undefined ? { reps: Math.round(acotar(cambio.reps, LIMITES.reps)) } : {}),
        ...(cambio.rir !== undefined ? { rir: acotar(cambio.rir, [0, 4]) } : {}),
      };
    }),
  }));
}

/** Qué serie se acaba de marcar, para «Deshacer serie n». */
export interface RefSerie {
  ej: number;
  i: number;
}

export interface ResultadoMarcar {
  sesion: SesionLocal;
  marcada: (RefSerie & { serie: SerieLocal }) | null;
  /** Segundos de descanso que arrancan, o null si fue la última serie de la sesión. */
  descansoS: number | null;
}

/**
 * «Serie hecha» o «Fallé»: marca la serie activa y la que sigue en el mismo ejercicio hereda kilos
 * y RIR (si subiste kilos, la próxima parte desde ahí). Arranca el descanso salvo en la última.
 * No llama a la red: solo devuelve la sesión nueva (APP-026).
 */
export function marcar(s: SesionLocal, fallo: boolean, ahoraMs: number): ResultadoMarcar {
  const e = ejercicioActual(s);
  const i = indiceActiva(e);
  if (!e || i === -1) return { sesion: s, marcada: null, descansoS: null };
  const hecha = e.series[i] as SerieLocal;
  const marcadaSerie: SerieLocal = { ...hecha, estado: fallo ? 'fallada' : 'hecha', marcada_at: isoConZona(ahoraMs) };
  const sesion = conEjercicio(s, s.ejercicio_actual, (x) => ({
    ...x,
    series: x.series.map((serie, k) => {
      if (k === i) return marcadaSerie;
      if (k === i + 1 && serie.estado === 'pendiente') return { ...serie, peso_kg: hecha.peso_kg, rir: hecha.rir };
      return serie;
    }),
  }));
  const quedan = seriesMarcadas(sesion) < totalSeries(sesion);
  return {
    sesion,
    marcada: { ej: s.ejercicio_actual, i, serie: marcadaSerie },
    descansoS: quedan ? e.objetivo.descanso_s : null,
  };
}

/** Desmarca la serie y vuelve a su ejercicio. */
export function deshacer(s: SesionLocal, ref: RefSerie): SesionLocal {
  const e = s.ejercicios[ref.ej];
  if (!e || !e.series[ref.i]) return s;
  const otra = conEjercicio(s, ref.ej, (x) => ({
    ...x,
    series: x.series.map((serie, k) => (k === ref.i ? { ...serie, estado: 'pendiente', marcada_at: null } : serie)),
  }));
  return { ...otra, ejercicio_actual: ref.ej };
}

/** «Añadir serie»: copia los kilos de la última, con el tope del rango y el RIR de la rutina. */
export function anadirSerie(s: SesionLocal, id: string): SesionLocal {
  const e = ejercicioActual(s);
  if (!e) return s;
  const base = e.series[e.series.length - 1];
  return conEjercicio(s, s.ejercicio_actual, (x) => ({
    ...x,
    series: [...x.series, serieNueva(id, x.series.length + 1, base?.peso_kg ?? x.peso_hoy_kg, x.objetivo.reps_max, x.objetivo.rir_objetivo)],
  }));
}

/** Pasa a otro ejercicio (flechas o «Siguiente ejercicio»). */
export function irA(s: SesionLocal, j: number): SesionLocal {
  if (j < 0 || j >= s.ejercicios.length) return s;
  return { ...s, ejercicio_actual: j };
}

/** El texto de la hoja «¿Terminar la sesión?». */
export function textoQuedan(s: SesionLocal): string {
  const quedan = totalSeries(s) - seriesMarcadas(s);
  if (quedan === 0) return 'Marcaste todas las series.';
  return `Te ${quedan === 1 ? 'queda 1 serie' : `quedan ${quedan} series`} sin marcar. Se guardan como no hechas.`;
}

/** Lo que sigue después del descanso: «Serie 2 · 82,5 kg × 8», el próximo ejercicio o terminar. */
export function textoSigue(s: SesionLocal): string {
  const e = ejercicioActual(s);
  const i = indiceActiva(e);
  if (e && i !== -1) {
    const x = e.series[i] as SerieLocal;
    return `Serie ${i + 1} · ${cifra(x.peso_kg)} kg × ${x.reps}`;
  }
  const j = siguientePendiente(s);
  return j === -1 ? 'Terminar la sesión' : (s.ejercicios[j]?.nombre ?? 'Terminar la sesión');
}

// ── Resumen al terminar ──────────────────────────────────────────────────────
function aWorkoutSet(x: SerieLocal): WorkoutSet {
  return { id: x.id, serieN: x.serie_n, pesoKg: x.peso_kg, reps: x.reps, rir: x.rir, completada: x.estado !== 'pendiente', fallo: x.estado === 'fallada' };
}

/**
 * El resumen calculado en el teléfono, con las fórmulas del PRD: volumen = kilos × repeticiones de
 * las series marcadas; kcal = 5 × peso corporal × horas (sin peso, null: H-13); récords de peso
 * contra el récord que trajo Hoy; sugerencias con el motor del paquete compartido.
 */
export function resumenLocal(s: SesionLocal, ahoraMs: number, proxima: DiaHoy | null): ResumenCierre {
  const duracion = Math.max(0, Math.round((ahoraMs - s.iniciada_ms) / 1000));
  let volumen = 0;
  const prs: PrVista[] = [];
  const sugerencias: SugerenciaVista[] = [];
  const incompletos: string[] = [];
  for (const e of s.ejercicios) {
    const hechas = e.series.filter((x) => x.estado !== 'pendiente');
    if (hechas.length < e.series.length) incompletos.push(e.nombre);
    volumen += hechas.reduce((a, x) => a + x.peso_kg * x.reps, 0);
    // Récord de peso: más kilos que el récord vigente, con al menos una repetición.
    const mejor = hechas.filter((x) => x.reps > 0).sort((a, b) => b.peso_kg - a.peso_kg || b.reps - a.reps)[0];
    if (mejor && e.record && mejor.peso_kg > e.record.peso_kg) {
      prs.push({
        exercise_id: e.exercise_id,
        nombre: e.nombre,
        marca: `${cifra(mejor.peso_kg)} kg × ${mejor.reps}`,
        antes: `antes ${cifra(e.record.peso_kg)} kg${e.record.fecha ? `, ${fechaCorta(e.record.fecha)}` : ''}`,
        diferencia: `+${cifra(mejor.peso_kg - e.record.peso_kg)} kg`,
      });
    }
    sugerencias.push(sugerenciaLocal(s, e));
  }
  return {
    series_hechas: seriesMarcadas(s),
    series_total: totalSeries(s),
    volumen_kg: Math.round(volumen * 10) / 10,
    duracion_s: duracion,
    kcal: s.peso_corporal_kg ? Math.round(5 * s.peso_corporal_kg * (duracion / 3600)) : null,
    prs,
    sugerencias,
    ejercicios_incompletos: incompletos,
    proxima: proxima ? { routine_day_id: proxima.routine_day_id, nombre: proxima.nombre, fecha: proxima.fecha } : null,
  };
}

function sugerenciaLocal(s: SesionLocal, e: EjercicioLocal): SugerenciaVista {
  const hechas = e.series.filter((x) => x.estado !== 'pendiente');
  const base = {
    routine_exercise_id: e.routine_exercise_id,
    nombre: e.nombre,
    reps_min: e.objetivo.reps_min,
    reps_max: e.objetivo.reps_max,
  };
  if (hechas.length === 0) {
    return { ...base, peso_kg: e.peso_hoy_kg, sube_kg: 0, por: `Sin series hoy. Se mantiene ${cifra(e.peso_hoy_kg)} kg.` };
  }
  const pesoHoy = Math.max(...hechas.map((x) => x.peso_kg));
  const sug = sugerirProgresion({
    metodo: s.metodo,
    routineExerciseId: e.routine_exercise_id ?? e.exercise_id,
    exerciseId: e.exercise_id,
    nombre: e.nombre,
    series: e.objetivo.series,
    repsMin: e.objetivo.reps_min,
    repsMax: e.objetivo.reps_max,
    rirObjetivo: e.objetivo.rir_objetivo,
    incrementoKg: e.objetivo.incremento_kg,
    setsActuales: e.series.map(aWorkoutSet),
    setsAnteriores: e.ultima
      ? e.ultima.reps.map((r, k) => ({ id: `u${k}`, serieN: k + 1, pesoKg: e.ultima?.peso_kg ?? 0, reps: r, rir: null, completada: true, fallo: false }))
      : null,
  });
  if (!sug) return { ...base, peso_kg: pesoHoy, sube_kg: 0, por: `Se mantiene ${cifra(pesoHoy)} kg.` };
  return {
    ...base,
    peso_kg: sug.pesoKg,
    sube_kg: Math.max(0, Math.round((sug.pesoKg - pesoHoy) * 100) / 100),
    reps_min: sug.repsMin,
    reps_max: sug.repsMax,
    por: motivoCorto(sug.motivo, e, hechas) ?? sug.texto,
  };
}

/** El porqué corto de la maqueta: «Llegaste a 8 en las 4 series.», «Te faltó 1 repetición en la serie 4.». */
export function motivoCorto(motivo: MotivoSugerencia, e: EjercicioLocal, hechas: readonly SerieLocal[]): string | null {
  const rmax = e.objetivo.reps_max;
  const n = hechas.length;
  switch (motivo) {
    case 'tope_del_rango':
    case 'lineal_sube':
      return `Llegaste a ${rmax} en las ${n} series.`;
    case 'dentro_del_rango': {
      const faltan = hechas.map((x, k) => ({ x, k })).filter(({ x }) => x.reps < rmax);
      const ultima = faltan[faltan.length - 1];
      if (faltan.length === 1 && ultima) {
        const d = rmax - ultima.x.reps;
        return `Te faltó ${d === 1 ? '1 repetición' : `${d} repeticiones`} en la serie ${ultima.k + 1}.`;
      }
      return `Apunta a ${rmax} en las ${n} series.`;
    }
    case 'bajo_el_minimo':
      return `Quedaste bajo ${e.objetivo.reps_min} en una serie. Se mantiene el peso.`;
    case 'baja_dos_sesiones':
      return 'Dos sesiones bajo el mínimo. Baja el peso.';
    case 'lineal_mantiene':
      return 'Faltó completar una serie. Se mantiene el peso.';
    case 'lineal_baja':
      return 'Dos sesiones sin completar. Baja 10 %.';
    case 'sin_lastre_sube_reps':
      return `Llegaste a ${rmax}: sube las repeticiones.`;
    default:
      return null;
  }
}
