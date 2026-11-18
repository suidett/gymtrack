// Progreso: ejercicio, volumen, récords, medidas y fotos (plan-de-validacion.md, «Progreso,
// sugerencias y alertas»: INT-116 a INT-125, INT-148; SEG-016, SEG-028; P-02, P-30, P-53).
// La escena: Camila entrenadora, Martina vinculada a Camila (con consentimiento de fotos), Diego
// solo (sin consentimiento de fotos) y Rodrigo, entrenador sin clientes. Reloj: martes 17 de
// noviembre de 2026, 13:00 UTC (10:00 en Santiago).
import { expect, it } from 'vitest';
import { almacenamiento } from '../../src/modulos/progreso/almacenamiento';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, type PersonaDePrueba } from '../ayudas';
import { crearSesion, haceDias, series } from './datos';

const SENTADILLA = idEjercicioBase('sentadilla-trasera');
const BANCA = idEjercicioBase('press-de-banca');
const SEMANA = 7;

describeConBase('Progreso', () => {
  const e = usarEntornoApi();

  const pedirFoto = (p: PersonaDePrueba, extra: Record<string, unknown> = {}) =>
    e.pedirComo(p, { method: 'POST', url: '/v1/me/photos', payload: { tipo: 'frente', content_type: 'image/jpeg', bytes: 2048, ...extra } });

  /** Pide la URL y sube la foto con ella. Devuelve el id. */
  async function subirFoto(p: PersonaDePrueba, fecha: string, tipo = 'frente') {
    const r = await pedirFoto(p, { fecha, tipo });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    const u = new URL(r.json.subida.url);
    const s = await e.pedir({
      method: 'PUT', url: u.pathname + u.search, headers: { 'content-type': 'image/jpeg' }, payload: Buffer.alloc(1024, 7),
    });
    expect(s.status, JSON.stringify(s.json)).toBe(200);
    return r.json.id as string;
  }

  // ── Progreso de un ejercicio ────────────────────────────────────────────────
  it('INT-116 el progreso de la sentadilla trae un punto por sesión de las últimas 26 semanas', async () => {
    const { martina } = await e.escena();
    const semanas = [27, 25, 12, 3, 1];
    for (const [i, s] of semanas.entries()) {
      await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, s * SEMANA), series: series(3, { ejercicioId: SENTADILLA, pesoKg: 70 + i * 2.5, reps: 8 }) });
    }
    const r = await e.pedirComo(martina, { method: 'GET', url: `/v1/me/progress/exercises/${SENTADILLA}` });
    expect(r.status).toBe(200);
    expect(r.json.puntos).toHaveLength(4);
    expect(r.json.puntos[0].mejor_serie).toMatchObject({ peso_kg: 72.5, reps: 8 });
    // Epley: 80 × (1 + 8/30) = 101,3.
    expect(r.json.puntos.at(-1)).toMatchObject({ e1rm: 101.3, mejor_serie: { peso_kg: 80, reps: 8 } });
    expect(r.json.mejor.e1rm).toBe(101.3);
    expect(r.json.tipo_marca).toBe('e1rm');
  });

  // ── Volumen ─────────────────────────────────────────────────────────────────
  it('INT-117 volume?weeks=8 trae 8 semanas de lunes a domingo, dos en 0, con la variación', async () => {
    const { martina } = await e.escena();
    const sesiones: [string, number][] = [
      ['2026-09-30T20:00:00Z', 1000], ['2026-10-07T20:00:00Z', 1200], ['2026-10-21T20:00:00Z', 1500],
      ['2026-10-28T20:00:00Z', 1500], ['2026-11-04T20:00:00Z', 1800], ['2026-11-16T12:00:00Z', 900],
    ];
    for (const [cuando, volumen] of sesiones) {
      await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: cuando, volumenKg: volumen, series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    }
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/progress/volume', query: { weeks: '8' } });
    expect(r.status).toBe(200);
    expect(r.json.timezone).toBe('America/Santiago');
    expect(r.json.semanas.map((s: any) => s.inicio)).toEqual([
      '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16',
    ]);
    expect(r.json.semanas.map((s: any) => s.volumen_kg)).toEqual([1000, 1200, 0, 1500, 1500, 1800, 0, 900]);
    expect(r.json.semanas.map((s: any) => s.variacion_pct)).toEqual([null, 20, -100, null, 0, 20, -100, null]);
    expect(r.json.semanas.at(-1)).toMatchObject({ en_curso: true, fin: '2026-11-22' });
  });

  it('INT-117 una sesión del domingo a las 23:30 de Santiago cuenta en esa semana, no en la siguiente', async () => {
    const { martina } = await e.escena();
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: '2026-11-16T02:30:00Z', volumenKg: 500, series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/progress/volume', query: { weeks: '2' } });
    expect(r.json.semanas.map((s: any) => [s.inicio, s.volumen_kg])).toEqual([['2026-11-09', 500], ['2026-11-16', 0]]);
  });

  it('INT-118 weeks=0 y weeks=53 dan 400', async () => {
    const { martina } = await e.escena();
    for (const weeks of ['0', '53']) {
      const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/progress/volume', query: { weeks } });
      expect(r.status).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
    }
  });

  // ── Récords ─────────────────────────────────────────────────────────────────
  it('INT-119 GET /me/prs trae un récord vigente por ejercicio y tipo, con fecha y diferencia', async () => {
    const { martina } = await e.escena();
    await e.prisma.recordPersonal.createMany({
      data: [
        { alumnoId: martina.id, ejercicioId: BANCA, tipo: 'e1rm', valor: 60, fecha: haceDias(AHORA, 20), superadoAt: haceDias(AHORA, 1) },
        { alumnoId: martina.id, ejercicioId: BANCA, tipo: 'e1rm', valor: 63.3, fecha: haceDias(AHORA, 1) },
        { alumnoId: martina.id, ejercicioId: SENTADILLA, tipo: 'e1rm', valor: 80, fecha: haceDias(AHORA, 7) },
      ],
    });
    const r = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/prs' });
    expect(r.status).toBe(200);
    expect(r.json.items).toHaveLength(2);
    expect(r.json.items.find((x: any) => x.exercise_id === BANCA)).toMatchObject({ nombre: 'Press de banca', valor: 63.3, anterior: 60, diferencia: 3.3 });
    expect(r.json.items.find((x: any) => x.exercise_id === SENTADILLA)).toMatchObject({ valor: 80, anterior: null, diferencia: null });
  });

  // ── Medidas ─────────────────────────────────────────────────────────────────
  it('INT-120 con 2 registros de peso la tendencia es null; con 3 aparece el cambio a 30 días (P-30)', async () => {
    const { diego } = await e.escena();
    for (const [fecha, peso_kg] of [['2026-10-15', 80], ['2026-10-20', 79]] as const) {
      expect((await e.pedirComo(diego, { method: 'POST', url: '/v1/me/body-metrics', payload: { fecha, peso_kg } })).status).toBe(201);
    }
    let r = await e.pedirComo(diego, { method: 'GET', url: '/v1/me/body-metrics' });
    expect(r.json.items).toHaveLength(2);
    expect(r.json.tendencia).toBeNull();
    await e.pedirComo(diego, { method: 'POST', url: '/v1/me/body-metrics', payload: { fecha: '2026-11-15', peso_kg: 78 } });
    r = await e.pedirComo(diego, { method: 'GET', url: '/v1/me/body-metrics' });
    expect(r.json.items.map((m: any) => m.fecha)).toEqual(['2026-11-15', '2026-10-20', '2026-10-15']);
    expect(r.json.tendencia.peso_kg).toEqual({ actual: 78, fecha: '2026-11-15', referencia: 80, fecha_referencia: '2026-10-15', cambio: -2 });
    expect(r.json.tendencia.cintura_cm).toBeNull();
  });

  it('INT-121 dos pesos del mismo día dejan una fila; 23:30 y 00:30 de Santiago caen en días distintos', async () => {
    const { martina } = await e.escena();
    const pesar = (peso_kg: number, medido_at: string) =>
      e.pedirComo(martina, { method: 'POST', url: '/v1/me/body-metrics', payload: { peso_kg, medido_at } });
    expect((await pesar(62, '2026-11-17T08:00:00-03:00')).status).toBe(201);
    const segunda = await pesar(61.5, '2026-11-17T21:00:00-03:00');
    expect(segunda.status).toBe(200);
    expect(segunda.json).toMatchObject({ fecha: '2026-11-17', peso_kg: 61.5 });
    expect((await pesar(62.2, '2026-11-15T23:30:00-03:00')).json.fecha).toBe('2026-11-15');
    expect((await pesar(62.1, '2026-11-16T00:30:00-03:00')).json.fecha).toBe('2026-11-16');
    const filas = await e.prisma.medidaCorporal.findMany({ where: { alumnoId: martina.id }, orderBy: { fecha: 'asc' } });
    expect(filas.map((f) => f.pesoKg)).toEqual([62.2, 62.1, 61.5]);
  });

  it('INT-122 peso -1 o cintura 0 dan 400; la entrenadora no registra medidas (PERM-16)', async () => {
    const { camila, martina } = await e.escena();
    for (const payload of [{ peso_kg: -1 }, { cintura_cm: 0 }, {}]) {
      const r = await e.pedirComo(martina, { method: 'POST', url: '/v1/me/body-metrics', payload });
      expect(r.status).toBe(400);
    }
    const r = await e.pedirComo(camila, { method: 'POST', url: '/v1/me/body-metrics', payload: { peso_kg: 70 } });
    expect(r.status).toBe(403);
    expect(r.json.error.code).toBe('FORBIDDEN');
    expect(await e.prisma.medidaCorporal.count()).toBe(0);
  });

  // ── Fotos ───────────────────────────────────────────────────────────────────
  it('INT-123 Martina recibe una URL de 15 minutos; Diego sin consentimiento recibe 422 CONSENT_REQUIRED', async () => {
    const { martina, diego } = await e.escena();
    const r = await pedirFoto(martina);
    expect(r.status).toBe(201);
    expect(r.json.subida).toMatchObject({ metodo: 'PUT', headers: { 'content-type': 'image/jpeg' } });
    expect(new Date(r.json.subida.vence_at).getTime() - new Date(AHORA).getTime()).toBe(15 * 60_000);
    const d = await pedirFoto(diego);
    expect(d.status).toBe(422);
    expect(d.json.error.code).toBe('CONSENT_REQUIRED');
    expect(await e.prisma.fotoProgreso.count({ where: { alumnoId: diego.id } })).toBe(0);
  });

  it('SEG-028 la primera foto con consentimiento guarda la fecha y la versión de la política', async () => {
    const { diego } = await e.escena();
    const r = await pedirFoto(diego, { consentimiento_fotos: true });
    expect(r.status).toBe(201);
    const perfil = await e.prisma.perfilAlumno.findUnique({ where: { usuarioId: diego.id } });
    expect(perfil?.consentimientoFotosAt?.toISOString()).toBe(AHORA);
    expect(perfil?.politicaVersion).toBe('1');
  });

  it('INT-124 Martina y Camila ven las 3 fotos subidas con URLs de 15 minutos; Rodrigo recibe 404 (P-53)', async () => {
    const { camila, martina } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    await subirFoto(martina, '2026-10-01');
    await subirFoto(martina, '2026-11-01', 'lado');
    await subirFoto(martina, '2026-11-15', 'espalda');
    // Pedida pero nunca subida: no aparece.
    await pedirFoto(martina, { fecha: '2026-11-16' });
    const propia = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/photos' });
    expect(propia.status).toBe(200);
    expect(propia.json.items.map((f: any) => f.fecha)).toEqual(['2026-11-15', '2026-11-01', '2026-10-01']);
    for (const f of propia.json.items) {
      expect(new Date(f.vence_at).getTime() - new Date(AHORA).getTime()).toBeLessThanOrEqual(15 * 60_000);
    }
    const deCamila = await e.pedirComo(camila, { method: 'GET', url: '/v1/me/photos', query: { client_id: martina.id } });
    expect(deCamila.status).toBe(200);
    expect(deCamila.json.items).toHaveLength(3);
    const deRodrigo = await e.pedirComo(rodrigo, { method: 'GET', url: '/v1/me/photos', query: { client_id: martina.id } });
    expect(deRodrigo.status).toBe(404);
  });

  it('SEG-016 la foto se ve con la URL firmada y da 403 sin firma o a los 16 minutos', async () => {
    const { martina } = await e.escena();
    await subirFoto(martina, '2026-11-15');
    const lista = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/photos' });
    const u = new URL(lista.json.items[0].url);
    const ok = await e.app.inject({ method: 'GET', url: u.pathname + u.search });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-type']).toBe('image/jpeg');
    expect(String(ok.headers['cache-control'])).not.toContain('public');
    expect(ok.rawPayload.length).toBe(1024);
    expect((await e.pedir({ method: 'GET', url: u.pathname })).status).toBe(403);
    e.reloj.avanzar('16m');
    expect((await e.pedir({ method: 'GET', url: u.pathname + u.search })).status).toBe(403);
  });

  it('INT-125 Camila no borra la foto (403), Diego recibe 404 y Martina la borra del almacenamiento', async () => {
    const { camila, martina, diego } = await e.escena();
    const id = await subirFoto(martina, '2026-11-15');
    const clave = (await e.prisma.fotoProgreso.findUniqueOrThrow({ where: { id } })).storageKey;
    expect(await almacenamiento().existe(clave)).toBe(true);
    expect((await e.pedirComo(camila, { method: 'DELETE', url: `/v1/me/photos/${id}` })).status).toBe(403);
    expect((await e.pedirComo(diego, { method: 'DELETE', url: `/v1/me/photos/${id}` })).status).toBe(404);
    const r = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/me/photos/${id}` });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ id, borrada: true });
    expect(await almacenamiento().existe(clave)).toBe(false);
    expect(await e.prisma.fotoProgreso.count()).toBe(0);
  });

  // ── El entrenador lee con ?client_id= (P-02) ────────────────────────────────
  it('INT-148 Camila con ?client_id= recibe lo mismo que Martina en progreso, volumen, PRs y medidas', async () => {
    const { camila, martina } = await e.escena();
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, 3), series: series(3, { ejercicioId: SENTADILLA, pesoKg: 80, reps: 6 }) });
    await e.prisma.recordPersonal.create({ data: { alumnoId: martina.id, ejercicioId: SENTADILLA, tipo: 'e1rm', valor: 96, fecha: haceDias(AHORA, 3) } });
    await e.pedirComo(martina, { method: 'POST', url: '/v1/me/body-metrics', payload: { fecha: '2026-11-01', peso_kg: 62.4, cintura_cm: 71.5 } });
    const antes = await e.prisma.medidaCorporal.count();
    for (const url of [`/v1/me/progress/exercises/${SENTADILLA}`, '/v1/me/progress/volume', '/v1/me/prs', '/v1/me/body-metrics']) {
      const propia = await e.pedirComo(martina, { method: 'GET', url });
      const ajena = await e.pedirComo(camila, { method: 'GET', url, query: { client_id: martina.id } });
      expect(propia.status, url).toBe(200);
      expect(ajena.status, url).toBe(200);
      expect(ajena.json, url).toEqual(propia.json);
    }
    expect(await e.prisma.medidaCorporal.count()).toBe(antes);
  });

  it('P-02 sin client_id la entrenadora recibe 400; con un alumno ajeno, 404 para entrenador y alumno', async () => {
    const { camila, martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const sin = await e.pedirComo(camila, { method: 'GET', url: '/v1/me/prs' });
    expect(sin.status).toBe(400);
    expect(sin.json.error.details.campo).toBe('client_id');
    expect((await e.pedirComo(rodrigo, { method: 'GET', url: '/v1/me/prs', query: { client_id: martina.id } })).status).toBe(404);
    expect((await e.pedirComo(camila, { method: 'GET', url: '/v1/me/prs', query: { client_id: diego.id } })).status).toBe(404);
    expect((await e.pedirComo(martina, { method: 'GET', url: '/v1/me/body-metrics', query: { client_id: diego.id } })).status).toBe(404);
  });
});
