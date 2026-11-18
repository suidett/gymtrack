// ─────────────────────────────────────────────────────────────────────────────
// Sugerencias de carga · Zona: Progreso (API)
//
// Qué hace: todo lo de progression_suggestions del lado del servidor.
//   - generarSugerenciasDeCierre: al cerrar una sesión, corre el motor de @gymtrack/shared
//     (sugerirProgresion) por cada ejercicio de la rutina que tuvo series completadas y guarda una
//     sugerencia por ejercicio de rutina (única por sesión). La llama el cierre de sesiones.
//   - aplicarSugerencias: al iniciar la sesión que las precarga, pasan a «aplicada» y desde ahí
//     no se pueden sobrescribir (P-19). La llama POST /sessions.
//   - vigentesDe: lo que precarga la próxima sesión (la sobrescritura o la calculada) para GET /me/today.
//   - sugerenciaAApi y la regla de la sobrescritura del entrenador o del alumno solo (EP-54, EP-55).
// La columna `sugerencia` guarda { peso_kg, reps_min, reps_max, rir }; se leen también filas con
// camelCase por si otro módulo las escribió así.
// Tócalo cuando: cambie qué se guarda de una sugerencia o cuándo se usa.
// No lo toques para: la regla de progresión (packages/shared/src/progression.ts).
// Depende de: la base, ./consultas (aWorkoutSet) y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { sugerirProgresion, type MetodoProgresion } from '@gymtrack/shared';
import type { Prisma, SugerenciaProgresion } from '../../generado/prisma/client';
import { aWorkoutSet, type Db } from './consultas';

type Tx = Pick<Db, 'sesionEntreno' | 'serie' | 'ejercicioRutina' | 'sugerenciaProgresion'>;

export interface ValorSugerencia {
  peso_kg: number;
  reps_min: number;
  reps_max: number;
  rir: number | null;
}

// ── Lectura de la columna json ───────────────────────────────────────────────
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** La sugerencia calculada desde la columna json (snake_case, o camelCase si la escribió el motor tal cual). */
export function leerValor(json: Prisma.JsonValue | null): ValorSugerencia {
  const o = (json && typeof json === 'object' && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  return {
    peso_kg: num(o.peso_kg) ?? num(o.pesoKg) ?? 0,
    reps_min: num(o.reps_min) ?? num(o.repsMin) ?? 1,
    reps_max: num(o.reps_max) ?? num(o.repsMax) ?? 1,
    rir: num(o.rir),
  };
}

export function leerValorFinal(json: Prisma.JsonValue | null): (ValorSugerencia & { nota: string | null }) | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const nota = (json as Record<string, unknown>).nota;
  return { ...leerValor(json), nota: typeof nota === 'string' ? nota : null };
}

/** Lo que va a precargar la próxima sesión: la sobrescritura si la hay, si no la calculada. */
export function vigenteDe(s: Pick<SugerenciaProgresion, 'sugerencia' | 'valorFinal' | 'estado'>) {
  const final = s.estado === 'sobrescrita' ? leerValorFinal(s.valorFinal) : null;
  return final ?? { ...leerValor(s.sugerencia), nota: null };
}

// ── Generar al cerrar ────────────────────────────────────────────────────────
export interface SugerenciaDeCierre {
  id: string;
  routine_exercise_id: string;
  exercise_id: string;
  nombre: string;
  metodo: MetodoProgresion;
  sugerencia: ValorSugerencia;
  texto: string;
}

/**
 * Corre el motor por cada ejercicio de rutina con series completadas en la sesión y guarda la
 * sugerencia (una por sesión y ejercicio de rutina: llamarla dos veces no duplica). Devuelve la
 * lista con la forma de `sugerencias` del contrato del cierre (§API).
 */
export async function generarSugerenciasDeCierre(tx: Tx, sesionId: string): Promise<SugerenciaDeCierre[]> {
  const sesion = await tx.sesionEntreno.findUnique({
    where: { id: sesionId },
    include: { rutina: { select: { metodoProgresion: true } }, series: true },
  });
  if (!sesion || !sesion.rutina) return [];
  const idsRe = [...new Set(sesion.series.flatMap((s) => (s.ejercicioRutinaId ? [s.ejercicioRutinaId] : [])))];
  if (idsRe.length === 0) return [];
  const ejercicios = await tx.ejercicioRutina.findMany({
    where: { id: { in: idsRe } },
    include: { ejercicio: { select: { id: true, nombre: true } } },
    orderBy: { orden: 'asc' },
  });
  const salida: SugerenciaDeCierre[] = [];
  for (const re of ejercicios) {
    const actuales = sesion.series.filter((s) => s.ejercicioRutinaId === re.id).map(aWorkoutSet);
    // Las series de la sesión cerrada anterior con ese mismo ejercicio de rutina.
    const previa = await tx.serie.findFirst({
      where: { ejercicioRutinaId: re.id, alumnoId: sesion.alumnoId, sesionId: { not: sesion.id }, sesion: { estado: 'cerrada' } },
      orderBy: { sesion: { cerradaAt: 'desc' } },
      select: { sesionId: true },
    });
    const anteriores = previa
      ? (await tx.serie.findMany({ where: { sesionId: previa.sesionId, ejercicioRutinaId: re.id } })).map(aWorkoutSet)
      : null;
    const metodo = sesion.rutina.metodoProgresion as MetodoProgresion;
    const s = sugerirProgresion({
      metodo,
      routineExerciseId: re.id,
      exerciseId: re.ejercicioId,
      nombre: re.ejercicio.nombre,
      series: re.series,
      repsMin: re.repsMin,
      repsMax: re.repsMax,
      rirObjetivo: re.rirObjetivo,
      incrementoKg: re.incrementoKg,
      setsActuales: actuales,
      setsAnteriores: anteriores,
    });
    if (!s) continue;
    const valor: ValorSugerencia = { peso_kg: s.pesoKg, reps_min: s.repsMin, reps_max: s.repsMax, rir: s.rir };
    const fila = await tx.sugerenciaProgresion.upsert({
      where: { sesionId_ejercicioRutinaId: { sesionId: sesion.id, ejercicioRutinaId: re.id } },
      create: {
        alumnoId: sesion.alumnoId, ejercicioRutinaId: re.id, sesionId: sesion.id, metodo,
        sugerencia: valor as unknown as Prisma.InputJsonValue, texto: s.texto, motivo: s.motivo,
      },
      update: {},
    });
    salida.push({ id: fila.id, routine_exercise_id: re.id, exercise_id: re.ejercicioId, nombre: re.ejercicio.nombre, metodo, sugerencia: valor, texto: s.texto });
  }
  return salida;
}

// ── Usar al iniciar (P-19) ───────────────────────────────────────────────────
/**
 * La última sugerencia sin usar de cada uno de esos ejercicios de rutina (pendiente o sobrescrita).
 * Es la que muestra Hoy y la que precarga la sesión.
 */
export async function vigentesDe(tx: Pick<Db, 'sugerenciaProgresion'>, ejercicioRutinaIds: readonly string[]) {
  if (ejercicioRutinaIds.length === 0) return new Map<string, SugerenciaProgresion>();
  const filas = await tx.sugerenciaProgresion.findMany({
    where: { ejercicioRutinaId: { in: [...ejercicioRutinaIds] }, estado: { not: 'aplicada' } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const porRe = new Map<string, SugerenciaProgresion>();
  for (const f of filas) if (!porRe.has(f.ejercicioRutinaId)) porRe.set(f.ejercicioRutinaId, f);
  return porRe;
}

/**
 * Al iniciar la sesión de ese día de rutina, las sugerencias sin usar de sus ejercicios pasan a
 * aplicada (P-19). Devuelve lo que precargan, por ejercicio de rutina.
 */
export async function aplicarSugerencias(tx: Pick<Db, 'sugerenciaProgresion' | 'ejercicioRutina'>, alumnoId: string, diaRutinaId: string, ahora: Date) {
  const res = await tx.ejercicioRutina.findMany({ where: { diaRutinaId, deletedAt: null }, select: { id: true } });
  const vigentes = await vigentesDe(tx, res.map((r) => r.id));
  const precarga = new Map<string, ReturnType<typeof vigenteDe>>();
  for (const [reId, s] of vigentes) precarga.set(reId, vigenteDe(s));
  await tx.sugerenciaProgresion.updateMany({
    where: { alumnoId, ejercicioRutinaId: { in: res.map((r) => r.id) }, estado: { not: 'aplicada' } },
    data: { estado: 'aplicada', aplicadaAt: ahora },
  });
  return precarga;
}
