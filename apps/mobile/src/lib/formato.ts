import { fmtNum, type TipoCarga, type WorkoutSet } from '@gymtrack/shared';

/** "60×8 · 60×8 · 62×7" o "45 s · 45 s" para ejercicios de tiempo. Solo series completadas. */
export function resumenSets(sets: readonly WorkoutSet[], tipoCarga: TipoCarga): string {
  return sets
    .filter((s) => s.completada)
    .map((s) => (tipoCarga === 'tiempo' ? `${s.reps} s` : `${fmtNum(s.pesoKg)}×${s.reps}`))
    .join(' · ');
}
