// ─────────────────────────────────────────────────────────────────────────────
// Resumen de series · Zona: Utilidades
//
// Qué hace: convierte las series de un ejercicio en una línea corta de texto para las pantallas,
// tipo "60×8 · 60×8 · 62×7". Es lo que el alumno ve como "la última vez hiciste...".
// Tócalo cuando: quieras cambiar cómo se lee el resumen de una serie (el separador, si se muestra
// el RIR, si las series con fallo van marcadas, etc.).
// No lo toques para: cambiar cómo se escribe un número o los kilos (coma decimal, redondeo): eso
// vive en packages/shared/src/format.ts (fmtNum, fmtKg). Tampoco para cambiar qué campos tiene una
// serie: packages/shared/src/types.ts (WorkoutSet).
// Depende de: @gymtrack/shared (fmtNum de format.ts; los tipos TipoCarga y WorkoutSet de types.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum, type TipoCarga, type WorkoutSet } from '@gymtrack/shared';

/**
 * "60×8 · 60×8 · 62×7" o "45 s · 45 s" para ejercicios de tiempo. Solo series completadas.
 *
 * Recibe las series de un ejercicio (de una sesión guardada o de la que está en curso) y el tipo de
 * carga del ejercicio. Devuelve un string listo para pintar; si no hay series completadas devuelve "".
 *
 * Reglas que conviene saber:
 * - Solo entran las series con `completada: true`. Una serie a medio llenar no cuenta como hecha.
 * - En ejercicios de tiempo `reps` son segundos, por eso se muestra "45 s" y no peso por reps.
 * - En `peso_corporal` el peso es el lastre, así que sin lastre se ve "0×8". Si eso te molesta,
 *   el cambio va aquí, no en fmtNum.
 * - Lo usan la Bitácora (última vez), el Resumen al cerrar la sesión y la ficha del ejercicio.
 */
export function resumenSets(sets: readonly WorkoutSet[], tipoCarga: TipoCarga): string {
  return sets
    .filter((s) => s.completada)
    .map((s) => {
      if (tipoCarga === 'tiempo') return `${s.reps} s`;
      // Peso corporal: sin lastre se muestran solo las repeticiones; con lastre, "+2,5×8".
      if (tipoCarga === 'peso_corporal') return s.pesoKg > 0 ? `+${fmtNum(s.pesoKg)}×${s.reps}` : `${s.reps} reps`;
      return `${fmtNum(s.pesoKg)}×${s.reps}`;
    })
    .join(' · ');
}
