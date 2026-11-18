// ─────────────────────────────────────────────────────────────────────────────
// Regla de vínculo entrenador y alumno · Zona: Compartido (API)
//
// Qué hace: la única regla de quién ve a quién. Un entrenador solo alcanza a los alumnos con
// vínculo activo en trainer_clients (estado activo); cualquier otro id, aunque exista, responde
// 404 igual que uno inventado (§API; PERM-04, PERM-34: al terminar el vínculo el acceso se corta
// al instante). Un alumno solo ve lo suyo (PERM-05, PERM-06). También dice si un alumno está
// vinculado o anda solo, que es lo que separa dos columnas de la matriz de §Roles, y resuelve el
// `?client_id=` de las rutas «Alumno y su entrenador» (P-02).
// Tócalo cuando: cambie la regla del vínculo (por ejemplo, si el entrenador pudiera ver a un ex
// cliente por un tiempo).
// No lo toques para: crear o terminar vínculos (eso es del módulo entrenador) ni para qué puede
// hacer cada rol (permisos.ts).
// Depende de: la base (tabla trainer_clients) y ./errores.
// ─────────────────────────────────────────────────────────────────────────────
import type { BaseDeDatos } from '../db';
import type { Usuario, VinculoEntrenador } from '../generado/prisma/client';
import { campoInvalido, noEncontrado } from './errores';

type Db = Pick<BaseDeDatos, 'vinculoEntrenador'>;

// ── Consultas ────────────────────────────────────────────────────────────────
/** El vínculo activo entre este entrenador y este alumno, o null. */
export function vinculoActivo(prisma: Db, entrenadorId: string, alumnoId: string): Promise<VinculoEntrenador | null> {
  return prisma.vinculoEntrenador.findFirst({ where: { entrenadorId, alumnoId, estado: 'activo' } });
}

/** El vínculo activo del alumno (con quien sea), o null si anda solo. Hay uno a lo más (índice parcial). */
export function vinculoDelAlumno(prisma: Db, alumnoId: string): Promise<VinculoEntrenador | null> {
  return prisma.vinculoEntrenador.findFirst({ where: { alumnoId, estado: 'activo' } });
}

/** true si el alumno tiene un entrenador con vínculo activo. */
export async function estaVinculado(prisma: Db, alumnoId: string): Promise<boolean> {
  return (await vinculoDelAlumno(prisma, alumnoId)) !== null;
}

/** Los ids de los alumnos con vínculo activo de este entrenador. */
export async function idsDeClientes(prisma: Db, entrenadorId: string): Promise<string[]> {
  const filas = await prisma.vinculoEntrenador.findMany({
    where: { entrenadorId, estado: 'activo' },
    select: { alumnoId: true },
  });
  return filas.flatMap((f) => (f.alumnoId ? [f.alumnoId] : []));
}

// ── Exigencias (lanzan 404) ──────────────────────────────────────────────────
/** 404 si el alumno no es cliente activo de este entrenador. Devuelve el vínculo. */
export async function exigirClienteDe(prisma: Db, entrenadorId: string, alumnoId: string): Promise<VinculoEntrenador> {
  const v = await vinculoActivo(prisma, entrenadorId, alumnoId);
  if (!v) noEncontrado();
  return v;
}

/**
 * ¿Puede este usuario ver los datos de este alumno? Sí si es el mismo alumno o su entrenador con
 * vínculo activo. Para un recurso que ya cargaste (`sesion.alumnoId`): 404 si no.
 */
export async function exigirAccesoAlAlumno(prisma: Db, usuario: Pick<Usuario, 'id' | 'rol'>, alumnoId: string): Promise<void> {
  if (usuario.id === alumnoId) return;
  if (usuario.rol === 'trainer' && (await vinculoActivo(prisma, usuario.id, alumnoId))) return;
  noEncontrado();
}

/**
 * Las rutas `/me/...` que dicen «Alumno y su entrenador» (P-02). El alumno lee lo suyo: si manda
 * un client_id que no es el suyo, 404. El entrenador tiene que mandar client_id (400 si falta) y,
 * sin vínculo activo con ese alumno, 404. Devuelve el id del alumno cuyos datos se leen.
 */
export async function alumnoObjetivo(prisma: Db, usuario: Pick<Usuario, 'id' | 'rol'>, clientId?: string | null): Promise<string> {
  if (usuario.rol === 'client') {
    if (clientId && clientId !== usuario.id) noEncontrado();
    return usuario.id;
  }
  if (!clientId) campoInvalido('client_id', 'El entrenador tiene que indicar de qué alumno son los datos.');
  await exigirClienteDe(prisma, usuario.id, clientId);
  return clientId;
}
