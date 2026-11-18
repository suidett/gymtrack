// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de los avisos contra la base · Zona: Pruebas (API)
//
// Qué hace: prueba de punta a punta el módulo notificaciones con PostgreSQL y proveedores en
// memoria (PUSH_DRIVER=memoria y el buzón de correo: nunca se llama a Expo, a Google ni a Gmail):
// registrar y borrar dispositivos (sin tokens en claro), los avisos de cada evento (dolor,
// observaciones, cierre con alertas, rutinas), el tope de 2 al día, los recordatorios del
// worker, el correo de la noche, la ruta de prueba y el registro en la tabla avisos_enviados.
// Usa los ids del plan (INT, WRK) y los NOT-xx nuevos de plan-de-validacion.md.
// Tócalo cuando: cambie una regla de los avisos.
// Depende de: test/ayudas, test/progreso/datos y src/modulos/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import { createECDH, randomBytes } from 'node:crypto';
import { Writable } from 'node:stream';
import { beforeEach, expect, it } from 'vitest';
import { construirApp } from '../src/app';
import { crearAdaptadorMemoria, crearBuzon } from '../src/correo/desarrollo';
import { avisosDe, armarAvisoDeCierre } from '../src/modulos/notificaciones/eventos';
import { mandarRecordatorios } from '../src/modulos/notificaciones/recordatorios';
import { crearRegistroEnBase } from '../src/modulos/notificaciones/registro';
import type { ServicioAvisos } from '../src/modulos/notificaciones/servicio';
import { principal } from '../src/worker/principal';
import { correrTarea } from '../src/worker/tareas';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, uuidV7Fijo, type PersonaDePrueba } from './ayudas';
import { crearRutina, crearSesion, haceDias } from './progreso/datos';

const PRESS = idEjercicioBase('press-de-banca');
const TOKEN_CAMILA = 'ExponentPushToken[camila-telefono-01]';
const TOKEN_MARTINA = 'ExponentPushToken[martina-telefono-1]';
const TOKEN_DIEGO = 'ExponentPushToken[diego-telefono-001]';
/** Martes 17 de noviembre de 2026, 18:30 en Santiago (UTC-3 en verano). */
const A_LAS_1830 = '2026-11-17T21:30:00.000Z';
let n = 0;
const idv7 = () => uuidV7Fijo('2026-11-17T12:00:00.000Z', `prueba-avisos:${++n}`);
const suscripcion = (endpoint = 'https://web.push.apple.com/QGuQyavXutnMH7BPzA-martina') => ({
  endpoint, expirationTime: null, keys: { p256dh: createECDH('prime256v1').generateKeys().toString('base64url'), auth: randomBytes(16).toString('base64url') },
});

describeConBase('Notificaciones', () => {
  const e = usarEntornoApi();
  let avisos: ServicioAvisos;

  beforeEach(async () => {
    avisos = avisosDe(e.app.gymtrack.contexto)!;
    avisos.buzon.vaciar();
    await avisos.registro.vaciar();
  });

  /** Espera los avisos en segundo plano y los correos que encolaron. */
  const esperar = async () => {
    await avisos.esperar();
    await e.esperarCorreos();
  };
  const registrar = (p: PersonaDePrueba, payload: Record<string, unknown>) =>
    e.pedirComo(p, { method: 'POST', url: '/v1/notificaciones/dispositivos', payload });
  const registrarExpo = (p: PersonaDePrueba, token: string) => registrar(p, { tipo: 'expo', token, plataforma: 'android' });
  const observar = async (p: PersonaDePrueba, payload: Record<string, unknown>) => {
    const r = await e.pedirComo(p, { method: 'POST', url: '/v1/observations', payload });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    await esperar();
    return r;
  };
  const pushDe = (p: PersonaDePrueba) => avisos.buzon.de(p.id);
  /** Escena con los teléfonos de Camila y Martina registrados. */
  async function escenaConTelefonos() {
    const escena = await e.escena();
    expect((await registrarExpo(escena.camila, TOKEN_CAMILA)).status).toBe(201);
    expect((await registrarExpo(escena.martina, TOKEN_MARTINA)).status).toBe(201);
    return escena;
  }
  /** Inicia y cierra una sesión de Martina por la API. */
  async function cerrarSesion(p: PersonaDePrueba, diaId: string | null, extra: Record<string, unknown> = {}) {
    const id = idv7();
    const ini = await e.pedirComo(p, { method: 'POST', url: '/v1/sessions', payload: { id, routine_day_id: diaId, iniciada_at: '2026-11-17T12:15:00.000Z', device_id: 'tel' } });
    expect(ini.status, JSON.stringify(ini.json)).toBe(201);
    const fin = await e.pedirComo(p, { method: 'POST', url: `/v1/sessions/${id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z', ...extra } });
    expect(fin.status, JSON.stringify(fin.json)).toBe(200);
    await esperar();
    return fin.json;
  }

  // ── Dispositivos ───────────────────────────────────────────────────────────
  it('NOT-030 SEG-003 registra el token de Expo (201 y luego 200, una sola fila) y en push_tokens no queda nada en claro', async () => {
    const { martina } = await e.escena();
    const uno = await registrarExpo(martina, TOKEN_MARTINA);
    const dos = await registrarExpo(martina, TOKEN_MARTINA);
    expect([uno.status, dos.status]).toEqual([201, 200]);
    expect(uno.json).toMatchObject({ tipo: 'expo', plataforma: 'android' });
    expect(dos.json.id).toBe(uno.json.id);
    const s = suscripcion();
    const web = await registrar(martina, { tipo: 'web', suscripcion: s });
    expect([web.status, web.json.tipo, web.json.plataforma]).toEqual([201, 'web', 'web']);
    const filas = await e.prisma.pushToken.findMany();
    expect(filas).toHaveLength(2);
    const volcado = JSON.stringify(filas);
    // Valores inventados de la prueba, no son secretos reales.
    for (const secreto of [TOKEN_MARTINA, 'martina-telefono-1', s.endpoint, 'QGuQyavXutnMH7BPzA', s.keys.p256dh, s.keys.auth]) { // gitleaks:allow
      expect(volcado).not.toContain(secreto);
    }
  });

  it('NOT-031 la misma suscripción con llaves nuevas actualiza la fila; el mismo teléfono en otra cuenta pasa a la última', async () => {
    const { martina, diego } = await e.escena();
    const s = suscripcion();
    const a = await registrar(martina, { tipo: 'web', suscripcion: s });
    const b = await registrar(martina, { tipo: 'web', suscripcion: { ...s, keys: suscripcion().keys } });
    expect([a.status, b.status, b.json.id]).toEqual([201, 200, a.json.id]);
    await registrarExpo(martina, TOKEN_MARTINA);
    const deDiego = await registrarExpo(diego, TOKEN_MARTINA);
    expect(deDiego.status).toBe(200);
    expect((await avisos.dispositivos.activosDe(martina.id)).map((d) => d.tipo)).toEqual(['web']);
    expect((await avisos.dispositivos.activosDe(diego.id)).map((d) => (d.tipo === 'expo' ? d.destino.token : ''))).toEqual([TOKEN_MARTINA]);
  });

  it('NOT-032 DELETE borra el propio (200), el ajeno o el que no existe da 404 y un id mal escrito 400', async () => {
    const { camila, martina } = await escenaConTelefonos();
    const propio = (await registrarExpo(martina, TOKEN_MARTINA)).json.id;
    const ajeno = (await registrarExpo(camila, TOKEN_CAMILA)).json.id;
    expect((await e.pedirComo(martina, { method: 'DELETE', url: `/v1/notificaciones/dispositivos/${ajeno}` })).status).toBe(404);
    const ok = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/notificaciones/dispositivos/${propio}` });
    expect([ok.status, ok.json]).toEqual([200, { borrado: true }]);
    expect((await e.pedirComo(martina, { method: 'DELETE', url: `/v1/notificaciones/dispositivos/${propio}` })).status).toBe(404);
    expect((await e.pedirComo(martina, { method: 'DELETE', url: '/v1/notificaciones/dispositivos/no-es-uuid' })).status).toBe(400);
    expect(await e.prisma.pushToken.count({ where: { usuarioId: camila.id } })).toBe(1);
  });

  it('NOT-033 CON-012 la entrada se valida en forma y en fondo: 400 con el campo; sin sesión 401', async () => {
    const { martina } = await e.escena();
    const casos: [Record<string, unknown>, string][] = [
      [{ tipo: 'expo', token: 'abc', plataforma: 'android' }, 'token'],
      [{ tipo: 'expo', token: TOKEN_MARTINA, plataforma: 'android', extra: 1 }, 'extra'],
      [{ tipo: 'web', suscripcion: suscripcion('https://169.254.169.254/latest') }, 'suscripcion.endpoint'],
      [{ tipo: 'web', suscripcion: { ...suscripcion(), keys: { p256dh: 'corta', auth: 'x' } } }, 'suscripcion.keys.p256dh'],
      [{ tipo: 'sms', token: TOKEN_MARTINA }, 'tipo'],
    ];
    for (const [payload, campo] of casos) {
      const r = await registrar(martina, payload);
      expect(r.status, JSON.stringify(payload)).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
      expect(r.json.error.details.campo).toBe(campo);
    }
    const sin = await e.pedir({ method: 'POST', url: '/v1/notificaciones/dispositivos', payload: { tipo: 'expo', token: TOKEN_MARTINA, plataforma: 'android' } });
    expect(sin.status).toBe(401);
    expect(await e.prisma.pushToken.count()).toBe(0);
  });

  // ── Eventos ────────────────────────────────────────────────────────────────
  it('INT-147 un dolor de 7 avisa a Camila al tiro por push y correo; uno de 6 no crea alerta y llega como observación', async () => {
    const { camila, martina } = await escenaConTelefonos();
    await observar(martina, { tipo: 'dolor', texto: 'Me tira el hombro', exercise_id: PRESS, dolor_zona: 'hombro', dolor_intensidad: 7 });
    expect(pushDe(camila)).toHaveLength(1);
    expect(pushDe(camila)[0]).toMatchObject({ destino: TOKEN_CAMILA, mensaje: { titulo: 'Dolor fuerte de Martina', datos: { tipo: 'dolor', url: '/entrenador/alertas' }, urgente: true } });
    expect(pushDe(camila)[0]!.mensaje.cuerpo).toBe('Dolor 7 de 10 en hombro en Press de banca. Toca para revisarla.');
    expect(e.buzon.ultimo(camila.email)).toMatchObject({ etiqueta: 'aviso', asunto: 'Martina reportó un dolor fuerte' });
    // Lo que escribió Martina no va en el push.
    expect(JSON.stringify(pushDe(camila))).not.toContain('Me tira');
    await observar(martina, { tipo: 'dolor', texto: 'Molesta', exercise_id: PRESS, dolor_intensidad: 6 });
    expect(await e.prisma.alerta.count({ where: { tipo: 'dolor' } })).toBe(1);
    expect(pushDe(camila).map((p) => p.mensaje.datos.tipo)).toEqual(['dolor', 'observacion']);
    expect(pushDe(martina)).toHaveLength(0);
  });

  it('INT-150 la observación de Martina deja 1 push a Camila que abre su ficha; el cierre sin alertas no avisa; el consejo de Camila sí', async () => {
    const { camila, martina } = await escenaConTelefonos();
    await observar(martina, { texto: 'Hoy me costó la última serie', exercise_id: PRESS });
    expect(pushDe(camila).map((p) => [p.mensaje.titulo, p.mensaje.datos.url])).toEqual([['Martina dejó una observación', `/cliente/${martina.id}`]]);
    const r = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await cerrarSesion(martina, r.dias[0]!.id);
    expect(pushDe(camila)).toHaveLength(1);
    expect(e.buzon.ultimo(camila.email)).toBeUndefined();
    await observar(camila, { tipo: 'consejo', texto: 'Baja 2,5 kilos y cuida el codo', exercise_id: PRESS, client_id: martina.id });
    expect(pushDe(martina).map((p) => [p.mensaje.titulo, p.mensaje.cuerpo])).toEqual([['Camila te dejó un consejo', 'Baja 2,5 kilos y cuida el codo']]);
  });

  it('INT-102 el cierre con dolor general de 7 deja la alerta y el aviso a Camila por push y correo', async () => {
    const { camila, martina } = await escenaConTelefonos();
    const r = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    const cierre = await cerrarSesion(martina, r.dias[0]!.id, { dolor_general: { zona: 'rodilla', intensidad: 7 } });
    expect(cierre.alertas_creadas).toEqual([{ tipo: 'dolor', exercise_id: null, nombre: null }]);
    expect(pushDe(camila).map((p) => p.mensaje.cuerpo)).toEqual(['Dolor 7 de 10 en rodilla. Toca para revisarla.']);
    expect(e.buzon.ultimo(camila.email)?.texto).toContain('Dolor 7 de 10 en rodilla.');
  });

  it('INT-145 WRK-017 NOT-034 Diego, alumno solo, no le avisa a nadie: ni su dolor ni su cierre', async () => {
    const { camila, diego } = await escenaConTelefonos();
    await registrarExpo(diego, TOKEN_DIEGO);
    await observar(diego, { tipo: 'dolor', texto: 'Fuerte', exercise_id: PRESS, dolor_intensidad: 9 });
    await cerrarSesion(diego, null, { dolor_general: { zona: 'rodilla', intensidad: 9 } });
    expect(avisos.buzon.todos()).toHaveLength(0);
    expect(e.buzon.ultimo(camila.email)).toBeUndefined();
  });

  it('NOT-035 asignar y activar una rutina le avisa a Martina; activar la suya no le avisa a nadie', async () => {
    const { camila, martina } = await escenaConTelefonos();
    const plantilla = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: null, estado: 'borrador', nombre: 'Fuerza', dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    const asignada = await e.pedirComo(camila, { method: 'POST', url: `/v1/routines/${plantilla.id}/assign`, payload: { client_id: martina.id, activar: true } });
    expect(asignada.status).toBe(201);
    await esperar();
    expect(pushDe(martina).map((p) => [p.mensaje.titulo, p.mensaje.cuerpo, p.mensaje.datos.url])).toEqual([
      ['Camila te asignó una rutina', '«Fuerza» ya está activa: la ves en Hoy.', '/'],
    ]);
    const propia = await crearRutina(e.prisma, { duenoId: martina.id, alumnoId: martina.id, estado: 'borrador', dias: [{ nombre: 'Día A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    expect((await e.pedirComo(martina, { method: 'POST', url: `/v1/routines/${propia.id}/activate` })).status).toBe(200);
    await esperar();
    expect(pushDe(martina)).toHaveLength(1);
    expect(pushDe(camila)).toHaveLength(0);
  });

  it('NOT-036 un token que Expo da por inválido se borra y no se vuelve a intentar', async () => {
    const { camila, martina } = await escenaConTelefonos();
    avisos.buzon.marcarInvalido(TOKEN_MARTINA);
    await observar(camila, { tipo: 'consejo', texto: 'Bien hecho', exercise_id: PRESS, client_id: martina.id });
    expect(pushDe(martina)).toHaveLength(0);
    expect(await e.prisma.pushToken.count({ where: { usuarioId: martina.id } })).toBe(0);
    expect(await e.prisma.pushToken.count({ where: { usuarioId: camila.id } })).toBe(1);
  });

  // ── Tope de 2 al día ───────────────────────────────────────────────────────
  it('WRK-007 P-20 con 2 push hoy, la tercera alerta no sale por push pero sí por correo; el dolor fuerte sale igual; mañana hay cupo', async () => {
    const { camila, martina } = await escenaConTelefonos();
    await observar(martina, { texto: 'Uno', exercise_id: PRESS });
    await observar(martina, { texto: 'Dos', exercise_id: PRESS });
    expect(pushDe(camila)).toHaveLength(2);
    const sesion = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: AHORA, series: [] });
    await e.prisma.alerta.create({ data: { alumnoId: martina.id, entrenadorId: camila.id, tipo: 'estancamiento', ejercicioId: PRESS, detalle: { session_id: sesion, sesiones: [1, 2, 3] } } });
    const r = await avisos.enviar((await armarAvisoDeCierre(e.prisma, sesion, null))!);
    await e.esperarCorreos();
    expect([r.push.omitido, r.correo]).toEqual(['tope', true]);
    expect(pushDe(camila)).toHaveLength(2);
    expect(e.buzon.ultimo(camila.email)?.asunto).toBe('Martina tiene una alerta nueva');
    await observar(martina, { tipo: 'dolor', texto: 'Fuerte', exercise_id: PRESS, dolor_intensidad: 8 });
    expect(pushDe(camila).map((p) => p.mensaje.datos.tipo)).toEqual(['observacion', 'observacion', 'dolor']);
    // Un día después (en Santiago) vuelve a haber cupo.
    e.reloj.avanzar('1d');
    await observar(martina, { texto: 'Mañana', exercise_id: PRESS });
    expect(pushDe(camila)).toHaveLength(4);
  });

  // ── Recordatorios ──────────────────────────────────────────────────────────
  /** Martina y Diego con rutina activa y hora habitual 19:00; Diego con el recordatorio apagado. */
  async function escenaRecordatorio() {
    const escena = await escenaConTelefonos();
    await registrarExpo(escena.diego, TOKEN_DIEGO);
    await crearRutina(e.prisma, { duenoId: escena.camila.id, alumnoId: escena.martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await crearRutina(e.prisma, { duenoId: escena.diego.id, alumnoId: escena.diego.id, dias: [{ nombre: 'Cuerpo completo', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await e.prisma.perfilAlumno.update({ where: { usuarioId: escena.martina.id }, data: { recordatorioHora: '19:00' } });
    await e.prisma.perfilAlumno.update({ where: { usuarioId: escena.diego.id }, data: { recordatorioHora: '19:00', recordatorioActivo: false } });
    return escena;
  }
  const recordar = async (cuando: string) => {
    e.reloj.fijar(cuando);
    const r = await mandarRecordatorios(e.prisma, avisos, new Date(cuando));
    await esperar();
    return r;
  };

  it('WRK-006 WRK-014 Martina recibe su recordatorio a las 18:30 de Santiago, una sola vez; Diego, con el recordatorio apagado, no', async () => {
    const { martina, diego } = await escenaRecordatorio();
    expect((await recordar('2026-11-17T21:25:00.000Z')).enviados).toBe(0);
    const r = await recordar(A_LAS_1830);
    expect(r).toMatchObject({ revisados: 1, enviados: 1 });
    expect(pushDe(martina).map((p) => [p.mensaje.titulo, p.mensaje.cuerpo, p.mensaje.vigenciaS])).toEqual([
      ['Hoy toca Empuje A', 'Tu hora habitual es a las 19:00: quedan 30 minutos.', 1800],
    ]);
    // Otra corrida en la misma ventana (el worker se reinició) no lo repite.
    await recordar('2026-11-17T21:32:00.000Z');
    await mandarRecordatorios(e.prisma, avisos, new Date(A_LAS_1830));
    await esperar();
    expect(pushDe(martina)).toHaveLength(1);
    expect(pushDe(diego)).toHaveLength(0);
  });

  it('P-21 NOT-037 sin recordatorio si ya entrenó hoy o tiene una en curso; sin hora fijada, la mediana de sus últimas sesiones', async () => {
    const { martina } = await escenaRecordatorio();
    const sesion = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: '2026-11-17T12:00:00.000Z', series: [] });
    expect(await recordar(A_LAS_1830)).toMatchObject({ enviados: 0, sin_recordatorio: 1 });
    await e.prisma.sesionEntreno.delete({ where: { id: sesion } });
    await avisos.registro.vaciar();
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: null, iniciadaAt: '2026-11-17T21:00:00.000Z', series: [] });
    expect((await recordar(A_LAS_1830)).enviados).toBe(0);
    await e.prisma.sesionEntreno.deleteMany({ where: { alumnoId: martina.id } });
    // Sin hora fijada y sin sesiones: no hay recordatorio.
    await e.prisma.perfilAlumno.update({ where: { usuarioId: martina.id }, data: { recordatorioHora: null } });
    expect(await recordar(A_LAS_1830)).toMatchObject({ enviados: 0, sin_recordatorio: 1 });
    // Tres sesiones que empezaron a las 19:10, 19:20 y 19:30 de Santiago: la hora habitual es 19:20.
    for (const [i, minuto] of [10, 20, 30].entries()) {
      await crearSesion(e.prisma, { alumnoId: martina.id, iniciadaAt: `2026-11-1${i + 1}T22:${minuto}:00.000Z`, cerradaAt: `2026-11-1${i + 1}T23:30:00.000Z`, series: [] });
    }
    expect((await recordar('2026-11-17T21:50:00.000Z')).enviados).toBe(1);
    expect(pushDe(martina)[0]!.mensaje.cuerpo).toBe('Tu hora habitual es a las 19:20: quedan 30 minutos.');
  });

  it('WRK-016 Martina ya recibió el recordatorio y un consejo: el segundo consejo queda guardado pero no sale push', async () => {
    const { camila, martina } = await escenaRecordatorio();
    await recordar(A_LAS_1830);
    await observar(camila, { tipo: 'consejo', texto: 'Uno', exercise_id: PRESS, client_id: martina.id });
    await observar(camila, { tipo: 'consejo', texto: 'Dos', exercise_id: PRESS, client_id: martina.id });
    expect(pushDe(martina).map((p) => p.mensaje.datos.tipo)).toEqual(['recordatorio', 'consejo']);
    expect(await e.prisma.observacion.count({ where: { alumnoId: martina.id, tipo: 'consejo' } })).toBe(2);
  });

  it('WRK-017 NOT-038 la noche le manda a Camila un correo con la alerta «sin sesiones» de Martina y ningún push; la de Diego no le llega a nadie', async () => {
    const { camila, martina, diego } = await escenaConTelefonos();
    await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, activadaAt: haceDias(AHORA, 10), dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await crearRutina(e.prisma, { duenoId: diego.id, alumnoId: diego.id, activadaAt: haceDias(AHORA, 10), dias: [{ nombre: 'Cuerpo completo', ejercicios: [{ slug: 'press-de-banca' }] }] });
    const r = await correrTarea(e.prisma, 'noche', new Date(AHORA), { avisos });
    await esperar();
    expect(r.deteccion?.por_tipo).toEqual({ sin_sesiones: 2 });
    expect(r.avisos_noche).toEqual({ alertas: 1, correos: 1 });
    const correo = e.buzon.ultimo(camila.email)!;
    expect(correo.asunto).toBe('Martina tiene una alerta nueva');
    expect(correo.texto).toContain('Lleva 10 días sin entrenar.');
    expect(avisos.buzon.todos()).toHaveLength(0);
    expect(e.buzon.ultimo(diego.email)).toBeUndefined();
    // El worker murió y se vuelve a correr con el mismo «ahora»: no repite el correo (WRK-014).
    const otra = await correrTarea(e.prisma, 'noche', new Date(AHORA), { avisos });
    expect(otra.avisos_noche).toEqual({ alertas: 1, correos: 0 });
    // La noche siguiente no hay alertas nuevas (la abierta no se repite): no hay correo.
    const manana = await correrTarea(e.prisma, 'noche', new Date(Date.parse(AHORA) + 86_400_000), { avisos });
    expect(manana.avisos_noche).toEqual({ alertas: 0, correos: 0 });
  });

  it('NOT-042 el worker corre recordatorios y noche de punta a punta con su propio servicio de avisos y termina con 0', async () => {
    await escenaRecordatorio();
    const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.DATABASE_URL };
    expect(await principal(['recordatorios', `--ahora=${A_LAS_1830}`], env)).toBe(0);
    expect(await principal(['noche', `--ahora=${AHORA}`], env)).toBe(0);
    // Una llave VAPID mal copiada no deja arrancar las tareas que avisan.
    expect(await principal(['recordatorios'], { ...env, VAPID_PUBLICA: 'mala', VAPID_PRIVADA: 'x', VAPID_CONTACTO: 'y' })).toBe(1);
  });

  // ── Ruta de prueba ─────────────────────────────────────────────────────────
  it('NOT-039 la prueba le llega a quien la pide, con correo si lo pide, sin contar para el tope y con tope de 10 por hora', async () => {
    const { camila, martina } = await escenaConTelefonos();
    const sinNada = await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/prueba', payload: { correo: true } });
    expect(sinNada.status).toBe(200);
    expect(sinNada.json).toMatchObject({ dispositivos: 1, enviados: 1, invalidos: 0, fallidos: 0, correo: true });
    expect(sinNada.json.resultados).toEqual([expect.objectContaining({ tipo: 'expo', plataforma: 'android', resultado: 'enviado' })]);
    await e.esperarCorreos();
    expect(e.buzon.ultimo(martina.email)).toMatchObject({ etiqueta: 'aviso', asunto: 'Prueba de avisos de GymTrack' });
    expect(pushDe(martina)[0]!.mensaje.titulo).toBe('Prueba de avisos');
    // Sin cuerpo también sirve, y no manda correo.
    const sola = await e.pedirComo(camila, { method: 'POST', url: '/v1/notificaciones/prueba' });
    expect([sola.status, sola.json.correo, sola.json.enviados]).toEqual([200, false, 1]);
    expect((await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/prueba', payload: { canal: 'sms' } })).status).toBe(400);
    // La de arriba más 9: las 10 de la hora. La que sigue da 429 (el 400 no contó).
    for (let i = 0; i < 9; i++) expect((await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/prueba' })).status).toBe(200);
    const tope = await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/prueba' });
    expect(tope.status).toBe(429);
    expect(tope.headers['retry-after']).toBeDefined();
    // Las 10 pruebas no gastaron el cupo del día: el consejo igual llega.
    await observar(camila, { tipo: 'consejo', texto: 'Sigue así', exercise_id: PRESS, client_id: martina.id });
    expect(pushDe(martina).filter((p) => p.mensaje.datos.tipo === 'consejo')).toHaveLength(1);
  });

  it('NOT-040 en producción la prueba es solo del entrenador: la alumna recibe 403', async () => {
    const { camila, martina } = await escenaConTelefonos();
    const ctx = e.app.gymtrack.contexto;
    const buzon = crearBuzon();
    const prod = await construirApp({
      config: { ...ctx.config, entorno: 'production' }, prisma: e.prisma, reloj: e.reloj, correo: { adaptador: crearAdaptadorMemoria(buzon), buzon },
      destinoLogs: new Writable({ write: (_t, _e, listo) => listo() }),
    });
    await prod.ready();
    try {
      const pedir = async (p: PersonaDePrueba) => prod.inject({ method: 'POST', url: '/v1/notificaciones/prueba', headers: { authorization: `Bearer ${await e.tokenDe(p)}` } });
      const alumna = await pedir(martina);
      expect([alumna.statusCode, alumna.json().error.code]).toEqual([403, 'FORBIDDEN']);
      expect((await pedir(camila)).statusCode).toBe(200);
    } finally {
      await prod.close();
    }
  });

  // ── Registro en la tabla avisos_enviados ───────────────────────────────────
  it('NOT-041 el tope y el «no repetir» quedan en la tabla avisos_enviados, compartida por la API y el worker', async () => {
    const { camila } = await e.escena();
    const r = crearRegistroEnBase(e.prisma);
    const ahora = new Date(AHORA);
    const entrada = { clave: 'observacion:1', usuarioId: camila.id, dia: '2026-11-17', tipo: 'observacion', cuentaTope: true };
    expect(await r.reservar(entrada, ahora)).toBe(true);
    expect(await r.reservar(entrada, ahora)).toBe(false);
    expect(await r.contarHoy(camila.id, '2026-11-17')).toBe(0);
    await r.cerrar('observacion:1', { pushEnviados: 1, pushFallidos: 0, correo: false, omitido: null });
    await r.reservar({ ...entrada, clave: 'prueba:1', tipo: 'prueba', cuentaTope: false }, ahora);
    await r.cerrar('prueba:1', { pushEnviados: 1, pushFallidos: 0, correo: false, omitido: null });
    await r.reservar({ ...entrada, clave: 'observacion:2' }, ahora);
    await r.cerrar('observacion:2', { pushEnviados: 0, pushFallidos: 0, correo: false, omitido: 'sin_dispositivos' });
    expect(await r.contarHoy(camila.id, '2026-11-17')).toBe(1);
    expect(await r.contarHoy(camila.id, '2026-11-18')).toBe(0);
    const filas = await e.prisma.$queryRaw<{ clave: string; omitido: string | null }[]>`SELECT clave, omitido FROM avisos_enviados ORDER BY clave`;
    expect(filas).toEqual([
      { clave: 'observacion:1', omitido: null }, { clave: 'observacion:2', omitido: 'sin_dispositivos' }, { clave: 'prueba:1', omitido: null },
    ]);
  });
});
