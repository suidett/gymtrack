// ─────────────────────────────────────────────────────────────────────────────
// Módulo ejercicios · Zona: Ejercicios (API)
//
// Qué hace: las rutas de Ejercicios de §API: la biblioteca (base más los propios, con búsqueda,
// filtros por grupo y equipo, el PR del alumno y paginación por nombre), el detalle (P-03) y
// crear, editar y borrar los propios. Se registra solo bajo /v1 (src/compartido/modulos.ts).
// Reglas:
//   - Ver: consultas.ts (P-07). Lo que no ves da 404, igual que lo que no existe.
//   - Editar y borrar: solo el dueño. Uno de la base o uno que ves pero no es tuyo (el entrenador
//     mirando el de su alumno) da 403 FORBIDDEN (P-01, PERM-40).
//   - Cambiar el tipo de carga con sesiones cerradas: 409 EXERCISE_HAS_HISTORY (los récords se
//     comparan por tipo de carga).
//   - Borrar es lógico (deleted_at); en una rutina activa da 409 EXERCISE_IN_ACTIVE_ROUTINE (P-35).
// Pendiente: POST /exercises/:id/media y PUT /exercises/:id/media/:media_id (falta el bucket y
// sus URLs firmadas en el contexto de los módulos).
// Tócalo cuando: agregues o cambies una ruta de ejercicios.
// No lo toques para: la regla de quién ve qué (consultas.ts) ni la forma de entrada y salida
// (packages/shared/src/api/ejercicios.ts).
// Depende de: src/compartido, ./consultas y @gymtrack/shared (RUTAS_EJERCICIOS).
// ─────────────────────────────────────────────────────────────────────────────
import { RUTAS_EJERCICIOS as R } from '@gymtrack/shared';
import {
  armarPagina, definirModulo, esquemaDe, exigirClienteDe, existeOFalla, fallar, noEncontrado, prohibido, urlDe, usuarioDe,
} from '../../compartido';
import type { Ejercicio, Usuario } from '../../generado/prisma/client';
import {
  detalleAApi, dondeVisibles, ejercicioAApi, ejercicioVisible, filtroNombre, paginaPorNombre, prsDe, type Db,
} from './consultas';

/** El ejercicio si es de quien llama. 404 si no lo ve; 403 si lo ve pero no es suyo (base o de su alumno). */
async function exigirPropio(prisma: Db, quien: Pick<Usuario, 'id' | 'rol'>, id: string): Promise<Ejercicio> {
  const e = existeOFalla(await ejercicioVisible(prisma, quien, id));
  if (e.duenoId !== quien.id) prohibido();
  return e;
}

export default definirModulo(async (app, ctx) => {
  const { prisma } = ctx;

  // ── Lista ──────────────────────────────────────────────────────────────────
  app.get(urlDe(R.listar), { schema: esquemaDe(R.listar), preHandler: app.exigirSesion }, async (req) => {
    const usuario = usuarioDe(req);
    const { q, grupo, equipo, client_id: clientId } = req.query;
    // De quién es el PR y, para el entrenador, de qué alumno ve los propios (P-02, P-07).
    let alumnoPr: string | null = usuario.rol === 'client' ? usuario.id : null;
    let clientes: string[] = [];
    if (clientId) {
      if (usuario.rol === 'client') {
        if (clientId !== usuario.id) noEncontrado();
      } else {
        await exigirClienteDe(prisma, usuario.id, clientId);
        clientes = [clientId];
        alumnoPr = clientId;
      }
    }
    const p = paginaPorNombre(req.query);
    const filas = await prisma.ejercicio.findMany({
      where: {
        AND: [
          await dondeVisibles(prisma, usuario, clientes),
          filtroNombre(q),
          grupo ? { grupoMuscular: grupo } : {},
          equipo ? { equipo } : {},
          p.where,
        ],
      },
      orderBy: p.orderBy,
      take: p.take,
    });
    const pagina = armarPagina(filas, req.query.limit, (u) => ({ nombre: u.nombre, id: u.id }));
    const prs = await prsDe(prisma, alumnoPr, pagina.items);
    return { items: pagina.items.map((e) => ejercicioAApi(e, usuario, prs.get(e.id) ?? null)), next_cursor: pagina.next_cursor };
  });

  // ── Detalle ────────────────────────────────────────────────────────────────
  app.get(urlDe(R.detalle), { schema: esquemaDe(R.detalle), preHandler: app.exigirSesion }, async (req) => {
    const usuario = usuarioDe(req);
    const e = existeOFalla(await ejercicioVisible(prisma, usuario, req.params.id));
    // El PR que se muestra es el de quien entrena: el alumno, o el dueño si el entrenador mira el de su alumno.
    const alumnoPr = usuario.rol === 'client' ? usuario.id : e.duenoId !== usuario.id ? e.duenoId : null;
    const [prs, media] = await Promise.all([
      prsDe(prisma, alumnoPr, [e]),
      prisma.mediaEjercicio.findMany({ where: { ejercicioId: e.id }, orderBy: { orden: 'asc' } }),
    ]);
    return detalleAApi(e, usuario, prs.get(e.id) ?? null, media);
  });

  // ── Crear ──────────────────────────────────────────────────────────────────
  app.post(urlDe(R.crear), { schema: esquemaDe(R.crear), preHandler: app.exigirPermiso('crearEjercicio') }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const c = req.body;
    const ahora = ctx.reloj.ahora();
    const e = await prisma.ejercicio.create({
      data: {
        duenoId: usuario.id,
        nombre: c.nombre,
        grupoMuscular: c.grupo_muscular,
        equipo: c.equipo,
        patron: c.patron,
        tipoCarga: c.tipo_carga,
        incrementoDefaultKg: c.incremento_default_kg,
        instrucciones: c.instrucciones ?? null,
        createdAt: ahora,
        updatedAt: ahora,
      },
    });
    return reply.code(201).send(detalleAApi(e, usuario, null, []));
  });

  // ── Editar ─────────────────────────────────────────────────────────────────
  app.patch(urlDe(R.editar), { schema: esquemaDe(R.editar), preHandler: app.exigirPermiso('crearEjercicio') }, async (req) => {
    const usuario = usuarioDe(req);
    const e = await exigirPropio(prisma, usuario, req.params.id);
    const c = req.body;
    if (c.tipo_carga !== undefined && c.tipo_carga !== e.tipoCarga) {
      const conHistoria = await prisma.serie.count({ where: { ejercicioId: e.id, sesion: { estado: 'cerrada' } } });
      if (conHistoria > 0) fallar('EXERCISE_HAS_HISTORY', { exercise_id: e.id, campo: 'tipo_carga' });
    }
    const cambiado = await prisma.ejercicio.update({
      where: { id: e.id },
      data: {
        nombre: c.nombre,
        grupoMuscular: c.grupo_muscular,
        equipo: c.equipo,
        patron: c.patron,
        tipoCarga: c.tipo_carga,
        incrementoDefaultKg: c.incremento_default_kg,
        instrucciones: c.instrucciones,
        updatedAt: ctx.reloj.ahora(),
      },
    });
    const [prs, media] = await Promise.all([
      prsDe(prisma, usuario.rol === 'client' ? usuario.id : null, [cambiado]),
      prisma.mediaEjercicio.findMany({ where: { ejercicioId: e.id }, orderBy: { orden: 'asc' } }),
    ]);
    return detalleAApi(cambiado, usuario, prs.get(e.id) ?? null, media);
  });

  // ── Borrar (lógico) ────────────────────────────────────────────────────────
  app.delete(urlDe(R.borrar), { schema: esquemaDe(R.borrar), preHandler: app.exigirPermiso('crearEjercicio') }, async (req) => {
    const usuario = usuarioDe(req);
    const e = await exigirPropio(prisma, usuario, req.params.id);
    const enActiva = await prisma.ejercicioRutina.findFirst({
      where: { ejercicioId: e.id, deletedAt: null, dia: { deletedAt: null, rutina: { estado: 'activa', deletedAt: null } } },
      select: { dia: { select: { rutinaId: true } } },
    });
    if (enActiva) fallar('EXERCISE_IN_ACTIVE_ROUTINE', { exercise_id: e.id, routine_id: enActiva.dia.rutinaId });
    const ahora = ctx.reloj.ahora();
    await prisma.ejercicio.update({ where: { id: e.id }, data: { deletedAt: ahora, updatedAt: ahora } });
    return { id: e.id, deleted_at: ahora.toISOString() };
  });
});
