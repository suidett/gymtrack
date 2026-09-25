// ─────────────────────────────────────────────────────────────────────────────
// Fechas y números del teléfono · Zona: Utilidades
//
// Qué hace: las ayudas chicas que usan las pantallas y el store para el tiempo (la fecha de "ahora",
// el lunes de la semana, si dos fechas son el mismo día) y para leer un número que escribió el
// alumno con coma o con punto ("47,5").
// Tócalo cuando: cambie qué día parte la semana, cómo se entiende "el mismo día", o qué se acepta
// al escribir un peso o unas repeticiones.
// No lo toques para: mostrar fechas o kilos bonitos ("23 sep", "47,5 kg"): eso es
// packages/shared/src/format.ts (fmtFecha, fmtKg, fmtNum). Tampoco para el reloj del descanso
// durante la sesión, que vive en apps/mobile/src/features/sesion/utilidades.ts (ahoraMs).
// Depende de: ninguno.
// ─────────────────────────────────────────────────────────────────────────────

// ── Fechas ───────────────────────────────────────────────────────────────────

/**
 * La fecha y hora de ahora como texto ISO en UTC ("2026-09-25T14:03:00.000Z").
 * No recibe nada. Es el formato en que se guardan todas las marcas de tiempo (creadoAt, iniciadaAt,
 * cerradaAt): un string ordena bien, sobrevive a AsyncStorage y el servidor futuro lo entiende tal cual.
 * Da un valor distinto cada vez, así que no la llames al renderizar un componente (misma regla que
 * Date.now() en la guía); úsala en una acción del store o dentro de un efecto.
 */
export function ahoraIso(): string {
  return new Date().toISOString();
}

/**
 * Lunes de la semana de `d`, a las 0:00 hora local.
 * Recibe una fecha (por defecto ahora) y devuelve una fecha nueva; no modifica la que le pasaste.
 * Es lo que usan los selectores para contar "sesiones de esta semana": la semana parte el lunes,
 * no el domingo como en JavaScript.
 */
export function inicioDeSemana(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  // getDay() da 0 para domingo y 1 para lunes; con el +6 y el módulo, el lunes queda en 0 y el
  // domingo en 6, así restar `dia` días siempre cae en el lunes anterior (o en el mismo día).
  const dia = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dia);
  return x;
}

/**
 * Verdadero si `a` y `b` caen en el mismo día calendario, en hora local del teléfono.
 * Se compara año, mes y día, no la diferencia en horas: las 23:59 y las 00:01 del día siguiente
 * son días distintos aunque estén a dos minutos. Sirve para la racha y para "ya entrenaste hoy".
 */
export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ── Números escritos por el alumno ───────────────────────────────────────────

/**
 * "47,5" o "47.5" a número; vacío o inválido devuelve null.
 * Recibe el texto tal cual salió del campo (con espacios, coma chilena o punto) y devuelve el
 * número, o null cuando no hay nada que leer. Quien lo llama decide qué hacer con el null (dejar
 * el valor anterior, guardar "sin dato", etc.); acá no se inventa un 0.
 * Ojo: no entiende separador de miles: "1.000" se lee como 1 y "1.000,5" queda inválido. Para
 * pesos de gimnasio alcanza.
 */
export function parseNumero(texto: string): number | null {
  const t = texto.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  // Number("abc") da NaN y Number("1e999") da Infinity; ninguno sirve para un peso, van como null.
  return Number.isFinite(n) ? n : null;
}
