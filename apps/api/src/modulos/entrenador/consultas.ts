// ─────────────────────────────────────────────────────────────────────────────
// Consultas del panel del entrenador · Zona: Entrenador (API)
//
// Qué hace: arma lo que muestran Clientes (pantalla 16) y la Ficha del cliente (pantalla 17) a
// partir de la base: la rutina activa de cada alumno, sus sesiones de la semana (adherencia,
// lunes a domingo en su zona), si entrena hoy, la última sesión y las alertas abiertas. Todo en
// pocas consultas para la lista completa (un entrenador tiene decenas de clientes, no miles).
// Reglas de esta versión:
//   - adherencia = sesiones cerradas desde el lunes / días de la rutina activa, hasta 100 %;
//     sin rutina, null.
//   - entrena hoy = tiene una sesión iniciada hoy o su rutina tiene un día fijado para hoy.
// Tócalo cuando: cambie cómo se cuenta una de esas cifras.
// No lo toques para: quién puede ver a quién (src/compartido/vinculo.ts).
// Depende de: la base y ../progreso/zona.
// ─────────────────────────────────────────────────────────────────────────────
import type { BaseDeDatos } from '../../db';
import { diaLocal, diaSemanaIso, inicioDelDia, lunesDe } from '../progreso/zona';

type Db = BaseDeDatos;

export interface RutinaResumen {
  id: string;
  nombre: string;
  metodo_progresion: string;
  semanas: number;
  version: number;
  activadaAt: Date | null;
  duenoId: string;
  dias: { id: string; nombre: string; orden: number; dia_semana: number | null }[];
}

export interface EstadoCliente {
  rutina: RutinaResumen | null;
  adherencia: { semana_inicio: string; hechas: number; planificadas: number; pct: number | null };
  entrenaHoy: boolean;
  ultimaSesion: { id: string; estado: 'en_curso' | 'cerrada' | 'descartada'; iniciada_at: string; cerrada_at: string | null; dia_nombre: string | null } | null;
  alertasAbiertas: number;
  alertasNuevas: number;
}

/** La rutina activa de cada alumno: la del perfil o, si falta, la que está en estado activa. */
export async function rutinasActivas(prisma: Db, alumnoIds: readonly string[]): Promise<Map<string, RutinaResumen>> {
  if (alumnoIds.length === 0) return new Map();
  const perfiles = await prisma.perfilAlumno.findMany({ where: { usuarioId: { in: [...alumnoIds] } }, select: { usuarioId: true, rutinaActivaId: true } });
  const porPerfil = new Map(perfiles.flatMap((p) => (p.rutinaActivaId ? [[p.usuarioId, p.rutinaActivaId] as const] : [])));
  const rutinas = await prisma.rutina.findMany({
    where: {
      deletedAt: null,
      OR: [{ id: { in: [...porPerfil.values()] } }, { alumnoId: { in: [...alumnoIds] }, estado: 'activa' }],
    },
    include: { dias: { where: { deletedAt: null }, orderBy: { orden: 'asc' } } },
    orderBy: { activadaAt: 'desc' },
  });
  const salida = new Map<string, RutinaResumen>();
  const aResumen = (r: (typeof rutinas)[number]): RutinaResumen => ({
    id: r.id, nombre: r.nombre, metodo_progresion: r.metodoProgresion, semanas: r.semanas, version: r.version,
    activadaAt: r.activadaAt, duenoId: r.duenoId,
    dias: r.dias.map((d) => ({ id: d.id, nombre: d.nombre, orden: d.orden, dia_semana: d.diaSemana })),
  });
  for (const id of alumnoIds) {
    const delPerfil = porPerfil.get(id);
    const r = rutinas.find((x) => x.id === delPerfil && x.estado !== 'archivada') ?? rutinas.find((x) => x.alumnoId === id && x.estado === 'activa');
    if (r) salida.set(id, aResumen(r));
  }
  return salida;
}

/** El estado de cada cliente para la lista y la ficha. */
export async function estadosDeClientes(
  prisma: Db,
  entrenadorId: string,
  clientes: readonly { id: string; timezone: string }[],
  ahora: Date,
): Promise<Map<string, EstadoCliente>> {
  const ids = clientes.map((c) => c.id);
  if (ids.length === 0) return new Map();
  const rutinas = await rutinasActivas(prisma, ids);
  // Ocho días alcanzan para cubrir la semana en curso en cualquier zona.
  const desde = new Date(ahora.getTime() - 8 * 86_400_000);
  const [recientes, alertas] = await Promise.all([
    prisma.sesionEntreno.findMany({
      where: { alumnoId: { in: ids }, iniciadaAt: { gte: desde } },
      select: { id: true, alumnoId: true, estado: true, iniciadaAt: true, cerradaAt: true },
    }),
    prisma.alerta.groupBy({
      by: ['alumnoId', 'estado'],
      where: { entrenadorId, alumnoId: { in: ids }, estado: { in: ['nueva', 'vista'] } },
      _count: { _all: true },
    }),
  ]);
  const salida = new Map<string, EstadoCliente>();
  for (const c of clientes) {
    const hoy = diaLocal(ahora, c.timezone);
    const lunes = lunesDe(hoy);
    const inicioSemana = inicioDelDia(lunes, c.timezone).getTime();
    const inicioHoy = inicioDelDia(hoy, c.timezone).getTime();
    const rutina = rutinas.get(c.id) ?? null;
    const suyas = recientes.filter((s) => s.alumnoId === c.id);
    const hechas = suyas.filter((s) => s.estado === 'cerrada' && s.cerradaAt && s.cerradaAt.getTime() >= inicioSemana).length;
    const planificadas = rutina?.dias.length ?? 0;
    const entrenaHoy =
      suyas.some((s) => s.estado !== 'descartada' && s.iniciadaAt.getTime() >= inicioHoy) ||
      (rutina?.dias.some((d) => d.dia_semana === diaSemanaIso(hoy)) ?? false);
    const ultima = await prisma.sesionEntreno.findFirst({
      where: { alumnoId: c.id, estado: { not: 'descartada' } },
      orderBy: { iniciadaAt: 'desc' },
      select: { id: true, estado: true, iniciadaAt: true, cerradaAt: true, dia: { select: { nombre: true } } },
    });
    const contar = (estado: 'nueva' | 'vista') =>
      alertas.find((a) => a.alumnoId === c.id && a.estado === estado)?._count._all ?? 0;
    salida.set(c.id, {
      rutina,
      adherencia: {
        semana_inicio: lunes,
        hechas,
        planificadas,
        pct: planificadas > 0 ? Math.min(100, Math.round((hechas / planificadas) * 100)) : null,
      },
      entrenaHoy,
      ultimaSesion: ultima
        ? {
            id: ultima.id, estado: ultima.estado, iniciada_at: ultima.iniciadaAt.toISOString(),
            cerrada_at: ultima.cerradaAt?.toISOString() ?? null, dia_nombre: ultima.dia?.nombre ?? null,
          }
        : null,
      alertasAbiertas: contar('nueva') + contar('vista'),
      alertasNuevas: contar('nueva'),
    });
  }
  return salida;
}

/** Para buscar sin importar tildes ni mayúsculas («Sebastian» encuentra a «Sebastián»). */
export const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
