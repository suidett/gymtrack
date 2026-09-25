import type { WorkoutSet } from './types';

export function redondear(n: number, decimales = 1): number {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

/** 1RM estimado con la fórmula de Epley. Válida hasta 12 repeticiones; más allá devuelve null. */
export function e1rm(pesoKg: number, reps: number): number | null {
  if (!(pesoKg > 0) || !(reps >= 1) || reps > 12) return null;
  if (reps === 1) return redondear(pesoKg);
  return redondear(pesoKg * (1 + reps / 30));
}

/**
 * La misma fórmula sin el tope de 12: sirve para comparar marcas entre sesiones,
 * porque es creciente en repeticiones. Para mostrar, prefiere e1rm.
 */
export function e1rmComparable(pesoKg: number, reps: number): number | null {
  if (!(pesoKg > 0) || !(reps >= 1)) return null;
  if (reps === 1) return redondear(pesoKg);
  return redondear(pesoKg * (1 + reps / 30));
}

export function rpeDesdeRir(rir: number): number {
  return Math.max(0, Math.min(10, 10 - rir));
}

export function rirDesdeRpe(rpe: number): number {
  return Math.max(0, Math.min(10, 10 - rpe));
}

/** Suma peso por repeticiones de las series completadas. */
export function volumenSets(sets: readonly WorkoutSet[]): number {
  return redondear(sets.filter((s) => s.completada).reduce((a, s) => a + s.pesoKg * s.reps, 0));
}

export function mejorE1rm(sets: readonly WorkoutSet[]): { valor: number; set: WorkoutSet } | null {
  let mejor: { valor: number; set: WorkoutSet } | null = null;
  for (const s of sets) {
    if (!s.completada) continue;
    const v = e1rm(s.pesoKg, s.reps);
    if (v != null && (mejor == null || v > mejor.valor)) mejor = { valor: v, set: s };
  }
  return mejor;
}

/** Calorías estimadas con MET 5 (fuerza) y el peso corporal del alumno. */
export function kcalEstimadas(pesoCorporalKg: number, duracionS: number, met = 5): number {
  if (!(pesoCorporalKg > 0) || !(duracionS > 0)) return 0;
  return Math.round(met * pesoCorporalKg * (duracionS / 3600));
}

/** Redondea al múltiplo de carga más cercano (2,5 kg por defecto). */
export function redondearCarga(pesoKg: number, paso = 2.5): number {
  if (!(paso > 0)) return redondear(pesoKg);
  return redondear(Math.round(pesoKg / paso) * paso);
}
