import type { Routine, RoutineDay, Sugerencia, WorkoutSession, WorkoutSet } from './types';

/** Sesiones cerradas, la más reciente primero. */
export function sesionesCerradas(sesiones: readonly WorkoutSession[]): WorkoutSession[] {
  return sesiones
    .filter((s) => s.estado === 'cerrada')
    .sort((a, b) => (b.cerradaAt ?? b.iniciadaAt).localeCompare(a.cerradaAt ?? a.iniciadaAt));
}

export interface UltimaVez {
  fecha: string;
  sessionId: string;
  sets: WorkoutSet[];
  pesoMax: number;
}

/** Las series completadas la última vez que se hizo el ejercicio. */
export function ultimaVez(exerciseId: string, sesiones: readonly WorkoutSession[]): UltimaVez | null {
  for (const s of sesionesCerradas(sesiones)) {
    const ej = s.ejercicios.find((e) => e.exerciseId === exerciseId);
    const sets = ej?.sets.filter((x) => x.completada) ?? [];
    if (sets.length === 0) continue;
    return {
      fecha: s.cerradaAt ?? s.iniciadaAt,
      sessionId: s.id,
      sets,
      pesoMax: Math.max(...sets.map((x) => x.pesoKg)),
    };
  }
  return null;
}

/** Las series de la sesión anterior de ese ejercicio de la rutina (por routineExerciseId). */
export function setsAnteriores(routineExerciseId: string, sesiones: readonly WorkoutSession[]): WorkoutSet[] | null {
  for (const s of sesionesCerradas(sesiones)) {
    const ej = s.ejercicios.find((e) => e.routineExerciseId === routineExerciseId);
    if (ej) return ej.sets.filter((x) => x.completada);
  }
  return null;
}

/** La sugerencia más reciente para ese ejercicio de la rutina. */
export function sugerenciaVigente(routineExerciseId: string, sesiones: readonly WorkoutSession[]): Sugerencia | null {
  for (const s of sesionesCerradas(sesiones)) {
    const sug = s.sugerencias.find((x) => x.routineExerciseId === routineExerciseId);
    if (sug) return sug;
  }
  return null;
}

/** El día que toca: el siguiente al de la última sesión cerrada de la rutina, en ciclo. */
export function proximoDia(rutina: Routine, sesiones: readonly WorkoutSession[]): RoutineDay | null {
  const dias = rutina.dias.slice().sort((a, b) => a.orden - b.orden);
  if (dias.length === 0) return null;
  const ultima = sesionesCerradas(sesiones).find((s) => s.routineId === rutina.id);
  if (!ultima) return dias[0] ?? null;
  const idx = dias.findIndex((d) => d.id === ultima.routineDayId);
  return dias[(idx + 1) % dias.length] ?? dias[0] ?? null;
}

/** Semana en curso de la rutina, de 1 a `semanas`, contada desde que se creó. */
export function semanaDeRutina(rutina: Routine, ahora: Date = new Date()): number {
  const inicio = new Date(rutina.creadoAt).getTime();
  const semanas = Math.floor((ahora.getTime() - inicio) / (7 * 86_400_000)) + 1;
  return Math.max(1, Math.min(rutina.semanas, semanas));
}
