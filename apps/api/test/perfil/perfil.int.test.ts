// ─────────────────────────────────────────────────────────────────────────────
// Pruebas del módulo perfil · Zona: Pruebas (API)
//
// Qué hace: integración contra PostgreSQL de las rutas de perfil y cuenta: PATCH /me, encuesta,
// push, código de invitación, vincular y desvincular, exportar y borrar la cuenta. Cada caso
// lleva el id de docs/pruebas/plan-de-validacion.md (INT-, SEG-, PERM-).
// Tócalo cuando: cambie una regla de estas rutas.
// No lo toques para: las ayudas compartidas (test/ayudas).
// Depende de: test/ayudas y src/modulos/perfil.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { ALFABETO_INVITACION, CODIGOS_ERROR } from '@gymtrack/shared';
import { expect, it } from 'vitest';
import { CLAVE, describeConBase, usarEntornoApi, type PersonaDePrueba } from '../ayudas';

const respuestas = (extra: Record<string, unknown> = {}) => ({
  objetivo: 'ganar_masa',
  experiencia: 'uno_a_tres_anos',
  dias_semana: 4,
  lugar: 'gimnasio_completo',
  minutos_sesion: 60,
  fecha_nacimiento: '1998-03-12',
  altura_cm: 165,
  peso_kg: 61.5,
  lesiones: { zonas: ['ninguna'] },
  ...extra,
});
const encuesta = (extra: Record<string, unknown> = {}, cuerpo: Record<string, unknown> = {}) => ({
  respuestas: respuestas(extra),
  consentimiento_salud: true,
  politica_version: '1',
  ...cuerpo,
});

/** Lee un ZIP: nombre del archivo y su texto (sin el BOM). */
function leerZip(buf: Buffer): Record<string, string> {
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const total = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const archivos: Record<string, string> = {};
  for (let i = 0; i < total; i++) {
    const comp = buf.readUInt32LE(p + 20);
    const largoNombre = buf.readUInt16LE(p + 28);
    const local = buf.readUInt32LE(p + 42);
    const nombre = buf.subarray(p + 46, p + 46 + largoNombre).toString('utf8');
    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    archivos[nombre] = inflateRawSync(buf.subarray(inicio, inicio + comp)).toString('utf8').replace(/^﻿/, '');
    p += 46 + largoNombre;
  }
  return archivos;
}

describeConBase('Perfil y cuenta', () => {
  const e = usarEntornoApi();

  const ingresar = (p: PersonaDePrueba) =>
    e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: p.email, password: CLAVE } });

  const invitar = async (entrenador: PersonaDePrueba) => {
    const r = await e.pedirComo(entrenador, { method: 'POST', url: '/v1/trainer/invitations' });
    expect(r.status).toBe(201);
    return r.json.codigo as string;
  };

  // ── PATCH /me ──────────────────────────────────────────────────────────────
  it('INT-019 Martina cambia unidades, descanso, modo gimnasio y zona; GET /me los devuelve', async () => {
    const { martina } = await e.escena();
    const cambios = { unidades: 'lb', descanso_default_s: 120, modo_gimnasio: true, timezone: 'America/Punta_Arenas' };
    const r = await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload: cambios });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ...cambios, entrenador: { nombre: 'Camila', apellido: 'Rojas' }, recordatorio_activo: true });
    const me = await e.pedirComo(martina, { method: 'GET', url: '/v1/me' });
    expect(me.json).toMatchObject(cambios);
  });

  it('INT-020 PATCH /me con rol, correo, descanso fuera de rango o zona inexistente da 400 y nada cambia', async () => {
    const { martina } = await e.escena();
    for (const payload of [
      { rol: 'trainer' }, { email: 'otra@gymtrack.test' }, { descanso_default_s: 20 }, { descanso_default_s: 301 },
      { timezone: 'Marte/Base' },
    ]) {
      const r = await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload });
      expect(r.status, JSON.stringify(payload)).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
    }
    const u = await e.prisma.usuario.findUniqueOrThrow({ where: { id: martina.id } });
    expect(u).toMatchObject({ rol: 'client', email: martina.email, descansoDefaultS: 90, timezone: 'America/Santiago' });
  });

  it('PERM-28 PATCH /me con el recordatorio desde un entrenador da 422', async () => {
    const { camila } = await e.escena();
    const r = await e.pedirComo(camila, { method: 'PATCH', url: '/v1/me', payload: { recordatorio_activo: false } });
    expect(r.status).toBe(422);
  });

  // ── Encuesta ───────────────────────────────────────────────────────────────
  it('INT-021 Sofía responde las 10 preguntas: encuesta v1, perfil lleno y primer peso de hoy', async () => {
    const sofia = await e.crear('sofia');
    const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta() });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ version: 1, completada_at: '2026-11-17T13:00:00.000Z', politica_version: '1', entrenador: null });
    const filas = await e.prisma.respuestaEncuesta.findMany({ where: { alumnoId: sofia.id } });
    expect(filas).toHaveLength(1);
    expect(filas[0]!.respuestas).toMatchObject(respuestas());
    const perfil = await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: sofia.id } });
    expect(perfil).toMatchObject({ alturaCm: 165, objetivo: 'ganar_masa', diasSemana: 4, minutosSesion: 60, politicaVersion: '1' });
    expect(perfil.consentimientoSaludAt?.toISOString()).toBe('2026-11-17T13:00:00.000Z');
    const peso = await e.prisma.medidaCorporal.findMany({ where: { alumnoId: sofia.id } });
    expect(peso).toHaveLength(1);
    expect(peso[0]!.pesoKg).toBe(61.5);
    expect(peso[0]!.fecha.toISOString().slice(0, 10)).toBe('2026-11-17');
    const me = await e.pedirComo(sofia, { method: 'GET', url: '/v1/me/survey' });
    expect(me.status).toBe(200);
  });

  it('INT-022 Sofía responde con el código vigente de Camila y queda vinculada', async () => {
    const { camila } = await e.escena();
    const sofia = await e.crear('sofia');
    const codigo = await invitar(camila);
    const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta({ codigo_entrenador: codigo }) });
    expect(r.status).toBe(201);
    expect(r.json.entrenador).toMatchObject({ id: camila.id, nombre: 'Camila' });
    const v = await e.prisma.vinculoEntrenador.findUniqueOrThrow({ where: { codigo } });
    expect(v).toMatchObject({ estado: 'activo', alumnoId: sofia.id });
    const perfil = await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: sofia.id } });
    expect(perfil.entrenadorId).toBe(camila.id);
  });

  it('INT-023 nueve respuestas o «siete días» dan 400 y no queda ninguna fila', async () => {
    const sofia = await e.crear('sofia');
    const { lugar: _sinLugar, ...nueve } = respuestas();
    for (const payload of [{ respuestas: nueve, consentimiento_salud: true }, encuesta({ dias_semana: 7 })]) {
      const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload });
      expect(r.status).toBe(400);
    }
    expect(await e.prisma.respuestaEncuesta.count()).toBe(0);
    expect(await e.prisma.medidaCorporal.count()).toBe(0);
  });

  it('INT-024 encuesta sin consentimiento: 422 CONSENT_REQUIRED y ninguna fila (P-25)', async () => {
    const sofia = await e.crear('sofia');
    for (const cuerpo of [{ consentimiento_salud: false }, { consentimiento_salud: undefined }]) {
      const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta({}, cuerpo) });
      expect(r.status).toBe(422);
      expect(r.json.error.code).toBe('CONSENT_REQUIRED');
    }
    expect(await e.prisma.respuestaEncuesta.count()).toBe(0);
    expect(await e.prisma.perfilAlumno.count({ where: { usuarioId: sofia.id } })).toBe(0);
  });

  it('INT-024 un código malo en la pregunta 10 no deja nada guardado (todo en una transacción)', async () => {
    const sofia = await e.crear('sofia');
    const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta({ codigo_entrenador: 'ZZZZZZ' }) });
    expect(r.status).toBe(404);
    expect(r.json.error.code).toBe('INVITATION_NOT_FOUND');
    expect(await e.prisma.respuestaEncuesta.count()).toBe(0);
    expect(await e.prisma.medidaCorporal.count()).toBe(0);
  });

  it('INT-021 menor de 14 años: 422 BUSINESS_RULE (P-13)', async () => {
    const sofia = await e.crear('sofia');
    const r = await e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta({ fecha_nacimiento: '2013-01-01' }) });
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe('BUSINESS_RULE');
  });

  it('INT-025 y INT-026 la segunda encuesta crea otra fila; la primera queda intacta y GET devuelve la nueva', async () => {
    const { martina } = await e.escena();
    e.reloj.fijar('2026-08-04T14:00:00.000Z');
    const agosto = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/survey', payload: encuesta() });
    expect(agosto.status).toBe(201);
    e.reloj.fijar('2026-11-17T13:00:00.000Z');
    const nueva = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/survey', payload: encuesta({ objetivo: 'bajar_grasa', peso_kg: 60 }) });
    expect(nueva.status).toBe(201);
    const filas = await e.prisma.respuestaEncuesta.findMany({ where: { alumnoId: martina.id }, orderBy: { completadaAt: 'asc' } });
    expect(filas).toHaveLength(2);
    expect(filas[0]!.respuestas).toMatchObject({ objetivo: 'ganar_masa' });
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/survey' });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ id: nueva.json.id, version: 1, completada_at: '2026-11-17T13:00:00.000Z', respuestas: { objetivo: 'bajar_grasa' } });
    expect(Object.keys(r.json.respuestas)).toHaveLength(9);
    expect(r.json.entrenador).toMatchObject({ nombre: 'Camila' });
  });

  it('INT-026 GET /me/survey sin encuesta da 404', async () => {
    const { diego } = await e.escena();
    const r = await e.pedirComo(diego, { method: 'GET', url: '/v1/me/survey' });
    expect(r.status).toBe(404);
  });

  it('INT-027 PERM-31 Camila no puede responder ni leer /me/survey: 403 y ninguna fila', async () => {
    const { camila } = await e.escena();
    const post = await e.pedirComo(camila, { method: 'POST', url: '/v1/me/survey', payload: encuesta() });
    const get = await e.pedirComo(camila, { method: 'GET', url: '/v1/me/survey' });
    expect([post.status, get.status]).toEqual([403, 403]);
    expect(post.json.error.code).toBe('FORBIDDEN');
    expect(await e.prisma.respuestaEncuesta.count()).toBe(0);
  });

  // ── Push ───────────────────────────────────────────────────────────────────
  it('INT-028 SEG-003 el mismo token de Expo dos veces: 201 y luego 200, una fila con hash', async () => {
    const { martina } = await e.escena();
    const token = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
    const uno = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/push-tokens', payload: { token, plataforma: 'android' } });
    const dos = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/push-tokens', payload: { token, plataforma: 'android' } });
    expect([uno.status, dos.status]).toEqual([201, 200]);
    expect(dos.json.id).toBe(uno.json.id);
    const filas = await e.prisma.pushToken.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0]!.tokenHash).not.toContain('xxxx');
    expect(JSON.stringify(uno.json)).not.toContain('xxxx');
    const malo = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/push-tokens', payload: { token: 'abc', plataforma: 'android' } });
    expect(malo.status).toBe(400);
  });

  // ── Invitación ─────────────────────────────────────────────────────────────
  it('INT-030 Camila pide un código: 6 caracteres de P-14, vence a 7 días exactos, estado invitado', async () => {
    const { camila } = await e.escena();
    const r = await e.pedirComo(camila, { method: 'POST', url: '/v1/trainer/invitations' });
    expect(r.status).toBe(201);
    expect(r.json.codigo).toMatch(new RegExp(`^[${ALFABETO_INVITACION}]{6}$`));
    expect(r.json).toMatchObject({ vence_at: '2026-11-24T13:00:00.000Z', estado: 'invitado', vigente: true });
    const v = await e.prisma.vinculoEntrenador.findUniqueOrThrow({ where: { codigo: r.json.codigo } });
    expect(v).toMatchObject({ estado: 'invitado', alumnoId: null, entrenadorId: camila.id });
    const actual = await e.pedirComo(camila, { method: 'GET', url: '/v1/trainer/invitations' });
    expect(actual.json.invitacion).toMatchObject({ codigo: r.json.codigo, vigente: true });
  });

  it('INT-031 pedir otro código invalida el anterior sin usar (P-14)', async () => {
    const { camila, diego } = await e.escena();
    const viejo = await invitar(camila);
    const nuevo = await invitar(camila);
    expect(nuevo).not.toBe(viejo);
    const conViejo = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: viejo } });
    expect(conViejo.status).toBe(404);
    expect(conViejo.json.error.code).toBe('INVITATION_NOT_FOUND');
    const conNuevo = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: nuevo } });
    expect(conNuevo.status).toBe(200);
  });

  it('INT-032 PERM-32 Martina y Diego no pueden pedir un código: 403 y ninguna fila', async () => {
    const { martina, diego } = await e.escena();
    const antes = await e.prisma.vinculoEntrenador.count();
    for (const p of [martina, diego]) {
      const r = await e.pedirComo(p, { method: 'POST', url: '/v1/trainer/invitations' });
      expect(r.status).toBe(403);
      const g = await e.pedirComo(p, { method: 'GET', url: '/v1/trainer/invitations' });
      expect(g.status).toBe(403);
    }
    expect(await e.prisma.vinculoEntrenador.count()).toBe(antes);
  });

  // ── Vincular ───────────────────────────────────────────────────────────────
  it('INT-033 Diego se vincula con el código vigente de Camila', async () => {
    const { camila, diego } = await e.escena();
    const codigo = await invitar(camila);
    const previa = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo, vista_previa: true } });
    expect(previa.status).toBe(200);
    expect(previa.json).toMatchObject({ vinculado: false, entrenador: { nombre: 'Camila', apellido: 'Rojas' } });
    expect(await e.prisma.vinculoEntrenador.count({ where: { alumnoId: diego.id } })).toBe(0);
    const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ vinculado: true, aceptado_at: '2026-11-17T13:00:00.000Z', entrenador: { id: camila.id } });
    const v = await e.prisma.vinculoEntrenador.findUniqueOrThrow({ where: { codigo } });
    expect(v).toMatchObject({ estado: 'activo', alumnoId: diego.id });
    expect(v.aceptadoAt?.toISOString()).toBe('2026-11-17T13:00:00.000Z');
    const perfil = await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: diego.id } });
    expect(perfil.entrenadorId).toBe(camila.id);
    const me = await e.pedirComo(diego, { method: 'GET', url: '/v1/me' });
    expect(me.json.entrenador).toMatchObject({ id: camila.id });
  });

  it('INT-034 código vencido (7 días y 1 segundo) e inexistente: 404 INVITATION_NOT_FOUND con el mismo cuerpo', async () => {
    const { camila, diego } = await e.escena();
    const codigo = await invitar(camila);
    e.reloj.avanzar('7d');
    e.reloj.avanzar('1s');
    const vencido = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } });
    const inventado = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: 'QQQQQQ' } });
    expect([vencido.status, inventado.status]).toEqual([404, 404]);
    expect(vencido.json).toEqual(inventado.json);
    expect(vencido.json.error.code).toBe('INVITATION_NOT_FOUND');
  });

  it('INT-035 un código ya usado da 409 INVITATION_USED', async () => {
    const { camila, diego } = await e.escena();
    const gonzalo = await e.crear('gonzalo');
    const codigo = await invitar(camila);
    expect((await e.pedirComo(gonzalo, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } })).status).toBe(200);
    const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('INVITATION_USED');
  });

  it('INT-036 Martina ya vinculada usa el código de Rodrigo: 409 ALREADY_LINKED y sigue con Camila (P-15)', async () => {
    const { camila, martina } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const codigo = await invitar(rodrigo);
    const r = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('ALREADY_LINKED');
    const v = await e.prisma.vinculoEntrenador.findFirstOrThrow({ where: { alumnoId: martina.id, estado: 'activo' } });
    expect(v.entrenadorId).toBe(camila.id);
  });

  it('INT-037 PERM-33 Rodrigo no puede usar /me/trainer: 403', async () => {
    const { camila } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const codigo = await invitar(camila);
    const link = await e.pedirComo(rodrigo, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo } });
    const baja = await e.pedirComo(rodrigo, { method: 'DELETE', url: '/v1/me/trainer' });
    expect([link.status, baja.status]).toEqual([403, 403]);
    const v = await e.prisma.vinculoEntrenador.findUniqueOrThrow({ where: { codigo } });
    expect(v.estado).toBe('invitado');
  });

  it('INT-038 el código en minúsculas sirve igual (P-14)', async () => {
    const { camila, diego } = await e.escena();
    const codigo = await invitar(camila);
    const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: codigo.toLowerCase() } });
    expect(r.status).toBe(200);
  });

  it('SEG-024 el undécimo código inventado de la hora da 429 (P-27)', async () => {
    const { diego } = await e.escena();
    for (let i = 0; i < 10; i++) {
      const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: `ZZZZZ${ALFABETO_INVITACION[i]}` } });
      expect(r.status).toBe(404);
    }
    const r = await e.pedirComo(diego, { method: 'POST', url: '/v1/me/trainer/link', payload: { codigo: 'ZZZZYY' } });
    expect(r.status).toBe(429);
    expect(r.json.error.code).toBe('RATE_LIMITED');
  });

  // ── Desvincular ────────────────────────────────────────────────────────────
  it('INT-047 PERM-34 Martina se desvincula: vínculo terminado, sin trainer_id y la rutina de Camila archivada (P-16)', async () => {
    const { camila, martina } = await e.escena();
    const rutina = await e.prisma.rutina.create({
      data: { duenoId: camila.id, alumnoId: martina.id, nombre: 'Fuerza 4 días', semanas: 8, estado: 'activa' },
    });
    await e.prisma.perfilAlumno.update({ where: { usuarioId: martina.id }, data: { rutinaActivaId: rutina.id } });
    const r = await e.pedirComo(martina, { method: 'DELETE', url: '/v1/me/trainer' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ desvinculado: true, terminado_at: '2026-11-17T13:00:00.000Z' });
    expect(await e.prisma.vinculoEntrenador.count({ where: { alumnoId: martina.id, estado: 'activo' } })).toBe(0);
    const perfil = await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: martina.id } });
    expect(perfil).toMatchObject({ entrenadorId: null, rutinaActivaId: null });
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: rutina.id } })).estado).toBe('archivada');
  });

  it('INT-048 Diego sin entrenador se desvincula: 404', async () => {
    const { diego } = await e.escena();
    const r = await e.pedirComo(diego, { method: 'DELETE', url: '/v1/me/trainer' });
    expect(r.status).toBe(404);
  });

  // ── Exportar ───────────────────────────────────────────────────────────────
  it('INT-137 SEG-027 Martina exporta: URL firmada de 15 minutos con un ZIP de sus CSV y solo sus filas', async () => {
    const { camila, martina, diego } = await e.escena();
    await e.prisma.medidaCorporal.create({ data: { alumnoId: martina.id, fecha: new Date('2026-11-10'), pesoKg: 61.25, nota: 'en ayunas, "temprano"' } });
    await e.prisma.medidaCorporal.create({ data: { alumnoId: diego.id, fecha: new Date('2026-11-10'), pesoKg: 80 } });
    const sesion = randomUUID();
    await e.prisma.sesionEntreno.create({ data: { id: sesion, alumnoId: martina.id, iniciadaAt: new Date('2026-11-16T12:00:00Z'), estado: 'cerrada' } });
    await e.prisma.observacion.create({ data: { autorId: camila.id, alumnoId: martina.id, tipo: 'consejo', sesionId: sesion, texto: 'Baja el ritmo, ¿vale?' } });
    await e.pedirComo(martina, { method: 'POST', url: '/v1/me/survey', payload: encuesta() });

    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/export' });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ vence_at: '2026-11-17T13:15:00.000Z', nombre_archivo: 'gymtrack-mis-datos.zip' });
    const url = new URL(r.json.url);
    const bajada = await e.app.inject({ method: 'GET', url: url.pathname + url.search });
    expect(bajada.statusCode).toBe(200);
    expect(bajada.headers['content-type']).toBe('application/zip');
    const zip = leerZip(bajada.rawPayload);
    expect(Object.keys(zip).sort()).toEqual(['encuesta.csv', 'medidas.csv', 'observaciones.csv', 'series.csv', 'sesiones.csv']);
    expect(zip['medidas.csv']).toContain('2026-11-10,61.25');
    expect(zip['medidas.csv']).toContain('"en ayunas, ""temprano"""');
    expect(zip['medidas.csv']).not.toContain(',80,');
    expect(zip['sesiones.csv']).toContain(sesion);
    expect(zip['observaciones.csv']).toContain('Baja el ritmo');
    expect(zip['encuesta.csv']).toContain('ganar_masa');
    expect(zip['series.csv']!.trim().split('\r\n')).toHaveLength(1);

    e.reloj.avanzar('16m');
    const vencida = await e.pedir({ method: 'GET', url: url.pathname + url.search });
    expect(vencida.status).toBe(404);
    const alterada = await e.pedir({ method: 'GET', url: url.pathname + url.search.replace(/.$/, 'x') });
    expect(alterada.status).toBe(404);
  });

  it('INT-138 PERM-28 Camila exporta rutinas, ejercicios propios y observaciones, sin datos de salud de sus clientes', async () => {
    const { camila, martina } = await e.escena();
    await e.prisma.medidaCorporal.create({ data: { alumnoId: martina.id, fecha: new Date('2026-11-10'), pesoKg: 61.25 } });
    await e.prisma.rutina.create({ data: { duenoId: camila.id, nombre: 'Plantilla torso', semanas: 6 } });
    const r = await e.pedirComo(camila, { method: 'GET', url: '/v1/me/export' });
    expect(r.json.archivos).toEqual(['rutinas.csv', 'ejercicios.csv', 'observaciones.csv']);
    const url = new URL(r.json.url);
    const zip = leerZip((await e.app.inject({ method: 'GET', url: url.pathname + url.search })).rawPayload);
    expect(zip['rutinas.csv']).toContain('Plantilla torso');
    expect(JSON.stringify(zip)).not.toContain('61.25');
  });

  // ── Borrar la cuenta ───────────────────────────────────────────────────────
  it('INT-139 SEG-026 Martina borra su cuenta: deleted_at, refresh revocados, sesión descartada, vínculo terminado y su access deja de servir', async () => {
    const { martina } = await e.escena();
    const login1 = await ingresar(martina);
    const login2 = await ingresar(martina);
    expect([login1.status, login2.status]).toEqual([200, 200]);
    const sesion = randomUUID();
    await e.prisma.sesionEntreno.create({ data: { id: sesion, alumnoId: martina.id, iniciadaAt: new Date('2026-11-17T12:30:00Z') } });
    const token = await e.tokenDe(martina);
    const r = await e.pedir({ method: 'DELETE', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ borrada: true, deleted_at: '2026-11-17T13:00:00.000Z', purga_at: '2026-12-17T13:00:00.000Z' });
    const u = await e.prisma.usuario.findUniqueOrThrow({ where: { id: martina.id } });
    expect(u.deletedAt?.toISOString()).toBe('2026-11-17T13:00:00.000Z');
    expect(await e.prisma.refreshToken.count({ where: { usuarioId: martina.id, revocadoAt: null } })).toBe(0);
    expect((await e.prisma.sesionEntreno.findUniqueOrThrow({ where: { id: sesion } })).estado).toBe('descartada');
    expect(await e.prisma.vinculoEntrenador.count({ where: { alumnoId: martina.id, estado: 'activo' } })).toBe(0);
    const despues = await e.pedir({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
    expect(despues.status).toBe(401);
    const ingreso = await ingresar(martina);
    expect(ingreso.status).toBe(401);
    expect(ingreso.json.error.code).toBe('ACCOUNT_DELETED');
  });

  it('INT-151 PERM-30 Camila borra su cuenta: sus vínculos terminan y Martina sigue entrando con su historial', async () => {
    const { camila, martina } = await e.escena();
    const codigo = await invitar(camila);
    const r = await e.pedirComo(camila, { method: 'DELETE', url: '/v1/me' });
    expect(r.status).toBe(200);
    expect(await e.prisma.vinculoEntrenador.count({ where: { entrenadorId: camila.id, estado: 'activo' } })).toBe(0);
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: martina.id } })).entrenadorId).toBeNull();
    const yo = await e.pedirComo(martina, { method: 'GET', url: '/v1/me' });
    expect(yo.status).toBe(200);
    expect(yo.json.entrenador).toBeNull();
    const { diego } = { diego: await e.prisma.usuario.findFirstOrThrow({ where: { nombre: 'Diego' } }) };
    const link = await e.pedirComo({ nombre: 'diego', id: diego.id, email: diego.email, rol: 'client', usuario: diego }, {
      method: 'POST', url: '/v1/me/trainer/link', payload: { codigo },
    });
    expect(link.status).toBe(404);
  });

  it('CON-005 los códigos que usa el módulo existen con su estado', () => {
    for (const c of ['INVITATION_NOT_FOUND', 'INVITATION_USED', 'ALREADY_LINKED', 'CONSENT_REQUIRED', 'BUSINESS_RULE'] as const) {
      expect(CODIGOS_ERROR[c]).toBeDefined();
    }
  });
});
