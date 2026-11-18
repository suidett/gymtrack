// ─────────────────────────────────────────────────────────────────────────────
// Estado de Hoy · Zona: Entrenar
//
// Qué hace: decide qué tarjeta muestra Hoy (los estados de hoy.html): rutina del día, sesión en
// curso, día de descanso, sin rutina con entrenador (espera) o solo, y «lista» cuando la sesión
// de hoy ya se cerró en este teléfono pero Hoy todavía muestra lo de antes (sin señal). También
// arma los textos de la tarjeta («6 ejercicios · 23 series · ~55 min»).
// Tócalo cuando: cambie un estado de Hoy o su texto.
// No lo toques para: cómo se ve cada tarjeta (PantallaHoy.tsx).
// Depende de: ./modelo. Es puro.
// ─────────────────────────────────────────────────────────────────────────────
import type { CierreGuardado, DiaHoy, EstadoHoy, Hoy, SesionLocal } from './modelo';

function mismoDia(iso: string, ms: number): boolean {
  const a = new Date(iso);
  const b = new Date(ms);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** El estado de la tarjeta principal. null mientras no haya nada que mostrar. */
export function estadoHoy(
  hoy: Hoy | null,
  sesion: SesionLocal | null,
  cierres: Record<string, CierreGuardado>,
  hoyAt: number | null,
  ahoraMs: number,
): EstadoHoy | null {
  if (sesion) return 'curso';
  if (!hoy) return null;
  // La API dice que hay una en curso, pero si este teléfono ya la cerró, manda lo local.
  if (hoy.sesion_en_curso && !cierres[hoy.sesion_en_curso.id]) return 'curso';
  if (hoy.dia) {
    const diaId = hoy.dia.routine_day_id;
    const cerradaHoy = Object.values(cierres).some(
      (c) =>
        c.routine_day_id === diaId &&
        mismoDia(c.cerrada_at, ahoraMs) &&
        (c.envio !== 'enviada' || hoyAt === null || hoyAt < Date.parse(c.cerrada_at)),
    );
    return cerradaHoy ? 'lista' : 'normal';
  }
  if (hoy.rutina) return 'descanso';
  return hoy.entrenador ? 'espera' : 'solo';
}

export function seriesDelDia(dia: DiaHoy): number {
  return dia.ejercicios.reduce((a, e) => a + e.series, 0);
}

/** «6 ejercicios · 23 series · ~55 min». */
export function resumenDia(dia: DiaHoy): string {
  const n = dia.ejercicios.length;
  const partes = [`${n} ${n === 1 ? 'ejercicio' : 'ejercicios'}`, `${seriesDelDia(dia)} series`];
  if (dia.minutos) partes.push(`~${Math.round(dia.minutos)} min`);
  return partes.join(' · ');
}

/** «Pierna A» o el nombre de la sesión en curso. */
export function nombreEnCurso(hoy: Hoy | null, sesion: SesionLocal | null): string {
  return sesion?.nombre_dia ?? hoy?.sesion_en_curso?.nombre ?? '';
}
