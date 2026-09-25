// ─────────────────────────────────────────────────────────────────────────────
// Historial de sesiones · Zona: Motor
//
// Qué hace: responde preguntas sobre las sesiones ya cerradas del alumno: cuándo fue la última vez
// que hizo un ejercicio y con cuánto, qué series hizo la sesión anterior en ese puesto de la rutina,
// qué sugerencia sigue vigente, qué día de la rutina toca ahora y en qué semana del plan va.
// Tócalo cuando: cambie qué cuenta como "la última vez" (por ejemplo, si una sesión descartada vale),
// cómo se elige el día que toca o cómo se cuenta la semana de la rutina.
// No lo toques para: la racha, el volumen por semana o el resumen del mes
// (apps/mobile/src/store/selectors.ts), para generar la sugerencia (packages/shared/src/progression.ts)
// ni para detectar récords o el mejor registro histórico (packages/shared/src/cierre.ts).
// Depende de: ./types (Routine, RoutineDay, Sugerencia, WorkoutSession, WorkoutSet).
// ─────────────────────────────────────────────────────────────────────────────
import type { Routine, RoutineDay, Sugerencia, WorkoutSession, WorkoutSet } from './types';

// ── Sesiones cerradas ────────────────────────────────────────────────────────

/**
 * Sesiones cerradas, la más reciente primero.
 *
 * Recibe todas las sesiones del store y devuelve una lista nueva solo con las de estado "cerrada",
 * de la más nueva a la más antigua. Las "en_curso" y "descartada" quedan fuera: para el historial no
 * existen. Todo lo demás de este archivo parte de esta lista, y las pantallas la usan para listar.
 */
export function sesionesCerradas(sesiones: readonly WorkoutSession[]): WorkoutSession[] {
  // filter() ya devuelve una copia, así que el sort() no reordena el arreglo del store.
  // Las fechas son ISO, por eso comparar el texto equivale a comparar la fecha; va (b, a) para que
  // quede descendente. El `?? iniciadaAt` es solo por si una sesión cerrada quedó sin cerradaAt.
  return sesiones
    .filter((s) => s.estado === 'cerrada')
    .sort((a, b) => (b.cerradaAt ?? b.iniciadaAt).localeCompare(a.cerradaAt ?? a.iniciadaAt));
}

// ── Última vez por ejercicio ─────────────────────────────────────────────────

/**
 * Lo que se hizo la última vez con un ejercicio de la biblioteca. Es lo que la Bitácora muestra como
 * "la última vez hiciste..." y lo que el store mira, si no hay sugerencia, para el peso con que parte
 * la sesión nueva.
 */
export interface UltimaVez {
  /** Cuándo se cerró esa sesión (ISO). */
  fecha: string;
  /** La sesión donde pasó, por si hay que abrirla. */
  sessionId: string;
  /** Solo las series completadas de ese día. */
  sets: WorkoutSet[];
  /** El mayor peso entre esas series (en peso corporal, el mayor lastre). */
  pesoMax: number;
}

/**
 * Las series completadas la última vez que se hizo el ejercicio.
 *
 * Busca por `exerciseId` (el ejercicio de la biblioteca), no por el puesto en la rutina: si el alumno
 * hizo sentadilla en otra rutina, esa también cuenta. Devuelve null si nunca lo hizo.
 * Recibe las sesiones sin filtrar; las ordena ella misma.
 */
export function ultimaVez(exerciseId: string, sesiones: readonly WorkoutSession[]): UltimaVez | null {
  for (const s of sesionesCerradas(sesiones)) {
    // Si el mismo ejercicio aparece dos veces en un día, solo se mira el primero.
    const ej = s.ejercicios.find((e) => e.exerciseId === exerciseId);
    const sets = ej?.sets.filter((x) => x.completada) ?? [];
    // Una sesión donde el ejercicio quedó sin series hechas no es "la última vez": se sigue buscando.
    if (sets.length === 0) continue;
    return {
      fecha: s.cerradaAt ?? s.iniciadaAt,
      sessionId: s.id,
      sets,
      // Seguro porque ya hay al menos una serie; Math.max() sin argumentos daría -Infinity.
      pesoMax: Math.max(...sets.map((x) => x.pesoKg)),
    };
  }
  return null;
}

// ── Sesión anterior del ejercicio de la rutina ───────────────────────────────

/**
 * Las series de la sesión anterior de ese ejercicio de la rutina (por routineExerciseId).
 *
 * A diferencia de ultimaVez, busca por el puesto en la rutina: es lo que la progresión compara para
 * saber si el alumno viene fallando dos sesiones seguidas. Devuelve null si nunca se hizo ese puesto.
 * Ojo con la diferencia: si en la sesión anterior el ejercicio estaba pero no se completó ninguna
 * serie, devuelve [] y no sigue buscando más atrás. Es a propósito: esa sesión sí ocurrió.
 */
export function setsAnteriores(routineExerciseId: string, sesiones: readonly WorkoutSession[]): WorkoutSet[] | null {
  for (const s of sesionesCerradas(sesiones)) {
    const ej = s.ejercicios.find((e) => e.routineExerciseId === routineExerciseId);
    if (ej) return ej.sets.filter((x) => x.completada);
  }
  return null;
}

// ── Sugerencia vigente ───────────────────────────────────────────────────────

/**
 * La sugerencia más reciente para ese ejercicio de la rutina.
 *
 * Cada sesión cerrada guarda las sugerencias que el motor generó para la próxima vez. Aquí se recorren
 * las sesiones de la más nueva a la más antigua y se devuelve la primera que tenga una para ese puesto
 * de la rutina; si una sesión no tuvo el ejercicio, se salta y se sigue atrás. Con ella el store arma
 * el peso y las repeticiones objetivo de la sesión nueva. Devuelve null si nunca hubo sugerencia.
 */
export function sugerenciaVigente(routineExerciseId: string, sesiones: readonly WorkoutSession[]): Sugerencia | null {
  for (const s of sesionesCerradas(sesiones)) {
    const sug = s.sugerencias.find((x) => x.routineExerciseId === routineExerciseId);
    if (sug) return sug;
  }
  return null;
}

// ── Día y semana de la rutina ────────────────────────────────────────────────

/**
 * El día que toca: el siguiente al de la última sesión cerrada de la rutina, en ciclo.
 *
 * Recibe la rutina y todas las sesiones. Elige por `orden`, no por el día de la semana: si el alumno
 * se saltó el martes, el día 2 sigue esperando. Después del último día vuelve al primero.
 * Devuelve null solo si la rutina no tiene días.
 */
export function proximoDia(rutina: Routine, sesiones: readonly WorkoutSession[]): RoutineDay | null {
  // slice() antes de sort() para no reordenar los días dentro de la rutina del store.
  const dias = rutina.dias.slice().sort((a, b) => a.orden - b.orden);
  if (dias.length === 0) return null;
  const ultima = sesionesCerradas(sesiones).find((s) => s.routineId === rutina.id);
  if (!ultima) return dias[0] ?? null;
  // Si el día de la última sesión ya no existe (lo borraron en el editor), findIndex da -1 y el módulo
  // cae en el día 0: se vuelve a empezar, que es lo razonable.
  const idx = dias.findIndex((d) => d.id === ultima.routineDayId);
  return dias[(idx + 1) % dias.length] ?? dias[0] ?? null;
}

/**
 * Semana en curso de la rutina, de 1 a `semanas`, contada desde que se activó (o se creó, si nunca se activó).
 *
 * Cuenta bloques de 7 días desde `activadaAt`: los primeros 7 días son la semana 1. Se acota al plan,
 * así una rutina de 8 semanas que ya lleva 10 se queda en la 8 y no vuelve a la 1. Archivarla y
 * reactivarla tampoco reinicia la cuenta: el store conserva el activadaAt original.
 * Es lo que Hoy muestra como "Semana 3".
 */
export function semanaDeRutina(rutina: Routine, ahora: Date = new Date()): number {
  const inicio = new Date(rutina.activadaAt ?? rutina.creadoAt).getTime();
  // El +1 es porque el día en que se activa ya es semana 1, no semana 0.
  const semanas = Math.floor((ahora.getTime() - inicio) / (7 * 86_400_000)) + 1;
  return Math.max(1, Math.min(rutina.semanas, semanas));
}
