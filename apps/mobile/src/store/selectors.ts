import { sesionesCerradas, type WorkoutSession } from '@gymtrack/shared';
import { inicioDeSemana, mismoDia } from '@/lib/tiempo';

export function estadisticasDelMes(sesiones: readonly WorkoutSession[], ahora: Date = new Date()) {
  const delMes = sesionesCerradas(sesiones).filter((s) => {
    const d = new Date(s.cerradaAt ?? s.iniciadaAt);
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  });
  return {
    sesiones: delMes.length,
    volumenKg: delMes.reduce((a, s) => a + (s.volumenKg ?? 0), 0),
    prs: delMes.reduce((a, s) => a + s.prs.length, 0),
  };
}

/** Lunes a domingo de esta semana: true si hubo sesión cerrada ese día. */
export function diasDeLaSemana(sesiones: readonly WorkoutSession[], ahora: Date = new Date()): boolean[] {
  const lunes = inicioDeSemana(ahora);
  const cerradas = sesionesCerradas(sesiones);
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return cerradas.some((s) => mismoDia(new Date(s.cerradaAt ?? s.iniciadaAt), dia));
  });
}

/** Días seguidos con sesión, contando hoy o ayer como inicio. */
export function rachaDias(sesiones: readonly WorkoutSession[], ahora: Date = new Date()): number {
  const fechas = new Set(
    sesionesCerradas(sesiones).map((s) => {
      const d = new Date(s.cerradaAt ?? s.iniciadaAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  const cursor = new Date(ahora);
  const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  if (!fechas.has(clave(cursor))) cursor.setDate(cursor.getDate() - 1);
  let racha = 0;
  while (fechas.has(clave(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

/** Volumen por semana, las últimas `semanas`, de la más antigua a la actual. */
export function volumenPorSemana(
  sesiones: readonly WorkoutSession[],
  semanas = 8,
  ahora: Date = new Date(),
): { etiqueta: string; kg: number }[] {
  const lunesActual = inicioDeSemana(ahora);
  const cerradas = sesionesCerradas(sesiones);
  return Array.from({ length: semanas }, (_, i) => {
    const desde = new Date(lunesActual);
    desde.setDate(lunesActual.getDate() - (semanas - 1 - i) * 7);
    const hasta = new Date(desde);
    hasta.setDate(desde.getDate() + 7);
    const kg = cerradas
      .filter((s) => {
        const d = new Date(s.cerradaAt ?? s.iniciadaAt);
        return d >= desde && d < hasta;
      })
      .reduce((a, s) => a + (s.volumenKg ?? 0), 0);
    return { etiqueta: `${desde.getDate()}/${desde.getMonth() + 1}`, kg };
  });
}
