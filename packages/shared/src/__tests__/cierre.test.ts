import { describe, expect, it } from 'vitest';
import {
  calcularCierre,
  e1rmComparable,
  marcaVigente,
  medidaDelSet,
  type Exercise,
  type SessionExercise,
  type WorkoutSession,
  type WorkoutSet,
} from '../index';

let n = 0;
const set = (pesoKg: number, reps: number, completada = true): WorkoutSet => ({
  id: `s${n++}`, serieN: 1, pesoKg, reps, rir: 2, completada, fallo: false,
});

function ejercicio(exerciseId: string, tipoCarga: Exercise['tipoCarga'], sets: WorkoutSet[], inc = 2.5): SessionExercise {
  return {
    id: `e${n++}`, exerciseId, routineExerciseId: `re-${exerciseId}`, orden: 0, nombre: exerciseId, tipoCarga,
    descansoS: 90, objetivo: { series: 3, repsMin: 8, repsMax: 12, rirObjetivo: 2, incrementoKg: inc }, sets, observacion: '',
  };
}

function sesion(id: string, iniciadaAt: string, ejercicios: SessionExercise[]): WorkoutSession {
  return {
    id, routineId: 'r', routineDayId: 'd', nombreDia: 'Día', iniciadaAt, cerradaAt: null, estado: 'en_curso',
    ejercicios, duracionS: null, volumenKg: null, kcalEstimadas: null, observacion: '', sugerencias: [], prs: [],
  };
}

const EJ: Exercise[] = [];

describe('medidas y récords', () => {
  it('más de 12 repeticiones sí cuenta para el récord', () => {
    expect(e1rmComparable(10, 15)).toBe(15);
    expect(medidaDelSet('kg', set(10, 15))?.valor).toBe(15);
    const s1 = calcularCierre({
      sesion: sesion('a', '2026-09-01T10:00:00Z', [ejercicio('lat', 'kg', [set(10, 15), set(10, 15)])]),
      previas: [], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-01T11:00:00Z', pesoCorporalKg: null,
    });
    expect(s1.prs).toHaveLength(1);
    expect(s1.prs[0]?.valor).toBe(15);
  });

  it('peso corporal se mide siempre en repeticiones: agregar lastre no regala un "primer récord"', () => {
    const s1 = calcularCierre({
      sesion: sesion('a', '2026-09-01T10:00:00Z', [ejercicio('fondos', 'peso_corporal', [set(0, 12), set(0, 12), set(0, 12)])]),
      previas: [], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-01T11:00:00Z', pesoCorporalKg: null,
    });
    expect(s1.prs[0]).toMatchObject({ tipo: 'reps', valor: 12, lastreKg: 0, anterior: null });
    const s2 = calcularCierre({
      sesion: sesion('b', '2026-09-03T10:00:00Z', [ejercicio('fondos', 'peso_corporal', [set(2.5, 10), set(2.5, 10), set(2.5, 9)])]),
      previas: [s1], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-03T11:00:00Z', pesoCorporalKg: null,
    });
    expect(s2.prs).toHaveLength(0);
    const s3 = calcularCierre({
      sesion: sesion('c', '2026-09-05T10:00:00Z', [ejercicio('fondos', 'peso_corporal', [set(2.5, 12), set(2.5, 12), set(2.5, 12)])]),
      previas: [s1, s2], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-05T11:00:00Z', pesoCorporalKg: null,
    });
    expect(s3.prs[0]).toMatchObject({ tipo: 'reps', valor: 12, lastreKg: 2.5, anterior: 12 });
    expect(marcaVigente('fondos', 'peso_corporal', [s1, s2, s3])?.lastreKg).toBe(2.5);
  });

  it('el historial se mide con el tipo de carga que tenía cada sesión', () => {
    const s1 = calcularCierre({
      sesion: sesion('a', '2026-09-01T10:00:00Z', [ejercicio('propio', 'kg', [set(60, 8)])]),
      previas: [], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-01T11:00:00Z', pesoCorporalKg: null,
    });
    const m = marcaVigente('propio', 'tiempo', [s1]);
    expect(m?.tipo).toBe('e1rm');
    expect(m?.valor).toBe(76);
  });

  it('un peso corporal 0 no produce calorías', () => {
    const s = calcularCierre({
      sesion: sesion('a', '2026-09-01T10:00:00Z', [ejercicio('x', 'kg', [set(60, 8)])]),
      previas: [], ejercicios: EJ, metodo: 'doble_progresion', ahoraIso: '2026-09-01T11:00:00Z', pesoCorporalKg: 0,
    });
    expect(s.kcalEstimadas).toBeNull();
  });
});
