// ─────────────────────────────────────────────────────────────────────────────
// Rutina de ejemplo · Zona: Datos
//
// Qué hace: arma la rutina de cuatro días (empuje, tirón, piernas, empuje) que el alumno encuentra
// activa la primera vez que abre la app, para que pueda registrar una sesión desde el primer
// minuto sin armar nada. Es una rutina común y corriente: se edita, se archiva o se borra igual
// que cualquiera.
// Tócalo cuando: quieras cambiar los ejercicios, las series, el rango de repeticiones, los
// descansos o el nombre de los días con los que parte un alumno nuevo. Solo la ve quien siembra
// (primera vez o "restablecer datos" en useStore.ts); un cambio aquí no toca las rutinas que ya
// están en los teléfonos.
// No lo toques para: agregar un ejercicio a la biblioteca (exercises.seed.ts), cambiar qué campos
// tiene una rutina (types.ts) ni cómo se crea o edita una rutina en la app (useStore.ts).
// Depende de: types.ts (los tipos Routine, RoutineDay y RoutineExercise). Los ids de ejercicio que
// usa tienen que existir en exercises.seed.ts, aunque no lo importa.
// ─────────────────────────────────────────────────────────────────────────────
import type { Routine, RoutineDay, RoutineExercise } from './types';

// ── Forma de cada fila ───────────────────────────────────────────────────────

// Cada ejercicio del día se escribe como una fila corta para que la rutina se lea como una tabla:
// [id corto del ejercicio (sin "base-"), series, reps mínimas, reps máximas, RIR objetivo,
// descanso en segundos, incremento en kilos]. El incremento se escribe a mano porque la rutina
// puede querer otro salto que el que trae el ejercicio en la biblioteca.
type Item = [exerciseId: string, series: number, repsMin: number, repsMax: number, rir: number, descansoS: number, incrementoKg: number];

// ── La rutina ────────────────────────────────────────────────────────────────

/**
 * Una rutina de cuatro días para probar la app desde el primer minuto. Se puede editar o borrar.
 *
 * Recibe `newId` (el generador de ids del teléfono, apps/mobile/src/lib/ids.ts) y `ahoraIso` (la
 * fecha actual en ISO). Devuelve la rutina ya activa, con doble progresión y 8 semanas, y con
 * activadaAt en ahoraIso: desde ahí se cuenta la semana en curso.
 * Cada llamada genera ids nuevos, así que dos llamadas dan dos rutinas distintas.
 * Los ids de ejercicio no se verifican aquí: si uno no existe en la biblioteca, la sesión lo muestra
 * como "Ejercicio" sin nombre y activarRutina (useStore.ts) rechaza la rutina.
 */
export function rutinaEjemplo(newId: () => string, ahoraIso: string): Routine {
  // Arma un día: le pone id, nombre y orden, y convierte cada fila en un RoutineExercise con
  // pesoInicialKg en null (la app pide el peso en la primera sesión).
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

  // Nace activa y con activadaAt en este momento: así la pestaña Hoy tiene qué mostrar de inmediato
  // y la semana en curso se cuenta desde la primera apertura. El orden de los días (0 a 3) es el
  // ciclo que sigue la app: después de "Empuje B" vuelve a "Empuje A".
  return {
    id: newId(),
    nombre: 'Rutina de ejemplo · Fuerza 4 días',
    descripcion: 'Empuje y tirón, 8 semanas, doble progresión. Edítala o bórrala cuando quieras.',
    metodo: 'doble_progresion',
    semanas: 8,
    estado: 'activa',
    dias: [
      // Cada fila: [id, series, repsMin, repsMax, RIR, descanso en s, incremento en kg].
      // RIR 2 en los multiarticulares y 1 en los de aislamiento; descansos más largos en los pesados.
      dia('Empuje A', 0, [
        ['press-de-banca', 4, 8, 10, 2, 120, 2.5],
        ['press-militar', 3, 8, 10, 2, 90, 2.5],
        ['fondos-en-paralelas', 3, 8, 12, 2, 90, 2.5],
        ['elevaciones-laterales', 3, 12, 15, 1, 60, 1],
      ]),
      dia('Tirón A', 1, [
        ['peso-muerto', 3, 5, 6, 2, 180, 5],
        ['jalon-al-pecho', 3, 8, 10, 2, 90, 5],
        ['remo-con-barra', 3, 8, 10, 2, 90, 2.5],
        ['curl-con-barra', 3, 10, 12, 1, 60, 2.5],
      ]),
      dia('Piernas A', 2, [
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
