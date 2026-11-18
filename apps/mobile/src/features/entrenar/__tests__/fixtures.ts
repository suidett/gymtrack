// ─────────────────────────────────────────────────────────────────────────────
// Datos de prueba de Entrenar · Zona: Entrenar (pruebas)
//
// Qué hace: un GET /me/today como el de Martina en la semilla `piloto` (Pierna A, semana 3 de 8,
// los mismos ejercicios de las maquetas hoy.html y registro.html) y ayudas para armar sesiones.
// Tócalo cuando: cambie la forma de Hoy o haga falta otro caso.
// Depende de: ../contrato, ../sesionLocal.
// ─────────────────────────────────────────────────────────────────────────────
import { normalizarHoy } from '../contrato';
import type { Hoy } from '../modelo';
import { crearSesion } from '../sesionLocal';

export const AHORA = Date.parse('2026-11-17T22:00:00.000Z');

const ej = (id: string, nombre: string, grupo: string, series: number, rmin: number, rmax: number, rir: number, desc: number, kg: number, ultima: { kg: number; reps: number[] }, record?: number) => ({
  routine_exercise_id: `re-${id}`,
  exercise_id: `ex-${id}`,
  nombre,
  grupo,
  series,
  reps_min: rmin,
  reps_max: rmax,
  rir_objetivo: rir,
  descanso_s: desc,
  incremento_kg: 2.5,
  sugerencia: { peso_kg: kg, reps_min: rmin, reps_max: rmax, rir },
  ultima_vez: { fecha: '2026-11-10T19:00:00-03:00', series: ultima.reps.map((r) => ({ peso_kg: ultima.kg, reps: r })) },
  ...(record !== undefined ? { record: { peso_kg: record, reps: rmax, fecha: '2026-11-10T19:00:00-03:00' } } : {}),
});

export const JSON_HOY_MARTINA = {
  racha_dias: 12,
  rutina: { id: 'rut-1', nombre: 'Fuerza', metodo_progresion: 'doble_progresion', version: 2, semana_actual: 3, semanas: 8 },
  dia: {
    routine_day_id: 'dia-pierna-a',
    nombre: 'Pierna A',
    minutos_estimados: 55,
    ejercicios: [
      ej('sent', 'Sentadilla', 'Cuádriceps y glúteos', 4, 6, 8, 2, 180, 82.5, { kg: 80, reps: [8, 8, 8, 7] }, 80),
      ej('pmr', 'Peso muerto rumano', 'Isquiotibiales y glúteos', 3, 8, 10, 2, 120, 60, { kg: 60, reps: [10, 10, 9] }, 60),
      ej('prensa', 'Prensa', 'Cuádriceps', 3, 10, 12, 2, 120, 140, { kg: 135, reps: [12, 12, 12] }, 135),
    ],
  },
  proximo_dia: { routine_day_id: 'dia-empuje-b', nombre: 'Empuje B', fecha: '2026-11-19', minutos_estimados: 50, ejercicios: [] },
  sesion_en_curso: null,
  semana: { dias: ['hecho', 'toca', 'descanso', 'plan', 'plan', 'descanso', 'descanso'], hoy: 1, hechas: 1, plan: 4 },
  mes: { sesiones: 9, volumen_kg: 41320, prs: 3 },
  entrenador: { nombre: 'Camila', apellido: 'Rojas' },
  ultima_accion_entrenador: { texto: 'Hoy sube a 82,5 en la sentadilla.', created_at: '2026-11-15T10:00:00-03:00', total: 2 },
  peso_corporal: { peso_kg: 62.4, fecha: '2026-11-10' },
};

export function hoyMartina(): Hoy {
  return normalizarHoy(JSON_HOY_MARTINA);
}

let n = 0;
export const idPrueba = () => `id-${++n}`;

export function sesionMartina() {
  const hoy = hoyMartina();
  if (!hoy.dia) throw new Error('falta el día');
  return crearSesion(hoy, hoy.dia, { id: 'ses-1', nuevoId: idPrueba, ahoraMs: AHORA, deviceId: 'tel-a' });
}
