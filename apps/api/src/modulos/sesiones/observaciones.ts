// ─────────────────────────────────────────────────────────────────────────────
// Observaciones y dolores · Zona: Sesiones (API)
//
// Qué hace: POST y GET /observations. Una observación va sobre un ejercicio, una sesión, una serie
// o una rutina (al menos uno). De quién es el dato (client_id) sale del destino; el entrenador
// solo escribe sobre clientes con vínculo activo (404 si no). El tipo consejo es solo del
// entrenador (422, P-08); el alumno vinculado no comenta la rutina (403, P-08). Un dolor de
// intensidad 7 o más crea la alerta de dolor para el entrenador en la misma llamada (INT-147).
// Nadie edita la ajena: no hay ruta de edición (INT-115).
// Tócalo cuando: cambie quién escribe dónde.
// No lo toques para: las rutas (index.ts).
// Depende de: src/compartido y ./servicio.
// ─────────────────────────────────────────────────────────────────────────────
import type { esquemaObservacionNueva, esquemaQueryObservaciones, ObservacionApi, Pagina } from '@gymtrack/shared';
import type { z } from 'zod';
import {
  alumnoObjetivo, armarPagina, exigirAccesoAlAlumno, exigirClienteDe, fallar, noEncontrado, paginaPorId, prohibido,
} from '../../compartido';
import type { Usuario } from '../../generado/prisma/client';
import { crearAlertaDolor, INCLUIR_AUTOR, observacionAApi, UMBRAL_DOLOR, type Db } from './servicio';

type Entrada = z.output<typeof esquemaObservacionNueva>;

export async function crearObservacion(db: Db, u: Usuario, e: Entrada): Promise<{ creada: boolean; observacion: ObservacionApi }> {
  if (e.id) {
    const ya = await db.observacion.findUnique({ where: { id: e.id }, include: INCLUIR_AUTOR });
    if (ya) {
      if (ya.autorId !== u.id) fallar('CONFLICT', { observation_id: e.id });
      return { creada: false, observacion: observacionAApi(ya) };
    }
  }
  if (e.tipo === 'consejo' && u.rol !== 'trainer') {
    fallar('BUSINESS_RULE', { campo: 'tipo', motivo: 'El consejo es solo del entrenador.' }, 'El consejo es solo del entrenador.');
  }
  // De quién es el dato: del destino más concreto.
  const candidatos: string[] = [];
  if (e.set_id) {
    const s = await db.serie.findUnique({ where: { id: e.set_id }, select: { alumnoId: true, sesionId: true } });
    if (!s || (e.session_id && s.sesionId !== e.session_id)) noEncontrado();
    candidatos.push(s.alumnoId);
  }
  if (e.session_id) {
    const s = await db.sesionEntreno.findUnique({ where: { id: e.session_id }, select: { alumnoId: true } });
    if (!s) noEncontrado();
    candidatos.push(s.alumnoId);
  }
  if (e.routine_id) {
    const r = await db.rutina.findUnique({ where: { id: e.routine_id } });
    if (!r || r.deletedAt) noEncontrado();
    if (u.rol === 'client') {
      if (r.alumnoId !== u.id && r.duenoId !== u.id) noEncontrado();
      const vinculado = await db.vinculoEntrenador.findFirst({ where: { alumnoId: u.id, estado: 'activo' } });
      // P-08: el alumno vinculado escribe en ejercicio, sesión y serie; la rutina la comenta el entrenador.
      if (vinculado) prohibido();
    } else if (!r.alumnoId) noEncontrado();
    candidatos.push(r.alumnoId ?? u.id);
  }
  if (e.exercise_id) {
    const ej = await db.ejercicio.findUnique({ where: { id: e.exercise_id }, select: { id: true } });
    if (!ej) noEncontrado();
  }
  let alumnoId = candidatos[0] ?? (u.rol === 'client' ? u.id : e.client_id);
  if (!alumnoId) fallar('VALIDATION_ERROR', { campo: 'client_id', motivo: 'Indica de qué alumno es la observación.' });
  if (candidatos.some((c) => c !== alumnoId)) noEncontrado();
  if (u.rol === 'client' && e.client_id && e.client_id !== u.id) noEncontrado();
  if (u.rol === 'trainer') {
    if (e.client_id && e.client_id !== alumnoId) noEncontrado();
    await exigirClienteDe(db, u.id, alumnoId);
  } else {
    await exigirAccesoAlAlumno(db, u, alumnoId);
    alumnoId = u.id;
  }
  const o = await db.observacion.create({
    data: {
      ...(e.id ? { id: e.id } : {}),
      autorId: u.id, alumnoId, tipo: e.tipo, texto: e.texto,
      ejercicioId: e.exercise_id ?? null, sesionId: e.session_id ?? null, serieId: e.set_id ?? null, rutinaId: e.routine_id ?? null,
      dolorZona: e.dolor_zona ?? null, dolorIntensidad: e.dolor_intensidad ?? null,
    },
    include: INCLUIR_AUTOR,
  });
  if (o.tipo === 'dolor' && (o.dolorIntensidad ?? 0) >= UMBRAL_DOLOR && u.rol === 'client') {
    await crearAlertaDolor(db, alumnoId, o.ejercicioId, { observation_id: o.id, session_id: o.sesionId, zona: o.dolorZona, intensidad: o.dolorIntensidad });
  }
  return { creada: true, observacion: observacionAApi(o) };
}

export async function listarObservaciones(db: Db, u: Usuario, q: z.output<typeof esquemaQueryObservaciones>): Promise<Pagina<ObservacionApi>> {
  const alumnoId = await alumnoObjetivo(db, u, q.client_id);
  const p = paginaPorId(q, 'desc');
  const filas = await db.observacion.findMany({
    ...p,
    where: {
      ...p.where, alumnoId,
      ...(q.exercise_id ? { ejercicioId: q.exercise_id } : {}),
      ...(q.session_id ? { sesionId: q.session_id } : {}),
      ...(q.routine_id ? { rutinaId: q.routine_id } : {}),
    },
    include: INCLUIR_AUTOR,
  });
  return armarPagina(filas.map(observacionAApi), q.limit, (o) => ({ id: o.id }));
}
