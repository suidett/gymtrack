// ─────────────────────────────────────────────────────────────────────────────
// Consultas de progreso · Zona: Progreso (API)
//
// Qué hace: arma desde la base lo que muestran Progreso y la ficha del cliente: el historial de un
// ejercicio con el 1RM estimado y la mejor serie por sesión (EP-46), el volumen por semana en la
// zona del alumno (EP-47), los récords vigentes con su anterior (EP-48) y la tendencia de peso y
// medidas desde el tercer registro (P-30). Las marcas salen de las series guardadas con las
// fórmulas de @gymtrack/shared (mejorMarca, e1rm), así dan lo mismo que en el celular.
// Tócalo cuando: cambie qué se cuenta en una de esas cifras.
// No lo toques para: quién puede leerlas (index.ts) ni la forma de la respuesta (progreso.ts de
// packages/shared).
// Depende de: la base, ./zona y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import {
  CAMPOS_MEDIDA, DIAS_TENDENCIA, REGISTROS_PARA_TENDENCIA, e1rm, mejorMarca, redondear, tipoDeMarca,
  type CampoMedida, type TipoCarga, type WorkoutSet,
} from '@gymtrack/shared';
import type { BaseDeDatos } from '../../db';
import type { MedidaCorporal, RecordPersonal, Serie } from '../../generado/prisma/client';
import { diaDeFechaDb, diaLocal, diasEntre, inicioDelDia, lunesDe, sumarDias } from './zona';

export type Db = BaseDeDatos;

// ── Series ───────────────────────────────────────────────────────────────────
/** Una fila de workout_sets como la serie que entienden las fórmulas del paquete compartido. */
export function aWorkoutSet(s: Pick<Serie, 'id' | 'serieN' | 'pesoKg' | 'reps' | 'rir' | 'completada' | 'fallo'>): WorkoutSet {
  return { id: s.id, serieN: s.serieN, pesoKg: s.pesoKg, reps: s.reps, rir: s.rir, completada: s.completada, fallo: s.fallo };
}

/** Volumen de series completadas (peso × reps); los ejercicios de tiempo no suman (cierre.ts). */
export function volumenDeSeries(series: readonly { pesoKg: number; reps: number; completada: boolean; tipoCarga: TipoCarga }[]): number {
  return redondear(series.filter((s) => s.completada && s.tipoCarga !== 'tiempo').reduce((a, s) => a + s.pesoKg * s.reps, 0));
}

// ── Progreso de un ejercicio ─────────────────────────────────────────────────
export interface PuntoProgreso {
  session_id: string;
  fecha: string;
  e1rm: number | null;
  marca: number;
  mejor_serie: { peso_kg: number; reps: number; rir: number | null };
  volumen_kg: number;
  series: number;
}

/**
 * Un punto por sesión cerrada desde `desde` con series completadas de ese ejercicio, de la más
 * antigua a la más nueva, con la mejor serie medida como cierre.ts (P-09).
 */
export async function puntosDeEjercicio(prisma: Db, alumnoId: string, ejercicioId: string, tipoCarga: TipoCarga, desde: Date): Promise<PuntoProgreso[]> {
  const series = await prisma.serie.findMany({
    where: {
      alumnoId, ejercicioId, completada: true,
      sesion: { estado: 'cerrada', cerradaAt: { gte: desde } },
    },
    include: { sesion: { select: { id: true, cerradaAt: true } } },
    orderBy: [{ sesion: { cerradaAt: 'asc' } }, { serieN: 'asc' }],
  });
  const porSesion = new Map<string, { fecha: Date; series: Serie[] }>();
  for (const s of series) {
    const g = porSesion.get(s.sesionId) ?? { fecha: s.sesion.cerradaAt ?? s.createdAt, series: [] };
    g.series.push(s);
    porSesion.set(s.sesionId, g);
  }
  const puntos: PuntoProgreso[] = [];
  for (const [sesionId, g] of porSesion) {
    const m = mejorMarca(tipoCarga, g.series.map(aWorkoutSet));
    if (!m) continue;
    puntos.push({
      session_id: sesionId,
      fecha: g.fecha.toISOString(),
      e1rm: tipoCarga === 'kg' ? e1rm(m.set.pesoKg, m.set.reps) : null,
      marca: m.valor,
      mejor_serie: { peso_kg: m.set.pesoKg, reps: m.set.reps, rir: m.set.rir },
      volumen_kg: tipoCarga === 'tiempo' ? 0 : redondear(g.series.reduce((a, s) => a + s.pesoKg * s.reps, 0)),
      series: g.series.length,
    });
  }
  return puntos.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export { tipoDeMarca };

// ── Volumen por semana ───────────────────────────────────────────────────────
export interface SemanaVolumen {
  inicio: string;
  fin: string;
  volumen_kg: number;
  sesiones: number;
  variacion_pct: number | null;
  en_curso: boolean;
}

/** Volumen total de una sesión cerrada: el guardado al cerrar o, si falta, el de sus series. */
async function volumenesDeSesiones(prisma: Db, alumnoId: string, desde: Date, hasta: Date) {
  const sesiones = await prisma.sesionEntreno.findMany({
    where: { alumnoId, estado: 'cerrada', cerradaAt: { gte: desde, lt: hasta } },
    select: {
      id: true, cerradaAt: true, volumenKg: true,
      series: { select: { pesoKg: true, reps: true, completada: true, ejercicio: { select: { tipoCarga: true } } } },
    },
  });
  return sesiones.map((s) => ({
    id: s.id,
    cerradaAt: s.cerradaAt!,
    volumen: s.volumenKg ?? volumenDeSeries(s.series.map((x) => ({ ...x, tipoCarga: x.ejercicio.tipoCarga }))),
  }));
}

/**
 * `semanas` semanas de lunes a domingo en la zona del alumno, terminando en la que va en curso.
 * Las semanas sin sesiones van con 0. La variación es frente a la semana anterior (null si esa fue 0).
 */
export async function volumenPorSemana(prisma: Db, alumnoId: string, zona: string, semanas: number, ahora: Date): Promise<SemanaVolumen[]> {
  const lunesActual = lunesDe(diaLocal(ahora, zona));
  const primerLunes = sumarDias(lunesActual, -7 * (semanas - 1));
  // Una semana antes de la primera, para la variación de la primera.
  const desde = inicioDelDia(sumarDias(primerLunes, -7), zona);
  const hasta = inicioDelDia(sumarDias(lunesActual, 7), zona);
  const sesiones = await volumenesDeSesiones(prisma, alumnoId, desde, hasta);
  const porLunes = new Map<string, { volumen: number; sesiones: number }>();
  for (const s of sesiones) {
    const l = lunesDe(diaLocal(s.cerradaAt, zona));
    const g = porLunes.get(l) ?? { volumen: 0, sesiones: 0 };
    g.volumen += s.volumen;
    g.sesiones += 1;
    porLunes.set(l, g);
  }
  const salida: SemanaVolumen[] = [];
  let anterior = redondear(porLunes.get(sumarDias(primerLunes, -7))?.volumen ?? 0);
  for (let i = 0; i < semanas; i++) {
    const inicio = sumarDias(primerLunes, 7 * i);
    const g = porLunes.get(inicio);
    const volumen = redondear(g?.volumen ?? 0);
    salida.push({
      inicio,
      fin: sumarDias(inicio, 6),
      volumen_kg: volumen,
      sesiones: g?.sesiones ?? 0,
      variacion_pct: anterior > 0 ? redondear(((volumen - anterior) / anterior) * 100) : null,
      en_curso: inicio === lunesActual,
    });
    anterior = volumen;
  }
  return salida;
}

// ── Récords ──────────────────────────────────────────────────────────────────
export interface RecordApi {
  id: string;
  exercise_id: string;
  nombre: string;
  tipo: RecordPersonal['tipo'];
  valor: number;
  fecha: string;
  session_id: string | null;
  set_id: string | null;
  anterior: number | null;
  diferencia: number | null;
}

/** Los récords vigentes (superado_at nulo) de cada ejercicio y tipo, con el que superaron. */
export async function recordsVigentes(prisma: Db, alumnoId: string): Promise<RecordApi[]> {
  const filas = await prisma.recordPersonal.findMany({
    where: { alumnoId },
    include: { ejercicio: { select: { nombre: true } } },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
  });
  const vigentes = filas.filter((r) => r.superadoAt === null);
  return vigentes.map((r) => {
    // El anterior es el más reciente ya superado del mismo ejercicio y tipo.
    const previo = filas.find(
      (x) => x.superadoAt !== null && x.ejercicioId === r.ejercicioId && x.tipo === r.tipo && x.fecha.getTime() <= r.fecha.getTime(),
    );
    return {
      id: r.id,
      exercise_id: r.ejercicioId,
      nombre: r.ejercicio.nombre,
      tipo: r.tipo,
      valor: r.valor,
      fecha: r.fecha.toISOString(),
      session_id: r.sesionId,
      set_id: r.serieId,
      anterior: previo?.valor ?? null,
      diferencia: previo ? redondear(r.valor - previo.valor) : null,
    };
  });
}

// ── Medidas ──────────────────────────────────────────────────────────────────
const COLUMNA: Record<CampoMedida, keyof MedidaCorporal> = {
  peso_kg: 'pesoKg', cintura_cm: 'cinturaCm', cadera_cm: 'caderaCm', pecho_cm: 'pechoCm',
  brazo_cm: 'brazoCm', muslo_cm: 'musloCm', grasa_pct: 'grasaPct',
};

export const columnaDeMedida = (c: CampoMedida) => COLUMNA[c];

export function medidaAApi(m: MedidaCorporal) {
  return {
    id: m.id,
    fecha: diaDeFechaDb(m.fecha),
    peso_kg: m.pesoKg, cintura_cm: m.cinturaCm, cadera_cm: m.caderaCm, pecho_cm: m.pechoCm,
    brazo_cm: m.brazoCm, muslo_cm: m.musloCm, grasa_pct: m.grasaPct,
    nota: m.nota,
    updated_at: m.updatedAt.toISOString(),
  };
}

type TendenciaCampo = { actual: number; fecha: string; referencia: number; fecha_referencia: string; cambio: number };

/**
 * P-30: desde el tercer registro de un campo, el cambio a 30 días es el último menos el registro
 * más cercano a 30 días antes del último. null si ningún campo tiene 3 registros.
 */
export function tendenciaDeMedidas(filas: readonly MedidaCorporal[]): Record<CampoMedida, TendenciaCampo | null> | null {
  const orden = [...filas].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  let alguna = false;
  const salida = {} as Record<CampoMedida, TendenciaCampo | null>;
  for (const campo of CAMPOS_MEDIDA) {
    const col = COLUMNA[campo];
    const conValor = orden.filter((m) => typeof m[col] === 'number') as (MedidaCorporal & Record<string, number>)[];
    if (conValor.length < REGISTROS_PARA_TENDENCIA) {
      salida[campo] = null;
      continue;
    }
    const ultimo = conValor[conValor.length - 1]!;
    const diaUltimo = diaDeFechaDb(ultimo.fecha);
    const objetivo = sumarDias(diaUltimo, -DIAS_TENDENCIA);
    let ref = conValor[0]!;
    for (const m of conValor.slice(0, -1)) {
      const d = Math.abs(diasEntre(objetivo, diaDeFechaDb(m.fecha)));
      if (d < Math.abs(diasEntre(objetivo, diaDeFechaDb(ref.fecha)))) ref = m;
    }
    const actual = ultimo[col] as number;
    const referencia = ref[col] as number;
    salida[campo] = { actual, fecha: diaUltimo, referencia, fecha_referencia: diaDeFechaDb(ref.fecha), cambio: redondear(actual - referencia) };
    alguna = true;
  }
  return alguna ? salida : null;
}
