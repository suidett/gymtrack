// ─────────────────────────────────────────────────────────────────────────────
// Vista de rutinas · Zona: Rutinas (API)
//
// Qué hace: lo que se lee de una rutina y cómo sale por la API. Define el `include` de Prisma con
// el dueño, los días y los ejercicios vivos (sin deleted_at) en su orden, quién puede leer una
// rutina, qué puede hacer con ella quien llama (`permisos`) y la semana en curso (UNI-072).
// Quién la lee:
//   - Su dueño (quien la escribió) y el alumno al que está asignada (aunque sea del entrenador).
//   - El entrenador, si el alumno de la rutina es su cliente con vínculo activo (lee y comenta
//     la que el alumno se hizo solo, sin editarla: P-44).
//   - Las plantillas del entrenador (client_id nulo) no las lee ningún alumno (PERM-39).
//   - Una rutina archivada sin sesiones (deleted_at) no la lee nadie.
// Qué puede hacer: editar, cambiar días y archivar solo el dueño; activar el dueño si hay alumno
// alcanzable (no una plantilla); asignar solo el entrenador dueño; duplicar quien la lee.
// Tócalo cuando: cambie quién lee una rutina o qué trae la respuesta.
// No lo toques para: las rutas (index.ts) ni lo que cambia la base (servicio.ts).
// Depende de: el cliente de Prisma y @gymtrack/shared (RutinaApi).
// ─────────────────────────────────────────────────────────────────────────────
import type { Equipo, GrupoMuscular, Patron, RutinaApi } from '@gymtrack/shared';
import type { Prisma, Rutina, Usuario } from '../../generado/prisma/client';

type Quien = Pick<Usuario, 'id' | 'rol'>;

// ── Lo que se lee ────────────────────────────────────────────────────────────
export const INCLUIR_RUTINA = {
  dueno: { select: { id: true, nombre: true, apellido: true, rol: true } },
  dias: {
    where: { deletedAt: null },
    orderBy: [{ orden: 'asc' }, { id: 'asc' }],
    include: {
      ejercicios: {
        where: { deletedAt: null },
        orderBy: [{ orden: 'asc' }, { id: 'asc' }],
        include: {
          ejercicio: { select: { id: true, nombre: true, grupoMuscular: true, equipo: true, patron: true, tipoCarga: true } },
        },
      },
    },
  },
} as const satisfies Prisma.RutinaInclude;

export type RutinaCompleta = Prisma.RutinaGetPayload<{ include: typeof INCLUIR_RUTINA }>;

// ── Quién lee y qué puede hacer ──────────────────────────────────────────────
/**
 * true si esta persona lee la rutina. `clientes`: los alumnos con vínculo activo del entrenador
 * (vacío para un alumno).
 */
export function puedeLeer(r: Rutina, quien: Quien, clientes: ReadonlySet<string>): boolean {
  if (r.deletedAt !== null) return false;
  if (r.duenoId === quien.id || r.alumnoId === quien.id) return true;
  return quien.rol === 'trainer' && r.alumnoId !== null && clientes.has(r.alumnoId);
}

export function permisosDe(r: Rutina, quien: Quien, clientes: ReadonlySet<string>): RutinaApi['permisos'] {
  const viva = r.deletedAt === null;
  const esDueno = viva && r.duenoId === quien.id;
  const alumnoAlcanzable = r.alumnoId !== null && (quien.rol === 'client' ? r.alumnoId === quien.id : clientes.has(r.alumnoId));
  return {
    editar: esDueno,
    archivar: esDueno && r.estado !== 'archivada',
    activar: esDueno && alumnoAlcanzable && r.estado !== 'activa',
    asignar: esDueno && quien.rol === 'trainer',
    duplicar: viva && puedeLeer(r, quien, clientes),
  };
}

// ── Semana en curso ──────────────────────────────────────────────────────────
const SEMANA_MS = 7 * 86_400_000;

/** Bloques de 7 días desde la primera activación, de 1 a `semanas` (UNI-072); null si nunca se activó. */
export function semanaActual(r: Pick<Rutina, 'activadaAt' | 'semanas'>, ahora: Date): number | null {
  if (!r.activadaAt) return null;
  const s = Math.floor((ahora.getTime() - r.activadaAt.getTime()) / SEMANA_MS) + 1;
  return Math.max(1, Math.min(r.semanas, s));
}

// ── A la forma de la API ─────────────────────────────────────────────────────
export function rutinaAApi(r: RutinaCompleta, quien: Quien, clientes: ReadonlySet<string>, ahora: Date): RutinaApi {
  return {
    id: r.id,
    nombre: r.nombre,
    descripcion: r.descripcion,
    semanas: r.semanas,
    metodo_progresion: r.metodoProgresion,
    estado: r.estado,
    version: r.version,
    owner_id: r.duenoId,
    client_id: r.alumnoId,
    origen_id: r.origenId,
    dueno: { id: r.dueno.id, nombre: r.dueno.nombre, apellido: r.dueno.apellido, rol: r.dueno.rol },
    activada_at: r.activadaAt?.toISOString() ?? null,
    semana_actual: semanaActual(r, ahora),
    deleted_at: r.deletedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    permisos: permisosDe(r, quien, clientes),
    dias: r.dias.map((d) => ({
      id: d.id,
      orden: d.orden,
      nombre: d.nombre,
      dia_semana: d.diaSemana,
      ejercicios: d.ejercicios.map((x) => ({
        id: x.id,
        orden: x.orden,
        exercise_id: x.ejercicioId,
        ejercicio: {
          id: x.ejercicio.id,
          nombre: x.ejercicio.nombre,
          grupo_muscular: x.ejercicio.grupoMuscular as GrupoMuscular,
          equipo: x.ejercicio.equipo as Equipo,
          patron: x.ejercicio.patron as Patron,
          tipo_carga: x.ejercicio.tipoCarga,
        },
        series: x.series,
        reps_min: x.repsMin,
        reps_max: x.repsMax,
        rir_objetivo: x.rirObjetivo,
        descanso_s: x.descansoS,
        incremento_kg: x.incrementoKg,
        peso_inicial_kg: x.pesoInicialKg,
        esquema: x.esquema,
        grupo_superserie: x.grupoSuperserie,
        nota_entrenador: x.notaEntrenador,
        porcentajes_semana: x.porcentajesSemana,
        objetivo_rm: x.objetivoRm,
      })),
    })),
  };
}
