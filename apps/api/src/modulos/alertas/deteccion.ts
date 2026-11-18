// ─────────────────────────────────────────────────────────────────────────────
// Detección de alertas · Zona: Alertas (API)
//
// Qué hace: las cuatro reglas de §Datos «Detección de estancamiento y de baja», en dos capas:
//   - Funciones puras (evaluarEstancamiento, evaluarBaja, limiteSinSesiones, esDolorFuerte) que
//     reciben los números y los umbrales, para probarlas sin base (UNI-080 a UNI-091).
//   - Funciones con base que leen las series, crean las alertas sin repetirlas y dicen cuáles
//     crearon: detectarTrasCierre (la llama el cierre de una sesión y el worker), detectarSinSesiones
//     (worker), crearAlertaDolor (la llama POST /observations) y detectarNoche (worker).
// Reglas: estancamiento = el mejor 1RM estimado (o la marca comparable, P-09) no supera en N
// sesiones seguidas al mejor de antes; baja = la sesión o el mejor 1RM caen X % o más frente al
// promedio de las 4 semanas anteriores (el volumen, contra el mismo día de rutina; P-47); sin
// sesiones = N días locales sin cerrar ninguna con rutina activa; dolor = intensidad 7 o más.
// Sin repetir: no se crea si ya hay una abierta (nueva o vista) del mismo alumno, tipo y ejercicio
// (también con ejercicio nulo, que el índice parcial no cubre), ni si ya se creó una por esa
// misma sesión (así la noche no duplica lo del cierre, WRK-013, WRK-014).
// La alerta lleva trainer_id del vínculo activo, o nulo para el alumno solo (P-23).
// Tócalo cuando: cambie una regla. Los números van en ./umbrales.ts.
// No lo toques para: la forma de la respuesta (./vista.ts) ni los avisos push.
// Depende de: la base, ../progreso/consultas (marcas y volumen), ../progreso/zona y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { mejorMarca, redondear, tipoDeMarca, type TipoCarga, type TipoPR } from '@gymtrack/shared';
import { vinculoDelAlumno } from '../../compartido';
import type { BaseDeDatos } from '../../db';
import { esDuplicado } from '../../db';
import type { Prisma, TipoAlerta } from '../../generado/prisma/client';
import { aWorkoutSet, volumenDeSeries } from '../progreso/consultas';
import { diaLocal, inicioDelDia, sumarDias } from '../progreso/zona';
import type { Umbrales } from './umbrales';

const DIA_MS = 86_400_000;
type Db = BaseDeDatos;

// ── Reglas puras ─────────────────────────────────────────────────────────────
export interface MarcaDeSesion {
  sesionId: string;
  fecha: Date;
  marca: number;
}

/**
 * Estancamiento: con las marcas de cada sesión de la más antigua a la recién cerrada, las últimas
 * `sesiones` no superan la mejor de las anteriores. Hace falta una marca previa (UNI-082).
 */
export function evaluarEstancamiento(marcas: readonly MarcaDeSesion[], sesiones: number) {
  if (marcas.length < sesiones + 1) return null;
  const ventana = marcas.slice(-sesiones);
  const previas = marcas.slice(0, -sesiones);
  const mejor = previas.reduce((m, x) => (x.marca > m.marca ? x : m));
  if (ventana.some((m) => m.marca > mejor.marca)) return null;
  return { mejor, ventana };
}

/**
 * Baja: `actual` cae `pct` % o más frente al promedio de `previos` en las `semanas` semanas antes
 * de `fecha` (sin contarla). Con menos de `semanasMin` semanas con datos no se evalúa (P-47).
 * 3.780 contra 4.200 es justo 10 % y cuenta; 3.781 no (UNI-084, UNI-085).
 */
export function evaluarBaja(
  actual: number,
  previos: readonly { fecha: Date; valor: number }[],
  fecha: Date,
  u: Pick<Umbrales, 'bajaPct' | 'bajaSemanas' | 'bajaSemanasMin'>,
) {
  const desde = fecha.getTime() - u.bajaSemanas * 7 * DIA_MS;
  const ventana = previos.filter((p) => p.fecha.getTime() >= desde && p.fecha.getTime() < fecha.getTime());
  if (ventana.length === 0) return null;
  const semanas = new Set(ventana.map((p) => Math.floor((fecha.getTime() - p.fecha.getTime()) / (7 * DIA_MS))));
  if (semanas.size < u.bajaSemanasMin) return null;
  const promedio = ventana.reduce((a, p) => a + p.valor, 0) / ventana.length;
  if (!(promedio > 0)) return null;
  const cae = redondear(actual * 100, 6) <= redondear(promedio * (100 - u.bajaPct), 6);
  if (!cae) return null;
  return { actual, promedio: redondear(promedio), caida_pct: redondear(((promedio - actual) / promedio) * 100), sesiones_previas: ventana.length };
}

/**
 * Desde cuándo hay alerta «sin sesiones»: la misma hora local `dias` días después de la
 * referencia, contando días de la zona del alumno (WRK-003, WRK-012 con cambio de horario).
 */
export function limiteSinSesiones(referencia: Date, zona: string, dias: number): Date {
  const dia = diaLocal(referencia, zona);
  const desdeMedianoche = referencia.getTime() - inicioDelDia(dia, zona).getTime();
  return new Date(inicioDelDia(sumarDias(dia, dias), zona).getTime() + desdeMedianoche);
}

/** Solo un dolor con intensidad igual o mayor al umbral avisa (UNI-089). */
export function esDolorFuerte(tipo: string, intensidad: number | null | undefined, umbral: number): boolean {
  return tipo === 'dolor' && typeof intensidad === 'number' && intensidad >= umbral;
}

// ── Crear sin repetir ────────────────────────────────────────────────────────
export interface AlertaCreada {
  id: string;
  tipo: TipoAlerta;
  exercise_id: string | null;
  nombre: string | null;
}

interface NuevaAlerta {
  alumnoId: string;
  tipo: TipoAlerta;
  ejercicioId: string | null;
  detalle: Record<string, unknown>;
}

/** Crea la alerta si no hay una abierta igual ni una de la misma sesión. Devuelve el id o null. */
export async function crearAlertaSiFalta(prisma: Db, a: NuevaAlerta, ahora: Date): Promise<string | null> {
  const abierta = await prisma.alerta.findFirst({
    where: { alumnoId: a.alumnoId, tipo: a.tipo, ejercicioId: a.ejercicioId, estado: { not: 'resuelta' } },
    select: { id: true },
  });
  if (abierta) return null;
  const sesionId = typeof a.detalle.session_id === 'string' ? a.detalle.session_id : null;
  if (sesionId) {
    const yaDeEsaSesion = await prisma.alerta.findFirst({
      where: { alumnoId: a.alumnoId, tipo: a.tipo, ejercicioId: a.ejercicioId, detalle: { path: ['session_id'], equals: sesionId } },
      select: { id: true },
    });
    if (yaDeEsaSesion) return null;
  }
  const vinculo = await vinculoDelAlumno(prisma, a.alumnoId);
  try {
    const fila = await prisma.alerta.create({
      data: {
        alumnoId: a.alumnoId,
        entrenadorId: vinculo?.entrenadorId ?? null,
        tipo: a.tipo,
        ejercicioId: a.ejercicioId,
        detalle: a.detalle as Prisma.InputJsonValue,
        createdAt: ahora,
      },
      select: { id: true },
    });
    return fila.id;
  } catch (e) {
    // Dos cierres a la vez: el índice parcial deja pasar solo una.
    if (esDuplicado(e)) return null;
    throw e;
  }
}

// ── Marcas desde la base ─────────────────────────────────────────────────────
/** La mejor marca de cada sesión cerrada del ejercicio hasta `hasta`, de la más antigua a la más nueva. */
async function marcasDelEjercicio(prisma: Db, alumnoId: string, ejercicioId: string, tipoCarga: TipoCarga, hasta: Date) {
  const series = await prisma.serie.findMany({
    where: { alumnoId, ejercicioId, completada: true, sesion: { estado: 'cerrada', cerradaAt: { lte: hasta } } },
    include: { sesion: { select: { cerradaAt: true } } },
  });
  const porSesion = new Map<string, { fecha: Date; series: typeof series }>();
  for (const s of series) {
    const g = porSesion.get(s.sesionId) ?? { fecha: s.sesion.cerradaAt!, series: [] };
    g.series.push(s);
    porSesion.set(s.sesionId, g);
  }
  const tipo: TipoPR = tipoDeMarca(tipoCarga);
  const marcas: MarcaDeSesion[] = [];
  for (const [sesionId, g] of porSesion) {
    const m = mejorMarca(tipoCarga, g.series.map(aWorkoutSet));
    if (m && m.tipo === tipo) marcas.push({ sesionId, fecha: g.fecha, marca: m.valor });
  }
  return marcas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.sesionId.localeCompare(b.sesionId));
}

// ── Al cerrar una sesión ─────────────────────────────────────────────────────
/**
 * Corre estancamiento y baja sobre una sesión cerrada. Devuelve las alertas que creó, con la forma
 * de `alertas_creadas` del contrato del cierre (§API). Llamarla dos veces no duplica.
 */
export async function detectarTrasCierre(prisma: Db, sesionId: string, u: Umbrales, ahora: Date): Promise<AlertaCreada[]> {
  const sesion = await prisma.sesionEntreno.findUnique({
    where: { id: sesionId },
    include: { series: { where: { completada: true }, include: { ejercicio: { select: { id: true, nombre: true, tipoCarga: true } } } } },
  });
  if (!sesion || sesion.estado !== 'cerrada' || !sesion.cerradaAt) return [];
  const cerrada = sesion.cerradaAt;
  const creadas: AlertaCreada[] = [];
  const crear = async (tipo: TipoAlerta, ejercicio: { id: string; nombre: string } | null, detalle: Record<string, unknown>) => {
    const id = await crearAlertaSiFalta(prisma, { alumnoId: sesion.alumnoId, tipo, ejercicioId: ejercicio?.id ?? null, detalle }, ahora);
    if (id) creadas.push({ id, tipo, exercise_id: ejercicio?.id ?? null, nombre: ejercicio?.nombre ?? null });
  };

  const ejercicios = new Map(sesion.series.map((s) => [s.ejercicio.id, s.ejercicio]));
  for (const ej of ejercicios.values()) {
    const marcas = await marcasDelEjercicio(prisma, sesion.alumnoId, ej.id, ej.tipoCarga, cerrada);
    const hoy = marcas.find((m) => m.sesionId === sesion.id);
    if (!hoy) continue;
    // Estancamiento (UNI-080 a UNI-083, UNI-091).
    const est = evaluarEstancamiento(marcas, u.estancamientoSesiones);
    if (est) {
      await crear('estancamiento', ej, {
        session_id: sesion.id,
        tipo_marca: tipoDeMarca(ej.tipoCarga),
        mejor: { valor: est.mejor.marca, fecha: est.mejor.fecha.toISOString(), session_id: est.mejor.sesionId },
        sesiones: est.ventana.map((m) => ({ session_id: m.sesionId, fecha: m.fecha.toISOString(), marca: m.marca })),
      });
    }
    // Baja por la marca del ejercicio (UNI-086).
    const previas = marcas.filter((m) => m.sesionId !== sesion.id).map((m) => ({ fecha: m.fecha, valor: m.marca }));
    const baja = evaluarBaja(hoy.marca, previas, cerrada, u);
    if (baja) {
      await crear('baja_rendimiento', ej, { session_id: sesion.id, medida: tipoDeMarca(ej.tipoCarga), ...baja });
    }
  }

  // Baja por el volumen de la sesión, contra el mismo día de rutina (P-47).
  if (sesion.diaRutinaId) {
    const volumen = sesion.volumenKg ?? volumenDeSeries(sesion.series.map((s) => ({ ...s, tipoCarga: s.ejercicio.tipoCarga })));
    const desde = new Date(cerrada.getTime() - u.bajaSemanas * 7 * DIA_MS);
    const anteriores = await prisma.sesionEntreno.findMany({
      where: { alumnoId: sesion.alumnoId, diaRutinaId: sesion.diaRutinaId, estado: 'cerrada', id: { not: sesion.id }, cerradaAt: { gte: desde, lt: cerrada } },
      select: {
        cerradaAt: true, volumenKg: true,
        series: { select: { pesoKg: true, reps: true, completada: true, ejercicio: { select: { tipoCarga: true } } } },
      },
    });
    const previos = anteriores.map((s) => ({
      fecha: s.cerradaAt!,
      valor: s.volumenKg ?? volumenDeSeries(s.series.map((x) => ({ ...x, tipoCarga: x.ejercicio.tipoCarga }))),
    }));
    const baja = evaluarBaja(volumen, previos, cerrada, u);
    if (baja) await crear('baja_rendimiento', null, { session_id: sesion.id, medida: 'volumen', routine_day_id: sesion.diaRutinaId, ...baja });
  }
  return creadas;
}

// ── Sin sesiones (worker) ────────────────────────────────────────────────────
/**
 * Para cada alumno con rutina activa: si pasaron N días locales desde su última sesión cerrada
 * (o desde que activó la rutina, o desde que se resolvió la última «sin sesiones»), crea la alerta.
 */
export async function detectarSinSesiones(prisma: Db, ahora: Date, u: Umbrales): Promise<AlertaCreada[]> {
  const rutinas = await prisma.rutina.findMany({
    where: { estado: 'activa', deletedAt: null, alumnoId: { not: null }, alumno: { deletedAt: null } },
    select: { id: true, alumnoId: true, activadaAt: true, alumno: { select: { timezone: true } } },
  });
  const creadas: AlertaCreada[] = [];
  for (const r of rutinas) {
    const alumnoId = r.alumnoId!;
    const [ultima, resuelta] = await Promise.all([
      prisma.sesionEntreno.findFirst({ where: { alumnoId, estado: 'cerrada' }, orderBy: { cerradaAt: 'desc' }, select: { cerradaAt: true } }),
      prisma.alerta.findFirst({ where: { alumnoId, tipo: 'sin_sesiones', estado: 'resuelta' }, orderBy: { resueltaAt: 'desc' }, select: { resueltaAt: true } }),
    ]);
    const candidatas = [ultima?.cerradaAt, r.activadaAt, resuelta?.resueltaAt].filter((d): d is Date => d instanceof Date);
    if (candidatas.length === 0) continue;
    const referencia = new Date(Math.max(...candidatas.map((d) => d.getTime())));
    const zona = r.alumno?.timezone ?? 'America/Santiago';
    if (ahora.getTime() < limiteSinSesiones(referencia, zona, u.sinSesionesDias).getTime()) continue;
    const id = await crearAlertaSiFalta(
      prisma,
      {
        alumnoId, tipo: 'sin_sesiones', ejercicioId: null,
        detalle: {
          dias: Math.floor((ahora.getTime() - referencia.getTime()) / DIA_MS),
          ultima_sesion_at: ultima?.cerradaAt?.toISOString() ?? null,
          desde: referencia.toISOString(),
          routine_id: r.id,
        },
      },
      ahora,
    );
    if (id) creadas.push({ id, tipo: 'sin_sesiones', exercise_id: null, nombre: null });
  }
  return creadas;
}

// ── Dolor (POST /observations) ───────────────────────────────────────────────
/**
 * Un dolor de intensidad 7 o más crea la alerta al instante (INT-147). La llama quien guarda la
 * observación, con la fila recién creada. Devuelve la alerta creada o null.
 */
export async function crearAlertaDolor(
  prisma: Db,
  obs: { id: string; alumnoId: string; tipo: string; ejercicioId: string | null; sesionId: string | null; dolorZona: string | null; dolorIntensidad: number | null },
  u: Umbrales,
  ahora: Date,
): Promise<AlertaCreada | null> {
  if (!esDolorFuerte(obs.tipo, obs.dolorIntensidad, u.dolorIntensidad)) return null;
  const id = await crearAlertaSiFalta(
    prisma,
    {
      alumnoId: obs.alumnoId, tipo: 'dolor', ejercicioId: obs.ejercicioId,
      detalle: { observation_id: obs.id, session_id: obs.sesionId, zona: obs.dolorZona, intensidad: obs.dolorIntensidad },
    },
    ahora,
  );
  if (!id) return null;
  const ej = obs.ejercicioId ? await prisma.ejercicio.findUnique({ where: { id: obs.ejercicioId }, select: { nombre: true } }) : null;
  return { id, tipo: 'dolor', exercise_id: obs.ejercicioId, nombre: ej?.nombre ?? null };
}

// ── La corrida de la noche ───────────────────────────────────────────────────
export interface ResultadoDeteccion {
  sesiones_revisadas: number;
  alertas_creadas: number;
  por_tipo: Record<string, number>;
}

/**
 * Lo que corre el worker cada noche: repasa las sesiones cerradas en las últimas `horas` (por si
 * alguna llegó sin que corriera la detección del cierre, WRK-002) y busca a quien lleva N días sin
 * entrenar. Solo cuenta; nunca escribe correos, nombres ni medidas en el resultado (WRK-010).
 */
export async function detectarNoche(prisma: Db, ahora: Date, u: Umbrales, horas = 48): Promise<ResultadoDeteccion> {
  const sesiones = await prisma.sesionEntreno.findMany({
    where: { estado: 'cerrada', cerradaAt: { gte: new Date(ahora.getTime() - horas * 3_600_000), lte: ahora }, alumno: { deletedAt: null } },
    select: { id: true },
    orderBy: { cerradaAt: 'asc' },
  });
  const creadas: AlertaCreada[] = [];
  for (const s of sesiones) creadas.push(...(await detectarTrasCierre(prisma, s.id, u, ahora)));
  creadas.push(...(await detectarSinSesiones(prisma, ahora, u)));
  const por_tipo: Record<string, number> = {};
  for (const a of creadas) por_tipo[a.tipo] = (por_tipo[a.tipo] ?? 0) + 1;
  return { sesiones_revisadas: sesiones.length, alertas_creadas: creadas.length, por_tipo };
}
