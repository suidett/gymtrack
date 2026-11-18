// ─────────────────────────────────────────────────────────────────────────────
// Purga de cuentas a 30 días · Zona: Worker (API)
//
// Qué hace: borra de verdad las cuentas que se marcaron para borrado (DELETE /me deja deleted_at)
// hace 30 días o más (P-24, WRK-008). Por cada cuenta, en este orden:
//   1. Borra sus fotos del almacenamiento. Si alguna falla, esa cuenta no se toca esta noche y la
//      próxima corrida reintenta (WRK-009): nunca quedan filas sin objeto ni objetos sin dueño.
//   2. Rescata lo que otras personas usan de ella. Las rutinas que una entrenadora escribió para
//      sus clientes pasan a ser de cada cliente y quedan archivadas (P-24, WRK-011). Sus
//      ejercicios propios que aparecen en series o rutinas de otro (un alumno que entrenó con el
//      ejercicio de su entrenadora) se copian a nombre de esa persona, y su historial apunta a la
//      copia (workout_sets.exercise_id es RESTRICT). Los clientes siguen solos con su historial.
//   3. Borra la fila del usuario; la base borra en cascada lo suyo y libera el correo.
// Los logs y el resultado traen solo ids y conteos, nunca correos, nombres ni medidas (WRK-010).
// Tócalo cuando: cambie qué se conserva de una cuenta purgada.
// No lo toques para: marcar la cuenta (DELETE /me, módulo perfil).
// Depende de: la base y ../modulos/progreso/almacenamiento.
// ─────────────────────────────────────────────────────────────────────────────
import { DIAS_PURGA_CUENTA } from '@gymtrack/shared';
import type { BaseDeDatos } from '../db';
import { almacenamiento, type AdaptadorAlmacenamiento } from '../modulos/progreso/almacenamiento';

const DIA_MS = 86_400_000;

export interface ResultadoPurga {
  revisadas: number;
  purgadas: string[];
  pendientes: string[];
  fotos_borradas: number;
  ejercicios_copiados: number;
  rutinas_entregadas: number;
}

type Log = (o: Record<string, unknown>) => void;

/** Copia los ejercicios propios de `usuarioId` que usan otros y deja a esos otros apuntando a su copia. */
async function rescatarEjercicios(prisma: BaseDeDatos, usuarioId: string): Promise<number> {
  const propios = await prisma.ejercicio.findMany({ where: { duenoId: usuarioId } });
  let copias = 0;
  for (const ej of propios) {
    const [series, enRutinas] = await Promise.all([
      prisma.serie.findMany({ where: { ejercicioId: ej.id, alumnoId: { not: usuarioId } }, distinct: ['alumnoId'], select: { alumnoId: true } }),
      prisma.ejercicioRutina.findMany({
        where: { ejercicioId: ej.id, dia: { rutina: { duenoId: { not: usuarioId } } } },
        select: { dia: { select: { rutina: { select: { duenoId: true } } } } },
      }),
    ]);
    const otros = new Set([...series.map((s) => s.alumnoId), ...enRutinas.map((r) => r.dia.rutina.duenoId)]);
    for (const otro of otros) {
      await prisma.$transaction(async (tx) => {
        const copia = await tx.ejercicio.create({
          data: {
            duenoId: otro, nombre: ej.nombre, grupoMuscular: ej.grupoMuscular, equipo: ej.equipo, patron: ej.patron,
            tipoCarga: ej.tipoCarga, incrementoDefaultKg: ej.incrementoDefaultKg, instrucciones: ej.instrucciones,
          },
        });
        const deOtro = { ejercicioId: ej.id, alumnoId: otro };
        await tx.serie.updateMany({ where: deOtro, data: { ejercicioId: copia.id } });
        await tx.recordPersonal.updateMany({ where: deOtro, data: { ejercicioId: copia.id } });
        await tx.alerta.updateMany({ where: deOtro, data: { ejercicioId: copia.id } });
        await tx.observacion.updateMany({ where: deOtro, data: { ejercicioId: copia.id } });
        await tx.ejercicioRutina.updateMany({ where: { ejercicioId: ej.id, dia: { rutina: { duenoId: otro } } }, data: { ejercicioId: copia.id } });
      });
      copias++;
    }
  }
  return copias;
}

/** Las rutinas que el usuario escribió para otros pasan a ser de ellos, archivadas (P-24). */
async function entregarRutinas(prisma: BaseDeDatos, usuarioId: string): Promise<number> {
  const rutinas = await prisma.rutina.findMany({ where: { duenoId: usuarioId, alumnoId: { not: null } }, select: { id: true, alumnoId: true } });
  const ajenas = rutinas.filter((r) => r.alumnoId !== usuarioId);
  for (const r of ajenas) {
    await prisma.rutina.update({ where: { id: r.id }, data: { duenoId: r.alumnoId!, estado: 'archivada' } });
    await prisma.perfilAlumno.updateMany({ where: { usuarioId: r.alumnoId!, rutinaActivaId: r.id }, data: { rutinaActivaId: null } });
  }
  return ajenas.length;
}

/**
 * Purga las cuentas con deleted_at de hace `dias` días o más respecto de `ahora`. Una cuenta que
 * falla queda en `pendientes` y no corta las demás.
 */
export async function purgarCuentas(
  prisma: BaseDeDatos,
  ahora: Date,
  o: { almacenamiento?: AdaptadorAlmacenamiento; dias?: number; log?: Log } = {},
): Promise<ResultadoPurga> {
  const guardado = o.almacenamiento ?? almacenamiento();
  const log: Log = o.log ?? (() => {});
  const limite = new Date(ahora.getTime() - (o.dias ?? DIAS_PURGA_CUENTA) * DIA_MS);
  const cuentas = await prisma.usuario.findMany({ where: { deletedAt: { not: null, lte: limite } }, select: { id: true } });
  const r: ResultadoPurga = { revisadas: cuentas.length, purgadas: [], pendientes: [], fotos_borradas: 0, ejercicios_copiados: 0, rutinas_entregadas: 0 };
  for (const { id } of cuentas) {
    try {
      const fotos = await prisma.fotoProgreso.findMany({ where: { alumnoId: id }, select: { storageKey: true } });
      // Si el almacenamiento falla, se corta aquí: la cuenta sigue entera para la próxima noche.
      for (const f of fotos) await guardado.borrar(f.storageKey);
      r.fotos_borradas += fotos.length;
      // Primero las rutinas a sus alumnos, así el rescate ve que ya son de ellos.
      r.rutinas_entregadas += await entregarRutinas(prisma, id);
      r.ejercicios_copiados += await rescatarEjercicios(prisma, id);
      // Series y rutinas propias antes que el usuario: exercise_id es RESTRICT y PostgreSQL lo
      // revisa en el orden de la cascada, que no está garantizado.
      await prisma.$transaction([
        prisma.serie.deleteMany({ where: { alumnoId: id } }),
        prisma.rutina.deleteMany({ where: { duenoId: id } }),
        prisma.usuario.delete({ where: { id } }),
      ]);
      r.purgadas.push(id);
      log({ msg: 'cuenta purgada', usuario_id: id, fotos: fotos.length });
    } catch (e) {
      r.pendientes.push(id);
      log({ msg: 'purga pendiente', usuario_id: id, error: e instanceof Error ? e.name : 'Error' });
    }
  }
  return r;
}
