// Ejercicios: biblioteca, detalle y ejercicios propios (plan-de-validacion.md, «Ejercicios»:
// INT-050 a INT-059, INT-146, INT-152; SEG-013; P-07 y PERM-13 a 15, PERM-40).
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo; Rodrigo entrenador sin
// clientes. La base parte sembrada con la biblioteca de EJERCICIOS_BASE.
import { DETALLE_BASE, EJERCICIOS_BASE } from '@gymtrack/shared';
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { AHORA, describeConBase, idEjercicioBase, usarEntornoApi, type PersonaDePrueba } from '../ayudas';

describeConBase('Ejercicios', () => {
  const e = usarEntornoApi();

  // ── Ayudas ──────────────────────────────────────────────────────────────────
  const propio = (nombre: string, extra: Record<string, unknown> = {}) => ({
    nombre, grupo_muscular: 'Pecho', equipo: 'Barra', patron: 'empuje', tipo_carga: 'kg', incremento_default_kg: 2.5, ...extra,
  });

  async function crearPropio(p: PersonaDePrueba, nombre: string, extra: Record<string, unknown> = {}) {
    const r = await e.pedirComo(p, { method: 'POST', url: '/v1/exercises', payload: propio(nombre, extra) });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    return r.json;
  }

  async function listar(p: PersonaDePrueba, query: Record<string, string> = {}) {
    return e.pedirComo(p, { method: 'GET', url: '/v1/exercises', query: { limit: '100', ...query } });
  }

  /** Una sesión cerrada de ayer con una serie del ejercicio. */
  async function sesionCerradaCon(alumno: PersonaDePrueba, ejercicioId: string) {
    const ayer = new Date(new Date(AHORA).getTime() - 86_400_000);
    const sesionId = randomUUID();
    await e.prisma.sesionEntreno.create({
      data: { id: sesionId, alumnoId: alumno.id, iniciadaAt: ayer, cerradaAt: ayer, estado: 'cerrada' },
    });
    await e.prisma.serie.create({
      data: { id: randomUUID(), sesionId, alumnoId: alumno.id, ejercicioId, serieN: 1, pesoKg: 40, reps: 8, completada: true },
    });
    return sesionId;
  }

  // ── Lista ───────────────────────────────────────────────────────────────────
  it('INT-050 Martina pide grupo=Pecho&q=press: solo pecho con «press», sus propios que calzan y su PR', async () => {
    const { martina } = await e.escena();
    const pausa = await crearPropio(martina, 'Press con pausa');
    await crearPropio(martina, 'Puente de glúteo con banda', { grupo_muscular: 'Piernas', equipo: 'Banda', patron: 'cadera' });
    await e.prisma.recordPersonal.create({
      data: { alumnoId: martina.id, ejercicioId: idEjercicioBase('press-de-banca'), tipo: 'peso_max', valor: 47.5, fecha: new Date(AHORA) },
    });

    const r = await listar(martina, { grupo: 'Pecho', q: 'press' });
    expect(r.status).toBe(200);
    const items: any[] = r.json.items;
    expect(items.every((x) => x.grupo_muscular === 'Pecho' && /press/i.test(x.nombre))).toBe(true);
    const baseEsperados = EJERCICIOS_BASE.filter((x) => x.grupo === 'Pecho' && /press/i.test(x.nombre)).length;
    expect(items.filter((x) => x.base)).toHaveLength(baseEsperados);
    expect(items.find((x) => x.id === pausa.id)).toMatchObject({ propio: true, editable: true, owner_id: martina.id, musculos: null });
    // En la lista, cada uno de la base trae sus pasos y sus músculos principales.
    for (const x of items.filter((i) => i.base)) {
      expect(x.instrucciones?.split('\n').length, x.slug).toBeGreaterThanOrEqual(3);
      expect(x.musculos?.principales.length, x.slug).toBeGreaterThan(0);
    }
    expect(items.some((x) => x.nombre === 'Puente de glúteo con banda')).toBe(false);
    expect(items.find((x) => x.id === idEjercicioBase('press-de-banca'))?.pr).toMatchObject({ tipo: 'peso_max', valor: 47.5 });
    expect(r.json.next_cursor).toBeNull();
  });

  it('INT-051 páginas de 20 hasta el final: next_cursor en cada una, null en la última, sin repetidos ni faltantes', async () => {
    const { martina } = await e.escena();
    const vistos: string[] = [];
    let cursor: string | null = null;
    let paginas = 0;
    do {
      const r = await listar(martina, { limit: '20', ...(cursor ? { cursor } : {}) });
      expect(r.status).toBe(200);
      expect(r.json.items.length).toBeLessThanOrEqual(20);
      vistos.push(...r.json.items.map((x: any) => x.id));
      cursor = r.json.next_cursor;
      paginas += 1;
    } while (cursor && paginas < 20);
    expect(cursor).toBeNull();
    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos).toHaveLength(await e.prisma.ejercicio.count({ where: { duenoId: null } }));
    expect(paginas).toBe(Math.ceil(vistos.length / 20));
  });

  it('INT-053 grupo inexistente, limit=0 y cursor roto dan 400', async () => {
    const { martina } = await e.escena();
    const grupo = await listar(martina, { grupo: 'Piernasss' });
    const limite = await e.pedirComo(martina, { method: 'GET', url: '/v1/exercises', query: { limit: '0' } });
    const cursor = await listar(martina, { cursor: 'esto-no-es-un-cursor' });
    expect([grupo.status, limite.status, cursor.status]).toEqual([400, 400, 400]);
    expect(grupo.json.error.details.campo).toBe('grupo');
    expect(cursor.json.error.details.campo).toBe('cursor');
  });

  it('INT-146 filtros por equipo y por grupo con equipo; un equipo inexistente da 400', async () => {
    const { martina } = await e.escena();
    const mancuerna = await listar(martina, { equipo: 'Mancuerna' });
    expect(mancuerna.status).toBe(200);
    expect(mancuerna.json.items.length).toBe(EJERCICIOS_BASE.filter((x) => x.equipo === 'Mancuerna').length);
    expect(mancuerna.json.items.every((x: any) => x.equipo === 'Mancuerna')).toBe(true);

    const pechoBarra = await listar(martina, { grupo: 'Pecho', equipo: 'Barra' });
    const nombres = pechoBarra.json.items.map((x: any) => x.nombre).sort();
    expect(nombres).toEqual(EJERCICIOS_BASE.filter((x) => x.grupo === 'Pecho' && x.equipo === 'Barra').map((x) => x.nombre).sort());
    expect(nombres).toEqual(expect.arrayContaining(['Press de banca', 'Press de banca inclinado']));

    expect((await listar(martina, { equipo: 'Trampolín' })).status).toBe(400);
  });

  it('SEG-013 q con SQL, % y _ responde normal y busca como texto', async () => {
    const { martina } = await e.escena();
    const sql = await listar(martina, { q: "'; DROP TABLE users; --" });
    const porcentaje = await listar(martina, { q: '%' });
    const guion = await listar(martina, { q: '_' });
    expect([sql.status, porcentaje.status, guion.status]).toEqual([200, 200, 200]);
    expect(sql.json.items).toHaveLength(0);
    expect(porcentaje.json.items).toHaveLength(0);
    expect(guion.json.items).toHaveLength(0);
    expect(await e.prisma.usuario.count()).toBe(3);
  });

  it('PERM-38 sin token la biblioteca da 401', async () => {
    const r = await e.pedir({ method: 'GET', url: '/v1/exercises' });
    expect(r.status).toBe(401);
  });

  // ── Quién ve qué (P-07) ─────────────────────────────────────────────────────
  it('INT-052 el propio de Martina: Diego y Rodrigo no lo ven; Camila lo ve sin poder editarlo (P-07)', async () => {
    const { camila, martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const suyo = await crearPropio(martina, 'Press Zercher');
    const url = `/v1/exercises/${suyo.id}`;

    expect((await listar(diego, { q: 'zercher' })).json.items).toHaveLength(0);
    expect((await e.pedirComo(diego, { method: 'GET', url })).status).toBe(404);
    expect((await e.pedirComo(rodrigo, { method: 'GET', url })).status).toBe(404);
    expect((await listar(rodrigo, { q: 'zercher', client_id: martina.id })).status).toBe(404);

    const detalle = await e.pedirComo(camila, { method: 'GET', url });
    expect(detalle.status).toBe(200);
    expect(detalle.json).toMatchObject({ propio: false, editable: false, owner_id: martina.id });
    // Su lista es la base más los suyos; con ?client_id= ve también los de su alumna.
    expect((await listar(camila, { q: 'zercher' })).json.items).toHaveLength(0);
    expect((await listar(camila, { q: 'zercher', client_id: martina.id })).json.items.map((x: any) => x.id)).toEqual([suyo.id]);
    const editar = await e.pedirComo(camila, { method: 'PATCH', url, payload: { nombre: 'Otro' } });
    expect(editar.status).toBe(403);
    expect(editar.json.error.code).toBe('FORBIDDEN');
  });

  it('P-07 el alumno ve el ejercicio propio de su entrenadora solo si está en una rutina asignada a él', async () => {
    const { camila, martina } = await e.escena();
    const deCamila = await crearPropio(camila, 'Sentadilla con pausa', { grupo_muscular: 'Piernas', patron: 'rodilla' });
    const url = `/v1/exercises/${deCamila.id}`;
    expect((await e.pedirComo(martina, { method: 'GET', url })).status).toBe(404);

    const rutina = await e.pedirComo(camila, {
      method: 'POST', url: '/v1/routines',
      payload: {
        nombre: 'Pierna', semanas: 4, client_id: martina.id,
        dias: [{ nombre: 'Pierna A', ejercicios: [{ exercise_id: deCamila.id, series: 3, reps_min: 6, reps_max: 8 }] }],
      },
    });
    expect(rutina.status, JSON.stringify(rutina.json)).toBe(201);
    const ahora = await e.pedirComo(martina, { method: 'GET', url });
    expect(ahora.status).toBe(200);
    expect(ahora.json.editable).toBe(false);
    expect((await listar(martina, { q: 'pausa' })).json.items.map((x: any) => x.id)).toContain(deCamila.id);
  });

  // ── Detalle ─────────────────────────────────────────────────────────────────
  it('INT-054 detalle: el base da 200 con sus datos, pasos y músculos; el propio de Diego, 404 para Martina', async () => {
    const { martina, diego } = await e.escena();
    const deDiego = await crearPropio(diego, 'Remo con pausa', { grupo_muscular: 'Espalda', patron: 'tiron' });
    const base = await e.pedirComo(martina, { method: 'GET', url: `/v1/exercises/${idEjercicioBase('press-de-banca')}` });
    expect(base.status).toBe(200);
    expect(base.json).toMatchObject({ slug: 'press-de-banca', nombre: 'Press de banca', base: true, editable: false, owner_id: null });
    expect(Array.isArray(base.json.media)).toBe(true);
    // La técnica y los músculos salen de DETALLE_BASE (los visores 3D): un paso por línea.
    const detalle = DETALLE_BASE['press-de-banca']!;
    expect(base.json.instrucciones).toBe(detalle.pasos.join('\n'));
    expect(base.json.musculos).toEqual({ principales: [...detalle.trabajan], ayudan: [...detalle.ayudan] });
    expect(base.json.musculos.principales.length).toBeGreaterThan(0);
    expect((await e.pedirComo(martina, { method: 'GET', url: `/v1/exercises/${deDiego.id}` })).status).toBe(404);
    expect((await e.pedirComo(martina, { method: 'GET', url: `/v1/exercises/${randomUUID()}` })).status).toBe(404);
  });

  // ── Crear, editar y borrar ──────────────────────────────────────────────────
  it('INT-055 PERM-13 PERM-14 PERM-15 Camila, Martina y Diego crean un propio: 201 con su owner_id; la base no cambia', async () => {
    const { camila, martina, diego } = await e.escena();
    const antes = await e.prisma.ejercicio.count({ where: { duenoId: null } });
    for (const p of [camila, martina, diego]) {
      const r = await crearPropio(p, `Ejercicio de ${p.nombre}`);
      expect(r).toMatchObject({
        owner_id: p.id, propio: true, editable: true, base: false, slug: null, tipo_carga: 'kg', pr: null, musculos: null, instrucciones: null,
      });
    }
    expect(await e.prisma.ejercicio.count({ where: { duenoId: null } })).toBe(antes);
    expect(antes).toBe(EJERCICIOS_BASE.length);
  });

  it('CU-17 crear con un campo de más, un grupo inexistente o un incremento negativo da 400', async () => {
    const { martina } = await e.escena();
    const casos = [propio('X', { color: 'rojo' }), propio('X', { grupo_muscular: 'Glúteos' }), propio('X', { incremento_default_kg: -1 }), propio('')];
    for (const payload of casos) {
      const r = await e.pedirComo(martina, { method: 'POST', url: '/v1/exercises', payload });
      expect(r.status, JSON.stringify(payload)).toBe(400);
    }
    expect(await e.prisma.ejercicio.count({ where: { duenoId: martina.id } })).toBe(0);
  });

  it('INT-056 PERM-40 Martina edita el propio (200), uno de la base (403) y uno de Diego (404)', async () => {
    const { martina, diego } = await e.escena();
    const suyo = await crearPropio(martina, 'Press con pausa');
    const deDiego = await crearPropio(diego, 'Remo con pausa');
    const ok = await e.pedirComo(martina, {
      method: 'PATCH', url: `/v1/exercises/${suyo.id}`, payload: { nombre: 'Press con pausa larga', incremento_default_kg: 5, instrucciones: 'Pausa de 2 s en el pecho.' },
    });
    expect(ok.status).toBe(200);
    expect(ok.json).toMatchObject({ nombre: 'Press con pausa larga', incremento_default_kg: 5, instrucciones: 'Pausa de 2 s en el pecho.' });
    const base = await e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${idEjercicioBase('press-de-banca')}`, payload: { nombre: 'Mío' } });
    expect(base.status).toBe(403);
    const ajeno = await e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${deDiego.id}`, payload: { nombre: 'Mío' } });
    expect(ajeno.status).toBe(404);
    const vacio = await e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${suyo.id}`, payload: {} });
    expect(vacio.status).toBe(400);
    expect((await e.prisma.ejercicio.findUniqueOrThrow({ where: { id: idEjercicioBase('press-de-banca') } })).nombre).toBe('Press de banca');
    expect((await e.prisma.ejercicio.findUniqueOrThrow({ where: { id: deDiego.id } })).nombre).toBe('Remo con pausa');
  });

  it('INT-057 cambiar el tipo de carga de un propio con sesiones cerradas da 409 EXERCISE_HAS_HISTORY', async () => {
    const { martina } = await e.escena();
    const suyo = await crearPropio(martina, 'Press con pausa');
    await sesionCerradaCon(martina, suyo.id);
    const r = await e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${suyo.id}`, payload: { tipo_carga: 'tiempo' } });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('EXERCISE_HAS_HISTORY');
    expect((await e.prisma.ejercicio.findUniqueOrThrow({ where: { id: suyo.id } })).tipoCarga).toBe('kg');
    // El resto sí se puede cambiar.
    const nombre = await e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${suyo.id}`, payload: { nombre: 'Press pausado', tipo_carga: 'kg' } });
    expect(nombre.status).toBe(200);
  });

  it('INT-058 borrar un propio usado en una sesión vieja: 200, queda con deleted_at, sale de la lista y la sesión conserva su nombre', async () => {
    const { martina } = await e.escena();
    const suyo = await crearPropio(martina, 'Press con pausa');
    const sesionId = await sesionCerradaCon(martina, suyo.id);
    const r = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/exercises/${suyo.id}` });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ id: suyo.id, deleted_at: AHORA });
    expect((await e.prisma.ejercicio.findUniqueOrThrow({ where: { id: suyo.id } })).deletedAt).not.toBeNull();
    expect((await listar(martina, { q: 'pausa' })).json.items).toHaveLength(0);
    expect((await e.pedirComo(martina, { method: 'GET', url: `/v1/exercises/${suyo.id}` })).status).toBe(404);
    const serie = await e.prisma.serie.findFirstOrThrow({ where: { sesionId }, include: { ejercicio: true } });
    expect(serie.ejercicio.nombre).toBe('Press con pausa');
  });

  it('INT-059 borrar un propio que está en la rutina activa da 409 EXERCISE_IN_ACTIVE_ROUTINE (P-35)', async () => {
    const { martina } = await e.escena();
    const suyo = await crearPropio(martina, 'Press con pausa');
    const rutina = await e.pedirComo(martina, {
      method: 'POST', url: '/v1/routines',
      payload: { nombre: 'Mía', semanas: 4, dias: [{ nombre: 'Empuje', ejercicios: [{ exercise_id: suyo.id, series: 3, reps_min: 8, reps_max: 10 }] }] },
    });
    expect(rutina.status).toBe(201);
    expect((await e.pedirComo(martina, { method: 'POST', url: `/v1/routines/${rutina.json.id}/activate` })).status).toBe(200);
    const r = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/exercises/${suyo.id}` });
    expect(r.status).toBe(409);
    expect(r.json.error.code).toBe('EXERCISE_IN_ACTIVE_ROUTINE');
    expect((await e.prisma.ejercicio.findUniqueOrThrow({ where: { id: suyo.id } })).deletedAt).toBeNull();
  });

  it('INT-152 PERM-40 Martina borra uno de la base (403) y uno de Diego (404); los dos siguen para su dueño', async () => {
    const { martina, diego } = await e.escena();
    const deDiego = await crearPropio(diego, 'Remo con pausa');
    const base = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/exercises/${idEjercicioBase('press-de-banca')}` });
    const ajeno = await e.pedirComo(martina, { method: 'DELETE', url: `/v1/exercises/${deDiego.id}` });
    expect([base.status, ajeno.status]).toEqual([403, 404]);
    expect((await listar(diego, { q: 'Remo con pausa' })).json.items.map((x: any) => x.id)).toEqual([deDiego.id]);
    expect((await listar(diego, { q: 'Press de banca' })).json.items.map((x: any) => x.id)).toContain(idEjercicioBase('press-de-banca'));
  });
});
