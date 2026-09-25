import { e1rm, kcalEstimadas, redondear, volumenSets } from './formulas';
import { fmtKg } from './format';
import { setsAnteriores } from './historial';
import { sugerirProgresion } from './progression';
import type { Exercise, MetodoProgresion, PR, Sugerencia, TipoCarga, TipoPR, WorkoutSession, WorkoutSet } from './types';

export interface Marca {
  tipo: TipoPR;
  valor: number;
  set: WorkoutSet;
}

/** Con qué se compara una serie según el tipo de carga: 1RM estimado, repeticiones o segundos. */
export function medidaDelSet(tipoCarga: TipoCarga, set: WorkoutSet): Marca | null {
  if (!set.completada) return null;
  if (tipoCarga === 'tiempo') return set.reps > 0 ? { tipo: 'tiempo', valor: set.reps, set } : null;
  if (tipoCarga === 'peso_corporal' && !(set.pesoKg > 0)) {
    return set.reps > 0 ? { tipo: 'reps', valor: set.reps, set } : null;
  }
  const v = e1rm(set.pesoKg, set.reps);
  return v == null ? null : { tipo: 'e1rm', valor: v, set };
}

export function mejorMarca(tipoCarga: TipoCarga, sets: readonly WorkoutSet[]): Marca | null {
  let mejor: Marca | null = null;
  for (const s of sets) {
    const m = medidaDelSet(tipoCarga, s);
    if (m && (mejor == null || m.valor > mejor.valor)) mejor = m;
  }
  return mejor;
}

export interface MarcaHistorica extends Marca {
  fecha: string;
  sessionId: string;
}

/** El mejor registro del ejercicio en todas las sesiones cerradas. */
export function marcaVigente(
  exerciseId: string,
  tipoCarga: TipoCarga,
  sesiones: readonly WorkoutSession[],
): MarcaHistorica | null {
  let mejor: MarcaHistorica | null = null;
  for (const s of sesiones) {
    if (s.estado !== 'cerrada') continue;
    for (const ej of s.ejercicios) {
      if (ej.exerciseId !== exerciseId) continue;
      const m = mejorMarca(tipoCarga, ej.sets);
      if (m && (mejor == null || m.valor > mejor.valor)) {
        mejor = { ...m, fecha: s.cerradaAt ?? s.iniciadaAt, sessionId: s.id };
      }
    }
  }
  return mejor;
}

export function fmtMarca(m: { tipo: TipoPR; valor: number }): string {
  if (m.tipo === 'e1rm') return fmtKg(m.valor);
  if (m.tipo === 'reps') return `${m.valor} reps`;
  return `${m.valor} s`;
}

export function etiquetaMarca(tipo: TipoPR): string {
  if (tipo === 'e1rm') return '1RM estimado';
  if (tipo === 'reps') return 'repeticiones';
  return 'segundos';
}

export interface EntradaCierre {
  sesion: WorkoutSession;
  /** Todas las sesiones anteriores; se usan solo las cerradas. */
  previas: readonly WorkoutSession[];
  ejercicios: readonly Exercise[];
  metodo: MetodoProgresion;
  ahoraIso: string;
  pesoCorporalKg: number | null;
}

/**
 * Cierra una sesión: descarta las series no completadas, calcula duración,
 * volumen, calorías, récords y la sugerencia de la próxima sesión por ejercicio.
 * Es pura: devuelve la sesión cerrada sin tocar la original.
 */
export function calcularCierre(e: EntradaCierre): WorkoutSession {
  const cerradas = e.previas.filter((s) => s.estado === 'cerrada' && s.id !== e.sesion.id);
  const ejercicios = e.sesion.ejercicios.map((ej) => ({ ...ej, sets: ej.sets.filter((s) => s.completada) }));

  const duracionS = Math.max(
    0,
    Math.round((new Date(e.ahoraIso).getTime() - new Date(e.sesion.iniciadaAt).getTime()) / 1000),
  );
  const volumenKg = redondear(
    ejercicios.filter((ej) => ej.tipoCarga !== 'tiempo').reduce((a, ej) => a + volumenSets(ej.sets), 0),
  );

  const prs: PR[] = [];
  const sugerencias: Sugerencia[] = [];
  for (const ej of ejercicios) {
    const mejor = mejorMarca(ej.tipoCarga, ej.sets);
    if (mejor) {
      const previa = marcaVigente(ej.exerciseId, ej.tipoCarga, cerradas);
      const anterior = previa && previa.tipo === mejor.tipo ? previa.valor : null;
      if (anterior == null || mejor.valor > anterior) {
        prs.push({
          exerciseId: ej.exerciseId,
          nombre: ej.nombre,
          tipo: mejor.tipo,
          valor: mejor.valor,
          anterior,
          setId: mejor.set.id,
          fecha: e.ahoraIso,
        });
      }
    }
    if (ej.routineExerciseId && ej.tipoCarga !== 'tiempo') {
      const sug = sugerirProgresion({
        metodo: e.metodo,
        routineExerciseId: ej.routineExerciseId,
        exerciseId: ej.exerciseId,
        nombre: ej.nombre,
        series: ej.objetivo.series,
        repsMin: ej.objetivo.repsMin,
        repsMax: ej.objetivo.repsMax,
        rirObjetivo: ej.objetivo.rirObjetivo,
        incrementoKg: ej.objetivo.incrementoKg,
        setsActuales: ej.sets,
        setsAnteriores: setsAnteriores(ej.routineExerciseId, cerradas),
      });
      if (sug) sugerencias.push(sug);
    }
  }

  return {
    ...e.sesion,
    ejercicios,
    estado: 'cerrada',
    cerradaAt: e.ahoraIso,
    duracionS,
    volumenKg,
    kcalEstimadas: e.pesoCorporalKg ? kcalEstimadas(e.pesoCorporalKg, duracionS) : null,
    prs,
    sugerencias,
  };
}
