// ─────────────────────────────────────────────────────────────────────────────
// Selectores de progreso · Zona: Store
//
// Qué hace: cálculos derivados de las sesiones cerradas para las pestañas Hoy, Perfil y Progreso:
// resumen del mes, qué días de esta semana entrenó el alumno, la racha de días seguidos y el volumen
// por semana. Son funciones puras: reciben la lista de sesiones y una fecha, no leen el store ni usan
// React, así que se prueban sin montar nada.
// Tócalo cuando: cambies cómo se cuenta la racha, la semana o el volumen, o agregues otro número
// derivado para una pantalla.
// No lo toques para: sumar el volumen o detectar récords de una sesión (packages/shared/src/formulas.ts
// y cierre.ts), ni para cambiar qué se guarda o agregar acciones (src/store/useStore.ts).
// Depende de: @gymtrack/shared (historial: sesionesCerradas; types: WorkoutSession),
// src/lib/tiempo (inicioDeSemana, mismoDia).
// ─────────────────────────────────────────────────────────────────────────────
import { sesionesCerradas, type WorkoutSession } from '@gymtrack/shared';
import { inicioDeSemana, mismoDia } from '@/lib/tiempo';

// ── Resumen del mes ──────────────────────────────────────────────────────────
/**
 * Resumen del mes calendario de `ahora`: cuántas sesiones cerró el alumno, kilos totales movidos y
 * cuántos récords hizo. Alimenta las tarjetas de arriba de la pestaña Hoy.
 * Una sesión cuenta en el mes en que se cerró (si no tuviera cerradaAt, en el que empezó).
 * `ahora` existe para las pruebas; en la app se deja el valor por defecto.
 */
export function estadisticasDelMes(sesiones: readonly WorkoutSession[], ahora: Date = new Date()) {
  const delMes = sesionesCerradas(sesiones).filter((s) => {
    const d = new Date(s.cerradaAt ?? s.iniciadaAt);
    // Mes y año en hora local del celular, igual que el calendario que ve el alumno.
    return d.getMonth() === ahora.getMonth() && d.getFullYear() === ahora.getFullYear();
  });
  // volumenKg y prs vienen ya calculados por sesión al cerrarla; aquí solo se suman.
  return {
    sesiones: delMes.length,
    volumenKg: delMes.reduce((a, s) => a + (s.volumenKg ?? 0), 0),
    prs: delMes.reduce((a, s) => a + s.prs.length, 0),
  };
}

// ── Semana actual ────────────────────────────────────────────────────────────
/**
 * Lunes a domingo de esta semana: true si hubo sesión cerrada ese día.
 * Devuelve siempre 7 valores, índice 0 = lunes, para la tira de puntos de la pestaña Hoy.
 */
export function diasDeLaSemana(sesiones: readonly WorkoutSession[], ahora: Date = new Date()): boolean[] {
  const lunes = inicioDeSemana(ahora);
  const cerradas = sesionesCerradas(sesiones);
  return Array.from({ length: 7 }, (_, i) => {
    // Se avanza de a un día desde el lunes; setDate se encarga solo del cambio de mes.
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    return cerradas.some((s) => mismoDia(new Date(s.cerradaAt ?? s.iniciadaAt), dia));
  });
}

// ── Racha ────────────────────────────────────────────────────────────────────
/**
 * Días seguidos con sesión, contando hoy o ayer como inicio.
 * Si el alumno todavía no entrenó hoy la racha no se corta: se empieza a contar desde ayer.
 * Dos sesiones el mismo día cuentan como un solo día. Devuelve 0 si no entrenó ni hoy ni ayer.
 */
export function rachaDias(sesiones: readonly WorkoutSession[], ahora: Date = new Date()): number {
  // Un Set de claves "año-mes-día" en hora local: así preguntar si entrenó tal día es directo.
  const fechas = new Set(
    sesionesCerradas(sesiones).map((s) => {
      const d = new Date(s.cerradaAt ?? s.iniciadaAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }),
  );
  const cursor = new Date(ahora);
  const clave = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  // Hoy sin sesión no corta la racha: el cursor arranca en ayer.
  if (!fechas.has(clave(cursor))) cursor.setDate(cursor.getDate() - 1);
  let racha = 0;
  // Se retrocede de a un día mientras haya sesión; el primer hueco termina la racha.
  while (fechas.has(clave(cursor))) {
    racha += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return racha;
}

// ── Volumen por semana ───────────────────────────────────────────────────────
/**
 * Volumen por semana, las últimas `semanas`, de la más antigua a la actual.
 * Cada punto trae la etiqueta del lunes ("día/mes") y los kilos movidos esa semana; es lo que dibuja
 * el gráfico de barras de la pestaña Progreso. Los ejercicios de tiempo no suman kilos (eso se decide
 * al cerrar la sesión, en packages/shared/src/cierre.ts).
 */
export function volumenPorSemana(
  sesiones: readonly WorkoutSession[],
  semanas = 8,
  ahora: Date = new Date(),
): { etiqueta: string; kg: number }[] {
  const lunesActual = inicioDeSemana(ahora);
  const cerradas = sesionesCerradas(sesiones);
  return Array.from({ length: semanas }, (_, i) => {
    // Cada semana va del lunes 0:00 (incluido) al lunes siguiente (excluido); la última es la que está en curso.
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
    // La etiqueta es el lunes de esa semana; sin año, porque ocho semanas caben en la vista.
    return { etiqueta: `${desde.getDate()}/${desde.getMonth() + 1}`, kg };
  });
}
