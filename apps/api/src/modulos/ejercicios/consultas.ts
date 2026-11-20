// ─────────────────────────────────────────────────────────────────────────────
// Consultas de ejercicios · Zona: Ejercicios (API)
//
// Qué hace: la regla de quién ve qué ejercicio (P-07) escrita una sola vez como filtro de Prisma,
// la búsqueda de la lista (q, grupo, equipo) con su cursor por nombre, el PR vigente del alumno
// por ejercicio y el paso de la fila de la base a la forma de la API (snake_case, fechas ISO; los
// músculos de la biblioteca base salen de DETALLE_BASE, no de la base).
// Quién ve qué:
//   - La biblioteca base (owner_id nulo): todos.
//   - Un ejercicio propio: su dueño.
//   - El entrenador: además los propios de sus alumnos con vínculo activo (sin editarlos).
//   - El alumno: además los que están en rutinas asignadas a él (los del entrenador).
//   - Lo borrado (deleted_at) no lo ve nadie.
// El módulo rutinas usa ejerciciosUsables para decidir qué ejercicio puede ir en una rutina
// (422 EXERCISE_NOT_OWNED).
// Tócalo cuando: cambie la regla de visibilidad, el orden de la lista o qué récord se muestra.
// No lo toques para: las rutas (index.ts) ni la regla del vínculo (src/compartido/vinculo.ts).
// Depende de: src/compartido (vínculo, cursor), el cliente de Prisma y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import {
  DETALLE_BASE, type DetalleEjercicioBase, type EjercicioApi, type EjercicioDetalleApi, type Equipo,
  type GrupoMuscular, type Patron, type TipoCarga,
} from '@gymtrack/shared';
import { z } from 'zod';
import { idsDeClientes, leerCursor } from '../../compartido';
import type { Ejercicio, MediaEjercicio, Prisma, TipoRecord, Usuario } from '../../generado/prisma/client';

export type Db = Prisma.TransactionClient;
type Quien = Pick<Usuario, 'id' | 'rol'>;

// ── Visibilidad (P-07) ───────────────────────────────────────────────────────
/** Filtro de «está en una rutina viva de este alumno» (días y ejercicios sin borrar). */
export const enRutinaDe = (alumnoId: string): Prisma.EjercicioWhereInput => ({
  enRutinas: { some: { deletedAt: null, dia: { deletedAt: null, rutina: { alumnoId, deletedAt: null } } } },
});

/**
 * Los ejercicios que esta persona ve. Para el entrenador, `clientes` dice de qué alumnos ve los
 * propios: los que le pases (la lista con ?client_id=) o, si no pasas nada, todos sus clientes
 * con vínculo activo (el detalle de un ejercicio).
 */
export async function dondeVisibles(prisma: Db, quien: Quien, clientes?: string[]): Promise<Prisma.EjercicioWhereInput> {
  const o: Prisma.EjercicioWhereInput[] = [{ duenoId: null }, { duenoId: quien.id }];
  if (quien.rol === 'trainer') {
    const ids = clientes ?? (await idsDeClientes(prisma, quien.id));
    if (ids.length > 0) o.push({ duenoId: { in: ids } });
  } else {
    o.push(enRutinaDe(quien.id));
  }
  return { deletedAt: null, OR: o };
}

/** El ejercicio si esta persona lo ve; null si no existe, está borrado o no le toca (404). */
export async function ejercicioVisible(prisma: Db, quien: Quien, id: string): Promise<Ejercicio | null> {
  return prisma.ejercicio.findFirst({ where: { AND: [{ id }, await dondeVisibles(prisma, quien)] } });
}

/**
 * De estos ids, los que pueden ir en una rutina de `duenoId` para `alumnoId` (null: plantilla):
 * los de la base, los del dueño, los del alumno, los que ya están en rutinas del alumno (los del
 * entrenador, al duplicar) y los que ya están en esta misma rutina. Devuelve id e incremento.
 */
export async function ejerciciosUsables(
  prisma: Db,
  ids: string[],
  d: { duenoId: string; alumnoId: string | null; rutinaId?: string },
): Promise<Map<string, { incrementoDefaultKg: number; tipoCarga: string }>> {
  if (ids.length === 0) return new Map();
  const duenos = d.alumnoId && d.alumnoId !== d.duenoId ? [d.duenoId, d.alumnoId] : [d.duenoId];
  const o: Prisma.EjercicioWhereInput[] = [{ duenoId: null }, { duenoId: { in: duenos } }];
  if (d.alumnoId) o.push(enRutinaDe(d.alumnoId));
  if (d.rutinaId) {
    o.push({ enRutinas: { some: { deletedAt: null, dia: { deletedAt: null, rutinaId: d.rutinaId } } } });
  }
  const filas = await prisma.ejercicio.findMany({
    where: { id: { in: [...new Set(ids)] }, deletedAt: null, OR: o },
    select: { id: true, incrementoDefaultKg: true, tipoCarga: true },
  });
  return new Map(filas.map((f) => [f.id, { incrementoDefaultKg: f.incrementoDefaultKg, tipoCarga: f.tipoCarga }]));
}

// ── Lista ────────────────────────────────────────────────────────────────────
const esquemaCursorNombre = z.object({ nombre: z.string(), id: z.uuid() });

/**
 * Busca por nombre sin distinguir mayúsculas. Prisma arma un ILIKE sin escapar los comodines, así
 * que `%`, `_` y `\` se escapan aquí para que se busquen como texto (SEG-013).
 */
export function filtroNombre(q: string | undefined): Prisma.EjercicioWhereInput {
  if (!q) return {};
  return { nombre: { contains: q.replace(/[\\%_]/g, (c) => `\\${c}`), mode: 'insensitive' } };
}

/** where, orden y take de una página ordenada por nombre (y id para desempatar). */
export function paginaPorNombre(query: { limit: number; cursor?: string }) {
  const c = leerCursor(query.cursor, esquemaCursorNombre);
  return {
    where: c ? { OR: [{ nombre: { gt: c.nombre } }, { nombre: c.nombre, id: { gt: c.id } }] } : {},
    orderBy: [{ nombre: 'asc' as const }, { id: 'asc' as const }],
    take: query.limit + 1,
  };
}

// ── PR del alumno ────────────────────────────────────────────────────────────
type Pr = NonNullable<EjercicioApi['pr']>;

/** Qué récord se muestra en la lista según el tipo de carga (el primero que haya). */
const RECORD_PREFERIDO: Record<TipoCarga, TipoRecord[]> = {
  kg: ['peso_max', 'e1rm'],
  peso_corporal: ['reps', 'peso_max'],
  tiempo: ['tiempo'],
};

/** El PR vigente (superado_at nulo) de este alumno para cada ejercicio. */
export async function prsDe(
  prisma: Db,
  alumnoId: string | null,
  ejercicios: Pick<Ejercicio, 'id' | 'tipoCarga'>[],
): Promise<Map<string, Pr>> {
  const r = new Map<string, Pr>();
  if (!alumnoId || ejercicios.length === 0) return r;
  const filas = await prisma.recordPersonal.findMany({
    where: { alumnoId, ejercicioId: { in: ejercicios.map((e) => e.id) }, superadoAt: null },
    select: { ejercicioId: true, tipo: true, valor: true, fecha: true },
  });
  for (const e of ejercicios) {
    for (const tipo of RECORD_PREFERIDO[e.tipoCarga]) {
      const f = filas.find((x) => x.ejercicioId === e.id && x.tipo === tipo);
      if (f) {
        r.set(e.id, { tipo: f.tipo, valor: f.valor, fecha: f.fecha.toISOString() });
        break;
      }
    }
  }
  return r;
}

// ── A la forma de la API ─────────────────────────────────────────────────────
/**
 * Los músculos de un ejercicio de la biblioteca base, por su slug (exercises.detalle.ts):
 * `trabajan` va como principales. Los propios (o un slug que no esté) dan null.
 */
export function musculosDe(e: Pick<Ejercicio, 'duenoId' | 'slug'>): EjercicioApi['musculos'] {
  if (e.duenoId !== null || !e.slug) return null;
  const d: DetalleEjercicioBase | undefined = DETALLE_BASE[e.slug];
  return d ? { principales: [...d.trabajan], ayudan: [...d.ayudan] } : null;
}

export function ejercicioAApi(e: Ejercicio, quien: Pick<Usuario, 'id'>, pr: Pr | null): EjercicioApi {
  return {
    id: e.id,
    slug: e.slug,
    nombre: e.nombre,
    grupo_muscular: e.grupoMuscular as GrupoMuscular,
    equipo: e.equipo as Equipo,
    patron: e.patron as Patron,
    tipo_carga: e.tipoCarga,
    incremento_default_kg: e.incrementoDefaultKg,
    instrucciones: e.instrucciones,
    musculos: musculosDe(e),
    owner_id: e.duenoId,
    base: e.duenoId === null,
    propio: e.duenoId === quien.id,
    editable: e.duenoId !== null && e.duenoId === quien.id,
    pr,
    created_at: e.createdAt.toISOString(),
    updated_at: e.updatedAt.toISOString(),
  };
}

/** El detalle: lo de la lista más las referencias. Las propias subidas se firmarán con el bucket. */
export function detalleAApi(e: Ejercicio, quien: Pick<Usuario, 'id'>, pr: Pr | null, media: MediaEjercicio[]): EjercicioDetalleApi {
  return {
    ...ejercicioAApi(e, quien, pr),
    media: media
      .filter((m) => m.url !== null || m.subidaAt !== null)
      .map((m) => ({ id: m.id, tipo: m.tipo, url: m.url, orden: m.orden })),
  };
}
