// ─────────────────────────────────────────────────────────────────────────────
// Semana de la rutina · Zona: Sesiones (API)
//
// Qué hace: la semana en curso de una rutina: bloques de 7 días desde la primera activación, de 1
// a `semanas` (la misma regla que rutinas/vista.ts, UNI-072). Sin activación, semana 1.
// Tócalo cuando: cambie cómo se cuentan las semanas (cámbialo también en rutinas/vista.ts).
// No lo toques para: otra cosa.
// Depende de: nada.
// ─────────────────────────────────────────────────────────────────────────────
const SEMANA_MS = 7 * 86_400_000;

export function semanaActualDe(r: { activadaAt: Date | null; semanas: number }, ahora: Date): number {
  if (!r.activadaAt) return 1;
  const s = Math.floor((ahora.getTime() - r.activadaAt.getTime()) / SEMANA_MS) + 1;
  return Math.max(1, Math.min(r.semanas, s));
}
