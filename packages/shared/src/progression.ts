import { redondear, redondearCarga } from './formulas';
import { fmtKg } from './format';
import { METODOS, type MetodoProgresion, type Sugerencia, type WorkoutSet } from './types';

export interface EntradaProgresion {
  metodo: MetodoProgresion;
  routineExerciseId: string;
  exerciseId: string;
  nombre: string;
  series: number;
  repsMin: number;
  repsMax: number;
  rirObjetivo: number;
  incrementoKg: number;
  setsActuales: readonly WorkoutSet[];
  /** Las series de la sesión anterior del mismo ejercicio, si la hubo. */
  setsAnteriores?: readonly WorkoutSet[] | null;
}

function nombreMetodo(id: MetodoProgresion): string {
  return METODOS.find((m) => m.id === id)?.nombre ?? id;
}

function bajoElMinimo(sets: readonly WorkoutSet[], repsMin: number): boolean {
  return sets.filter((s) => s.completada).some((s) => s.fallo || s.reps < repsMin);
}

/**
 * Calcula qué intentar la próxima sesión a partir de lo que se hizo hoy.
 * Doble progresión es la regla por defecto. Lineal tiene la suya. Los otros
 * cuatro métodos se calculan como doble progresión en esta versión, y el texto lo dice.
 */
export function sugerirProgresion(e: EntradaProgresion): Sugerencia | null {
  const hechas = e.setsActuales.filter((s) => s.completada);
  if (hechas.length === 0) return null;

  const peso = Math.max(...hechas.map((s) => s.pesoKg));
  const inc = e.incrementoKg > 0 ? e.incrementoKg : 2.5;
  const base = {
    routineExerciseId: e.routineExerciseId,
    exerciseId: e.exerciseId,
    nombre: e.nombre,
    metodo: e.metodo,
    rir: e.rirObjetivo,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
  };
  const fallaron = bajoElMinimo(hechas, e.repsMin);
  const fallaronAntes = e.setsAnteriores ? bajoElMinimo(e.setsAnteriores, e.repsMin) : false;
  const todasLasSeries = hechas.length >= e.series;

  if (e.metodo === 'lineal') {
    if (!fallaron && todasLasSeries) {
      const nuevo = redondear(peso + inc);
      return {
        ...base,
        pesoKg: nuevo,
        motivo: 'lineal_sube',
        texto: `Completaste todas las series. Próxima sesión: ${fmtKg(nuevo)} × ${e.series} × ${e.repsMin}.`,
      };
    }
    if (fallaron && fallaronAntes) {
      const nuevo = Math.max(0, redondearCarga(peso * 0.9, inc));
      return {
        ...base,
        pesoKg: nuevo,
        motivo: 'lineal_baja',
        texto: `Dos sesiones sin completar las series. Baja a ${fmtKg(nuevo)} y vuelve a subir desde ahí.`,
      };
    }
    return {
      ...base,
      pesoKg: peso,
      motivo: 'lineal_mantiene',
      texto: `Repite ${fmtKg(peso)} × ${e.series} × ${e.repsMin}. Cuando completes todas las series, sube a ${fmtKg(redondear(peso + inc))}.`,
    };
  }

  const aviso =
    e.metodo === 'doble_progresion' ? '' : ` (${nombreMetodo(e.metodo)}: en esta versión se calcula como doble progresión).`;

  const alTope =
    todasLasSeries &&
    hechas.every((s) => !s.fallo && s.reps >= e.repsMax && (s.rir == null || s.rir >= e.rirObjetivo));

  if (alTope) {
    const nuevo = redondear(peso + inc);
    return {
      ...base,
      pesoKg: nuevo,
      motivo: 'tope_del_rango',
      texto:
        `Llegaste al tope del rango. Próxima sesión intenta ${fmtKg(nuevo)} × ${e.repsMin} a ${e.repsMax}. ` +
        `Si consigues ${e.repsMax} o más con RIR ${e.rirObjetivo} o más, sube a ${fmtKg(redondear(nuevo + inc))}.` +
        aviso,
    };
  }

  if (fallaron) {
    if (fallaronAntes) {
      const nuevo = Math.max(0, redondear(peso - inc));
      return {
        ...base,
        pesoKg: nuevo,
        motivo: 'baja_dos_sesiones',
        texto: `Dos sesiones bajo ${e.repsMin} repeticiones. Baja a ${fmtKg(nuevo)} y trabaja de ${e.repsMin} a ${e.repsMax}.` + aviso,
      };
    }
    return {
      ...base,
      pesoKg: peso,
      motivo: 'bajo_el_minimo',
      texto: `Mantén ${fmtKg(peso)} y apunta a ${e.repsMin} o más en todas las series.` + aviso,
    };
  }

  const desde = Math.max(e.repsMin, Math.min(...hechas.map((s) => s.reps)));
  return {
    ...base,
    pesoKg: peso,
    motivo: 'dentro_del_rango',
    texto:
      `Próxima sesión intenta ${fmtKg(peso)} × ${desde} a ${e.repsMax}. ` +
      `Si consigues ${e.repsMax} o más con RIR ${e.rirObjetivo} o más, sube a ${fmtKg(redondear(peso + inc))}.` +
      aviso,
  };
}
