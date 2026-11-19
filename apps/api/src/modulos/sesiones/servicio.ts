// ─────────────────────────────────────────────────────────────────────────────
// Servicio de sesiones · Zona: Sesiones (API)
//
// Qué hace: lo que cambia la base al entrenar: iniciar una sesión con el id del celular (mismo id,
// misma sesión), guardar series por id (idempotente), cerrar con calcularCierre de
// @gymtrack/shared (volumen, kcal, PRs y sugerencias, igual que el celular), descartar, armar el
// resumen de cierre (que se puede volver a pedir y sale igual, P-18) y la alerta de dolor fuerte.
// Reglas de fondo (422 BUSINESS_RULE con details.campo y details.motivo): fechas del teléfono no
// más de 24 h en el futuro, cierre no antes del inicio, duración no más larga que el tiempo entre
// inicio y cierre, repeticiones hasta 60 (o 600 segundos en un ejercicio de tiempo) y una serie
// hecha con al menos una repetición salvo al fallo. Cerrar dos veces no duplica nada: la ruta
// devuelve el mismo resumen (INT-100) o 409 SESSION_CLOSED desde otro teléfono.
// Tócalo cuando: cambie una regla de sesión o de cierre del lado del servidor.
// No lo toques para: las rutas (index.ts), Hoy (hoy.ts) ni las fórmulas (packages/shared).
// Depende de: @gymtrack/shared, el cliente de Prisma y src/compartido.
// ─────────────────────────────────────────────────────────────────────────────
import {
  calcularCierre, e1rm as e1rmEpley, errorRepsSegun, kcalEstimadas, marcaVigente, maxRepsSegun, mejorMarca, rpeDesdeRir,
  type ResumenCierreApi, type SerieEntrenoApi, type SesionDetalleApi, type SesionEntrenoApi, type ObservacionApi,
  type SessionExercise, type WorkoutSession,
} from '@gymtrack/shared';
import type { z } from 'zod';
import type { esquemaFinSesion, esquemaSeriesLote, esquemaSesionNueva } from '@gymtrack/shared';
import { fallar, noEncontrado } from '../../compartido';
import type { BaseDeDatos } from '../../db';
import type { Observacion, Prisma, Serie, SesionEntreno, Usuario } from '../../generado/prisma/client';
import { fechaLocal, sumarDias, diaIso } from './fechas';

export type Db = BaseDeDatos | Prisma.TransactionClient;

// ── Umbrales (P-34: configuración del servidor, con estos valores por defecto) ─
export const UMBRAL_DOLOR = Number(process.env.UMBRAL_DOLOR_INTENSIDAD ?? 7);
/** Cuánto puede adelantarse el reloj del celular (SYNC-018: 2 horas sí, 3 días no). */
export const TOLERANCIA_FUTURO_MS = Number(process.env.TOLERANCIA_RELOJ_CELULAR_MS ?? 86_400_000);

// ── A la forma de la API ─────────────────────────────────────────────────────
type SesionConDia = SesionEntreno & { dia: { nombre: string } | null; series: Serie[] };

export function serieAApi(s: Serie): SerieEntrenoApi {
  return {
    id: s.id, session_id: s.sesionId, exercise_id: s.ejercicioId, routine_exercise_id: s.ejercicioRutinaId,
    serie_n: s.serieN, peso_kg: s.pesoKg, reps: s.reps, rir: s.rir, rpe: s.rpe, completada: s.completada,
    fallo: s.fallo, tiempo_s: s.tiempoS, descanso_real_s: s.descansoRealS, e1rm: s.e1rm, nota: s.nota,
  };
}

export function sesionAApi(s: SesionConDia): SesionEntrenoApi {
  const dolor = s.dolorGeneral as { zona?: unknown; intensidad?: unknown } | null;
  return {
    id: s.id, client_id: s.alumnoId, routine_id: s.rutinaId, routine_day_id: s.diaRutinaId,
    routine_version: s.routineVersion, nombre_dia: s.dia?.nombre ?? null, estado: s.estado,
    iniciada_at: s.iniciadaAt.toISOString(), cerrada_at: s.cerradaAt?.toISOString() ?? null,
    duracion_s: s.duracionS, volumen_kg: s.volumenKg, kcal_estimadas: s.kcalEstimadas,
    series_completadas: s.series.filter((x) => x.completada).length,
    observacion: s.observacion,
    dolor_general: dolor && typeof dolor.zona === 'string' && typeof dolor.intensidad === 'number'
      ? { zona: dolor.zona, intensidad: dolor.intensidad } : null,
    device_id: s.deviceId,
  };
}

type ObservacionConAutor = Observacion & { autor: Pick<Usuario, 'id' | 'nombre' | 'apellido' | 'rol'> };
export const INCLUIR_AUTOR = { autor: { select: { id: true, nombre: true, apellido: true, rol: true } } } as const;

export function observacionAApi(o: ObservacionConAutor): ObservacionApi {
  return {
    id: o.id, autor_id: o.autorId, autor: o.autor, client_id: o.alumnoId, tipo: o.tipo, texto: o.texto,
    exercise_id: o.ejercicioId, session_id: o.sesionId, set_id: o.serieId, routine_id: o.rutinaId,
    dolor_zona: o.dolorZona, dolor_intensidad: o.dolorIntensidad, created_at: o.createdAt.toISOString(),
  };
}

export async function detalleSesion(db: Db, id: string): Promise<SesionDetalleApi> {
  const s = await db.sesionEntreno.findUnique({
    where: { id },
    include: {
      dia: { select: { nombre: true } },
      series: { orderBy: [{ createdAt: 'asc' }, { serieN: 'asc' }, { id: 'asc' }] },
      observaciones: { include: INCLUIR_AUTOR, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!s) noEncontrado();
  return { ...sesionAApi(s), series: s.series.map(serieAApi), observaciones: s.observaciones.map(observacionAApi) };
}

/** La sesión del alumno o 404 (la de otra persona responde igual que una inventada). */
export async function sesionDelAlumno(db: Db, id: string, alumnoId: string): Promise<SesionEntreno> {
  const s = await db.sesionEntreno.findUnique({ where: { id } });
  if (!s || s.alumnoId !== alumnoId) noEncontrado();
  return s;
}

const TEXTO_FUTURO = 'La fecha está demasiado en el futuro. Revisa la hora del teléfono.';

function revisarFuturo(fecha: Date, ahora: Date, campo: string): void {
  if (fecha.getTime() > ahora.getTime() + TOLERANCIA_FUTURO_MS) {
    fallar('BUSINESS_RULE', { campo, regla: 'fecha_futura', motivo: TEXTO_FUTURO }, TEXTO_FUTURO);
  }
}

/** Cuánto puede pasar la duración que manda el teléfono al tiempo entre el inicio y el cierre. */
const HOLGURA_DURACION_S = 60;

// ── Iniciar ──────────────────────────────────────────────────────────────────
export type EntradaSesion = z.output<typeof esquemaSesionNueva>;

/** Crea la sesión o devuelve la que ya existe con ese id. `creada` dice si es nueva (201) o no (200). */
export async function iniciarSesion(db: Db, alumnoId: string, e: EntradaSesion, ahora: Date): Promise<{ creada: boolean }> {
  const existe = await db.sesionEntreno.findUnique({ where: { id: e.id } });
  if (existe) {
    if (existe.alumnoId !== alumnoId) noEncontrado();
    return { creada: false };
  }
  const iniciada = new Date(e.iniciada_at);
  revisarFuturo(iniciada, ahora, 'iniciada_at');
  let rutinaId: string | null = null;
  let version: number | null = null;
  let idsEjercicios: string[] = [];
  if (e.routine_day_id) {
    const dia = await db.diaRutina.findUnique({
      where: { id: e.routine_day_id },
      include: { rutina: true, ejercicios: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (!dia || dia.deletedAt || dia.rutina.deletedAt || dia.rutina.alumnoId !== alumnoId) noEncontrado();
    rutinaId = dia.rutinaId;
    version = e.routine_version ?? dia.rutina.version;
    idsEjercicios = dia.ejercicios.map((x) => x.id);
  }
  const enCurso = await db.sesionEntreno.findFirst({ where: { alumnoId, estado: 'en_curso' }, select: { id: true } });
  if (enCurso) fallar('SESSION_IN_PROGRESS', { session_id: enCurso.id });
  try {
    await db.sesionEntreno.create({
      data: {
        id: e.id, alumnoId, rutinaId, diaRutinaId: e.routine_day_id, routineVersion: version,
        iniciadaAt: iniciada, estado: 'en_curso', deviceId: e.device_id ?? null,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') fallar('SESSION_IN_PROGRESS');
    throw err;
  }
  // P-19: la sugerencia se «usa» al iniciar la sesión que la precarga.
  if (idsEjercicios.length > 0) {
    await db.sugerenciaProgresion.updateMany({
      where: { alumnoId, ejercicioRutinaId: { in: idsEjercicios }, estado: { in: ['pendiente', 'sobrescrita'] } },
      data: { estado: 'aplicada', aplicadaAt: ahora },
    });
  }
  return { creada: true };
}

// ── Series ───────────────────────────────────────────────────────────────────
export type LoteSeries = z.output<typeof esquemaSeriesLote>;

export function exigirEnCurso(s: SesionEntreno): void {
  if (s.estado === 'cerrada') fallar('SESSION_CLOSED', { session_id: s.id });
  if (s.estado === 'descartada') fallar('SESSION_DISCARDED', { session_id: s.id });
}

/** Reemplaza por id las series enviadas (el mismo lote varias veces deja lo mismo: INT-092). */
export async function guardarSeries(db: Db, s: SesionEntreno, lote: LoteSeries): Promise<void> {
  exigirEnCurso(s);
  const idsEj = [...new Set(lote.series.map((x) => x.exercise_id))];
  const ejercicios = await db.ejercicio.findMany({ where: { id: { in: idsEj } }, select: { id: true, tipoCarga: true, duenoId: true } });
  const porId = new Map(ejercicios.map((x) => [x.id, x]));
  const idsRe = [...new Set(lote.series.flatMap((x) => (x.routine_exercise_id ? [x.routine_exercise_id] : [])))];
  const delaRutina = idsRe.length && s.rutinaId
    ? new Set((await db.ejercicioRutina.findMany({ where: { id: { in: idsRe }, dia: { rutinaId: s.rutinaId } }, select: { id: true } })).map((x) => x.id))
    : new Set<string>();
  lote.series.forEach((x, i) => {
    const ej = porId.get(x.exercise_id);
    if (!ej) fallar('NOT_FOUND', { campo: `series.${i}.exercise_id` });
    if (x.routine_exercise_id && !delaRutina.has(x.routine_exercise_id)) {
      const motivo = 'El ejercicio no es de la rutina de esta sesión.';
      fallar('BUSINESS_RULE', { campo: `series.${i}.routine_exercise_id`, motivo }, motivo);
    }
    // Fondo: el tope de la «repetición» depende del ejercicio (60 repeticiones o 600 segundos).
    const tope = errorRepsSegun(ej.tipoCarga, x.reps);
    if (tope) fallar('BUSINESS_RULE', { campo: `series.${i}.reps`, regla: 'reps_maximas', maximo: maxRepsSegun(ej.tipoCarga), motivo: tope }, tope);
    // Una serie hecha tiene al menos una repetición; con 0 solo puede ser una serie al fallo.
    if (x.completada && !x.fallo && x.reps === 0) {
      const motivo = 'Una serie hecha necesita al menos 1 repetición. Si no salió ninguna, márcala al fallo.';
      fallar('BUSINESS_RULE', { campo: `series.${i}.reps`, regla: 'serie_sin_reps', motivo }, motivo);
    }
  });
  const ajenas = await db.serie.findMany({
    where: { id: { in: lote.series.map((x) => x.id) }, sesionId: { not: s.id } }, select: { id: true },
  });
  if (ajenas.length > 0) fallar('CONFLICT', { set_id: ajenas[0]!.id });
  for (const x of lote.series) {
    const tipo = porId.get(x.exercise_id)!.tipoCarga;
    const rir = x.rir ?? null;
    const datos = {
      ejercicioId: x.exercise_id, ejercicioRutinaId: x.routine_exercise_id ?? null, serieN: x.serie_n,
      pesoKg: x.peso_kg, reps: x.reps, rir, rpe: rir === null ? null : rpeDesdeRir(rir),
      completada: x.completada, fallo: x.fallo, tiempoS: x.tiempo_s ?? null, descansoRealS: x.descanso_real_s ?? null,
      e1rm: tipo === 'kg' ? e1rmEpley(x.peso_kg, x.reps) : null, nota: x.nota ?? null,
    };
    await db.serie.upsert({ where: { id: x.id }, create: { id: x.id, sesionId: s.id, alumnoId: s.alumnoId, ...datos }, update: datos });
  }
  if (lote.eliminadas.length > 0) await db.serie.deleteMany({ where: { sesionId: s.id, id: { in: lote.eliminadas } } });
  await db.sesionEntreno.update({ where: { id: s.id }, data: { updatedAt: new Date() } });
}

// ── Cierre ───────────────────────────────────────────────────────────────────
export type EntradaCierre = z.output<typeof esquemaFinSesion>;

type SerieCompleta = Prisma.SerieGetPayload<{ include: { ejercicio: true; ejercicioRutina: true } }>;

/** Una sesión de la base a la forma de packages/shared, para calcularCierre (CON-011). */
function aWorkoutSession(s: SesionEntreno, series: readonly SerieCompleta[]): WorkoutSession {
  const grupos = new Map<string, SessionExercise>();
  for (const x of [...series].sort((a, b) => a.serieN - b.serieN)) {
    const clave = x.ejercicioRutinaId ?? `suelto:${x.ejercicioId}`;
    let ej = grupos.get(clave);
    if (!ej) {
      const er = x.ejercicioRutina;
      ej = {
        id: clave, exerciseId: x.ejercicioId, routineExerciseId: x.ejercicioRutinaId, orden: grupos.size,
        nombre: x.ejercicio.nombre, tipoCarga: x.ejercicio.tipoCarga, descansoS: er?.descansoS ?? 90,
        objetivo: {
          series: er?.series ?? 0, repsMin: er?.repsMin ?? 1, repsMax: er?.repsMax ?? 1,
          rirObjetivo: er?.rirObjetivo ?? 2, incrementoKg: er?.incrementoKg ?? x.ejercicio.incrementoDefaultKg,
        },
        sets: [], observacion: '',
      };
      grupos.set(clave, ej);
    }
    ej.sets.push({ id: x.id, serieN: x.serieN, pesoKg: x.pesoKg, reps: x.reps, rir: x.rir, completada: x.completada, fallo: x.fallo });
  }
  return {
    id: s.id, routineId: s.rutinaId, routineDayId: s.diaRutinaId, nombreDia: '', iniciadaAt: s.iniciadaAt.toISOString(),
    cerradaAt: s.cerradaAt?.toISOString() ?? null, estado: s.estado, ejercicios: [...grupos.values()],
    duracionS: s.duracionS, volumenKg: s.volumenKg, kcalEstimadas: s.kcalEstimadas, observacion: s.observacion ?? '',
    sugerencias: [], prs: [],
  };
}

/** Cierra la sesión en curso: escribe totales, récords, sugerencias y la alerta de dolor. */
export async function cerrarSesion(db: Db, s: SesionEntreno, e: EntradaCierre, ahora: Date): Promise<void> {
  exigirEnCurso(s);
  const cerrada = new Date(e.cerrada_at);
  if (cerrada.getTime() < s.iniciadaAt.getTime()) {
    const motivo = 'El cierre no puede ser antes del inicio.';
    fallar('BUSINESS_RULE', { campo: 'cerrada_at', regla: 'cierre_antes_del_inicio', motivo }, motivo);
  }
  revisarFuturo(cerrada, ahora, 'cerrada_at');
  // La duración que mide el teléfono no puede ser más larga que el tiempo entre inicio y cierre.
  const transcurridoS = Math.ceil((cerrada.getTime() - s.iniciadaAt.getTime()) / 1000);
  if (e.duracion_s !== undefined && e.duracion_s > transcurridoS + HOLGURA_DURACION_S) {
    const motivo = 'La duración no puede ser más larga que el tiempo entre el inicio y el cierre.';
    fallar('BUSINESS_RULE', { campo: 'duracion_s', regla: 'duracion_mayor_al_intervalo', maximo: transcurridoS, motivo }, motivo);
  }
  const incluir = { ejercicio: true, ejercicioRutina: true } as const;
  const series = await db.serie.findMany({ where: { sesionId: s.id }, include: incluir });
  const idsEj = [...new Set(series.map((x) => x.ejercicioId))];
  const previasDb = idsEj.length === 0 ? [] : await db.sesionEntreno.findMany({
    where: { alumnoId: s.alumnoId, estado: 'cerrada', id: { not: s.id }, cerradaAt: { lte: cerrada }, series: { some: { ejercicioId: { in: idsEj } } } },
    include: { series: { where: { ejercicioId: { in: idsEj } }, include: incluir } },
  });
  const previas = previasDb.map((p) => aWorkoutSession(p, p.series));
  const rutina = s.rutinaId ? await db.rutina.findUnique({ where: { id: s.rutinaId }, select: { metodoProgresion: true } }) : null;
  const medida = await db.medidaCorporal.findFirst({
    where: { alumnoId: s.alumnoId, pesoKg: { not: null }, fecha: { lte: cerrada } }, orderBy: { fecha: 'desc' },
  });
  const peso = medida?.pesoKg ?? null;
  const cierre = calcularCierre({
    sesion: aWorkoutSession(s, series), previas, ejercicios: [], metodo: rutina?.metodoProgresion ?? 'doble_progresion',
    ahoraIso: cerrada.toISOString(), pesoCorporalKg: peso,
  });
  const duracion = e.duracion_s ?? cierre.duracionS ?? 0;
  const kcal = peso && peso > 0 ? kcalEstimadas(peso, duracion) : null;

  // Las series sin completar no quedan en la sesión cerrada (cierre.ts).
  await db.serie.deleteMany({ where: { sesionId: s.id, completada: false } });

  // Récords: la marca vigente es la fila sin superado_at; si no hay, se toma del historial.
  const porEjercicio = new Map<string, SessionExercise[]>();
  for (const ej of cierre.ejercicios) porEjercicio.set(ej.exerciseId, [...(porEjercicio.get(ej.exerciseId) ?? []), ej]);
  for (const [ejercicioId, ejs] of porEjercicio) {
    const tipoCarga = ejs[0]!.tipoCarga;
    const mejor = mejorMarca(tipoCarga, ejs.flatMap((x) => x.sets));
    if (!mejor) continue;
    let vigente = await db.recordPersonal.findFirst({ where: { alumnoId: s.alumnoId, ejercicioId, tipo: mejor.tipo, superadoAt: null } });
    if (!vigente) {
      const previa = marcaVigente(ejercicioId, tipoCarga, previas);
      if (previa && previa.tipo === mejor.tipo) {
        vigente = await db.recordPersonal.create({
          data: { alumnoId: s.alumnoId, ejercicioId, tipo: previa.tipo, valor: previa.valor, serieId: previa.set.id, sesionId: previa.sessionId, fecha: new Date(previa.fecha) },
        });
      }
    }
    if (vigente && !(mejor.valor > vigente.valor)) continue;
    if (vigente) await db.recordPersonal.update({ where: { id: vigente.id }, data: { superadoAt: cerrada } });
    await db.recordPersonal.create({
      data: { alumnoId: s.alumnoId, ejercicioId, tipo: mejor.tipo, valor: mejor.valor, serieId: mejor.set.id, sesionId: s.id, fecha: cerrada },
    });
  }

  for (const sug of cierre.sugerencias) {
    await db.sugerenciaProgresion.create({
      data: {
        alumnoId: s.alumnoId, ejercicioRutinaId: sug.routineExerciseId, sesionId: s.id, metodo: sug.metodo,
        sugerencia: { peso_kg: sug.pesoKg, reps_min: sug.repsMin, reps_max: sug.repsMax, rir: sug.rir },
        texto: sug.texto, motivo: sug.motivo,
      },
    });
  }

  await db.sesionEntreno.update({
    where: { id: s.id },
    data: {
      estado: 'cerrada', cerradaAt: cerrada, duracionS: duracion, volumenKg: cierre.volumenKg ?? 0, kcalEstimadas: kcal,
      observacion: e.observacion ?? s.observacion, dolorGeneral: e.dolor_general ?? undefined,
      deviceId: s.deviceId ?? e.device_id ?? null,
    },
  });

  if (e.dolor_general && e.dolor_general.intensidad >= UMBRAL_DOLOR) {
    await crearAlertaDolor(db, s.alumnoId, null, { session_id: s.id, zona: e.dolor_general.zona, intensidad: e.dolor_general.intensidad });
  }
}

/**
 * Alerta de dolor fuerte para el entrenador con vínculo activo (§Datos: intensidad 7 o más avisa
 * al instante). Sin entrenador no se crea. No repite una abierta del mismo ejercicio (o de la sesión).
 */
export async function crearAlertaDolor(db: Db, alumnoId: string, ejercicioId: string | null, detalle: Record<string, unknown>): Promise<boolean> {
  const v = await db.vinculoEntrenador.findFirst({ where: { alumnoId, estado: 'activo' } });
  if (!v) return false;
  const abierta = await db.alerta.findFirst({ where: { alumnoId, tipo: 'dolor', ejercicioId, estado: { not: 'resuelta' } } });
  if (abierta) return false;
  await db.alerta.create({ data: { alumnoId, entrenadorId: v.entrenadorId, tipo: 'dolor', ejercicioId, detalle: detalle as Prisma.InputJsonValue } });
  return true;
}

// ── Resumen de cierre ────────────────────────────────────────────────────────
/** El resumen de una sesión cerrada, armado desde la base: pedirlo dos veces da lo mismo (INT-100). */
export async function resumenDeCierre(db: Db, id: string, timezone: string): Promise<ResumenCierreApi> {
  const s = await db.sesionEntreno.findUniqueOrThrow({ where: { id }, include: { series: { select: { completada: true } } } });
  const records = await db.recordPersonal.findMany({
    where: { sesionId: id, tipo: { in: ['e1rm', 'reps', 'tiempo'] } }, include: { ejercicio: { select: { nombre: true } } }, orderBy: { createdAt: 'asc' },
  });
  const prs: ResumenCierreApi['prs'] = [];
  for (const r of records) {
    // Récords de relleno del historial (ver cerrarSesion) llevan otra sesión; solo cuentan los de esta.
    const anterior = await db.recordPersonal.findFirst({
      where: { alumnoId: r.alumnoId, ejercicioId: r.ejercicioId, tipo: r.tipo, superadoAt: r.fecha, id: { not: r.id } }, orderBy: { valor: 'desc' },
    });
    prs.push({ exercise_id: r.ejercicioId, nombre: r.ejercicio.nombre, tipo: r.tipo as 'e1rm' | 'reps' | 'tiempo', valor: r.valor, anterior: anterior?.valor ?? null });
  }
  const sugs = await db.sugerenciaProgresion.findMany({
    where: { sesionId: id }, include: { ejercicioRutina: { include: { ejercicio: { select: { id: true, nombre: true } } } } }, orderBy: { createdAt: 'asc' },
  });
  const alertas = await db.alerta.findMany({
    where: { alumnoId: s.alumnoId, detalle: { path: ['session_id'], equals: id } }, include: { ejercicio: { select: { nombre: true } } },
  });
  return {
    session: {
      id: s.id, estado: s.estado, series_completadas: s.series.filter((x) => x.completada).length,
      volumen_kg: s.volumenKg ?? 0, kcal_estimadas: s.kcalEstimadas, duracion_s: s.duracionS ?? 0,
    },
    prs,
    sugerencias: sugs.map((x) => {
      const v = x.sugerencia as { peso_kg: number; reps_min: number; reps_max: number; rir: number };
      return {
        id: x.id, routine_exercise_id: x.ejercicioRutinaId, exercise_id: x.ejercicioRutina.ejercicio.id,
        nombre: x.ejercicioRutina.ejercicio.nombre, metodo: x.metodo,
        sugerencia: { peso_kg: v.peso_kg, reps_min: v.reps_min, reps_max: v.reps_max, rir: v.rir }, texto: x.texto,
      };
    }),
    alertas_creadas: alertas.map((a) => ({ tipo: a.tipo, exercise_id: a.ejercicioId, nombre: a.ejercicio?.nombre ?? null })),
    proxima_sesion: await proximaSesion(db, s, timezone),
  };
}

/** El día que sigue en el ciclo y una fecha sugerida (día fijo o 7 / días por semana). */
async function proximaSesion(db: Db, s: SesionEntreno, timezone: string): Promise<ResumenCierreApi['proxima_sesion']> {
  if (!s.rutinaId || !s.cerradaAt) return null;
  const dias = await db.diaRutina.findMany({ where: { rutinaId: s.rutinaId, deletedAt: null }, orderBy: [{ orden: 'asc' }, { id: 'asc' }] });
  if (dias.length === 0) return null;
  const i = dias.findIndex((d) => d.id === s.diaRutinaId);
  const sig = dias[(i + 1) % dias.length]!;
  const hoy = fechaLocal(s.cerradaAt, timezone);
  let fecha = sumarDias(hoy, Math.max(1, Math.round(7 / dias.length)));
  if (sig.diaSemana) {
    for (let n = 1; n <= 7; n++) {
      const f = sumarDias(hoy, n);
      if (diaIso(f) === sig.diaSemana) { fecha = f; break; }
    }
  }
  return { routine_day_id: sig.id, nombre: sig.nombre, fecha_sugerida: fecha };
}

// ── Descartar ────────────────────────────────────────────────────────────────
export async function descartarSesion(db: Db, s: SesionEntreno): Promise<void> {
  if (s.estado === 'cerrada') fallar('SESSION_CLOSED', { session_id: s.id });
  if (s.estado === 'descartada') return;
  await db.sesionEntreno.update({ where: { id: s.id }, data: { estado: 'descartada' } });
}

/** true si las series guardadas son las mismas que trae la copia (mismo id, peso, reps y RIR). */
export async function mismasSeries(db: Db, id: string, series: readonly { id: string; peso_kg: number; reps: number; rir?: number | null; completada: boolean }[]): Promise<boolean> {
  const guardadas = await db.serie.findMany({ where: { sesionId: id } });
  const hechas = series.filter((x) => x.completada);
  if (guardadas.length !== hechas.length) return false;
  const porId = new Map(guardadas.map((g) => [g.id, g]));
  return hechas.every((x) => {
    const g = porId.get(x.id);
    return g !== undefined && g.pesoKg === x.peso_kg && g.reps === x.reps && (g.rir ?? null) === (x.rir ?? null);
  });
}
