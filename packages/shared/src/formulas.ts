// ─────────────────────────────────────────────────────────────────────────────
// Fórmulas de entrenamiento · Zona: Motor
//
// Qué hace: la matemática pura del gimnasio. Estima el 1RM de una serie (cuánto podría levantar el
// alumno una sola vez), suma el volumen de un ejercicio (kilos por repeticiones), estima las calorías
// de una sesión, convierte entre RIR y RPE y redondea una carga a los discos que existen (2,5 kg).
// Entra un número, sale un número: no hay estado ni nada de React.
// Tócalo cuando: quieras cambiar una fórmula (por ejemplo Epley por Brzycki), el tope de repeticiones
// desde el que el 1RM deja de mostrarse, el MET de las calorías o el paso con que se redondea la carga.
// No lo toques para: decidir si una serie es récord o cerrar la sesión (packages/shared/src/cierre.ts),
// para la regla de progresión o el texto de la sugerencia (packages/shared/src/progression.ts), ni para
// escribir el número con coma o con "kg" (packages/shared/src/format.ts).
// Depende de: ./types (el tipo WorkoutSet).
// ─────────────────────────────────────────────────────────────────────────────
import type { WorkoutSet } from './types';

// ── Redondeo ─────────────────────────────────────────────────────────────────

/**
 * Redondea `n` a `decimales` cifras (1 por defecto). Es el redondeo base de todo shared: cada fórmula
 * pasa por aquí antes de devolver, así un peso se guarda como 47.5 y no como 47.499999.
 * Devuelve un número, no un texto; para mostrarlo con coma usa fmtNum (format.ts).
 */
export function redondear(n: number, decimales = 1): number {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

// ── 1RM estimado (Epley) ─────────────────────────────────────────────────────

/**
 * 1RM estimado con la fórmula de Epley. Válida hasta 12 repeticiones; más allá devuelve null.
 *
 * Recibe el peso de la serie y las repeticiones; devuelve los kilos estimados a una decimal, o null
 * cuando la estimación no tiene sentido (sin peso, sin repeticiones o más de 12).
 * Es el 1RM que se le muestra al alumno. Para comparar marcas entre sesiones usa e1rmComparable.
 */
export function e1rm(pesoKg: number, reps: number): number | null {
  // Se escribe !(x > 0) y no x <= 0 a propósito: así un NaN o un undefined también devuelven null.
  // Sobre 12 repeticiones Epley infla demasiado el número, por eso no se estima.
  if (!(pesoKg > 0) || !(reps >= 1) || reps > 12) return null;
  // Con una repetición el 1RM es el peso mismo; la fórmula daría un 3 % más y sería mentira.
  if (reps === 1) return redondear(pesoKg);
  return redondear(pesoKg * (1 + reps / 30));
}

/**
 * La misma fórmula sin el tope de 12: sirve para comparar marcas entre sesiones,
 * porque es creciente en repeticiones. Para mostrar, prefiere e1rm.
 *
 * Recibe lo mismo que e1rm y devuelve null solo sin peso o sin repeticiones. cierre.ts la usa para
 * detectar récords: una serie de 15 repeticiones tiene que poder ganarle a una de 10, aunque el
 * número ya no sea un 1RM realista.
 */
export function e1rmComparable(pesoKg: number, reps: number): number | null {
  if (!(pesoKg > 0) || !(reps >= 1)) return null;
  if (reps === 1) return redondear(pesoKg);
  return redondear(pesoKg * (1 + reps / 30));
}

// ── RIR y RPE ────────────────────────────────────────────────────────────────

/**
 * Pasa de RIR (repeticiones que le quedaban al alumno) a RPE (esfuerzo percibido de 0 a 10).
 * RIR 0 es RPE 10 (al fallo), RIR 2 es RPE 8. El resultado se acota a 0..10 aunque entre un RIR raro.
 */
export function rpeDesdeRir(rir: number): number {
  return Math.max(0, Math.min(10, 10 - rir));
}

/** La inversa de rpeDesdeRir: RPE 8 es RIR 2. También acotada a 0..10. */
export function rirDesdeRpe(rpe: number): number {
  return Math.max(0, Math.min(10, 10 - rpe));
}

// ── Volumen y mejor serie ────────────────────────────────────────────────────

/**
 * Suma peso por repeticiones de las series completadas.
 *
 * Recibe las series de un ejercicio y devuelve los kilos movidos, a una decimal. Las series sin
 * `completada` no cuentan aunque tengan peso y reps escritos.
 * En peso corporal `pesoKg` es el lastre, así que sin lastre el volumen es 0. Los ejercicios de tiempo
 * los deja fuera quien llama (cierre.ts), porque ahí `reps` son segundos y el producto no significa nada.
 */
export function volumenSets(sets: readonly WorkoutSet[]): number {
  return redondear(sets.filter((s) => s.completada).reduce((a, s) => a + s.pesoKg * s.reps, 0));
}


// ── Calorías ─────────────────────────────────────────────────────────────────

/**
 * Calorías estimadas con MET 5 (fuerza) y el peso corporal del alumno.
 *
 * Recibe el peso corporal, la duración de la sesión en segundos y, si quieres, otro MET.
 * Devuelve kcal enteras (MET por kilos por horas) o 0 si falta el peso o la duración.
 * Es una estimación gruesa: no mira qué ejercicios se hicieron ni cuánto se descansó.
 */
export function kcalEstimadas(pesoCorporalKg: number, duracionS: number, met = 5): number {
  if (!(pesoCorporalKg > 0) || !(duracionS > 0)) return 0;
  return Math.round(met * pesoCorporalKg * (duracionS / 3600));
}

// ── Carga en discos ──────────────────────────────────────────────────────────

/**
 * Redondea al múltiplo de carga más cercano (2,5 kg por defecto).
 *
 * Sirve para que una sugerencia nunca pida un peso que no se puede armar con discos: 53,7 queda en
 * 52,5 y 54 en 55. progression.ts lo llama con el incremento del ejercicio como `paso`, así una
 * mancuerna que sube de a 2 kg se redondea a pares.
 * Si `paso` no es positivo, solo redondea a una decimal.
 */
export function redondearCarga(pesoKg: number, paso = 2.5): number {
  // Un paso 0 o negativo haría una división por cero; se cae al redondeo simple y listo.
  if (!(paso > 0)) return redondear(pesoKg);
  return redondear(Math.round(pesoKg / paso) * paso);
}
