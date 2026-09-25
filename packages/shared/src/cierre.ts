// ─────────────────────────────────────────────────────────────────────────────
// Cierre de sesión y récords · Zona: Motor
//
// Qué hace: define cómo se mide una serie según el tipo de carga del ejercicio (1RM estimado en
// kilos, repeticiones en peso corporal, segundos en tiempo), cómo se compara una marca con otra
// para saber si hay récord, y qué pasa cuando el alumno cierra una sesión: se descartan las series
// sin completar, se calculan duración, volumen y calorías, se detectan los récords y se le pide al
// motor de progresión la sugerencia de la próxima sesión para cada ejercicio de la rutina.
// Tócalo cuando: cambies qué cuenta como récord (la medida, el desempate por lastre, qué pasa si
// el ejercicio cambia de tipo de carga), cómo se escribe una marca (fmtMarca, etiquetaMarca) o qué
// se calcula al cerrar (totales, qué ejercicios reciben sugerencia). Pruebas en __tests__/cierre.test.ts.
// No lo toques para: cambiar la regla de progresión o su texto (progression.ts), las fórmulas de
// 1RM, volumen o calorías (formulas.ts), cómo se buscan las series de la sesión anterior
// (historial.ts), ni el momento en que la app llama al cierre (cerrarSesion en
// apps/mobile/src/store/useStore.ts). Las pantallas solo muestran lo que sale de aquí.
// Depende de: formulas.ts (e1rmComparable, kcalEstimadas, redondear, volumenSets), format.ts
// (fmtKg), historial.ts (setsAnteriores), progression.ts (sugerirProgresion) y types.ts (Exercise,
// MetodoProgresion, PR, Sugerencia, TipoCarga, TipoPR, WorkoutSession, WorkoutSet).
// ─────────────────────────────────────────────────────────────────────────────

import { e1rmComparable, kcalEstimadas, redondear, volumenSets } from './formulas';
import { fmtKg } from './format';
import { sesionesCerradas, setsAnteriores } from './historial';
import { sugerirProgresion } from './progression';
import type { Exercise, MetodoProgresion, PR, Sugerencia, TipoCarga, TipoPR, WorkoutSession, WorkoutSet } from './types';

// ── Marcas: cómo se mide una serie ───────────────────────────────────────────

/**
 * Una serie ya medida: el número con el que compite por el récord y de qué tipo es.
 * `valor` significa cosas distintas según `tipo`: kilos de 1RM estimado, repeticiones o segundos.
 * Por eso dos marcas solo se comparan si son del mismo tipo (ver superaMarca).
 */
export interface Marca {
  tipo: TipoPR;
  valor: number;
  /** Lastre de la serie (solo cuenta en peso corporal; desempata a igual valor). */
  lastreKg: number;
  /** La serie de la que salió, para poder señalarla en el resumen (setId del PR). */
  set: WorkoutSet;
}

/** Con qué se mide cada ejercicio: kilos por 1RM estimado, peso corporal por repeticiones, tiempo por segundos. */
export function tipoDeMarca(tipoCarga: TipoCarga): TipoPR {
  if (tipoCarga === 'tiempo') return 'tiempo';
  if (tipoCarga === 'peso_corporal') return 'reps';
  return 'e1rm';
}

/**
 * La medida de una serie. El tipo depende del ejercicio, nunca de la serie, así las marcas
 * siempre se comparan entre iguales.
 * Devuelve null si la serie no se completó o no tiene nada que medir (0 repeticiones, 0 segundos,
 * o kilos sin peso: e1rmComparable devuelve null con pesoKg 0). En peso corporal un pesoKg negativo
 * se trata como lastre 0.
 */
export function medidaDelSet(tipoCarga: TipoCarga, set: WorkoutSet): Marca | null {
  if (!set.completada) return null;
  if (tipoCarga === 'tiempo') return set.reps > 0 ? { tipo: 'tiempo', valor: set.reps, lastreKg: 0, set } : null;
  if (tipoCarga === 'peso_corporal') {
    return set.reps > 0 ? { tipo: 'reps', valor: set.reps, lastreKg: Math.max(0, set.pesoKg), set } : null;
  }
  // Se usa la versión "comparable" del 1RM (sin tope de 12 repeticiones) para que una serie de 15
  // sí pueda superar a una de 12; para mostrar el 1RM en pantalla se usa e1rm, que sí tiene tope.
  const v = e1rmComparable(set.pesoKg, set.reps);
  return v == null ? null : { tipo: 'e1rm', valor: v, lastreKg: 0, set };
}

/**
 * true si `a` supera a `b`. Marcas de tipos distintos no se comparan.
 * Contra null siempre gana (no había marca). A igual valor, desempata el lastre: 12 fondos con
 * 2,5 kg le ganan a 12 fondos sin lastre; 12 fondos con el mismo lastre no son récord nuevo.
 */
export function superaMarca(a: Marca, b: Marca | null): boolean {
  if (!b) return true;
  if (a.tipo !== b.tipo) return false;
  return a.valor > b.valor || (a.valor === b.valor && a.lastreKg > b.lastreKg);
}

/**
 * La mejor serie de un ejercicio dentro de una sesión, medida con el tipo de carga que se le pasa.
 * Devuelve null si ninguna serie se completó o ninguna tiene medida. Las series sin completar
 * las descarta medidaDelSet, así que sirve tanto para una sesión en curso como para una cerrada.
 */
export function mejorMarca(tipoCarga: TipoCarga, sets: readonly WorkoutSet[]): Marca | null {
  let mejor: Marca | null = null;
  for (const s of sets) {
    const m = medidaDelSet(tipoCarga, s);
    if (m && superaMarca(m, mejor)) mejor = m;
  }
  return mejor;
}

// ── Marca vigente en el historial ────────────────────────────────────────────

/** Una marca con la sesión y la fecha en que se hizo, para listarla en Progreso y en la ficha del ejercicio. */
export interface MarcaHistorica extends Marca {
  fecha: string;
  sessionId: string;
}

/**
 * El mejor registro del ejercicio en todas las sesiones cerradas. Cada sesión se
 * mide con el tipo de carga que tenía al registrarse; se prefiere el tipo actual
 * del ejercicio y, si no hay marcas de ese tipo, el de la sesión más reciente.
 *
 * Recibe el id del ejercicio, su tipo de carga actual y cualquier lista de sesiones (las que no
 * están cerradas se saltan). Devuelve null si el ejercicio nunca tuvo una serie con medida.
 * Se usa desde las pantallas (Progreso, Ejercicios, ficha) y desde calcularCierre para saber contra
 * qué comparar la marca de hoy.
 */
export function marcaVigente(
  exerciseId: string,
  tipoCarga: TipoCarga,
  sesiones: readonly WorkoutSession[],
): MarcaHistorica | null {
  // Primero se junta la mejor marca de cada sesión, medida como se registró en su momento
  // (ej.tipoCarga es la copia que quedó guardada en la sesión, no la del ejercicio actual).
  const marcas: MarcaHistorica[] = [];
  // De la más reciente a la más antigua, así marcas[0] es la última registrada.
  for (const s of sesionesCerradas(sesiones)) {
    for (const ej of s.ejercicios) {
      if (ej.exerciseId !== exerciseId) continue;
      const m = mejorMarca(ej.tipoCarga, ej.sets);
      if (m) marcas.push({ ...m, fecha: s.cerradaAt ?? s.iniciadaAt, sessionId: s.id });
    }
  }
  if (marcas.length === 0) return null;
  // Si el ejercicio cambió de tipo de carga, las marcas viejas son de otro tipo y no se comparan
  // con las nuevas. Con marcas del tipo actual, se compite solo entre esas; si no hay ninguna, se
  // toma el tipo de la primera marca de la lista (el orden es el de `sesiones`, tal como llegó).
  const preferido = tipoDeMarca(tipoCarga);
  const conTipo = marcas.filter((m) => m.tipo === preferido);
  const candidatas = conTipo.length > 0 ? conTipo : marcas.filter((m) => m.tipo === marcas[0]?.tipo);
  let mejor: MarcaHistorica | null = null;
  for (const m of candidatas) if (superaMarca(m, mejor)) mejor = m;
  return mejor;
}

// ── Formato de una marca ─────────────────────────────────────────────────────

/**
 * Cómo se escribe una marca en pantalla: "82,5 kg", "12 reps", "12 reps +2,5 kg" o "45 s".
 * Acepta tanto una Marca como un PR (por eso lastreKg es opcional: el "anterior" de un PR llega
 * solo con tipo y valor).
 */
export function fmtMarca(m: { tipo: TipoPR; valor: number; lastreKg?: number }): string {
  if (m.tipo === 'e1rm') return fmtKg(m.valor);
  if (m.tipo === 'reps') {
    const lastre = m.lastreKg ?? 0;
    return lastre > 0 ? `${m.valor} reps +${fmtKg(lastre)}` : `${m.valor} reps`;
  }
  return `${m.valor} s`;
}

/** Con qué se midió la marca, para ponerlo al lado del número: "1RM estimado", "repeticiones" o "segundos". */
export function etiquetaMarca(tipo: TipoPR): string {
  if (tipo === 'e1rm') return '1RM estimado';
  if (tipo === 'reps') return 'repeticiones';
  return 'segundos';
}

// ── Cierre de la sesión ──────────────────────────────────────────────────────

/**
 * Lo que necesita calcularCierre. La arma cerrarSesion en el store con lo que tiene a mano:
 * la sesión en curso, todas las sesiones guardadas, el método de la rutina y el perfil del alumno.
 */
export interface EntradaCierre {
  sesion: WorkoutSession;
  /** Todas las sesiones anteriores; se usan solo las cerradas. */
  previas: readonly WorkoutSession[];
  ejercicios: readonly Exercise[];
  /** Método de progresión de la rutina; si la sesión es libre, el store manda 'doble_progresion'. */
  metodo: MetodoProgresion;
  /** El "ahora" viene de afuera para que el cierre sea puro y se pueda probar con fechas fijas. */
  ahoraIso: string;
  /** Peso corporal del perfil, para las calorías. null o 0 deja las calorías en null. */
  pesoCorporalKg: number | null;
}

/**
 * Cierra una sesión: descarta las series no completadas, calcula duración,
 * volumen, calorías, récords y la sugerencia de la próxima sesión por ejercicio.
 * Es pura: devuelve la sesión cerrada sin tocar la original.
 *
 * Devuelve una copia de la sesión con estado 'cerrada', cerradaAt, los totales, `prs` y
 * `sugerencias` llenos. El store la guarda reemplazando a la sesión en curso, y la pantalla de
 * resumen solo la muestra.
 */
export function calcularCierre(e: EntradaCierre): WorkoutSession {
  // Contra qué se compara: solo cerradas, y nunca la sesión que se está cerrando (el store manda
  // la lista completa, incluida esta misma en estado 'en_curso').
  const cerradas = e.previas.filter((s) => s.estado === 'cerrada' && s.id !== e.sesion.id);
  // Las series pendientes desaparecen de la sesión guardada: el historial solo ve lo que se hizo.
  const ejercicios = e.sesion.ejercicios.map((ej) => ({ ...ej, sets: ej.sets.filter((s) => s.completada) }));

  // ── Totales de la sesión ─────────────────────────────────────────────────────
  // Duración en segundos desde que se abrió la sesión. El Math.max evita un número negativo si el
  // reloj del teléfono se movió hacia atrás.
  const duracionS = Math.max(
    0,
    Math.round((new Date(e.ahoraIso).getTime() - new Date(e.sesion.iniciadaAt).getTime()) / 1000),
  );
  // Volumen: kilos por repeticiones de todas las series hechas. Los ejercicios de tiempo no suman
  // (sus "reps" son segundos); en peso corporal solo suma el lastre, así que sin lastre aporta 0.
  const volumenKg = redondear(
    ejercicios.filter((ej) => ej.tipoCarga !== 'tiempo').reduce((a, ej) => a + volumenSets(ej.sets), 0),
  );

  // ── Récords y sugerencias por ejercicio ──────────────────────────────────────
  const prs: PR[] = [];
  const sugerencias: Sugerencia[] = [];
  for (const ej of ejercicios) {
    const mejor = mejorMarca(ej.tipoCarga, ej.sets);
    if (mejor) {
      // La marca previa solo compite si es del mismo tipo. Si el ejercicio cambió de tipo de carga,
      // la primera sesión con el tipo nuevo cuenta como "primer récord" (anterior: null).
      const previa = marcaVigente(ej.exerciseId, ej.tipoCarga, cerradas);
      const anterior = previa && previa.tipo === mejor.tipo ? previa : null;
      if (superaMarca(mejor, anterior)) {
        prs.push({
          exerciseId: ej.exerciseId,
          nombre: ej.nombre,
          tipo: mejor.tipo,
          valor: mejor.valor,
          lastreKg: mejor.lastreKg,
          anterior: anterior ? anterior.valor : null,
          setId: mejor.set.id,
          fecha: e.ahoraIso,
        });
      }
    }
    // Sugerencia solo para ejercicios que vienen de la rutina (los agregados a mano en la sesión no
    // tienen objetivo que progresar) y que no son de tiempo (el motor razona en kilos y
    // repeticiones). setsAnteriores busca por routineExerciseId, así que un mismo ejercicio en dos
    // rutinas distintas progresa por separado.
    if (ej.routineExerciseId && ej.tipoCarga !== 'tiempo') {
      const sug = sugerirProgresion({
        metodo: e.metodo,
        routineExerciseId: ej.routineExerciseId,
        exerciseId: ej.exerciseId,
        nombre: ej.nombre,
        series: ej.objetivo.series,
        repsMin: ej.objetivo.repsMin,
        repsMax: ej.objetivo.repsMax,
        rirObjetivo: ej.objetivo.rirObjetivo,
        incrementoKg: ej.objetivo.incrementoKg,
        setsActuales: ej.sets,
        setsAnteriores: setsAnteriores(ej.routineExerciseId, cerradas),
      });
      if (sug) sugerencias.push(sug);
    }
  }

  // ── Sesión cerrada ───────────────────────────────────────────────────────────
  // Copia nueva: la sesión original no se muta (el store la reemplaza por esta).
  return {
    ...e.sesion,
    ejercicios,
    estado: 'cerrada',
    cerradaAt: e.ahoraIso,
    duracionS,
    volumenKg,
    // Sin peso corporal en el perfil no se estiman calorías: queda null, no 0, para que la
    // pantalla pueda distinguir "no se calculó" de "cero".
    kcalEstimadas: e.pesoCorporalKg && e.pesoCorporalKg > 0 ? kcalEstimadas(e.pesoCorporalKg, duracionS) : null,
    prs,
    sugerencias,
  };
}
