// Panel del entrenador: lista de clientes, ficha y terminar el vínculo (plan-de-validacion.md,
// «Vínculo entrenador y alumno»: INT-039 a INT-046, INT-049; SEG-015; PERM-01 a 04, PERM-32,
// PERM-34; P-16).
// La escena: Camila entrenadora con Martina (rutina de 4 días y una alerta abierta), Gonzalo (sin
// rutina) y Sofía (entrenó hoy a las 07:05 de Santiago). Diego anda solo y fue cliente de Camila.
// Rodrigo es otro entrenador. Reloj: martes 17 de noviembre de 2026, 10:00 en Santiago.
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { AHORA, describeConBase, desvincular, idEjercicioBase, usarEntornoApi, vincular } from '../ayudas';
import { crearRutina, crearSesion, haceDias, series } from '../progreso/datos';

const BANCA = idEjercicioBase('press-de-banca');
const SENTADILLA = idEjercicioBase('sentadilla-trasera');
const RUMANO = idEjercicioBase('peso-muerto-rumano');

describeConBase('Panel del entrenador', () => {
  const e = usarEntornoApi();

  async function cartera() {
    const { camila, martina, diego } = await e.escena();
    const [rodrigo, gonzalo, sofia] = await Promise.all([e.crear('rodrigo'), e.crear('gonzalo'), e.crear('sofia')]);
    await vincular(e.prisma, camila, gonzalo, '2026-11-16T15:00:00Z');
    await vincular(e.prisma, camila, sofia, '2026-09-01T15:00:00Z');
    // Diego fue cliente de Camila y se desvinculó.
    await vincular(e.prisma, camila, diego, '2026-09-01T15:00:00Z');
    await desvincular(e.prisma, diego, haceDias(AHORA, 3));
    const rutinaMartina = await crearRutina(e.prisma, {
      duenoId: camila.id, alumnoId: martina.id, nombre: 'Fuerza 4 días',
      dias: ['Empuje A', 'Tirón A', 'Empuje B', 'Tirón B'].map((nombre) => ({ nombre, ejercicios: [{ slug: 'press-de-banca' }] })),
    });
    const rutinaSofia = await crearRutina(e.prisma, {
      duenoId: camila.id, alumnoId: sofia.id, nombre: 'Cuerpo completo 3 días',
      dias: ['Día 1', 'Día 2', 'Día 3'].map((nombre) => ({ nombre, ejercicios: [{ slug: 'sentadilla-trasera' }] })),
    });
    await crearSesion(e.prisma, {
      alumnoId: sofia.id, iniciadaAt: '2026-11-17T10:05:00Z', cerradaAt: '2026-11-17T11:00:00Z', rutinaId: rutinaSofia.id,
      diaRutinaId: rutinaSofia.dias[0]!.id, series: series(3, { ejercicioId: SENTADILLA, pesoKg: 50, reps: 8 }),
    });
    await e.prisma.alerta.create({
      data: { alumnoId: martina.id, entrenadorId: camila.id, tipo: 'estancamiento', ejercicioId: RUMANO, createdAt: new Date('2026-11-10T12:00:00Z') },
    });
    return { camila, martina, diego, rodrigo, gonzalo, sofia, rutinaMartina };
  }

  const lista = (p: Parameters<typeof e.pedirComo>[0], query: Record<string, string> = {}) =>
    e.pedirComo(p, { method: 'GET', url: '/v1/trainer/clients', query });
  const ficha = (p: Parameters<typeof e.pedirComo>[0], id: string) => e.pedirComo(p, { method: 'GET', url: `/v1/trainer/clients/${id}` });

  // ── Lista ───────────────────────────────────────────────────────────────────
  it('INT-039 Camila ve a sus 3 clientes activos con estado, adherencia, alertas, entrena hoy y sin rutina', async () => {
    const { camila, martina, gonzalo, sofia } = await cartera();
    const r = await lista(camila);
    expect(r.status).toBe(200);
    expect(r.json.items.map((c: any) => c.nombre)).toEqual(['Gonzalo', 'Martina', 'Sofía']);
    const de = (id: string) => r.json.items.find((c: any) => c.id === id);
    expect(de(gonzalo.id)).toMatchObject({ sin_rutina: true, rutina: null, adherencia_semana: { pct: null, planificadas: 0 }, alertas_abiertas: 0 });
    expect(de(martina.id)).toMatchObject({
      sin_rutina: false, rutina: { nombre: 'Fuerza 4 días', dias_por_semana: 4 }, alertas_abiertas: 1, alertas_nuevas: 1, revisar: true,
      adherencia_semana: { semana_inicio: '2026-11-16', hechas: 0, planificadas: 4, pct: 0 }, entrena_hoy: false,
    });
    expect(de(sofia.id)).toMatchObject({
      entrena_hoy: true, ultima_sesion: { iniciada_at: '2026-11-17T10:05:00.000Z', estado: 'cerrada', dia_nombre: 'Día 1' },
      adherencia_semana: { hechas: 1, planificadas: 3, pct: 33 }, revisar: false,
    });
    expect(r.json.resumen).toEqual({
      activos: 3, entrenan_hoy: 1, sin_rutina: 1, alertas_abiertas: 1, alertas_nuevas: 1,
      adherencia_semana_pct: 14, sesiones_hechas: 1, sesiones_planificadas: 7,
    });
    expect(r.json.next_cursor).toBeNull();
  });

  it('INT-039 busca sin tildes, filtra por sin rutina y pagina con cursor', async () => {
    const { camila, gonzalo, sofia } = await cartera();
    expect((await lista(camila, { q: 'sofia' })).json.items.map((c: any) => c.id)).toEqual([sofia.id]);
    expect((await lista(camila, { filtro: 'sin_rutina' })).json.items.map((c: any) => c.id)).toEqual([gonzalo.id]);
    expect((await lista(camila, { filtro: 'revisar' })).json.items.map((c: any) => c.nombre)).toEqual(['Martina']);
    expect((await lista(camila, { filtro: 'hoy' })).json.items.map((c: any) => c.nombre)).toEqual(['Sofía']);
    const p1 = await lista(camila, { limit: '2' });
    expect(p1.json.items).toHaveLength(2);
    const p2 = await lista(camila, { limit: '2', cursor: p1.json.next_cursor });
    expect(p2.json.items.map((c: any) => c.nombre)).toEqual(['Sofía']);
    expect(p2.json.next_cursor).toBeNull();
  });

  it('INT-040 Rodrigo sin clientes recibe items vacío y next_cursor null', async () => {
    const { rodrigo } = await cartera();
    const r = await lista(rodrigo);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ items: [], next_cursor: null, resumen: { activos: 0, adherencia_semana_pct: null } });
  });

  // ── Ficha ───────────────────────────────────────────────────────────────────
  it('INT-041 la ficha de Martina trae rutina, últimas sesiones, PRs, medidas, encuesta y la alerta abierta', async () => {
    const { camila, martina, rutinaMartina } = await cartera();
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: '2026-11-11T22:00:00Z', rutinaId: rutinaMartina.id, diaRutinaId: rutinaMartina.dias[1]!.id, series: series(3, { ejercicioId: BANCA, pesoKg: 40, reps: 8 }) });
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: '2026-11-13T22:00:00Z', rutinaId: rutinaMartina.id, diaRutinaId: rutinaMartina.dias[2]!.id, series: series(3, { ejercicioId: BANCA, pesoKg: 42.5, reps: 8 }) });
    await e.prisma.recordPersonal.create({ data: { alumnoId: martina.id, ejercicioId: SENTADILLA, tipo: 'e1rm', valor: 80, fecha: haceDias(AHORA, 7) } });
    await e.prisma.medidaCorporal.create({ data: { alumnoId: martina.id, fecha: new Date('2026-11-01'), pesoKg: 62.4, cinturaCm: 71.5 } });
    await e.prisma.respuestaEncuesta.create({ data: { alumnoId: martina.id, version: 1, respuestas: { objetivo: 'ganar_masa' }, completadaAt: new Date('2026-08-04T15:00:00Z') } });
    await e.prisma.observacion.create({ data: { autorId: martina.id, alumnoId: martina.id, tipo: 'dolor', ejercicioId: BANCA, texto: 'Molesta el hombro', dolorZona: 'hombro_derecho', dolorIntensidad: 4, createdAt: haceDias(AHORA, 4) } });
    await e.prisma.observacion.create({ data: { autorId: camila.id, alumnoId: martina.id, tipo: 'consejo', ejercicioId: BANCA, texto: 'Baja a 40 kg', createdAt: haceDias(AHORA, 3) } });

    const r = await ficha(camila, martina.id);
    expect(r.status).toBe(200);
    expect(r.json.cliente).toMatchObject({ id: martina.id, nombre: 'Martina', vinculado_at: '2026-08-04T13:00:00.000Z' });
    expect(r.json.rutina_activa).toMatchObject({ nombre: 'Fuerza 4 días', version: 2, metodo_progresion: 'doble_progresion', owner_id: camila.id });
    expect(r.json.rutina_activa.dias).toHaveLength(4);
    expect(r.json.ultimas_sesiones.map((s: any) => s.dia_nombre)).toEqual(['Empuje B', 'Tirón A']);
    expect(r.json.ultimas_sesiones[0]).toMatchObject({ series_completadas: 3, volumen_kg: 1020 });
    expect(r.json.mes).toEqual({ sesiones: 2, volumen_kg: 1980, prs: 1 });
    expect(r.json.prs).toEqual([expect.objectContaining({ nombre: 'Sentadilla trasera', valor: 80 })]);
    expect(r.json.medidas).toMatchObject({ registros: 1, tendencia: null, ultima: { fecha: '2026-11-01', peso_kg: 62.4 } });
    expect(r.json.encuesta).toMatchObject({ version: 1, completada_at: '2026-08-04T15:00:00.000Z', respuestas: { objetivo: 'ganar_masa' } });
    expect(r.json.alertas).toEqual([expect.objectContaining({ tipo: 'estancamiento', exercise: { id: RUMANO, nombre: 'Peso muerto rumano' }, created_at: '2026-11-10T12:00:00.000Z' })]);
    const dolor = r.json.observaciones.find((o: any) => o.tipo === 'dolor');
    expect(dolor).toMatchObject({ respondida: true, dolor_intensidad: 4, autor: { rol: 'client' } });
  });

  it('INT-042, INT-044 y SEG-015 Rodrigo recibe 404 con el mismo cuerpo que un id inventado', async () => {
    const { camila, martina, rodrigo } = await cartera();
    const ajena = await ficha(rodrigo, martina.id);
    const inventada = await ficha(camila, randomUUID());
    expect(ajena.status).toBe(404);
    expect(inventada.status).toBe(404);
    expect(ajena.json).toEqual(inventada.json);
    expect(ajena.json.error.code).toBe('NOT_FOUND');
    expect(ajena.headers['content-type']).toEqual(inventada.headers['content-type']);
  });

  it('INT-043 y PERM-34 la ficha de quien se desvinculó da 404 al instante', async () => {
    const { camila, diego, sofia } = await cartera();
    expect((await ficha(camila, diego.id)).status).toBe(404);
    expect((await ficha(camila, sofia.id)).status).toBe(200);
    await desvincular(e.prisma, sofia, new Date(AHORA));
    expect((await ficha(camila, sofia.id)).status).toBe(404);
  });

  // ── Terminar el vínculo ─────────────────────────────────────────────────────
  it('INT-045 Camila termina el vínculo de Martina: su historial queda con ella y la rutina se archiva (P-16)', async () => {
    const { camila, martina, rutinaMartina } = await cartera();
    await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, 2), rutinaId: rutinaMartina.id, series: [{ ejercicioId: BANCA, pesoKg: 40, reps: 8 }] });
    const r = await e.pedirComo(camila, { method: 'DELETE', url: `/v1/trainer/clients/${martina.id}` });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ client_id: martina.id, terminado_at: AHORA, rutinas_archivadas: 1 });
    const v = await e.prisma.vinculoEntrenador.findFirstOrThrow({ where: { alumnoId: martina.id, entrenadorId: camila.id } });
    expect(v).toMatchObject({ estado: 'terminado', terminadoAt: new Date(AHORA) });
    expect((await ficha(camila, martina.id)).status).toBe(404);
    expect(await e.prisma.sesionEntreno.count({ where: { alumnoId: martina.id } })).toBe(1);
    const rutina = await e.prisma.rutina.findUniqueOrThrow({ where: { id: rutinaMartina.id } });
    expect(rutina).toMatchObject({ duenoId: camila.id, estado: 'archivada' });
    const perfil = await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: martina.id } });
    expect(perfil).toMatchObject({ entrenadorId: null, rutinaActivaId: null });
    expect((await lista(camila)).json.items.map((c: any) => c.nombre)).toEqual(['Gonzalo', 'Sofía']);
  });

  it('INT-046 Rodrigo no puede terminar el vínculo de Martina (404) y sigue activo', async () => {
    const { martina, rodrigo } = await cartera();
    const r = await e.pedirComo(rodrigo, { method: 'DELETE', url: `/v1/trainer/clients/${martina.id}` });
    expect(r.status).toBe(404);
    expect(await e.prisma.vinculoEntrenador.count({ where: { alumnoId: martina.id, estado: 'activo' } })).toBe(1);
  });

  it('INT-049 Martina y Diego reciben 403 en las rutas de entrenador y nada cambia (PERM-02, PERM-03, PERM-32)', async () => {
    const { martina, diego, sofia } = await cartera();
    for (const p of [martina, diego]) {
      expect((await lista(p)).status).toBe(403);
      expect((await ficha(p, sofia.id)).status).toBe(403);
      expect((await e.pedirComo(p, { method: 'DELETE', url: `/v1/trainer/clients/${sofia.id}` })).status).toBe(403);
    }
    expect(await e.prisma.vinculoEntrenador.count({ where: { estado: 'activo' } })).toBe(3);
  });
});
