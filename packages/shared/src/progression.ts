// ─────────────────────────────────────────────────────────────────────────────
// Motor de progresión · Zona: Motor
//
// Qué hace: mira las series que el alumno hizo hoy en un ejercicio de su rutina y decide qué
// intentar la próxima sesión: el mismo peso, más kilos, más repeticiones o bajar la carga. Devuelve
// una Sugerencia con los números (peso y rango de repeticiones), el motivo y el texto que lee el
// alumno. Es una función pura: no sabe de React, del store ni de fechas.
// Tócalo cuando: cambies la regla de un método (cuándo sube, cuándo baja, cuánto), la redacción
// de la sugerencia, o agregues un cálculo propio para los métodos que hoy se resuelven como doble
// progresión (porcentual, por RM, descendentes, cluster). Cada regla nueva lleva su prueba en
// __tests__/progression.test.ts.
// No lo toques para: decidir cuándo se llama (lo hace calcularCierre en cierre.ts, una vez por
// ejercicio al cerrar la sesión), buscar las series de la sesión anterior (setsAnteriores en
// historial.ts), cambiar cómo se redondea una carga o se escriben los kilos (formulas.ts y
// format.ts), ni los nombres y descripciones de los métodos (METODOS en types.ts).
// Depende de: formulas.ts (redondear, redondearCarga), format.ts (fmtKg) y types.ts (METODOS,
// MetodoProgresion, Sugerencia, WorkoutSet).
// ─────────────────────────────────────────────────────────────────────────────

import { redondear, redondearCarga } from './formulas';
import { fmtKg } from './format';
import { METODOS, type MetodoProgresion, type Sugerencia, type WorkoutSet } from './types';

// ── Entrada ──────────────────────────────────────────────────────────────────

/**
 * Todo lo que el motor necesita de un ejercicio para sugerir la próxima sesión. La arma
 * calcularCierre (cierre.ts) con el objetivo que el ejercicio tiene en la rutina y las series
 * registradas. Los ids y el nombre solo se copian a la Sugerencia para que la app sepa a qué
 * ejercicio pertenece; el motor no los usa para calcular.
 */
export interface EntradaProgresion {
  metodo: MetodoProgresion;
  routineExerciseId: string;
  exerciseId: string;
  nombre: string;
  /** Series prescritas en la rutina. Si el alumno hizo menos, no cuenta como completar el objetivo. */
  series: number;
  repsMin: number;
  repsMax: number;
  /** RIR que pide la rutina. Para subir de peso hay que llegar al tope del rango con este RIR o más. */
  rirObjetivo: number;
  /** 0 significa "sin lastre": el ejercicio progresa en repeticiones, no en kilos. */
  incrementoKg: number;
  /** Las series de hoy. Solo cuentan las marcadas como completadas; el resto se ignora. */
  setsActuales: readonly WorkoutSet[];
  /** Las series de la sesión anterior del mismo ejercicio, si la hubo. */
  setsAnteriores?: readonly WorkoutSet[] | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Nombre legible del método ("Doble progresión", "Cluster"). Si el id no está en METODOS, devuelve el id. */
function nombreMetodo(id: MetodoProgresion): string {
  return METODOS.find((m) => m.id === id)?.nombre ?? id;
}

/**
 * true si alguna serie completada quedó bajo el mínimo del rango o el alumno la marcó como fallo.
 * Basta una sola serie corta: la regla mira la peor serie del día, no el promedio.
 */
function bajoElMinimo(sets: readonly WorkoutSet[], repsMin: number): boolean {
  return sets.filter((s) => s.completada).some((s) => s.fallo || s.reps < repsMin);
}

/**
 * "30 kg × 8 a 10", "30 kg × 10" o "8 a 10 repeticiones con peso corporal".
 * Si desde y hasta coinciden se muestra un solo número, para no decir "10 a 10".
 */
function objetivo(pesoKg: number, desde: number, hasta: number): string {
  const rango = desde < hasta ? `${desde} a ${hasta}` : `${hasta}`;
  return pesoKg > 0 ? `${fmtKg(pesoKg)} × ${rango}` : `${rango} repeticiones con peso corporal`;
}

// ── Sugerencia de la próxima sesión ──────────────────────────────────────────

/**
 * Calcula qué intentar la próxima sesión a partir de lo que se hizo hoy.
 * Doble progresión es la regla por defecto. Lineal tiene la suya. Los otros
 * cuatro métodos se calculan como doble progresión en esta versión, y el texto lo dice.
 * Con incrementoKg 0 (sin lastre) nunca se inventan kilos: se progresa en repeticiones.
 *
 * Recibe la EntradaProgresion de un ejercicio y devuelve la Sugerencia (peso, rango, motivo y
 * texto) o null si hoy no se completó ninguna serie. El `motivo` es un id estable para que la app
 * decida cómo mostrarla; el `texto` ya viene listo para leerse tal cual. `pesoKg` y `repsMin` de
 * la sugerencia son los que la próxima sesión precarga en la tabla de series.
 */
export function sugerirProgresion(e: EntradaProgresion): Sugerencia | null {
  const hechas = e.setsActuales.filter((s) => s.completada);
  if (hechas.length === 0) return null;

  // ── Lectura de la sesión de hoy ──────────────────────────────────────────────
  // El peso de referencia es el mayor que se usó hoy: si el alumno bajó en la última serie, igual
  // se parte del peso "bueno". En peso corporal, pesoKg es el lastre (0 si no usó).
  const peso = Math.max(...hechas.map((s) => s.pesoKg));
  // Un incremento negativo o raro se trata como 0, o sea, como un ejercicio sin lastre.
  const inc = e.incrementoKg > 0 ? e.incrementoKg : 0;
  const sinLastre = inc === 0;
  // Campos iguales en todas las sugerencias; cada rama solo agrega peso, rango, motivo y texto.
  const base = {
    routineExerciseId: e.routineExerciseId,
    exerciseId: e.exerciseId,
    nombre: e.nombre,
    metodo: e.metodo,
    rir: e.rirObjetivo,
    repsMin: e.repsMin,
    repsMax: e.repsMax,
  };
  // "fallaron" mira la peor serie de hoy; "fallaronAntes", la de la sesión pasada. Dos seguidas es
  // la señal para bajar la carga; una sola se perdona y se repite.
  const fallaron = bajoElMinimo(hechas, e.repsMin);
  const fallaronAntes = e.setsAnteriores ? bajoElMinimo(e.setsAnteriores, e.repsMin) : false;
  // Hacer menos series de las prescritas no cuenta como completar el objetivo, aunque las
  // repeticiones estén bien: en ese caso se mantiene el peso.
  const todasLasSeries = hechas.length >= e.series;
  // `desde` es el nuevo mínimo del rango cuando el alumno se queda dentro: la peor serie de hoy,
  // acotada al rango de la rutina para que nunca salga "12 a 10" ni un mínimo bajo el prescrito.
  const minReps = Math.min(...hechas.map((s) => s.reps));
  const desde = Math.min(e.repsMax, Math.max(e.repsMin, minReps));

  // ── Lineal ───────────────────────────────────────────────────────────────────
  // Sube el peso cada sesión que se completa; baja un 10 % tras dos sesiones fallidas. Solo aplica
  // con lastre: un ejercicio lineal sin kilos cae a la lógica de doble progresión de más abajo (y
  // sin aviso en el texto, porque el método sigue siendo "lineal").
  if (e.metodo === 'lineal' && !sinLastre) {
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
      // Se baja al 90 % y se redondea al múltiplo del incremento, para que el peso exista en el
      // gimnasio (60 kg por 0,9 da 54; con discos de 2,5 se sugiere 55).
      const nuevo = Math.max(0, redondearCarga(peso * 0.9, inc));
      return {
        ...base,
        pesoKg: nuevo,
        motivo: 'lineal_baja',
        texto: `Dos sesiones sin completar las series. Baja a ${fmtKg(nuevo)} y vuelve a subir desde ahí.`,
      };
    }
    // Una sola sesión corta, o menos series de las prescritas: se repite el mismo peso.
    return {
      ...base,
      pesoKg: peso,
      motivo: 'lineal_mantiene',
      texto: `Repite ${fmtKg(peso)} × ${e.series} × ${e.repsMin}. Cuando completes todas las series, sube a ${fmtKg(redondear(peso + inc))}.`,
    };
  }

  // ── Doble progresión ─────────────────────────────────────────────────────────
  // También atiende porcentual, por RM, descendentes y cluster: para esos el texto termina con un
  // aviso de que hoy se calcula como doble progresión, así el alumno no cree que hubo un cálculo
  // especial. Cuando alguno tenga su propia regla, sacarlo de aquí y quitarle el aviso.
  const aviso =
    e.metodo === 'doble_progresion' || e.metodo === 'lineal'
      ? ''
      : ` (${nombreMetodo(e.metodo)}: en esta versión se calcula como doble progresión).`;

  // Tope del rango: todas las series prescritas, todas al máximo de repeticiones, ninguna marcada
  // como fallo y el RIR declarado igual o mayor al objetivo. Si el alumno no marcó RIR (null), se
  // le cree y cuenta como cumplido.
  const alTope =
    todasLasSeries &&
    hechas.every((s) => !s.fallo && s.reps >= e.repsMax && (s.rir == null || s.rir >= e.rirObjetivo));

  if (alTope) {
    if (sinLastre) {
      // Sin kilos que subir, se corre el rango dos repeticiones hacia arriba (8 a 10 pasa a 10 a 12)
      // y la sugerencia trae ese rango nuevo para que la próxima sesión lo precargue.
      const nuevoMin = e.repsMax;
      const nuevoMax = e.repsMax + 2;
      return {
        ...base,
        pesoKg: peso,
        repsMin: nuevoMin,
        repsMax: nuevoMax,
        motivo: 'sin_lastre_sube_reps',
        texto:
          `Llegaste al tope del rango. Próxima sesión intenta ${objetivo(peso, nuevoMin, nuevoMax)}, ` +
          `o pasa a una variante más difícil.` +
          aviso,
      };
    }
    // Con lastre: sube un incremento y vuelve al mínimo del rango (repsMin y repsMax quedan los de
    // la rutina, vienen en `base`). El texto adelanta el paso siguiente para que el alumno sepa
    // qué viene sin abrir la app.
    const nuevo = redondear(peso + inc);
    return {
      ...base,
      pesoKg: nuevo,
      motivo: 'tope_del_rango',
      texto:
        `Llegaste al tope del rango. Próxima sesión intenta ${objetivo(nuevo, e.repsMin, e.repsMax)}. ` +
        `Si consigues ${e.repsMax} o más con RIR ${e.rirObjetivo} o más, sube a ${fmtKg(redondear(nuevo + inc))}.` +
        aviso,
    };
  }

  if (fallaron) {
    if (fallaronAntes) {
      // Dos sesiones seguidas bajo el mínimo: se baja un incremento. Sin lastre no hay kilos que
      // restar, así que `nuevo` no se usa en esa rama y el peso queda como estaba.
      const nuevo = Math.max(0, redondear(peso - inc));
      if (sinLastre) {
        return {
          ...base,
          pesoKg: peso,
          motivo: 'baja_dos_sesiones',
          texto: `Dos sesiones bajo ${e.repsMin} repeticiones. Prueba una variante más fácil o un rango más corto.` + aviso,
        };
      }
      // Si al restar el incremento se llega a 0, el consejo es sacar el lastre, no "bajar a 0 kg".
      return {
        ...base,
        pesoKg: nuevo,
        motivo: 'baja_dos_sesiones',
        texto:
          (nuevo > 0
            ? `Dos sesiones bajo ${e.repsMin} repeticiones. Baja a ${fmtKg(nuevo)} y trabaja de ${e.repsMin} a ${e.repsMax}.`
            : `Dos sesiones bajo ${e.repsMin} repeticiones. Quita el lastre y trabaja de ${e.repsMin} a ${e.repsMax}.`) + aviso,
      };
    }
    // Primera sesión corta: se perdona. Mismo peso y la meta es llegar al mínimo en todas las series.
    return {
      ...base,
      pesoKg: peso,
      motivo: 'bajo_el_minimo',
      texto:
        `Mantén ${peso > 0 ? fmtKg(peso) : 'el peso corporal'} y apunta a ${e.repsMin} o más en todas las series.` + aviso,
    };
  }

  // Dentro del rango (ni al tope ni bajo el mínimo): mismo peso, y el mínimo del rango sube a lo
  // que ya hizo hoy (`desde`) para que la próxima sesión no arranque más abajo de lo logrado.
  const subir = sinLastre ? 'sube el rango de repeticiones' : `sube a ${fmtKg(redondear(peso + inc))}`;
  return {
    ...base,
    pesoKg: peso,
    repsMin: desde,
    motivo: 'dentro_del_rango',
    texto:
      `Próxima sesión intenta ${objetivo(peso, desde, e.repsMax)}. ` +
      `Si consigues ${e.repsMax} o más con RIR ${e.rirObjetivo} o más, ${subir}.` +
      aviso,
  };
}
