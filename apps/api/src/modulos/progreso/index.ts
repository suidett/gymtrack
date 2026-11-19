// ─────────────────────────────────────────────────────────────────────────────
// Módulo progreso · Zona: Progreso (API)
//
// Qué hace: las rutas de Progreso de §API (EP-46 a EP-55): progreso por ejercicio, volumen por
// semana, récords, peso y medidas, fotos privadas (con la subida y la lectura por URL firmada del
// almacenamiento de disco) y las sugerencias de carga con la sobrescritura del entrenador o del
// alumno solo. Se registra solo bajo /v1 (src/compartido/modulos.ts).
// Quién: las lecturas `/me/...` son del alumno y de su entrenador con `?client_id=` (P-02); el
// registro de medidas y fotos es solo del alumno (el entrenador recibe 403, PERM-16, PERM-36);
// las sugerencias son del entrenador y del alumno solo (el vinculado recibe 403, PERM-20, PERM-42).
// Lo ajeno siempre da 404 con el mismo cuerpo que lo inexistente.
// Reglas de fondo: la fecha de una medida o de una foto no puede ser futura ni de hace más de un
// año en la zona del alumno (400 con el campo); un campo de medida en null no borra lo que había
// ese día; las repeticiones de una sugerencia siguen el tope del tipo de carga (422).
// Tócalo cuando: agregues o cambies una ruta de progreso.
// No lo toques para: las cuentas (./consultas), las sugerencias (./sugerencias), dónde viven las
// fotos (./almacenamiento) ni la forma de entrada y salida (packages/shared/src/api/progreso.ts).
// Depende de: src/compartido, ./consultas, ./sugerencias, ./fotos, ./almacenamiento, ./zona y
// @gymtrack/shared (RUTAS_PROGRESO).
// ─────────────────────────────────────────────────────────────────────────────
import {
  BYTES_MAX_FOTO, CAMPOS_MEDIDA, CONTENIDOS_FOTO, errorFechaRegistro, errorRepsSegun, maxRepsSegun, RUTAS_PROGRESO as R,
  SEMANAS_PROGRESO_EJERCICIO, tipoDeMarca,
} from '@gymtrack/shared';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  alumnoObjetivo, armarPagina, campoInvalido, definirModulo, esquemaDe, existeOFalla, fallar, leerCursor,
  noEncontrado, prohibido, urlDe, usuarioDe, uuidV7Fijo, vinculoActivo,
} from '../../compartido';
import { Prisma, type FotoProgreso, type Usuario } from '../../generado/prisma/client';
import { almacenamiento, extensionDe } from './almacenamiento';
import { columnaDeMedida, medidaAApi, puntosDeEjercicio, recordsVigentes, tendenciaDeMedidas, volumenPorSemana, type Db } from './consultas';
import { firmarFoto, tokenFotoValido } from './fotos';
import { leerValor, leerValorFinal, vigenteDe } from './sugerencias';
import { diaDeFechaDb, diaLocal, fechaDbDeDia } from './zona';

const SEMANA_MS = 7 * 86_400_000;

// ── Sugerencias a la API ─────────────────────────────────────────────────────
const conDetalle = {
  ejercicioRutina: { include: { ejercicio: { select: { id: true, nombre: true } }, dia: { select: { id: true, nombre: true, orden: true } } } },
  sobrescritaPor: { select: { id: true, nombre: true, apellido: true } },
  sesion: { select: { id: true, cerradaAt: true, iniciadaAt: true } },
} satisfies Prisma.SugerenciaProgresionInclude;

type SugerenciaConDetalle = Prisma.SugerenciaProgresionGetPayload<{ include: typeof conDetalle }>;

async function sugerenciasAApi(prisma: Db, filas: SugerenciaConDetalle[]) {
  const series = filas.length
    ? await prisma.serie.findMany({
        where: { OR: filas.map((f) => ({ sesionId: f.sesionId, ejercicioRutinaId: f.ejercicioRutinaId })), completada: true },
        orderBy: { serieN: 'asc' },
      })
    : [];
  return filas.map((f) => {
    const propias = series.filter((s) => s.sesionId === f.sesionId && s.ejercicioRutinaId === f.ejercicioRutinaId);
    return {
      id: f.id,
      client_id: f.alumnoId,
      routine_exercise_id: f.ejercicioRutinaId,
      exercise_id: f.ejercicioRutina.ejercicio.id,
      nombre: f.ejercicioRutina.ejercicio.nombre,
      dia: { id: f.ejercicioRutina.dia.id, nombre: f.ejercicioRutina.dia.nombre },
      metodo: f.metodo,
      estado: f.estado,
      sugerencia: leerValor(f.sugerencia),
      texto: f.texto,
      motivo: f.motivo,
      vigente: vigenteDe(f),
      valor_final: f.estado === 'sobrescrita' ? leerValorFinal(f.valorFinal) : null,
      sobrescrita_por: f.sobrescritaPor,
      sobrescrita_at: f.sobrescritaAt?.toISOString() ?? null,
      ultimo_rendimiento: {
        session_id: f.sesionId,
        fecha: (f.sesion.cerradaAt ?? f.sesion.iniciadaAt).toISOString(),
        series: propias.map((s) => ({ peso_kg: s.pesoKg, reps: s.reps, rir: s.rir })),
      },
      created_at: f.createdAt.toISOString(),
    };
  });
}

/**
 * Las sugerencias son del entrenador (de su alumno con vínculo activo) y del alumno solo (las
 * suyas). La matriz ya dejó afuera al vinculado con 403; aquí lo ajeno da 404.
 */
async function exigirAlcanceSugerencia(prisma: Db, usuario: Usuario, alumnoId: string): Promise<void> {
  if (usuario.rol === 'trainer') {
    if (!(await vinculoActivo(prisma, usuario.id, alumnoId))) noEncontrado();
    return;
  }
  if (usuario.id !== alumnoId) noEncontrado();
}

/** La rutina activa del alumno (la del perfil o, si falta, la que está en estado activa). */
async function rutinaActivaDe(prisma: Db, alumnoId: string): Promise<string | null> {
  const perfil = await prisma.perfilAlumno.findUnique({ where: { usuarioId: alumnoId }, select: { rutinaActivaId: true } });
  if (perfil?.rutinaActivaId) return perfil.rutinaActivaId;
  const r = await prisma.rutina.findFirst({ where: { alumnoId, estado: 'activa', deletedAt: null }, select: { id: true } });
  return r?.id ?? null;
}

// ── Fotos ────────────────────────────────────────────────────────────────────
const esquemaCursorFecha = z.object({ fecha: z.iso.date(), id: z.uuid() });
const esquemaCursorDia = z.object({ fecha: z.iso.date() });

function urlArchivo(req: { protocol: string; host: string }, fotoId: string, token: string): string {
  return `${req.protocol}://${req.host}${R.subirArchivoFoto.ruta.replace(':id', fotoId)}?token=${encodeURIComponent(token)}`;
}

export default definirModulo(async (app, ctx) => {
  const { prisma, reloj } = ctx;
  const secreto = ctx.config.jwtSecreto;
  const guardado = () => almacenamiento();

  // La subida llega como imagen, no como JSON (solo dentro de este módulo).
  app.addContentTypeParser([...CONTENIDOS_FOTO], { parseAs: 'buffer', bodyLimit: BYTES_MAX_FOTO }, (_req, cuerpo, listo) => listo(null, cuerpo));

  /** Zona del alumno cuyos datos se leen. */
  const zonaDe = async (alumnoId: string, usuario: Usuario) =>
    alumnoId === usuario.id ? usuario.timezone : ((await prisma.usuario.findUnique({ where: { id: alumnoId }, select: { timezone: true } }))?.timezone ?? 'UTC');

  // ── EP-46 · Progreso de un ejercicio ───────────────────────────────────────
  app.get(urlDe(R.progresoEjercicio), { schema: esquemaDe(R.progresoEjercicio), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => {
    const usuario = usuarioDe(req);
    const alumnoId = await alumnoObjetivo(prisma, usuario, req.query.client_id);
    const ej = existeOFalla(await prisma.ejercicio.findUnique({ where: { id: req.params.id } }));
    // Un ejercicio propio de otra persona no se nombra, salvo que el alumno lo haya usado.
    if (ej.duenoId && ej.duenoId !== alumnoId && ej.duenoId !== usuario.id) {
      const uso = await prisma.serie.findFirst({ where: { alumnoId, ejercicioId: ej.id }, select: { id: true } });
      if (!uso) noEncontrado();
    }
    const desde = new Date(reloj.ahora().getTime() - SEMANAS_PROGRESO_EJERCICIO * SEMANA_MS);
    const puntos = await puntosDeEjercicio(prisma, alumnoId, ej.id, ej.tipoCarga, desde);
    const mejor = puntos.reduce<(typeof puntos)[number] | null>((m, p) => (!m || p.marca > m.marca ? p : m), null);
    return {
      exercise_id: ej.id, nombre: ej.nombre, tipo_carga: ej.tipoCarga, tipo_marca: tipoDeMarca(ej.tipoCarga),
      desde: desde.toISOString(), puntos, mejor,
    };
  });

  // ── EP-47 · Volumen por semana ─────────────────────────────────────────────
  app.get(urlDe(R.volumen), { schema: esquemaDe(R.volumen), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => {
    const usuario = usuarioDe(req);
    const alumnoId = await alumnoObjetivo(prisma, usuario, req.query.client_id);
    const zona = await zonaDe(alumnoId, usuario);
    const semanas = await volumenPorSemana(prisma, alumnoId, zona, req.query.weeks, reloj.ahora());
    return { timezone: zona, weeks: req.query.weeks, semanas };
  });

  // ── EP-48 · Récords vigentes ───────────────────────────────────────────────
  app.get(urlDe(R.records), { schema: esquemaDe(R.records), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => {
    const alumnoId = await alumnoObjetivo(prisma, usuarioDe(req), req.query.client_id);
    return { items: await recordsVigentes(prisma, alumnoId) };
  });

  // ── EP-49 · Peso y medidas ─────────────────────────────────────────────────
  app.get(urlDe(R.listarMedidas), { schema: esquemaDe(R.listarMedidas), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => {
    const alumnoId = await alumnoObjetivo(prisma, usuarioDe(req), req.query.client_id);
    const todas = await prisma.medidaCorporal.findMany({ where: { alumnoId }, orderBy: { fecha: 'desc' } });
    const c = leerCursor(req.query.cursor, esquemaCursorDia);
    const desde = c ? todas.filter((m) => diaDeFechaDb(m.fecha) < c.fecha) : todas;
    const pagina = armarPagina(desde.slice(0, req.query.limit + 1), req.query.limit, (m) => ({ fecha: diaDeFechaDb(m.fecha) }));
    return { items: pagina.items.map(medidaAApi), next_cursor: pagina.next_cursor, tendencia: tendenciaDeMedidas(todas) };
  });

  // ── EP-50 · Registrar peso y medidas ───────────────────────────────────────
  const esquemaMedida = esquemaDe(R.registrarMedida);
  app.post(
    urlDe(R.registrarMedida),
    { schema: { ...esquemaMedida, response: { ...esquemaMedida.response, 200: R.registrarMedida.respuesta } }, preHandler: app.exigirPermiso('registrarEntreno') },
    async (req, reply) => {
      const usuario = usuarioDe(req);
      const ahora = reloj.ahora();
      const hoy = diaLocal(ahora, usuario.timezone);
      // El día es el de la zona del alumno: 23:30 y 00:30 de Santiago caen en días distintos (INT-121).
      const dia = req.body.fecha ?? diaLocal(req.body.medido_at ? new Date(req.body.medido_at) : ahora, usuario.timezone);
      // Fondo: ni futura ni de hace más de un año, contra el día de hoy en la zona del alumno.
      const errorFecha = errorFechaRegistro(dia, hoy);
      if (errorFecha) campoInvalido(req.body.fecha ? 'fecha' : 'medido_at', errorFecha);
      const datos: Record<string, unknown> = {};
      // null es «no lo medí» (la app lo manda así): no borra lo que ya había ese día.
      for (const campo of CAMPOS_MEDIDA) if (req.body[campo] != null) datos[columnaDeMedida(campo)] = req.body[campo];
      if (req.body.nota !== undefined) datos.nota = req.body.nota;
      const clave = { alumnoId_fecha: { alumnoId: usuario.id, fecha: fechaDbDeDia(dia) } };
      const previa = await prisma.medidaCorporal.findUnique({ where: clave });
      // La segunda del mismo día reemplaza los campos que trae (§Datos: una fila por día).
      const fila = previa
        ? await prisma.medidaCorporal.update({ where: clave, data: datos })
        : await prisma.medidaCorporal.create({ data: { alumnoId: usuario.id, fecha: fechaDbDeDia(dia), ...datos } });
      return reply.code(previa ? 200 : 201).send(medidaAApi(fila));
    },
  );

  // ── EP-51 · Pedir la URL para subir una foto ───────────────────────────────
  app.post(urlDe(R.pedirSubidaFoto), { schema: esquemaDe(R.pedirSubidaFoto), preHandler: app.exigirPermiso('registrarEntreno') }, async (req, reply) => {
    const usuario = usuarioDe(req);
    const ahora = reloj.ahora();
    const perfil = await prisma.perfilAlumno.findUnique({ where: { usuarioId: usuario.id } });
    let consentimiento = perfil?.consentimientoFotosAt ?? null;
    if (!consentimiento) {
      // Ley 21.719: la primera foto pide el consentimiento expreso (P-25, INT-123).
      if (req.body.consentimiento_fotos !== true) fallar('CONSENT_REQUIRED', { consentimiento: 'fotos' });
      consentimiento = ahora;
      await prisma.perfilAlumno.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id, consentimientoFotosAt: ahora, politicaVersion: '1' },
        update: { consentimientoFotosAt: ahora, politicaVersion: perfil?.politicaVersion ?? '1' },
      });
    }
    const dia = req.body.fecha ?? diaLocal(ahora, usuario.timezone);
    // La misma regla de fecha que las medidas: ni futura ni de hace más de un año.
    const errorFecha = errorFechaRegistro(dia, diaLocal(ahora, usuario.timezone));
    if (errorFecha) campoInvalido('fecha', errorFecha);
    const id = uuidV7Fijo(ahora, randomUUID());
    const clave = `fotos/${usuario.id}/${id}.${extensionDe(req.body.content_type)}`;
    await prisma.fotoProgreso.create({
      data: { id, alumnoId: usuario.id, fecha: fechaDbDeDia(dia), tipo: req.body.tipo, storageKey: clave, bytes: req.body.bytes },
    });
    const { token, venceAt } = firmarFoto(secreto, 'subir', id, clave, ahora);
    const subida = await guardado().urlSubida(clave, { venceAt, contentType: req.body.content_type, urlApi: urlArchivo(req, id, token) });
    return reply.code(201).send({
      id, tipo: req.body.tipo, fecha: dia,
      subida: { ...subida, vence_at: subida.venceAt.toISOString() },
      consentimiento_fotos_at: consentimiento.toISOString(),
    });
  });

  // La subida con la URL firmada (adaptador de disco). La autoriza el token, no la sesión.
  app.put(
    urlDe(R.subirArchivoFoto),
    { schema: esquemaDe(R.subirArchivoFoto), bodyLimit: BYTES_MAX_FOTO },
    async (req) => {
      const ahora = reloj.ahora();
      const foto = await prisma.fotoProgreso.findUnique({ where: { id: req.params.id } });
      if (!foto || !tokenFotoValido(secreto, 'subir', foto.id, foto.storageKey, req.query.token ?? '', ahora)) prohibido();
      const tipo = String(req.headers['content-type'] ?? '').split(';')[0]!.trim();
      if (!Buffer.isBuffer(req.body) || extensionDe(tipo) !== foto.storageKey.split('.').pop()) {
        campoInvalido('content-type', 'La foto tiene que subirse con el mismo tipo que se pidió.');
      }
      const datos = req.body as Buffer;
      if (datos.length === 0) campoInvalido('bytes', 'La foto está vacía.');
      if (foto.bytes !== null && datos.length > foto.bytes) campoInvalido('bytes', 'La foto pesa más de lo que se declaró.');
      await guardado().guardar(foto.storageKey, datos, tipo);
      const lista = await prisma.fotoProgreso.update({ where: { id: foto.id }, data: { subidaAt: ahora, bytes: datos.length } });
      return { id: lista.id, bytes: datos.length, subida_at: ahora.toISOString() };
    },
  );

  // ── EP-52 · Lista de fotos ─────────────────────────────────────────────────
  app.get(urlDe(R.listarFotos), { schema: esquemaDe(R.listarFotos), preHandler: app.exigirPermiso('verDatosAlumno') }, async (req) => {
    const alumnoId = await alumnoObjetivo(prisma, usuarioDe(req), req.query.client_id);
    const ahora = reloj.ahora();
    const c = leerCursor(req.query.cursor, esquemaCursorFecha);
    const despues: Prisma.FotoProgresoWhereInput = c
      ? { OR: [{ fecha: { lt: fechaDbDeDia(c.fecha) } }, { fecha: fechaDbDeDia(c.fecha), id: { lt: c.id } }] }
      : {};
    // P-53: solo las que ya están en el almacenamiento.
    const filas = await prisma.fotoProgreso.findMany({
      where: { AND: [{ alumnoId, subidaAt: { not: null } }, req.query.tipo ? { tipo: req.query.tipo } : {}, despues] },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      take: req.query.limit + 1,
    });
    const pagina = armarPagina(filas, req.query.limit, (f) => ({ fecha: diaDeFechaDb(f.fecha), id: f.id }));
    const items = await Promise.all(
      pagina.items.map(async (f: FotoProgreso) => {
        const { token, venceAt } = firmarFoto(secreto, 'ver', f.id, f.storageKey, ahora);
        const u = await guardado().urlLectura(f.storageKey, { venceAt, urlApi: urlArchivo(req, f.id, token) });
        return {
          id: f.id, tipo: f.tipo, fecha: diaDeFechaDb(f.fecha), bytes: f.bytes,
          url: u.url, vence_at: u.venceAt.toISOString(), subida_at: f.subidaAt!.toISOString(),
        };
      }),
    );
    return { items, next_cursor: pagina.next_cursor };
  });

  // La lectura con la URL firmada (adaptador de disco): privada, sin caché pública (SEG-016).
  app.get(urlDe(R.descargarArchivoFoto), { schema: esquemaDe(R.descargarArchivoFoto) }, async (req, reply) => {
    const foto = await prisma.fotoProgreso.findUnique({ where: { id: req.params.id } });
    if (!foto || !tokenFotoValido(secreto, 'ver', foto.id, foto.storageKey, req.query.token ?? '', reloj.ahora())) prohibido();
    const objeto = await guardado().leer(foto.storageKey);
    if (!objeto) noEncontrado();
    return reply.header('content-type', objeto.contentType).header('cache-control', 'private, no-store').send(objeto.datos);
  });

  // ── EP-53 · Borrar una foto ────────────────────────────────────────────────
  app.delete(urlDe(R.borrarFoto), { schema: esquemaDe(R.borrarFoto), preHandler: app.exigirPermiso('registrarEntreno') }, async (req) => {
    const usuario = usuarioDe(req);
    const foto = await prisma.fotoProgreso.findFirst({ where: { id: req.params.id, alumnoId: usuario.id } });
    if (!foto) noEncontrado();
    // Primero el objeto: si el almacenamiento falla, la fila queda y se puede reintentar.
    await guardado().borrar(foto.storageKey);
    await prisma.fotoProgreso.delete({ where: { id: foto.id } });
    return { id: foto.id, borrada: true as const };
  });

  // ── EP-54 · Sugerencias de la rutina activa ────────────────────────────────
  app.get(urlDe(R.listarSugerencias), { schema: esquemaDe(R.listarSugerencias), preHandler: app.exigirPermiso('verSugerenciasCliente') }, async (req) => {
    const usuario = usuarioDe(req);
    const alumnoId = req.params.id;
    await exigirAlcanceSugerencia(prisma, usuario, alumnoId);
    const rutinaId = await rutinaActivaDe(prisma, alumnoId);
    if (!rutinaId) return { items: [] };
    const res = await prisma.ejercicioRutina.findMany({
      where: { deletedAt: null, dia: { rutinaId, deletedAt: null } },
      select: { id: true, orden: true, dia: { select: { orden: true } } },
    });
    const filas = await prisma.sugerenciaProgresion.findMany({
      where: { alumnoId, ejercicioRutinaId: { in: res.map((r) => r.id) }, estado: { not: 'aplicada' } },
      include: conDetalle,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    // La última sin usar de cada ejercicio de la rutina, en el orden de la rutina.
    const ultima = new Map<string, SugerenciaConDetalle>();
    for (const f of filas) if (!ultima.has(f.ejercicioRutinaId)) ultima.set(f.ejercicioRutinaId, f);
    const orden = new Map(res.map((r) => [r.id, r.dia.orden * 1000 + r.orden]));
    const lista = [...ultima.values()].sort((a, b) => (orden.get(a.ejercicioRutinaId) ?? 0) - (orden.get(b.ejercicioRutinaId) ?? 0));
    return { items: await sugerenciasAApi(prisma, lista) };
  });

  // ── EP-55 · Sobrescribir o volver a la calculada ───────────────────────────
  app.patch(urlDe(R.cambiarSugerencia), { schema: esquemaDe(R.cambiarSugerencia), preHandler: app.exigirPermiso('sobrescribirSugerencia') }, async (req) => {
    const usuario = usuarioDe(req);
    const s = existeOFalla(await prisma.sugerenciaProgresion.findUnique({ where: { id: req.params.id } }));
    await exigirAlcanceSugerencia(prisma, usuario, s.alumnoId);
    // P-19: ya la precargó una sesión; cambiarla no tendría efecto.
    if (s.estado === 'aplicada') fallar('SUGGESTION_USED', { suggestion_id: s.id });
    const ahora = reloj.ahora();
    let data: Prisma.SugerenciaProgresionUpdateInput;
    if ('restaurar' in req.body) {
      data = { estado: 'pendiente', valorFinal: Prisma.DbNull, sobrescritaPor: { connect: { id: usuario.id } }, sobrescritaAt: ahora };
    } else {
      const b = req.body;
      if (b.peso_kg === undefined && b.reps_min === undefined && b.reps_max === undefined && b.rir === undefined && b.nota === undefined) {
        campoInvalido('peso_kg', 'Cambia el peso, el rango, el RIR o la nota.');
      }
      const base = vigenteDe(s);
      const final = {
        peso_kg: b.peso_kg ?? base.peso_kg,
        reps_min: b.reps_min ?? base.reps_min,
        reps_max: b.reps_max ?? base.reps_max,
        rir: b.rir !== undefined ? b.rir : base.rir,
        nota: b.nota !== undefined ? b.nota : base.nota,
      };
      if (final.reps_min > final.reps_max) {
        fallar('REPS_RANGE_INVALID', { campo: 'reps_min', reps_min: final.reps_min, reps_max: final.reps_max });
      }
      // Fondo: el tope depende del ejercicio (60 repeticiones o 600 segundos si es de tiempo).
      const re = await prisma.ejercicioRutina.findUnique({ where: { id: s.ejercicioRutinaId }, select: { ejercicio: { select: { tipoCarga: true } } } });
      const tipoCarga = re?.ejercicio.tipoCarga ?? 'kg';
      const tope = errorRepsSegun(tipoCarga, final.reps_max);
      if (tope) fallar('BUSINESS_RULE', { campo: 'reps_max', regla: 'reps_maximas', maximo: maxRepsSegun(tipoCarga), motivo: tope }, tope);
      data = { estado: 'sobrescrita', valorFinal: final, sobrescritaPor: { connect: { id: usuario.id } }, sobrescritaAt: ahora };
    }
    const fila = await prisma.sugerenciaProgresion.update({ where: { id: s.id }, data, include: conDetalle });
    const [api] = await sugerenciasAApi(prisma, [fila]);
    return api!;
  });
});
