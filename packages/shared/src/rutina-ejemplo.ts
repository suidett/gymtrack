import type { Routine, RoutineDay, RoutineExercise } from './types';

type Item = [exerciseId: string, series: number, repsMin: number, repsMax: number, rir: number, descansoS: number, incrementoKg: number];

/** Una rutina de cuatro días para probar la app desde el primer minuto. Se puede editar o borrar. */
export function rutinaEjemplo(newId: () => string, ahoraIso: string): Routine {
  const dia = (nombre: string, orden: number, items: Item[]): RoutineDay => ({
    id: newId(),
    nombre,
    orden,
    ejercicios: items.map(
      ([exerciseId, series, repsMin, repsMax, rirObjetivo, descansoS, incrementoKg], i): RoutineExercise => ({
        id: newId(),
        exerciseId: `base-${exerciseId}`,
        orden: i,
        series,
        repsMin,
        repsMax,
        rirObjetivo,
        descansoS,
        incrementoKg,
        pesoInicialKg: null,
      }),
    ),
  });

  return {
    id: newId(),
    nombre: 'Rutina de ejemplo · Fuerza 4 días',
    descripcion: 'Empuje y tirón, 8 semanas, doble progresión. Edítala o bórrala cuando quieras.',
    metodo: 'doble_progresion',
    semanas: 8,
    estado: 'activa',
    dias: [
      dia('Empuje A', 0, [
        ['press-de-banca', 4, 8, 10, 2, 120, 2.5],
        ['press-militar', 3, 8, 10, 2, 90, 2.5],
        ['fondos-en-paralelas', 3, 8, 12, 2, 90, 2.5],
        ['elevaciones-laterales', 3, 12, 15, 1, 60, 1],
      ]),
      dia('Tirón B', 1, [
        ['peso-muerto', 3, 5, 6, 2, 180, 5],
        ['jalon-al-pecho', 3, 8, 10, 2, 90, 5],
        ['remo-con-barra', 3, 8, 10, 2, 90, 2.5],
        ['curl-con-barra', 3, 10, 12, 1, 60, 2.5],
      ]),
      dia('Piernas C', 2, [
        ['sentadilla-trasera', 4, 6, 8, 2, 150, 2.5],
        ['prensa-de-piernas', 3, 10, 12, 2, 90, 5],
        ['curl-femoral-acostado', 3, 10, 12, 1, 60, 5],
        ['elevacion-talones-pie', 3, 12, 15, 1, 60, 5],
      ]),
      dia('Empuje B', 3, [
        ['press-inclinado-mancuernas', 4, 8, 10, 2, 90, 2],
        ['press-hombros-mancuernas', 3, 8, 10, 2, 90, 2],
        ['cruce-de-poleas', 3, 12, 15, 1, 60, 2.5],
        ['extension-triceps-polea', 3, 10, 12, 1, 60, 2.5],
      ]),
    ],
    creadoAt: ahoraIso,
    activadaAt: ahoraIso,
    actualizadoAt: ahoraIso,
  };
}
