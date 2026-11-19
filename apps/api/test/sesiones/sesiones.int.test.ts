// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de sesiones · Zona: Pruebas (API)
//
// Qué hace: las pruebas de integración de Entrenar y sincronizar (INT-083 a INT-113, INT-147,
// INT-155, SYNC-009 y SYNC-010) contra PostgreSQL: Hoy, iniciar con id del celular, series
// idempotentes, cierre con PRs, kcal y sugerencias, descartar, la cola sin señal, historial y
// observaciones, más los casos sin permiso.
// Tócalo cuando: cambie una regla del módulo sesiones.
// No lo toques para: pruebas de otros módulos.
// Depende de: test/ayudas.
// ─────────────────────────────────────────────────────────────────────────────
import { expect, it } from 'vitest';
import { describeConBase, idEjercicioBase, usarEntornoApi, uuidV7Fijo, type PersonaDePrueba } from '../ayudas';
import type { BaseDeDatos } from '../../src/db';

const PRESS = idEjercicioBase('press-de-banca');
const REMO = idEjercicioBase('remo-con-barra');
let n = 0;
const idv7 = () => uuidV7Fijo('2026-11-17T12:00:00.000Z', `prueba-sesiones:${++n}`);

/** Rutina activa de Camila para Martina (o propia del alumno) con un día «Empuje A» de dos ejercicios. */
async function rutinaPara(prisma: BaseDeDatos, dueno: PersonaDePrueba, alumno: PersonaDePrueba) {
  const r = await prisma.rutina.create({
    data: {
      duenoId: dueno.id, alumnoId: alumno.id, nombre: 'Fuerza 4 días', semanas: 8, estado: 'activa', version: 2,
      activadaAt: new Date('2026-10-20T13:00:00.000Z'),
      dias: {
        create: [
          { orden: 0, nombre: 'Empuje A', ejercicios: { create: [
            { ejercicioId: PRESS, orden: 0, series: 3, repsMin: 8, repsMax: 10, incrementoKg: 2.5 },
            { ejercicioId: REMO, orden: 1, series: 3, repsMin: 8, repsMax: 10, incrementoKg: 2.5 },
          ] } },
          { orden: 1, nombre: 'Tirón A', ejercicios: { create: [{ ejercicioId: REMO, orden: 0, series: 3, repsMin: 8, repsMax: 10, incrementoKg: 2.5 }] } },
        ],
      },
    },
    include: { dias: { orderBy: { orden: 'asc' }, include: { ejercicios: { orderBy: { orden: 'asc' } } } } },
  });
  await prisma.perfilAlumno.upsert({ where: { usuarioId: alumno.id }, create: { usuarioId: alumno.id, rutinaActivaId: r.id }, update: { rutinaActivaId: r.id } });
  return { rutina: r, empuje: r.dias[0]!, tiron: r.dias[1]! };
}

const serie = (re: { id: string; ejercicioId: string }, serieN: number, peso: number, reps: number, extra: Record<string, unknown> = {}) => ({
  id: idv7(), exercise_id: re.ejercicioId, routine_exercise_id: re.id, serie_n: serieN, peso_kg: peso, reps, rir: 2, completada: true, ...extra,
});

describeConBase('Sesiones', () => {
  const e = usarEntornoApi();

  async function iniciar(p: PersonaDePrueba, diaId: string | null, id = idv7()) {
    return e.pedirComo(p, { method: 'POST', url: '/v1/sessions', payload: { id, routine_day_id: diaId, iniciada_at: '2026-11-17T12:15:00.000Z', device_id: 'telefono-a' } });
  }

  it('INT-087 PERM-17 crear con el id del celular da 201 y repetirlo da 200 con una sola fila', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const id = idv7();
    const a = await iniciar(martina, empuje.id, id);
    expect(a.status).toBe(201);
    expect(a.json.estado).toBe('en_curso');
    expect(a.json.routine_version).toBe(2);
    const b = await iniciar(martina, empuje.id, id);
    expect(b.status).toBe(200);
    expect(b.json.id).toBe(id);
    expect(await e.prisma.sesionEntreno.count()).toBe(1);
  });

  it('INT-088 P-17 con una sesión en curso, otra con id distinto da 409 SESSION_IN_PROGRESS', async () => {
    const { camila, martina } = await e.escena();
    const { empuje, tiron } = await rutinaPara(e.prisma, camila, martina);
    await iniciar(martina, empuje.id);
    const a = await iniciar(martina, tiron.id);
    const b = await iniciar(martina, empuje.id);
    expect([a.status, a.json.error.code]).toEqual([409, 'SESSION_IN_PROGRESS']);
    expect([b.status, b.json.error.code]).toEqual([409, 'SESSION_IN_PROGRESS']);
  });

  it('INT-089 PERM-16 día de una rutina ajena da 404 y la entrenadora recibe 403', async () => {
    const { camila, martina, diego } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, diego, diego);
    expect((await iniciar(martina, empuje.id)).status).toBe(404);
    const c = await iniciar(camila, null);
    expect([c.status, c.json.error.code]).toEqual([403, 'FORBIDDEN']);
  });

  it('INT-090 un UUID v4 o un texto como id da 400', async () => {
    const { martina } = await e.escena();
    expect((await iniciar(martina, null, '3b241101-e2bb-4255-8caf-4136c566a962')).status).toBe(400);
    expect((await iniciar(martina, null, 'no-es-uuid')).status).toBe(400);
  });

  it('INT-091 INT-092 series: RPE y e1RM calculados, y el mismo lote 3 veces no duplica', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    const re = empuje.ejercicios[0]!;
    const lote = { series: [serie(re, 1, 60, 8), serie(re, 2, 60, 13)] };
    for (let i = 0; i < 3; i++) {
      const r = await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${s.id}/sets`, payload: lote });
      expect(r.status).toBe(200);
    }
    const r = await e.pedirComo(martina, { method: 'GET', url: `/v1/sessions/${s.id}` });
    expect(r.json.series).toHaveLength(2);
    const [a, b] = r.json.series;
    expect([a.rpe, a.e1rm, b.e1rm]).toEqual([8, 76, null]);
  });

  it('INT-094 RIR 11, reps -1 o peso -5 dan 400 con el campo y no guardan nada', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    const re = empuje.ejercicios[0]!;
    for (const malo of [{ rir: 11 }, { reps: -1 }, { peso_kg: -5 }]) {
      const r = await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${s.id}/sets`, payload: { series: [serie(re, 1, 60, 8), { ...serie(re, 2, 60, 8), ...malo }] } });
      expect(r.status).toBe(400);
      expect(r.json.error.details.campo).toMatch(/^series\.1\./);
    }
    expect(await e.prisma.serie.count()).toBe(0);
  });

  it('INT-093 INT-096 INT-097 INT-098 INT-100 cierre: kcal, PR con anterior, sugerencias, y cerrar otra vez da lo mismo', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    await e.prisma.medidaCorporal.create({ data: { alumnoId: martina.id, fecha: new Date('2026-11-10'), pesoKg: 62 } });
    await e.prisma.recordPersonal.create({ data: { alumnoId: martina.id, ejercicioId: PRESS, tipo: 'e1rm', valor: 60, fecha: new Date('2026-11-01T13:00:00Z') } });
    const s = (await iniciar(martina, empuje.id)).json;
    const [press, remo] = empuje.ejercicios;
    await e.pedirComo(martina, {
      method: 'PUT', url: `/v1/sessions/${s.id}/sets`,
      payload: { series: [serie(press!, 1, 50, 8), serie(remo!, 1, 40, 10), serie(press!, 2, 45, 8, { completada: false }), serie({ id: null as never, ejercicioId: idEjercicioBase('curl-con-barra') }, 1, 20, 10, { routine_exercise_id: null })] },
    });
    const cuerpo = { cerrada_at: '2026-11-17T13:00:00.000Z', duracion_s: 2718, observacion: 'Molestia leve', dolor_general: { zona: 'hombro_derecho', intensidad: 3 }, device_id: 'telefono-a' };
    const r = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: cuerpo });
    expect(r.status).toBe(200);
    expect(r.json.session).toMatchObject({ estado: 'cerrada', series_completadas: 3, volumen_kg: 1000, kcal_estimadas: 234, duracion_s: 2718 });
    const prPress = r.json.prs.find((p: { exercise_id: string }) => p.exercise_id === PRESS);
    expect(prPress).toMatchObject({ tipo: 'e1rm', valor: 63.3, anterior: 60 });
    expect(await e.prisma.recordPersonal.count({ where: { ejercicioId: PRESS, valor: 60, superadoAt: { not: null } } })).toBe(1);
    expect(r.json.sugerencias).toHaveLength(2);
    expect(await e.prisma.sugerenciaProgresion.count({ where: { sesionId: s.id, estado: 'pendiente' } })).toBe(2);
    expect(r.json.proxima_sesion.nombre).toBe('Tirón A');
    expect(await e.prisma.serie.count({ where: { sesionId: s.id } })).toBe(3);

    const otra = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: cuerpo });
    expect(otra.status).toBe(200);
    expect(otra.json).toEqual(r.json);
    expect(await e.prisma.recordPersonal.count({ where: { sesionId: s.id } })).toBe(r.json.prs.length);

    const tarde = await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${s.id}/sets`, payload: { series: [serie(press!, 3, 50, 8)] } });
    expect(tarde.status).toBe(409);
    expect(tarde.json.error).toEqual({ code: 'SESSION_CLOSED', message: 'La sesión ya está cerrada y no se puede editar', details: { session_id: s.id } });
  });

  it('INT-102 dolor general de intensidad 7 crea la alerta de dolor para Camila en el cierre', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    const r = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z', dolor_general: { zona: 'rodilla', intensidad: 7 } } });
    expect(r.status).toBe(200);
    expect(r.json.alertas_creadas).toEqual([{ tipo: 'dolor', exercise_id: null, nombre: null }]);
    expect(await e.prisma.alerta.count({ where: { entrenadorId: camila.id, tipo: 'dolor' } })).toBe(1);
  });

  it('INT-101 INT-103 INT-104 descartar: sale del historial; cerrar una descartada da 409; la de Diego da 404', async () => {
    const { camila, martina, diego } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    const d = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/discard` });
    expect([d.status, d.json.estado]).toEqual([200, 'descartada']);
    const c = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z' } });
    expect([c.status, c.json.error.code]).toEqual([409, 'SESSION_DISCARDED']);
    const h = await e.pedirComo(martina, { method: 'GET', url: '/v1/sessions' });
    expect(h.json.items).toHaveLength(0);
    expect((await iniciar(martina, empuje.id)).status).toBe(201);
    const deDiego = (await iniciar(diego, null)).json;
    expect((await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${deDiego.id}/discard` })).status).toBe(404);
  });

  it('INT-086 PERM-37 la entrenadora no tiene Hoy; INT-084 sin rutina dice si espera o anda sola', async () => {
    const { camila, martina, diego } = await e.escena();
    expect((await e.pedirComo(camila, { method: 'GET', url: '/v1/me/today' })).status).toBe(403);
    const m = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/today' });
    expect([m.status, m.json.estado, m.json.rutina]).toEqual([200, 'espera_entrenador', null]);
    const d = await e.pedirComo(diego, { method: 'GET', url: '/v1/me/today' });
    expect([d.json.estado, d.json.entrenador]).toEqual(['sin_rutina', null]);
  });

  it('INT-083 INT-085 INT-155 Hoy trae el día, la sugerencia y la sesión en curso; iniciar usa la sugerencia', async () => {
    const { camila, martina } = await e.escena();
    const { empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${s.id}/sets`, payload: { series: [serie(empuje.ejercicios[0]!, 1, 45, 10)] } });
    await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: { cerrada_at: '2026-11-17T12:50:00.000Z' } });
    // El ciclo sigue con Tirón A; para la prueba se vuelve a Empuje A con un día fijo de hoy (martes).
    await e.prisma.diaRutina.update({ where: { id: empuje.id }, data: { diaSemana: 2 } });
    const hoy = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/today' });
    expect(hoy.status).toBe(200);
    expect(hoy.json).toMatchObject({ estado: 'normal', fecha: '2026-11-17', racha_dias: 1, rutina: { nombre: 'Fuerza 4 días', semana: 5 } });
    expect(hoy.json.dia.nombre).toBe('Empuje A');
    expect(hoy.json.dia.ejercicios[0].sugerencia).toMatchObject({ estado: 'pendiente', peso_kg: 45 });
    expect(hoy.json.mes.sesiones).toBe(1);
    const otra = (await iniciar(martina, empuje.id)).json;
    expect(await e.prisma.sugerenciaProgresion.count({ where: { estado: 'aplicada' } })).toBe(1);
    const enCurso = await e.pedirComo(martina, { method: 'GET', url: '/v1/me/today' });
    expect([enCurso.json.estado, enCurso.json.sesion_en_curso.id]).toEqual(['en_curso', otra.id]);
  });

  it('INT-105 INT-106 SYNC-009 SYNC-010 la cola: aceptadas, la inválida rechazada, reintento ya_estaba y otro teléfono descartada_conflicto', async () => {
    const { camila, martina } = await e.escena();
    const { empuje, tiron } = await rutinaPara(e.prisma, camila, martina);
    const sesion = (dia: typeof empuje, inicio: string, extra: Record<string, unknown> = {}) => ({
      id: idv7(), routine_day_id: dia.id, iniciada_at: inicio, cerrada_at: inicio.replace('T12', 'T13'), device_id: 'telefono-a',
      series: [serie(dia.ejercicios[0]!, 1, 40, 9)], ...extra,
    });
    const a = sesion(empuje, '2026-11-12T12:00:00.000Z');
    const b = sesion(tiron, '2026-11-13T12:00:00.000Z', { series: [serie(tiron.ejercicios[0]!, 1, 40, 9, { rir: 11 })] });
    const c = sesion(tiron, '2026-11-14T12:00:00.000Z');
    const r = await e.pedirComo(martina, { method: 'POST', url: '/v1/sync/sessions', payload: { sesiones: [c, b, a] } });
    expect(r.status).toBe(200);
    const porId = Object.fromEntries(r.json.resultados.map((x: { id: string; resultado: string }) => [x.id, x.resultado]));
    expect(porId).toEqual({ [a.id]: 'aceptada', [b.id]: 'rechazada', [c.id]: 'aceptada' });
    expect(r.json.resultados[0].id).toBe(a.id);

    const otraVez = await e.pedirComo(martina, { method: 'POST', url: '/v1/sync/sessions', payload: { sesiones: [a] } });
    expect(otraVez.json.resultados[0].resultado).toBe('ya_estaba');
    const telefonoB = await e.pedirComo(martina, { method: 'POST', url: '/v1/sync/sessions', payload: { sesiones: [{ ...a, device_id: 'telefono-b' }] } });
    expect(telefonoB.json.resultados[0].resultado).toBe('descartada_conflicto');
    expect(await e.prisma.sesionEntreno.count()).toBe(2);
    expect(await e.prisma.sugerenciaProgresion.count({ where: { sesionId: a.id } })).toBe(1);

    await iniciar(martina, empuje.id);
    const choque = await e.pedirComo(martina, { method: 'POST', url: '/v1/sync/sessions', payload: { sesiones: [sesion(empuje, '2026-11-16T12:00:00.000Z')] } });
    expect(choque.json.resultados[0]).toMatchObject({ resultado: 'rechazada', motivo: { code: 'SESSION_IN_PROGRESS' } });
  });

  it('INT-108 INT-109 PERM-04 PERM-05 historial y detalle: Martina y Camila sí, Rodrigo y Diego 404', async () => {
    const { camila, martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const s = (await iniciar(martina, null)).json;
    const mia = await e.pedirComo(martina, { method: 'GET', url: '/v1/sessions' });
    const deCamila = await e.pedirComo(camila, { method: 'GET', url: '/v1/sessions', query: { client_id: martina.id } });
    expect([mia.json.items.length, deCamila.json.items.length]).toEqual([1, 1]);
    expect((await e.pedirComo(rodrigo, { method: 'GET', url: '/v1/sessions', query: { client_id: martina.id } })).status).toBe(404);
    expect((await e.pedirComo(camila, { method: 'GET', url: `/v1/sessions/${s.id}` })).status).toBe(200);
    expect((await e.pedirComo(diego, { method: 'GET', url: `/v1/sessions/${s.id}` })).status).toBe(404);
  });

  it('INT-110 INT-111 INT-113 INT-147 observaciones: destinos, validación, rutina del entrenador, consejo y dolor fuerte', async () => {
    const { camila, martina } = await e.escena();
    const { rutina, empuje } = await rutinaPara(e.prisma, camila, martina);
    const s = (await iniciar(martina, empuje.id)).json;
    await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${s.id}/sets`, payload: { series: [serie(empuje.ejercicios[0]!, 1, 40, 9)] } });
    const setId = (await e.prisma.serie.findFirstOrThrow()).id;
    const obs = (payload: Record<string, unknown>, p = martina) => e.pedirComo(p, { method: 'POST', url: '/v1/observations', payload });
    expect((await obs({ texto: 'Buen agarre', exercise_id: PRESS })).status).toBe(201);
    expect((await obs({ texto: 'Pesada', session_id: s.id })).status).toBe(201);
    expect((await obs({ tipo: 'dolor', dolor_zona: 'hombro', texto: 'Hombro', set_id: setId, dolor_intensidad: 4 })).status).toBe(201);
    expect((await obs({ texto: 'Sin destino' })).status).toBe(400);
    expect((await obs({ tipo: 'dolor', dolor_zona: 'hombro', texto: 'x', exercise_id: PRESS, dolor_intensidad: 0 })).status).toBe(400);
    expect((await obs({ tipo: 'dolor', dolor_zona: 'hombro', texto: 'x', exercise_id: PRESS, dolor_intensidad: 11 })).status).toBe(400);
    expect((await obs({ texto: 'Sobre la rutina', routine_id: rutina.id })).status).toBe(403);
    expect((await obs({ tipo: 'consejo', texto: 'Hazlo así', exercise_id: PRESS })).status).toBe(422);
    expect((await obs({ tipo: 'consejo', texto: 'Cuida el hombro', exercise_id: PRESS, client_id: martina.id }, camila)).status).toBe(201);

    await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${s.id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z' } });
    expect((await obs({ texto: 'Después del cierre', session_id: s.id })).status).toBe(201);

    expect((await obs({ tipo: 'dolor', dolor_zona: 'hombro', texto: 'Fuerte', exercise_id: PRESS, dolor_intensidad: 6 })).status).toBe(201);
    expect(await e.prisma.alerta.count({ where: { tipo: 'dolor' } })).toBe(0);
    expect((await obs({ tipo: 'dolor', dolor_zona: 'hombro', texto: 'Muy fuerte', exercise_id: PRESS, dolor_intensidad: 7 })).status).toBe(201);
    expect(await e.prisma.alerta.count({ where: { tipo: 'dolor', entrenadorId: camila.id, ejercicioId: PRESS } })).toBe(1);

    const lista = await e.pedirComo(camila, { method: 'GET', url: '/v1/observations', query: { client_id: martina.id, exercise_id: PRESS } });
    expect(lista.status).toBe(200);
    expect(lista.json.items.map((o: { tipo: string }) => o.tipo).sort()).toEqual(['consejo', 'dolor', 'dolor', 'observacion']);
  });
});
