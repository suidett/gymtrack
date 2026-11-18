// ─────────────────────────────────────────────────────────────────────────────
// Módulo entrenador · Zona: Entrenador (API)
//
// Qué hace: las rutas del panel del entrenador de §API (EP-15 a EP-17): la lista de clientes con
// quién entrena hoy, quién no tiene rutina, la adherencia de la semana y las alertas abiertas; la
// ficha completa de un cliente (rutina activa, cifras del mes, últimas sesiones, PRs, medidas,
// encuesta, observaciones con si ya tienen respuesta, y alertas abiertas); y terminar el vínculo,
// que deja el historial con el alumno y archiva para él la rutina que escribió el entrenador
// (P-16). Se registra solo bajo /v1 (src/compartido/modulos.ts).
// Quién: solo el entrenador (el alumno recibe 403, PERM-01 a 03, PERM-32), y solo sobre clientes
// con vínculo activo: cualquier otro id da 404 con el mismo cuerpo que uno inventado (INT-042 a 44).
// La invitación y el vínculo desde el alumno están en el módulo perfil. Responder una observación
// o escribir un consejo es POST /observations (módulo sesiones).
// Tócalo cuando: agregues o cambies una ruta del panel del entrenador.
// No lo toques para: cómo se cuentan la adherencia o «entrena hoy» (./consultas.ts) ni la forma de
// la respuesta (packages/shared/src/api/entrenador.ts).
// Depende de: src/compartido, ./consultas, ../progreso (récords, medidas, zona), ../alertas/vista
// y @gymtrack/shared (RUTAS_ENTRENADOR).
// ─────────────────────────────────────────────────────────────────────────────
import { OBSERVACIONES_EN_FICHA, RUTAS_ENTRENADOR as R, SESIONES_EN_FICHA } from '@gymtrack/shared';
import { z } from 'zod';
import { armarPagina, definirModulo, esquemaDe, exigirClienteDe, existeOFalla, leerCursor, urlDe, usuarioDe } from '../../compartido';
import { alertaAApi, incluirAlerta } from '../alertas/vista';
import { medidaAApi, recordsVigentes, tendenciaDeMedidas } from '../progreso/consultas';
import { diaLocal, inicioDelDia, primeroDelMes } from '../progreso/zona';
import { estadosDeClientes, sinTildes, type EstadoCliente, type RutinaResumen } from './consultas';

const esquemaCursorLista = z.object({ desde: z.number().int().min(0) });
const SEMANA_MS = 7 * 86_400_000;

function rutinaDeLista(r: RutinaResumen | null) {
  return r ? { id: r.id, nombre: r.nombre, metodo_progresion: r.metodo_progresion, dias_por_semana: r.dias.length } : null;
}

export default definirModulo(async (app, ctx) => {
  const { prisma, reloj } = ctx;

  // ── EP-15 · Lista de clientes ──────────────────────────────────────────────
  app.get(urlDe(R.listarClientes), { schema: esquemaDe(R.listarClientes), preHandler: app.exigirPermiso('verClientes') }, async (req) => {
    const usuario = usuarioDe(req);
    const ahora = reloj.ahora();
    const vinculos = await prisma.vinculoEntrenador.findMany({
      where: { entrenadorId: usuario.id, estado: 'activo', alumno: { deletedAt: null } },
      include: { alumno: { select: { id: true, nombre: true, apellido: true, timezone: true } } },
    });
    const clientes = vinculos.flatMap((v) => (v.alumno ? [{ ...v.alumno, vinculadoAt: v.aceptadoAt }] : []));
    const estados = await estadosDeClientes(prisma, usuario.id, clientes, ahora);
    const filas = clientes
      .map((c) => {
        const e = estados.get(c.id) as EstadoCliente;
        return {
          id: c.id,
          nombre: c.nombre,
          apellido: c.apellido,
          estado: 'activo' as const,
          vinculado_at: c.vinculadoAt?.toISOString() ?? null,
          rutina: rutinaDeLista(e.rutina),
          sin_rutina: e.rutina === null,
          entrena_hoy: e.entrenaHoy,
          ultima_sesion: e.ultimaSesion,
          adherencia_semana: e.adherencia,
          alertas_abiertas: e.alertasAbiertas,
          alertas_nuevas: e.alertasNuevas,
          revisar: e.alertasAbiertas > 0,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.apellido.localeCompare(b.apellido, 'es') || a.id.localeCompare(b.id));

    // El resumen de arriba mira a todos, sin filtro ni búsqueda.
    const conRutina = filas.filter((f) => !f.sin_rutina);
    const hechas = conRutina.reduce((s, f) => s + f.adherencia_semana.hechas, 0);
    const planificadas = conRutina.reduce((s, f) => s + f.adherencia_semana.planificadas, 0);
    const resumen = {
      activos: filas.length,
      entrenan_hoy: filas.filter((f) => f.entrena_hoy).length,
      sin_rutina: filas.length - conRutina.length,
      alertas_abiertas: filas.reduce((s, f) => s + f.alertas_abiertas, 0),
      alertas_nuevas: filas.reduce((s, f) => s + f.alertas_nuevas, 0),
      adherencia_semana_pct: planificadas > 0 ? Math.min(100, Math.round((hechas / planificadas) * 100)) : null,
      sesiones_hechas: hechas,
      sesiones_planificadas: planificadas,
    };

    const q = req.query.q ? sinTildes(req.query.q) : '';
    const filtradas = filas.filter((f) => {
      if (q && !sinTildes(`${f.nombre} ${f.apellido}`).includes(q)) return false;
      if (req.query.filtro === 'hoy') return f.entrena_hoy;
      if (req.query.filtro === 'revisar') return f.revisar;
      if (req.query.filtro === 'sin_rutina') return f.sin_rutina;
      return true;
    });
    const desde = leerCursor(req.query.cursor, esquemaCursorLista)?.desde ?? 0;
    const tramo = filtradas.slice(desde, desde + req.query.limit + 1);
    const pagina = armarPagina(tramo, req.query.limit, () => ({ desde: desde + req.query.limit }));
    return { ...pagina, resumen };
  });

  // ── EP-16 · Ficha del cliente ──────────────────────────────────────────────
  app.get(urlDe(R.fichaCliente), { schema: esquemaDe(R.fichaCliente), preHandler: app.exigirPermiso('verClientes') }, async (req) => {
    const usuario = usuarioDe(req);
    const ahora = reloj.ahora();
    const vinculo = await exigirClienteDe(prisma, usuario.id, req.params.id);
    const cliente = existeOFalla(await prisma.usuario.findFirst({ where: { id: req.params.id, deletedAt: null } }));
    const estado = (await estadosDeClientes(prisma, usuario.id, [cliente], ahora)).get(cliente.id) as EstadoCliente;
    const zona = cliente.timezone;
    const inicioMes = inicioDelDia(primeroDelMes(diaLocal(ahora, zona)), zona);

    const [sesiones, delMes, prs, prsDelMes, medidas, fotos, encuesta, observaciones, alertas] = await Promise.all([
      prisma.sesionEntreno.findMany({
        where: { alumnoId: cliente.id, estado: { not: 'descartada' } },
        orderBy: { iniciadaAt: 'desc' },
        take: SESIONES_EN_FICHA,
        include: { dia: { select: { nombre: true } }, _count: { select: { series: { where: { completada: true } } } } },
      }),
      prisma.sesionEntreno.findMany({
        where: { alumnoId: cliente.id, estado: 'cerrada', cerradaAt: { gte: inicioMes } },
        select: { volumenKg: true },
      }),
      recordsVigentes(prisma, cliente.id),
      prisma.recordPersonal.count({ where: { alumnoId: cliente.id, fecha: { gte: inicioMes } } }),
      prisma.medidaCorporal.findMany({ where: { alumnoId: cliente.id }, orderBy: { fecha: 'desc' } }),
      prisma.fotoProgreso.count({ where: { alumnoId: cliente.id, subidaAt: { not: null } } }),
      prisma.respuestaEncuesta.findFirst({ where: { alumnoId: cliente.id }, orderBy: { completadaAt: 'desc' } }),
      prisma.observacion.findMany({
        where: { alumnoId: cliente.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { autor: { select: { id: true, rol: true, nombre: true } }, ejercicio: { select: { id: true, nombre: true } } },
      }),
      prisma.alerta.findMany({
        where: { alumnoId: cliente.id, entrenadorId: usuario.id, estado: { in: ['nueva', 'vista'] } },
        include: incluirAlerta,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const r = estado.rutina;
    const semanaActual = r?.activadaAt
      ? Math.min(r.semanas, Math.max(1, Math.floor((ahora.getTime() - r.activadaAt.getTime()) / SEMANA_MS) + 1))
      : null;
    // Una observación del alumno tiene respuesta si después hay un consejo del entrenador sobre lo mismo.
    const respondida = (o: (typeof observaciones)[number]) =>
      o.autor.rol === 'client' &&
      observaciones.some(
        (x) =>
          x.autor.rol === 'trainer' && x.tipo === 'consejo' && x.createdAt > o.createdAt &&
          ((o.sesionId && x.sesionId === o.sesionId) || (o.ejercicioId && x.ejercicioId === o.ejercicioId) || (o.serieId && x.serieId === o.serieId)),
      );
    const respuestas = encuesta?.respuestas;

    return {
      cliente: {
        id: cliente.id, nombre: cliente.nombre, apellido: cliente.apellido, timezone: cliente.timezone, unidades: cliente.unidades,
        vinculado_at: vinculo.aceptadoAt?.toISOString() ?? null, cuenta_creada_at: cliente.createdAt.toISOString(),
      },
      rutina_activa: r
        ? {
            id: r.id, nombre: r.nombre, metodo_progresion: r.metodo_progresion, semanas: r.semanas, semana_actual: semanaActual,
            version: r.version, activada_at: r.activadaAt?.toISOString() ?? null, owner_id: r.duenoId, dias: r.dias,
          }
        : null,
      adherencia_semana: estado.adherencia,
      mes: {
        sesiones: delMes.length,
        volumen_kg: Math.round(delMes.reduce((s, x) => s + (x.volumenKg ?? 0), 0) * 10) / 10,
        prs: prsDelMes,
      },
      ultimas_sesiones: sesiones.map((s) => ({
        id: s.id, estado: s.estado, dia_nombre: s.dia?.nombre ?? null,
        iniciada_at: s.iniciadaAt.toISOString(), cerrada_at: s.cerradaAt?.toISOString() ?? null,
        duracion_s: s.duracionS, volumen_kg: s.volumenKg, series_completadas: s._count.series,
      })),
      prs,
      medidas: { ultima: medidas[0] ? medidaAApi(medidas[0]) : null, registros: medidas.length, tendencia: tendenciaDeMedidas(medidas) },
      fotos,
      encuesta: encuesta
        ? {
            id: encuesta.id, version: encuesta.version, completada_at: encuesta.completadaAt.toISOString(),
            respuestas: (respuestas && typeof respuestas === 'object' && !Array.isArray(respuestas) ? respuestas : {}) as Record<string, unknown>,
          }
        : null,
      observaciones: observaciones.slice(0, OBSERVACIONES_EN_FICHA).map((o) => ({
        id: o.id, tipo: o.tipo, texto: o.texto, autor: o.autor, exercise: o.ejercicio,
        session_id: o.sesionId, set_id: o.serieId, routine_id: o.rutinaId,
        dolor_zona: o.dolorZona, dolor_intensidad: o.dolorIntensidad,
        respondida: Boolean(respondida(o)), created_at: o.createdAt.toISOString(),
      })),
      alertas: alertas.map(alertaAApi),
    };
  });

  // ── EP-17 · Terminar el vínculo ────────────────────────────────────────────
  app.delete(urlDe(R.terminarVinculo), { schema: esquemaDe(R.terminarVinculo), preHandler: app.exigirPermiso('verClientes') }, async (req) => {
    const usuario = usuarioDe(req);
    const ahora = reloj.ahora();
    const vinculo = await exigirClienteDe(prisma, usuario.id, req.params.id);
    const alumnoId = req.params.id;
    const archivadas = await prisma.$transaction(async (tx) => {
      await tx.vinculoEntrenador.update({ where: { id: vinculo.id }, data: { estado: 'terminado', terminadoAt: ahora } });
      // P-16: la rutina activa que escribió el entrenador queda archivada para el alumno; él la
      // conserva en su biblioteca y el historial de sesiones se queda con el alumno.
      const suyas = await tx.rutina.findMany({ where: { duenoId: usuario.id, alumnoId, estado: 'activa' }, select: { id: true } });
      const ids = suyas.map((x) => x.id);
      if (ids.length) await tx.rutina.updateMany({ where: { id: { in: ids } }, data: { estado: 'archivada' } });
      const perfil = await tx.perfilAlumno.findUnique({ where: { usuarioId: alumnoId } });
      if (perfil) {
        await tx.perfilAlumno.update({
          where: { usuarioId: alumnoId },
          data: {
            entrenadorId: perfil.entrenadorId === usuario.id ? null : perfil.entrenadorId,
            rutinaActivaId: perfil.rutinaActivaId && ids.includes(perfil.rutinaActivaId) ? null : perfil.rutinaActivaId,
          },
        });
      }
      return ids.length;
    });
    return { client_id: alumnoId, terminado_at: ahora.toISOString(), rutinas_archivadas: archivadas };
  });
});
