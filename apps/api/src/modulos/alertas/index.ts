// ─────────────────────────────────────────────────────────────────────────────
// Módulo alertas · Zona: Alertas (API)
//
// Qué hace: las rutas de Alertas de §API (EP-56 a EP-59): la lista del entrenador con sus filtros,
// el cambio a vista o resuelta (con lo que hizo al resolver), las alertas del alumno que piden sus
// motivos y el reporte de baja que devuelve hasta 3 consejos por motivo. Se registra solo bajo /v1
// (src/compartido/modulos.ts).
// Quién: /trainer/alerts y PATCH /alerts/:id son del entrenador (el alumno recibe 403, PERM-01);
// /me/alerts y /me/drop-reports son del alumno, vinculado o solo (el entrenador recibe 403,
// PERM-23, PERM-24, PERM-37). El entrenador solo alcanza alertas de clientes con vínculo activo;
// lo demás da 404 (INT-133).
// La detección (cuándo se crea una alerta) vive en ./deteccion.ts; los umbrales en ./umbrales.ts.
// Tócalo cuando: agregues o cambies una ruta de alertas.
// No lo toques para: la forma de la respuesta (packages/shared/src/api/alertas.ts y ./vista.ts).
// Depende de: src/compartido, ./vista y @gymtrack/shared (RUTAS_ALERTAS).
// ─────────────────────────────────────────────────────────────────────────────
import { CONSEJOS_POR_MOTIVO, RUTAS_ALERTAS as R, TIPOS_ALERTA_CON_MOTIVOS } from '@gymtrack/shared';
import {
  armarPagina, definirModulo, esquemaDe, existeOFalla, fallar, idsDeClientes, noEncontrado, paginaPorId, urlDe, usuarioDe,
} from '../../compartido';
import { esDuplicado } from '../../db';
import type { EstadoAlerta, Prisma } from '../../generado/prisma/client';
import { alertaAApi, incluirAlerta } from './vista';

const ABIERTAS: EstadoAlerta[] = ['nueva', 'vista'];

export default definirModulo(async (app, ctx) => {
  const { prisma, reloj } = ctx;

  /** Las alertas que este entrenador alcanza: suyas y de un cliente con vínculo activo. */
  const delEntrenador = async (entrenadorId: string): Promise<Prisma.AlertaWhereInput> => ({
    entrenadorId,
    alumnoId: { in: await idsDeClientes(prisma, entrenadorId) },
  });

  // ── EP-56 · Alertas del entrenador ─────────────────────────────────────────
  app.get(urlDe(R.listarEntrenador), { schema: esquemaDe(R.listarEntrenador), preHandler: app.exigirPermiso('gestionarAlertas') }, async (req) => {
    const usuario = usuarioDe(req);
    const alcance = await delEntrenador(usuario.id);
    const { estado, client_id: clientId, tipo } = req.query;
    if (clientId && !(alcance.alumnoId as { in: string[] }).in.includes(clientId)) noEncontrado();
    const porEstado: Prisma.AlertaWhereInput =
      estado === 'resueltas' ? { estado: 'resuelta' } : estado === 'nuevas' ? { estado: 'nueva' } : { estado: { in: ABIERTAS } };
    const p = paginaPorId(req.query, 'desc');
    const filas = await prisma.alerta.findMany({
      where: { AND: [alcance, porEstado, clientId ? { alumnoId: clientId } : {}, tipo ? { tipo } : {}, p.where] },
      include: incluirAlerta,
      orderBy: p.orderBy,
      take: p.take,
    });
    const pagina = armarPagina(filas, req.query.limit, (a) => ({ id: a.id }));
    const [abiertas, nuevas] = await Promise.all([
      prisma.alerta.count({ where: { AND: [alcance, { estado: { in: ABIERTAS } }] } }),
      prisma.alerta.count({ where: { AND: [alcance, { estado: 'nueva' }] } }),
    ]);
    return { items: pagina.items.map(alertaAApi), next_cursor: pagina.next_cursor, abiertas, nuevas };
  });

  // ── EP-57 · Marcar vista o resuelta ────────────────────────────────────────
  app.patch(urlDe(R.cambiarEstado), { schema: esquemaDe(R.cambiarEstado), preHandler: app.exigirPermiso('gestionarAlertas') }, async (req) => {
    const usuario = usuarioDe(req);
    const a = existeOFalla(
      await prisma.alerta.findFirst({ where: { AND: [{ id: req.params.id }, await delEntrenador(usuario.id)] } }),
    );
    const ahora = reloj.ahora();
    const { estado, acciones } = req.body;
    // Una resuelta no vuelve a estar por revisar: si pasa de nuevo, la detección crea otra.
    if (a.estado === 'resuelta' && estado === 'vista') fallar('CONFLICT', { alert_id: a.id, estado: a.estado });
    let data: Prisma.AlertaUpdateInput = {};
    if (estado === 'vista' && a.estado === 'nueva') data = { estado: 'vista', vistaAt: ahora };
    if (estado === 'resuelta' && a.estado !== 'resuelta') {
      const detalle = (typeof a.detalle === 'object' && a.detalle && !Array.isArray(a.detalle) ? a.detalle : {}) as Record<string, unknown>;
      data = {
        estado: 'resuelta',
        resueltaAt: ahora,
        vistaAt: a.vistaAt ?? ahora,
        detalle: { ...detalle, resolucion: { acciones: acciones ?? [], por: usuario.id, at: ahora.toISOString() } } as Prisma.InputJsonValue,
      };
    }
    const fila = await prisma.alerta.update({ where: { id: a.id }, data, include: incluirAlerta });
    return alertaAApi(fila);
  });

  // ── EP-58 · Alertas del alumno que piden motivos ───────────────────────────
  app.get(urlDe(R.listarAlumno), { schema: esquemaDe(R.listarAlumno), preHandler: app.exigirPermiso('responderAlertas') }, async (req) => {
    const usuario = usuarioDe(req);
    const filas = await prisma.alerta.findMany({
      where: { alumnoId: usuario.id, estado: { in: ABIERTAS }, tipo: { in: [...TIPOS_ALERTA_CON_MOTIVOS] }, reporte: { is: null } },
      include: incluirAlerta,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return { items: filas.map(alertaAApi) };
  });

  // ── EP-59 · Motivos de la baja y consejos ──────────────────────────────────
  app.post(urlDe(R.reportarBaja), { schema: esquemaDe(R.reportarBaja), preHandler: app.exigirPermiso('responderAlertas') }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const { alert_id: alertaId, motivos, comentario } = req.body;
    const a = existeOFalla(await prisma.alerta.findFirst({ where: { id: alertaId, alumnoId: usuario.id }, include: { reporte: true } }));
    if (!(TIPOS_ALERTA_CON_MOTIVOS as readonly string[]).includes(a.tipo)) {
      fallar('BUSINESS_RULE', { alert_id: a.id, tipo: a.tipo }, 'Esta alerta no pide motivos.');
    }
    if (a.reporte || a.estado === 'resuelta') fallar('CONFLICT', { alert_id: a.id }, 'Ya mandaste tus motivos para esta alerta.');
    const consejos = (
      await Promise.all(
        motivos.map((motivo) => prisma.consejo.findMany({ where: { motivo }, orderBy: { orden: 'asc' }, take: CONSEJOS_POR_MOTIVO })),
      )
    ).flat();
    try {
      const r = await prisma.reporteBaja.create({
        data: {
          alumnoId: usuario.id,
          alertaId: a.id,
          motivos,
          comentario: comentario ?? null,
          consejosMostrados: consejos.map((c) => c.id),
          createdAt: reloj.ahora(),
        },
      });
      return reply.code(201).send({
        id: r.id,
        alert_id: a.id,
        motivos: r.motivos,
        comentario: r.comentario,
        consejos: consejos.map((c) => ({ id: c.id, motivo: c.motivo, orden: c.orden, texto: c.texto })),
        created_at: r.createdAt.toISOString(),
      });
    } catch (e) {
      if (esDuplicado(e)) fallar('CONFLICT', { alert_id: a.id }, 'Ya mandaste tus motivos para esta alerta.');
      throw e;
    }
  });
});
