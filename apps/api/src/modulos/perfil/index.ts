// ─────────────────────────────────────────────────────────────────────────────
// Módulo perfil · Zona: Perfil (API)
//
// Qué hace: las rutas de perfil y cuenta de §API: PATCH /me, POST y GET /me/survey,
// POST /me/push-tokens, GET /me/export (más la descarga del ZIP con la URL firmada), DELETE /me,
// el código de invitación del entrenador (POST y GET /trainer/invitations) y el vínculo del
// alumno (POST /me/trainer/link y DELETE /me/trainer). Se registra solo bajo /v1
// (src/compartido/modulos.ts). Cada ruta sale del catálogo RUTAS_PERFIL de
// packages/shared/src/api/perfil.ts; los permisos son los de la matriz de §Roles
// (src/compartido/permisos.ts): encuesta y vínculo solo alumno (PERM-31, PERM-33), invitación
// solo entrenador (PERM-32), exportar y borrar cada uno lo suyo (PERM-28 a 30).
// Tócalo cuando: agregues o cambies una ruta de perfil.
// No lo toques para: las reglas (servicio.ts), los CSV y el ZIP (exportar.ts) ni la forma de la
// entrada y la salida (packages/shared/src/api/perfil.ts).
// Depende de: src/compartido, ./servicio, ./exportar y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { NOMBRE_ARCHIVO_EXPORTACION, RUTAS_PERFIL as R } from '@gymtrack/shared';
import { definirModulo, esquemaDe, fallar, noEncontrado, urlDe, usuarioDe } from '../../compartido';
import { ARCHIVOS_ALUMNO, ARCHIVOS_ENTRENADOR, archivosDe, armarZip, firmarExportacion, leerExportacion } from './exportar';
import {
  actualizarPerfil, borrarCuenta, crearInvitacion, desvincular, registrarPush, responderEncuesta, verEncuesta,
  verInvitacion, vincularConCodigo,
} from './servicio';

/** P-27: 10 códigos fallidos por hora por alumno, además de los 60 por minuto generales. */
export const LIMITE_CODIGOS = { maximo: 10, ventanaMs: 3_600_000 } as const;

export default definirModulo(async (app, ctx) => {
  const { prisma, reloj } = ctx;
  const limiteCodigos = ctx.crearLimitador('perfil.codigosInvitacion', LIMITE_CODIGOS);
  /** Cuenta un código fallido; el undécimo de la hora da 429 (SEG-024). */
  const contarCodigoFallido = (alumnoId: string) => () => {
    const r = limiteCodigos.intentar(alumnoId);
    if (!r.permitido) fallar('RATE_LIMITED', { reintentar_en_s: r.reintentarEnS });
  };

  // ── Perfil ─────────────────────────────────────────────────────────────────
  app.patch(urlDe(R.actualizar), { schema: esquemaDe(R.actualizar), preHandler: app.exigirSesion }, async (req) =>
    actualizarPerfil(prisma, usuarioDe(req), req.body),
  );

  app.delete(urlDe(R.borrarCuenta), { schema: esquemaDe(R.borrarCuenta), preHandler: app.exigirPermiso('exportarYBorrar') }, async (req) => {
    const { deletedAt, purgaAt } = await borrarCuenta(prisma, usuarioDe(req), reloj.ahora());
    req.log.info({ usuario: usuarioDe(req).id }, 'cuenta marcada para borrado');
    return { borrada: true as const, deleted_at: deletedAt.toISOString(), purga_at: purgaAt.toISOString() };
  });

  // ── Encuesta ───────────────────────────────────────────────────────────────
  app.post(urlDe(R.responderEncuesta), { schema: esquemaDe(R.responderEncuesta), preHandler: app.exigirPermiso('responderEncuesta') },
    async (req, reply) => {
      const usuario = usuarioDe(req);
      const encuesta = await responderEncuesta(prisma, usuario, req.body, reloj.ahora(), contarCodigoFallido(usuario.id));
      return reply.code(201).send(encuesta);
    },
  );

  app.get(urlDe(R.verEncuesta), { schema: esquemaDe(R.verEncuesta), preHandler: app.exigirPermiso('responderEncuesta') }, async (req) =>
    verEncuesta(prisma, usuarioDe(req).id),
  );

  // ── Push ───────────────────────────────────────────────────────────────────
  const esquemaPush = esquemaDe(R.registrarPush);
  app.post(urlDe(R.registrarPush), { schema: { ...esquemaPush, response: { ...esquemaPush.response, 200: R.registrarPush.respuesta } }, preHandler: app.exigirSesion },
    async (req, reply) => {
      const { nuevo, token } = await registrarPush(prisma, usuarioDe(req), req.body);
      return reply.code(nuevo ? 201 : 200).send(token);
    },
  );

  // ── Exportar ───────────────────────────────────────────────────────────────
  app.get(urlDe(R.exportar), { schema: esquemaDe(R.exportar), preHandler: app.exigirPermiso('exportarYBorrar') }, async (req) => {
    const usuario = usuarioDe(req);
    const { token, venceAt } = firmarExportacion(ctx.config.jwtSecreto, usuario.id, reloj.ahora());
    const url = `${req.protocol}://${req.host}${R.descargarExportacion.ruta}?token=${encodeURIComponent(token)}`;
    return {
      url,
      vence_at: venceAt.toISOString(),
      nombre_archivo: NOMBRE_ARCHIVO_EXPORTACION,
      archivos: [...(usuario.rol === 'trainer' ? ARCHIVOS_ENTRENADOR : ARCHIVOS_ALUMNO)],
    };
  });

  app.get(urlDe(R.descargarExportacion), { schema: esquemaDe(R.descargarExportacion) }, async (req, reply) => {
    const ahora = reloj.ahora();
    const usuarioId = leerExportacion(ctx.config.jwtSecreto, req.query.token, ahora);
    // Vencida, alterada o de una cuenta borrada: 404 y la app pide otra (CU-53 E1).
    if (!usuarioId) noEncontrado();
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || usuario.deletedAt) noEncontrado();
    const zip = armarZip(await archivosDe(prisma, usuario), ahora);
    return reply
      .header('content-type', 'application/zip')
      .header('content-disposition', `attachment; filename="${NOMBRE_ARCHIVO_EXPORTACION}"`)
      .header('cache-control', 'private, no-store')
      .send(zip);
  });

  // ── Invitación del entrenador ──────────────────────────────────────────────
  app.post(urlDe(R.crearInvitacion), { schema: esquemaDe(R.crearInvitacion), preHandler: app.exigirRol('trainer') }, async (req, reply) =>
    reply.code(201).send(await crearInvitacion(prisma, usuarioDe(req).id, reloj.ahora())),
  );

  app.get(urlDe(R.verInvitacion), { schema: esquemaDe(R.verInvitacion), preHandler: app.exigirRol('trainer') }, async (req) => ({
    invitacion: await verInvitacion(prisma, usuarioDe(req).id, reloj.ahora()),
  }));

  // ── Vínculo del alumno ─────────────────────────────────────────────────────
  app.post(urlDe(R.vincular), { schema: esquemaDe(R.vincular), preHandler: app.exigirPermiso('vincularse') }, async (req) => {
    const usuario = usuarioDe(req);
    return vincularConCodigo(prisma, usuario, req.body.codigo, reloj.ahora(), contarCodigoFallido(usuario.id), req.body.vista_previa === true);
  });

  app.delete(urlDe(R.desvincular), { schema: esquemaDe(R.desvincular), preHandler: app.exigirPermiso('vincularse') }, async (req) => {
    const terminado = await desvincular(prisma, usuarioDe(req).id, reloj.ahora());
    return { desvinculado: true as const, terminado_at: terminado.toISOString() };
  });
});
