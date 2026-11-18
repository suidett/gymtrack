// ─────────────────────────────────────────────────────────────────────────────
// Módulo sesiones · Zona: Sesiones (API)
//
// Qué hace: las rutas de Entrenar y sincronizar de §API: GET /me/today, POST /sessions (id del
// celular: 201 la primera vez, 200 con la misma después), PUT /sessions/:id/sets, POST
// /sessions/:id/finish y /discard, POST /sync/sessions (cola sin señal, un resultado por sesión;
// gana la primera copia cerrada, P-18), GET /sessions y /sessions/:id, y POST y GET /observations.
// Permisos: entrenar es del alumno (el entrenador recibe 403, PERM-16 y PERM-37); leer es del
// alumno y de su entrenador con vínculo activo (lo ajeno da 404). Se registra solo bajo /v1.
// Tócalo cuando: agregues o cambies una ruta de este módulo.
// No lo toques para: la lógica de cierre (servicio.ts), Hoy (hoy.ts) ni reglas comunes (src/compartido).
// Depende de: src/compartido, ./servicio, ./hoy, ./observaciones y @gymtrack/shared (RUTAS_SESIONES).
// ─────────────────────────────────────────────────────────────────────────────
import { esquemaSesionSincronizada, RUTAS_SESIONES as R, type ResultadoSincronizacionApi } from '@gymtrack/shared';
import {
  alumnoObjetivo, armarPagina, definirModulo, ErrorApi, esquemaDe, exigirAccesoAlAlumno, noEncontrado, paginaPorId,
  urlDe, usuarioDe,
} from '../../compartido';
import { detectarTrasCierre } from '../alertas/deteccion';
import { leerUmbrales } from '../alertas/umbrales';
import { avisarCierreDeSesion, avisarObservacionNueva } from '../notificaciones/eventos';
import { armarHoy } from './hoy';
import { crearObservacion, listarObservaciones } from './observaciones';
import {
  cerrarSesion, descartarSesion, detalleSesion, guardarSeries, iniciarSesion, mismasSeries, resumenDeCierre,
  sesionAApi, sesionDelAlumno,
} from './servicio';

export default definirModulo(async (app, ctx) => {
  const { prisma, reloj } = ctx;
  const entrenar = app.exigirPermiso('registrarEntreno');
  const umbrales = leerUmbrales();

  /**
   * Estancamiento y baja de rendimiento al cerrar (INT-099, INT-145, INT-149). Va después de la
   * transacción del cierre, así la sesión ya está cerrada; si falla, el cierre igual queda y el
   * worker de la noche lo vuelve a revisar.
   */
  const detectar = async (sesionId: string) => {
    try {
      await detectarTrasCierre(prisma, sesionId, umbrales, reloj.ahora());
    } catch (err) {
      app.log.error({ err, sesionId }, 'No se pudo revisar las alertas del cierre');
    }
    // Push y correo al entrenador con las alertas que dejó el cierre (después de responder).
    avisarCierreDeSesion(ctx, sesionId);
  };

  // ── Hoy ────────────────────────────────────────────────────────────────────
  app.get(urlDe(R.hoy), { schema: esquemaDe(R.hoy), preHandler: entrenar }, async (req) => armarHoy(prisma, usuarioDe(req), reloj.ahora()));

  // ── Iniciar ────────────────────────────────────────────────────────────────
  const esquemaIniciar = esquemaDe(R.iniciar);
  app.post(urlDe(R.iniciar), {
    schema: { ...esquemaIniciar, response: { ...esquemaIniciar.response, 200: R.iniciar.respuesta } },
    preHandler: entrenar,
  }, async (req, reply) => {
    const u = usuarioDe(req);
    const { creada } = await prisma.$transaction((tx) => iniciarSesion(tx, u.id, req.body, reloj.ahora()));
    return reply.code(creada ? 201 : 200).send(await detalleSesion(prisma, req.body.id));
  });

  // ── Series ─────────────────────────────────────────────────────────────────
  app.put(urlDe(R.series), { schema: esquemaDe(R.series), preHandler: entrenar }, async (req) => {
    const u = usuarioDe(req);
    await prisma.$transaction(async (tx) => guardarSeries(tx, await sesionDelAlumno(tx, req.params.id, u.id), req.body));
    return detalleSesion(prisma, req.params.id);
  });

  // ── Cerrar ─────────────────────────────────────────────────────────────────
  app.post(urlDe(R.cerrar), { schema: esquemaDe(R.cerrar), preHandler: entrenar }, async (req) => {
    const u = usuarioDe(req);
    const s = await sesionDelAlumno(prisma, req.params.id, u.id);
    if (s.estado === 'cerrada') {
      // Reintento del mismo teléfono: el mismo resumen, sin duplicar nada (INT-100).
      if (s.deviceId && req.body.device_id && s.deviceId !== req.body.device_id) throw new ErrorApi('SESSION_CLOSED', { session_id: s.id });
      return resumenDeCierre(prisma, s.id, u.timezone);
    }
    await prisma.$transaction((tx) => cerrarSesion(tx, s, req.body, reloj.ahora()), { timeout: 20_000 });
    await detectar(s.id);
    return resumenDeCierre(prisma, s.id, u.timezone);
  });

  // ── Descartar ──────────────────────────────────────────────────────────────
  app.post(urlDe(R.descartar), { schema: esquemaDe(R.descartar), preHandler: entrenar }, async (req) => {
    const u = usuarioDe(req);
    await descartarSesion(prisma, await sesionDelAlumno(prisma, req.params.id, u.id));
    const s = await prisma.sesionEntreno.findUniqueOrThrow({ where: { id: req.params.id }, include: { dia: { select: { nombre: true } }, series: true } });
    return sesionAApi(s);
  });

  // ── Sincronizar (P-18, P-31) ───────────────────────────────────────────────
  app.post(urlDe(R.sincronizar), { schema: esquemaDe(R.sincronizar), preHandler: entrenar }, async (req) => {
    const u = usuarioDe(req);
    const ahora = reloj.ahora();
    const validadas = req.body.sesiones.map((crudo) => ({ crudo, r: esquemaSesionSincronizada.safeParse(crudo) }));
    // En orden de cerrada_at (P-31); las inválidas van al final.
    validadas.sort((a, b) => (a.r.success && b.r.success ? a.r.data.cerrada_at.localeCompare(b.r.data.cerrada_at) : a.r.success ? -1 : 1));
    const resultados: ResultadoSincronizacionApi['resultados'] = [];
    for (const { crudo, r } of validadas) {
      if (!r.success) {
        const i = r.error.issues[0];
        resultados.push({
          id: crudo.id, resultado: 'rechazada', resumen: null,
          motivo: { code: 'VALIDATION_ERROR', message: 'Revisa los datos enviados.', details: { campo: i?.path.join('.') ?? '(sesion)', motivo: i?.message ?? 'inválido' } },
        });
        continue;
      }
      const d = r.data;
      try {
        const existe = await prisma.sesionEntreno.findUnique({ where: { id: d.id } });
        if (existe && existe.alumnoId !== u.id) noEncontrado();
        if (existe?.estado === 'cerrada') {
          const mismoTelefono = (existe.deviceId ?? null) === (d.device_id ?? null);
          const iguales = await mismasSeries(prisma, d.id, d.series);
          resultados.push(mismoTelefono && iguales
            ? { id: d.id, resultado: 'ya_estaba', motivo: null, resumen: await resumenDeCierre(prisma, d.id, u.timezone) }
            : { id: d.id, resultado: 'descartada_conflicto', resumen: null, motivo: { code: 'SESSION_CLOSED', message: 'Esta sesión ya se cerró desde otro teléfono. Quedó la primera copia.' } });
          continue;
        }
        if (existe?.estado === 'descartada') throw new ErrorApi('SESSION_DISCARDED', { session_id: d.id });
        await prisma.$transaction(async (tx) => {
          await iniciarSesion(tx, u.id, d, ahora);
          await guardarSeries(tx, await sesionDelAlumno(tx, d.id, u.id), { series: d.series, eliminadas: [] });
          await cerrarSesion(tx, await sesionDelAlumno(tx, d.id, u.id), d, ahora);
        }, { timeout: 20_000 });
        await detectar(d.id);
        resultados.push({ id: d.id, resultado: 'aceptada', motivo: null, resumen: await resumenDeCierre(prisma, d.id, u.timezone) });
      } catch (err) {
        if (!(err instanceof ErrorApi)) throw err;
        resultados.push({ id: d.id, resultado: 'rechazada', resumen: null, motivo: { code: err.codigo, message: err.message, ...(err.detalles ? { details: err.detalles } : {}) } });
      }
    }
    return { resultados };
  });

  // ── Historial y detalle ────────────────────────────────────────────────────
  const leer = app.exigirPermiso('verDatosAlumno');
  app.get(urlDe(R.historial), { schema: esquemaDe(R.historial), preHandler: leer }, async (req) => {
    const alumnoId = await alumnoObjetivo(prisma, usuarioDe(req), req.query.client_id);
    const p = paginaPorId(req.query, 'desc');
    const filas = await prisma.sesionEntreno.findMany({
      ...p, where: { ...p.where, alumnoId, estado: { not: 'descartada' } },
      include: { dia: { select: { nombre: true } }, series: true },
    });
    return armarPagina(filas.map(sesionAApi), req.query.limit, (s) => ({ id: s.id }));
  });

  app.get(urlDe(R.detalle), { schema: esquemaDe(R.detalle), preHandler: leer }, async (req) => {
    const s = await prisma.sesionEntreno.findUnique({ where: { id: req.params.id }, select: { alumnoId: true } });
    if (!s) noEncontrado();
    await exigirAccesoAlAlumno(prisma, usuarioDe(req), s.alumnoId);
    return detalleSesion(prisma, req.params.id);
  });

  // ── Observaciones ──────────────────────────────────────────────────────────
  const escribir = app.exigirPermiso('escribirObservacion');
  const esquemaObservar = esquemaDe(R.observar);
  app.post(urlDe(R.observar), {
    schema: { ...esquemaObservar, response: { ...esquemaObservar.response, 200: R.observar.respuesta } },
    preHandler: escribir,
  }, async (req, reply) => {
    const { creada, observacion } = await crearObservacion(prisma, usuarioDe(req), req.body);
    // Dolor fuerte o nota del alumno al entrenador; respuesta o consejo del entrenador al alumno.
    if (creada) avisarObservacionNueva(ctx, observacion.id);
    return reply.code(creada ? 201 : 200).send(observacion);
  });

  app.get(urlDe(R.observaciones), { schema: esquemaDe(R.observaciones), preHandler: app.exigirSesion }, async (req) =>
    listarObservaciones(prisma, usuarioDe(req), req.query));
});
