// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de la campana contra la base · Zona: Pruebas (API)
//
// Qué hace: prueba de punta a punta las notificaciones dentro de la app con PostgreSQL y el push
// en memoria (PUSH_DRIVER=memoria: nunca se llama a Expo ni a Google):
//   - cada evento que avisa deja su notificación a quien la recibe, con el mismo título, texto y
//     ruta del push, aunque no tenga dispositivos, aunque haya llegado al tope de 2 push al día o
//     aunque el push falle; y el mismo aviso dos veces deja una sola (la clave del aviso);
//   - GET /v1/notificaciones (lista, páginas con `antes`, contador), POST /:id/leer y
//     POST /leer-todas, solo sobre lo propio (lo ajeno da 404);
//   - la validación estricta de la query, los params y el cuerpo (400 con el campo; 401 sin sesión).
// Ids NOT-070 a NOT-079 (campana), en la línea de los NOT-xx de plan-de-validacion.md.
// Tócalo cuando: cambie qué deja un aviso en la campana o las rutas de la campana.
// Depende de: test/ayudas, test/progreso/datos y src/modulos/notificaciones.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, expect, it } from 'vitest';
import { avisosDe, armarAvisoDeCierre } from '../src/modulos/notificaciones/eventos';
import { mandarRecordatorios } from '../src/modulos/notificaciones/recordatorios';
import type { ServicioAvisos } from '../src/modulos/notificaciones/servicio';
import { correrTarea } from '../src/worker/tareas';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, uuidV7Fijo, type PersonaDePrueba } from './ayudas';
import { crearRutina, crearSesion, haceDias } from './progreso/datos';

const PRESS = idEjercicioBase('press-de-banca');
const TOKEN_CAMILA = 'ExponentPushToken[camila-telefono-01]';
const TOKEN_MARTINA = 'ExponentPushToken[martina-telefono-1]';
/** Martes 17 de noviembre de 2026, 18:30 en Santiago: el recordatorio de las 19:00. */
const A_LAS_1830 = '2026-11-17T21:30:00.000Z';
let n = 0;
const idv7 = () => uuidV7Fijo('2026-11-17T12:00:00.000Z', `prueba-campana:${++n}`);

describeConBase('Notificaciones en la app (campana)', () => {
  const e = usarEntornoApi();
  let avisos: ServicioAvisos;

  beforeEach(async () => {
    avisos = avisosDe(e.app.gymtrack.contexto)!;
    avisos.buzon.vaciar();
    await avisos.registro.vaciar();
  });

  const esperar = async () => {
    await avisos.esperar();
    await e.esperarCorreos();
  };
  const observar = async (p: PersonaDePrueba, payload: Record<string, unknown>) => {
    const r = await e.pedirComo(p, { method: 'POST', url: '/v1/observations', payload });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    await esperar();
    return r.json as { id: string };
  };
  const campana = async (p: PersonaDePrueba, query = '') => {
    const r = await e.pedirComo(p, { method: 'GET', url: `/v1/notificaciones${query}` });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    return r.json as { items: { id: string; tipo: string; titulo: string; cuerpo: string; ruta: string; leida: boolean; created_at: string }[]; sin_leer: number };
  };
  const registrarExpo = async (p: PersonaDePrueba, token: string) => {
    const r = await e.pedirComo(p, { method: 'POST', url: '/v1/notificaciones/dispositivos', payload: { tipo: 'expo', token, plataforma: 'android' } });
    expect(r.status).toBe(201);
  };
  async function cerrarSesion(p: PersonaDePrueba, diaId: string | null, extra: Record<string, unknown> = {}) {
    const id = idv7();
    const ini = await e.pedirComo(p, { method: 'POST', url: '/v1/sessions', payload: { id, routine_day_id: diaId, iniciada_at: '2026-11-17T12:15:00.000Z', device_id: 'tel' } });
    expect(ini.status, JSON.stringify(ini.json)).toBe(201);
    const fin = await e.pedirComo(p, { method: 'POST', url: `/v1/sessions/${id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z', ...extra } });
    expect(fin.status, JSON.stringify(fin.json)).toBe(200);
    await esperar();
    return id;
  }
  /** Una notificación de esa persona hecha a mano con la bandeja, a la hora que diga. */
  const dejar = (p: PersonaDePrueba, clave: string, cuando: string, titulo = clave) =>
    avisos.bandeja.crear({ usuarioId: p.id, clave, tipo: 'prueba', titulo, cuerpo: 'Texto', ruta: '/' }, new Date(cuando));

  // ── Cada evento deja su notificación ───────────────────────────────────────
  it('NOT-070 sin ningún teléfono registrado, cada evento deja su notificación con el título, el texto y la ruta del push', async () => {
    const { camila, martina } = await e.escena();
    // Observación de Martina: a Camila, sin lo que escribió Martina (INT-150).
    await observar(martina, { texto: 'Hoy me costó la última serie', exercise_id: PRESS });
    // Dolor de 7: a Camila, como alerta de dolor.
    await observar(martina, { tipo: 'dolor', texto: 'Me tira el hombro', exercise_id: PRESS, dolor_zona: 'hombro', dolor_intensidad: 7 });
    // Cierre con dolor general de 7: la alerta del cierre a Camila.
    const r = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await cerrarSesion(martina, r.dias[0]!.id, { dolor_general: { zona: 'rodilla', intensidad: 7 } });
    // Consejo y respuesta de Camila: a Martina.
    await observar(camila, { tipo: 'consejo', texto: 'Baja 2,5 kilos y cuida el codo', exercise_id: PRESS, client_id: martina.id });
    await observar(camila, { texto: 'Vas muy bien, sigue así', exercise_id: PRESS, client_id: martina.id });
    // Rutina asignada y activa: a Martina.
    const plantilla = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: null, estado: 'borrador', nombre: 'Fuerza', dias: [{ nombre: 'Empuje B', ejercicios: [{ slug: 'press-de-banca' }] }] });
    expect((await e.pedirComo(camila, { method: 'POST', url: `/v1/routines/${plantilla.id}/assign`, payload: { client_id: martina.id, activar: true } })).status).toBe(201);
    await esperar();

    expect(avisos.buzon.todos()).toHaveLength(0);
    // El reloj de la prueba no avanza: todas tienen la misma hora, el orden lo prueba NOT-075.
    const deCamila = await campana(camila);
    expect(deCamila.sin_leer).toBe(3);
    expect(deCamila.items).toHaveLength(3);
    expect(deCamila.items.map((x) => [x.tipo, x.titulo, x.cuerpo, x.ruta, x.leida])).toEqual(expect.arrayContaining([
      ['dolor', 'Dolor fuerte de Martina', 'Dolor 7 de 10 en rodilla. Toca para revisarla.', '/entrenador/alertas', false],
      ['dolor', 'Dolor fuerte de Martina', 'Dolor 7 de 10 en hombro en Press de banca. Toca para revisarla.', '/entrenador/alertas', false],
      ['observacion', 'Martina dejó una observación', 'Sobre Press de banca. Toca para verla en su ficha.', `/cliente/${martina.id}`, false],
    ]));
    // Lo que escribió Martina no queda en la campana de Camila (igual que el push).
    expect(JSON.stringify(deCamila)).not.toMatch(/Me tira|me costó/);

    const deMartina = await campana(martina);
    expect(deMartina.items).toHaveLength(3);
    expect(deMartina.items.map((x) => [x.tipo, x.titulo, x.cuerpo, x.ruta])).toEqual(expect.arrayContaining([
      ['consejo', 'Camila te dejó un consejo', 'Baja 2,5 kilos y cuida el codo', '/'],
      ['observacion', 'Camila te respondió sobre Press de banca', 'Vas muy bien, sigue así', '/'],
      ['rutina', 'Camila te asignó una rutina', '«Fuerza» ya está activa: la ves en Hoy.', '/'],
    ]));
    expect(deMartina.sin_leer).toBe(3);
    // Las claves son las mismas de avisos_enviados.
    const claves = (await e.prisma.notificacion.findMany({ select: { clave: true } })).map((x) => x.clave).sort();
    const registro = (await e.prisma.avisoEnviado.findMany({ select: { clave: true } })).map((x) => x.clave).sort();
    expect(claves).toEqual(registro);
    expect(await e.prisma.avisoEnviado.count({ where: { omitido: 'sin_dispositivos' } })).toBe(6);
  });

  it('NOT-071 el recordatorio del worker, el correo de la noche y «Probar avisos» también dejan su notificación', async () => {
    const { camila, martina } = await e.escena();
    await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, activadaAt: haceDias(AHORA, 10), dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await e.prisma.perfilAlumno.update({ where: { usuarioId: martina.id }, data: { recordatorioHora: '19:00' } });
    // La noche: alerta «sin sesiones» de Martina, correo a Camila y su notificación.
    const noche = await correrTarea(e.prisma, 'noche', new Date(AHORA), { avisos });
    await esperar();
    expect(noche.avisos_noche).toEqual({ alertas: 1, correos: 1 });
    // El recordatorio de las 18:30.
    e.reloj.fijar(A_LAS_1830);
    expect((await mandarRecordatorios(e.prisma, avisos, new Date(A_LAS_1830))).revisados).toBe(1);
    // La prueba de avisos de Camila, sin teléfonos.
    e.reloj.avanzar('1m');
    const prueba = await e.pedirComo(camila, { method: 'POST', url: '/v1/notificaciones/prueba' });
    expect([prueba.status, prueba.json.dispositivos, prueba.json.enviados]).toEqual([200, 0, 0]);

    const deCamila = await campana(camila);
    expect(deCamila.items.map((x) => [x.tipo, x.titulo, x.cuerpo, x.ruta])).toEqual([
      ['prueba', 'Prueba de avisos', 'Si ves esto, los avisos de GymTrack llegan a este teléfono.', '/'],
      ['alertas_noche', 'Martina tiene una alerta nueva', 'Lleva 10 días sin entrenar. Toca para revisarla.', '/entrenador/alertas'],
    ]);
    expect((await campana(martina)).items.map((x) => [x.tipo, x.titulo, x.cuerpo])).toEqual([
      ['recordatorio', 'Hoy toca Empuje A', 'Tu hora habitual es a las 19:00: quedan 30 minutos.'],
    ]);
    expect(avisos.buzon.todos()).toHaveLength(0);
  });

  it('NOT-072 el tope de 2 al día es solo del push: el tercer aviso no sale por push pero sí queda en la campana', async () => {
    const { camila, martina } = await e.escena();
    await registrarExpo(camila, TOKEN_CAMILA);
    await observar(martina, { texto: 'Uno', exercise_id: PRESS });
    await observar(martina, { texto: 'Dos', exercise_id: PRESS });
    await observar(martina, { texto: 'Tres', exercise_id: PRESS });
    expect(avisos.buzon.de(camila.id)).toHaveLength(2);
    expect(await e.prisma.avisoEnviado.count({ where: { usuarioId: camila.id, omitido: 'tope' } })).toBe(1);
    const c = await campana(camila);
    expect([c.items.length, c.sin_leer]).toEqual([3, 3]);
  });

  it('NOT-073 si el push falla (el teléfono ya no existe) la notificación queda igual', async () => {
    const { camila, martina } = await e.escena();
    await registrarExpo(martina, TOKEN_MARTINA);
    avisos.buzon.marcarInvalido(TOKEN_MARTINA);
    await observar(camila, { tipo: 'consejo', texto: 'Bien hecho', exercise_id: PRESS, client_id: martina.id });
    expect(avisos.buzon.de(martina.id)).toHaveLength(0);
    expect(await e.prisma.pushToken.count({ where: { usuarioId: martina.id } })).toBe(0);
    expect((await campana(martina)).items.map((x) => x.titulo)).toEqual(['Camila te dejó un consejo']);
  });

  it('NOT-074 WRK-014 el mismo aviso dos veces deja una sola notificación (la clave del aviso)', async () => {
    const { camila, martina } = await e.escena();
    const sesion = await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: AHORA, series: [] });
    await e.prisma.alerta.create({ data: { alumnoId: martina.id, entrenadorId: camila.id, tipo: 'estancamiento', ejercicioId: PRESS, detalle: { session_id: sesion, sesiones: [1, 2, 3] } } });
    const aviso = (await armarAvisoDeCierre(e.prisma, sesion, null))!;
    const uno = await avisos.enviar(aviso);
    const dos = await avisos.enviar(aviso);
    expect([uno.repetido, uno.notificacion, dos.repetido, dos.notificacion]).toEqual([false, true, true, false]);
    // La noche corrida dos veces con el mismo «ahora» tampoco duplica.
    await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, activadaAt: haceDias(AHORA, 10), dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca' }] }] });
    await e.prisma.alerta.deleteMany({ where: { tipo: 'estancamiento' } });
    await e.prisma.sesionEntreno.deleteMany({});
    await correrTarea(e.prisma, 'noche', new Date(AHORA), { avisos });
    await correrTarea(e.prisma, 'noche', new Date(AHORA), { avisos });
    await esperar();
    const c = await campana(camila);
    expect(c.items.map((x) => x.tipo).sort()).toEqual(['alerta', 'alertas_noche']);
    expect(await e.prisma.notificacion.count()).toBe(2);
  });

  // ── Lista, páginas y contador ──────────────────────────────────────────────
  it('NOT-075 GET lista lo último primero, pagina con antes, cuenta las sin leer y no corta un mismo instante', async () => {
    const { martina, diego } = await e.escena();
    for (let i = 1; i <= 5; i++) await dejar(martina, `m:${i}`, `2026-11-1${i}T12:00:00.000Z`);
    await dejar(diego, 'd:1', '2026-11-16T12:00:00.000Z');
    const p1 = await campana(martina, '?limite=2');
    expect(p1.items.map((x) => x.titulo)).toEqual(['m:5', 'm:4']);
    expect(p1.sin_leer).toBe(5);
    expect(p1.items[0]).toEqual({ id: expect.any(String), tipo: 'prueba', titulo: 'm:5', cuerpo: 'Texto', ruta: '/', leida: false, created_at: '2026-11-15T12:00:00.000Z' });
    const p2 = await campana(martina, `?limite=2&antes=${encodeURIComponent(p1.items[1]!.created_at)}`);
    expect(p2.items.map((x) => x.titulo)).toEqual(['m:3', 'm:2']);
    const p3 = await campana(martina, `?limite=2&antes=${encodeURIComponent(p2.items[1]!.created_at)}`);
    expect(p3.items.map((x) => x.titulo)).toEqual(['m:1']);
    // Sin limite trae hasta 20; `antes` con otra zona horaria también sirve.
    expect((await campana(martina)).items).toHaveLength(5);
    expect((await campana(martina, `?antes=${encodeURIComponent('2026-11-14T09:00:00.000-03:00')}`)).items.map((x) => x.titulo)).toEqual(['m:3', 'm:2', 'm:1']);
    // Tres en el mismo instante con limite=2: van las tres, así la página siguiente no se salta ninguna.
    for (const k of ['a', 'b', 'c']) await dejar(diego, `d:mismo:${k}`, '2026-11-17T12:00:00.000Z');
    const d1 = await campana(diego, '?limite=2');
    expect(d1.items).toHaveLength(3);
    const d2 = await campana(diego, `?limite=2&antes=${encodeURIComponent(d1.items[2]!.created_at)}`);
    expect(d2.items.map((x) => x.titulo)).toEqual(['d:1']);
    expect(d1.sin_leer).toBe(4);
  });

  // ── Leer ───────────────────────────────────────────────────────────────────
  it('NOT-076 marcar una la deja leída y baja el contador; otra vez da lo mismo; la ajena o la que no existe dan 404', async () => {
    const { camila, martina } = await e.escena();
    await dejar(martina, 'm:1', '2026-11-16T12:00:00.000Z');
    await dejar(martina, 'm:2', '2026-11-17T12:00:00.000Z');
    await dejar(camila, 'c:1', '2026-11-17T12:00:00.000Z');
    const [n2, n1] = (await campana(martina)).items;
    const ajena = (await campana(camila)).items[0]!;
    const leer = (p: PersonaDePrueba, id: string, payload?: unknown) =>
      e.pedirComo(p, { method: 'POST', url: `/v1/notificaciones/${id}/leer`, ...(payload !== undefined ? { payload: payload as object } : {}) });

    const r = await leer(martina, n1!.id);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ notificacion: { ...n1, leida: true }, sin_leer: 1 });
    expect((await e.prisma.notificacion.findUniqueOrThrow({ where: { id: n1!.id } })).leidaAt?.toISOString()).toBe(AHORA);
    // Otra vez, una hora después: 200 y la hora de lectura no cambia. Con cuerpo `{}` también.
    e.reloj.avanzar('1h');
    expect((await leer(martina, n1!.id, {})).json.sin_leer).toBe(1);
    expect((await e.prisma.notificacion.findUniqueOrThrow({ where: { id: n1!.id } })).leidaAt?.toISOString()).toBe(AHORA);
    // La de Camila no se toca desde la cuenta de Martina: 404, igual que una que no existe.
    for (const id of [ajena.id, uuidV7Fijo(AHORA, 'no-existe')]) {
      const x = await leer(martina, id);
      expect([x.status, x.json.error.code]).toEqual([404, 'NOT_FOUND']);
    }
    expect((await campana(camila)).sin_leer).toBe(1);
    expect((await campana(martina)).items.map((x) => [x.titulo, x.leida])).toEqual([['m:2', false], ['m:1', true]]);
    expect(n2!.leida).toBe(false);
  });

  it('NOT-077 marcar todas deja en 0 las propias y no toca las de nadie más', async () => {
    const { camila, martina } = await e.escena();
    for (let i = 1; i <= 3; i++) await dejar(martina, `m:${i}`, `2026-11-1${i}T12:00:00.000Z`);
    await dejar(camila, 'c:1', '2026-11-17T12:00:00.000Z');
    await e.pedirComo(martina, { method: 'POST', url: `/v1/notificaciones/${(await campana(martina)).items[0]!.id}/leer` });
    const r = await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/leer-todas' });
    expect([r.status, r.json]).toEqual([200, { marcadas: 2, sin_leer: 0 }]);
    expect((await campana(martina)).items.every((x) => x.leida)).toBe(true);
    expect((await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/leer-todas', payload: {} })).json).toEqual({ marcadas: 0, sin_leer: 0 });
    expect((await campana(camila)).sin_leer).toBe(1);
  });

  // ── Validación ─────────────────────────────────────────────────────────────
  it('NOT-078 CON-012 la query, los params y el cuerpo se validan en forma y fondo: 400 con el campo; sin sesión 401', async () => {
    const { martina } = await e.escena();
    const casos: [string, string][] = [
      ['?limite=0', 'limite'], ['?limite=51', 'limite'], ['?limite=abc', 'limite'], ['?limite=2.5', 'limite'], ['?limite=1e1', 'limite'],
      ['?limite=', 'limite'], ['?limite=-3', 'limite'], ['?limite=1&limite=2', 'limite'],
      ['?antes=ayer', 'antes'], ['?antes=2026-11-17', 'antes'], ['?antes=2026-11-17T10:00:00', 'antes'], ['?antes=2026-02-30T10:00:00Z', 'antes'],
      ['?pagina=2', 'pagina'],
    ];
    for (const [query, campo] of casos) {
      const r = await e.pedirComo(martina, { method: 'GET', url: `/v1/notificaciones${query}` });
      expect(r.status, query).toBe(400);
      expect([r.json.error.code, r.json.error.details.campo], query).toEqual(['VALIDATION_ERROR', campo]);
    }
    expect((await e.pedirComo(martina, { method: 'GET', url: '/v1/notificaciones?limite=50' })).status).toBe(200);
    const malId = await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/no-es-uuid/leer' });
    expect([malId.status, malId.json.error.details.campo]).toEqual([400, 'id']);
    const conCuerpo = await e.pedirComo(martina, { method: 'POST', url: '/v1/notificaciones/leer-todas', payload: { todas: true } });
    expect([conCuerpo.status, conCuerpo.json.error.details.campo]).toEqual([400, 'todas']);
    for (const [method, url] of [['GET', '/v1/notificaciones'], ['POST', '/v1/notificaciones/leer-todas'], ['POST', `/v1/notificaciones/${idv7()}/leer`]] as const) {
      expect((await e.pedir({ method, url })).status, url).toBe(401);
    }
  });

  it('NOT-079 la cuenta borrada se lleva sus notificaciones (ON DELETE CASCADE)', async () => {
    const { martina } = await e.escena();
    await dejar(martina, 'm:1', AHORA);
    await e.prisma.usuario.delete({ where: { id: martina.id } });
    expect(await e.prisma.notificacion.count()).toBe(0);
  });
});
