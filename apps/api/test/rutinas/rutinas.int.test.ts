// Rutinas: crear, leer, editar, reemplazar días, asignar, activar, duplicar y archivar
// (plan-de-validacion.md, «Rutinas»: INT-063 a INT-082, INT-154, INT-156, INT-157; PERM-07 a 12,
// PERM-39, PERM-41; P-06, P-43, P-44, P-56).
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo. Rodrigo es otro
// entrenador sin clientes; Gonzalo hace de segunda clienta de Camila (Antonia en el plan) y Sofía
// de ex clienta (Valeria en el plan).
import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { AHORA, describeConBase, desvincular, idEjercicioBase, usarEntornoApi, vincular, type PersonaDePrueba } from '../ayudas';

describeConBase('Rutinas', () => {
  const e = usarEntornoApi();

  // ── Ayudas ──────────────────────────────────────────────────────────────────
  const DIAS_FUERZA: [string, string[]][] = [
    ['Empuje A', ['press-de-banca', 'press-de-banca-inclinado', 'press-con-mancuernas', 'aperturas-con-mancuernas']],
    ['Tirón A', ['peso-muerto-rumano', 'remo-con-barra', 'remo-con-mancuerna', 'remo-en-polea-baja']],
    ['Pierna A', ['sentadilla-trasera', 'sentadilla-bulgara', 'peso-muerto-rumano-mancuernas', 'sentadilla-goblet']],
    ['Empuje B', ['press-en-maquina', 'press-de-banca', 'aperturas-con-mancuernas', 'cruce-de-poleas']],
  ];

  const ej = (slug: string, extra: Record<string, unknown> = {}) => ({
    exercise_id: idEjercicioBase(slug), series: 4, reps_min: 8, reps_max: 10, rir_objetivo: 2, descanso_s: 120, incremento_kg: 2.5, ...extra,
  });

  function cuerpo(nombre: string, extra: Record<string, unknown> = {}, dias: [string, string[]][] = DIAS_FUERZA.slice(0, 1)) {
    return { nombre, semanas: 8, dias: dias.map(([n, slugs]) => ({ nombre: n, ejercicios: slugs.map((s) => ej(s)) })), ...extra };
  }

  async function crear(p: PersonaDePrueba, nombre: string, extra: Record<string, unknown> = {}, dias?: [string, string[]][]) {
    const r = await e.pedirComo(p, { method: 'POST', url: '/v1/routines', payload: cuerpo(nombre, extra, dias) });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    return r.json;
  }

  const pedir = (p: PersonaDePrueba, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, payload?: unknown) =>
    e.pedirComo(p, { method, url, ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }) });

  async function activar(p: PersonaDePrueba, id: string) {
    const r = await pedir(p, 'POST', `/v1/routines/${id}/activate`);
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    return r.json;
  }

  /** Sesiones cerradas de la rutina (con la versión que se indique). */
  async function sesiones(alumno: PersonaDePrueba, rutinaId: string, cuantas: number, version = 1) {
    for (let i = 0; i < cuantas; i++) {
      const cuando = new Date(new Date(AHORA).getTime() - (i + 1) * 86_400_000);
      await e.prisma.sesionEntreno.create({
        data: { id: randomUUID(), alumnoId: alumno.id, rutinaId, routineVersion: version, iniciadaAt: cuando, cerradaAt: cuando, estado: 'cerrada' },
      });
    }
  }

  // ── Crear ───────────────────────────────────────────────────────────────────
  it('INT-063 PERM-09 Diego crea «Fuerza 4 días»: 201 en borrador, con días y ejercicios en orden y doble progresión', async () => {
    const { diego } = await e.escena();
    const r = await crear(diego, 'Fuerza 4 días', {}, DIAS_FUERZA);
    expect(r).toMatchObject({
      nombre: 'Fuerza 4 días', estado: 'borrador', version: 1, semanas: 8, metodo_progresion: 'doble_progresion',
      owner_id: diego.id, client_id: diego.id, origen_id: null, activada_at: null, semana_actual: null,
      dueno: { id: diego.id, nombre: 'Diego', rol: 'client' },
      permisos: { editar: true, activar: true, asignar: false, archivar: true, duplicar: true },
    });
    expect(r.dias.map((d: any) => d.nombre)).toEqual(DIAS_FUERZA.map(([n]) => n));
    expect(r.dias.map((d: any) => d.orden)).toEqual([0, 1, 2, 3]);
    r.dias.forEach((d: any, i: number) => {
      expect(d.ejercicios.map((x: any) => x.exercise_id)).toEqual(DIAS_FUERZA[i]![1].map((s) => idEjercicioBase(s)));
      expect(d.ejercicios.map((x: any) => x.orden)).toEqual([0, 1, 2, 3]);
    });
    expect(r.dias[0].ejercicios[0]).toMatchObject({ series: 4, reps_min: 8, reps_max: 10, rir_objetivo: 2, descanso_s: 120, incremento_kg: 2.5, esquema: 'normal' });
    expect(r.dias[0].ejercicios[0].ejercicio).toMatchObject({ nombre: 'Press de banca', grupo_muscular: 'Pecho', tipo_carga: 'kg' });
  });

  it('CU-19 sin incremento se copia el del ejercicio; sin RIR ni descanso, 2 y 90 s; sin esquema, normal', async () => {
    const { diego } = await e.escena();
    const minimo = { exercise_id: idEjercicioBase('sentadilla-goblet'), series: 3, reps_min: 10, reps_max: 12 };
    const r = await pedir(diego, 'POST', '/v1/routines', { nombre: 'Corta', semanas: 4, dias: [{ nombre: 'Pierna', ejercicios: [minimo] }] });
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    expect(r.json.dias[0]).toMatchObject({ dia_semana: null });
    expect(r.json.dias[0].ejercicios[0]).toMatchObject({
      incremento_kg: 4, rir_objetivo: 2, descanso_s: 90, esquema: 'normal', peso_inicial_kg: null,
      grupo_superserie: null, nota_entrenador: null, porcentajes_semana: [], objetivo_rm: null,
    });
  });

  it('INT-064 un ejercicio de 12 a 8 repeticiones da 422 REPS_RANGE_INVALID con el ejercicio; no se crea nada', async () => {
    const { diego } = await e.escena();
    const payload = cuerpo('Mala');
    (payload.dias[0]!.ejercicios[1] as any).reps_min = 12;
    (payload.dias[0]!.ejercicios[1] as any).reps_max = 8;
    const r = await pedir(diego, 'POST', '/v1/routines', payload);
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe('REPS_RANGE_INVALID');
    expect(r.json.error.details).toMatchObject({ dia: 0, posicion: 1, exercise_id: idEjercicioBase('press-de-banca-inclinado') });
    expect(await e.prisma.rutina.count()).toBe(0);
  });

  it('INT-065 Diego incluye un ejercicio propio de Martina: 422 EXERCISE_NOT_OWNED', async () => {
    const { martina, diego } = await e.escena();
    const suyo = await pedir(martina, 'POST', '/v1/exercises', {
      nombre: 'Press Zercher', grupo_muscular: 'Pecho', equipo: 'Barra', patron: 'empuje', incremento_default_kg: 2.5,
    });
    const payload = cuerpo('Con ajeno');
    payload.dias[0]!.ejercicios.push(ej('press-de-banca', { exercise_id: suyo.json.id }));
    const r = await pedir(diego, 'POST', '/v1/routines', payload);
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe('EXERCISE_NOT_OWNED');
    expect(r.json.error.details).toMatchObject({ dia: 0, posicion: 4, exercise_id: suyo.json.id });
    const inventado = cuerpo('Con inventado');
    inventado.dias[0]!.ejercicios[0]!.exercise_id = randomUUID();
    expect((await pedir(diego, 'POST', '/v1/routines', inventado)).json.error.code).toBe('EXERCISE_NOT_OWNED');
    expect(await e.prisma.rutina.count()).toBe(0);
  });

  it('INT-066 sin nombre, sin días, con 0 series, descanso negativo o un campo de más: 400 en cada caso', async () => {
    const { diego } = await e.escena();
    const { nombre: _n, ...sinNombre } = cuerpo('X');
    const conCero = cuerpo('X');
    conCero.dias[0]!.ejercicios[0]!.series = 0;
    const conDescanso = cuerpo('X');
    conDescanso.dias[0]!.ejercicios[0]!.descanso_s = -10;
    const casos = [sinNombre, cuerpo('X', { dias: [] }), cuerpo('   '), conCero, conDescanso, cuerpo('X', { color: 'rojo' })];
    for (const payload of casos) {
      const r = await pedir(diego, 'POST', '/v1/routines', payload);
      expect(r.status, JSON.stringify(payload)).toBe(400);
      expect(r.json.error.code).toBe('VALIDATION_ERROR');
    }
    expect(await e.prisma.rutina.count()).toBe(0);
  });

  it('INT-067 PERM-07 Camila crea una rutina con client_id de Diego, que no es su cliente: 404', async () => {
    const { camila, diego } = await e.escena();
    const r = await pedir(camila, 'POST', '/v1/routines', cuerpo('Para Diego', { client_id: diego.id }));
    expect(r.status).toBe(404);
    expect(await e.prisma.rutina.count()).toBe(0);
  });

  it('INT-156 Camila guarda semanas, día fijo, superserie, esquema, peso inicial y nota; GET devuelve lo mismo; «piramidal» da 400', async () => {
    const { camila, martina } = await e.escena();
    const dia = {
      nombre: 'Empuje A', dia_semana: 1,
      ejercicios: [
        ej('press-de-banca', { grupo_superserie: 'A', esquema: 'descendente', peso_inicial_kg: 40, nota_entrenador: 'Baja controlado.' }),
        ej('aperturas-con-mancuernas', { grupo_superserie: 'A', reps_min: 12, reps_max: 15, descanso_s: 60 }),
        ej('press-con-mancuernas', { esquema: 'cluster', porcentajes_semana: [70, 75, 80], objetivo_rm: 5 }),
      ],
    };
    const creada = await crear(camila, 'Fuerza 4 días', { client_id: martina.id, semanas: 8, descripcion: 'Cuatro días.', dias: [dia] });
    const leida = await pedir(camila, 'GET', `/v1/routines/${creada.id}`);
    expect(leida.status).toBe(200);
    expect(leida.json).toEqual(creada);
    expect(leida.json).toMatchObject({ semanas: 8, descripcion: 'Cuatro días.', client_id: martina.id, owner_id: camila.id });
    expect(leida.json.dias[0].dia_semana).toBe(1);
    expect(leida.json.dias[0].ejercicios.map((x: any) => x.grupo_superserie)).toEqual(['A', 'A', null]);
    expect(leida.json.dias[0].ejercicios[0]).toMatchObject({ esquema: 'descendente', peso_inicial_kg: 40, nota_entrenador: 'Baja controlado.' });
    expect(leida.json.dias[0].ejercicios[2]).toMatchObject({ esquema: 'cluster', porcentajes_semana: [70, 75, 80], objetivo_rm: 5 });

    const mala = { ...dia, ejercicios: [ej('press-de-banca', { esquema: 'piramidal' })] };
    expect((await pedir(camila, 'POST', '/v1/routines', cuerpo('Mala', { dias: [mala] }))).status).toBe(400);
  });

  // ── Leer ────────────────────────────────────────────────────────────────────
  it('INT-068 PERM-39 Martina ve sus 2 y la asignada, no las plantillas; Camila ve las suyas y las asignadas', async () => {
    const { camila, martina } = await e.escena();
    const propias = [await crear(martina, 'Mía 1'), await crear(martina, 'Mía 2')];
    const asignada = await crear(camila, 'Para Martina', { client_id: martina.id });
    const plantillas = [await crear(camila, 'Plantilla 1'), await crear(camila, 'Plantilla 2'), await crear(camila, 'Plantilla 3')];

    const deMartina = await pedir(martina, 'GET', '/v1/routines');
    expect(deMartina.status).toBe(200);
    expect(deMartina.json.items.map((r: any) => r.id).sort()).toEqual([...propias, asignada].map((r) => r.id).sort());
    expect(deMartina.json.items.find((r: any) => r.id === asignada.id).permisos).toEqual({
      editar: false, activar: false, asignar: false, archivar: false, duplicar: true,
    });
    expect((await pedir(martina, 'GET', `/v1/routines/${plantillas[0].id}`)).status).toBe(404);

    const deCamila = await pedir(camila, 'GET', '/v1/routines');
    expect(deCamila.json.items.map((r: any) => r.id).sort()).toEqual([asignada, ...plantillas].map((r) => r.id).sort());
    // Con ?client_id= ve todas las de Martina, también las que ella se hizo (P-44: solo lectura).
    const fichaMartina = await e.pedirComo(camila, { method: 'GET', url: '/v1/routines', query: { client_id: martina.id } });
    expect(fichaMartina.json.items.map((r: any) => r.id).sort()).toEqual([...propias, asignada].map((r) => r.id).sort());
    expect(fichaMartina.json.items.find((r: any) => r.id === propias[0].id).permisos.editar).toBe(false);
  });

  it('INT-069 una rutina de Diego: Martina pide su detalle y recibe 404; Rodrigo también', async () => {
    const { martina, diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const deDiego = await crear(diego, 'De Diego');
    expect((await pedir(martina, 'GET', `/v1/routines/${deDiego.id}`)).status).toBe(404);
    expect((await pedir(rodrigo, 'GET', `/v1/routines/${deDiego.id}`)).status).toBe(404);
    expect((await e.pedirComo(rodrigo, { method: 'GET', url: '/v1/routines', query: { client_id: diego.id } })).status).toBe(404);
    expect((await pedir(martina, 'GET', `/v1/routines/${randomUUID()}`)).status).toBe(404);
  });

  it('PERM-38 sin token /v1/routines da 401', async () => {
    expect((await e.pedir({ method: 'GET', url: '/v1/routines' })).status).toBe(401);
  });

  // ── Editar ──────────────────────────────────────────────────────────────────
  it('INT-070 Martina cambia nombre, método a lineal y semanas a 6 de su rutina: 200 y quedan guardados', async () => {
    const { martina } = await e.escena();
    const mia = await crear(martina, 'Mía');
    const r = await pedir(martina, 'PATCH', `/v1/routines/${mia.id}`, { nombre: 'Mía nueva', metodo_progresion: 'lineal', semanas: 6 });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ nombre: 'Mía nueva', metodo_progresion: 'lineal', semanas: 6, version: 1 });
    const fila = await e.prisma.rutina.findUniqueOrThrow({ where: { id: mia.id } });
    expect([fila.nombre, fila.metodoProgresion, fila.semanas]).toEqual(['Mía nueva', 'lineal', 6]);
    expect((await pedir(martina, 'PATCH', `/v1/routines/${mia.id}`, {})).status).toBe(400);
    expect((await pedir(martina, 'PATCH', `/v1/routines/${mia.id}`, { metodo_progresion: 'magia' })).status).toBe(400);
  });

  it('INT-071 PERM-08 Martina intenta PATCH, PUT /days y DELETE sobre la que le asignó Camila: 403 en los tres y nada cambia', async () => {
    const { camila, martina } = await e.escena();
    const deCamila = await crear(camila, 'Fuerza', { client_id: martina.id });
    await activar(camila, deCamila.id);
    const antes = await e.prisma.rutina.findUniqueOrThrow({ where: { id: deCamila.id } });
    const url = `/v1/routines/${deCamila.id}`;
    const patch = await pedir(martina, 'PATCH', url, { nombre: 'Mía' });
    const put = await pedir(martina, 'PUT', `${url}/days`, { dias: cuerpo('X').dias });
    const del = await pedir(martina, 'DELETE', url);
    expect([patch.status, put.status, del.status]).toEqual([403, 403, 403]);
    expect([patch.json.error.code, put.json.error.code, del.json.error.code]).toEqual(['FORBIDDEN', 'FORBIDDEN', 'FORBIDDEN']);
    const despues = await e.prisma.rutina.findUniqueOrThrow({ where: { id: deCamila.id } });
    expect([despues.nombre, despues.version, despues.estado, despues.deletedAt]).toEqual([antes.nombre, antes.version, 'activa', null]);
  });

  it('P-44 Camila lee la rutina que Martina se hizo sola pero editarla da 403', async () => {
    const { camila, martina } = await e.escena();
    const mia = await crear(martina, 'Mía');
    expect((await pedir(camila, 'GET', `/v1/routines/${mia.id}`)).status).toBe(200);
    expect((await pedir(camila, 'PATCH', `/v1/routines/${mia.id}`, { nombre: 'De Camila' })).status).toBe(403);
    expect((await pedir(camila, 'POST', `/v1/routines/${mia.id}/activate`)).status).toBe(403);
  });

  // ── Reemplazar los días ─────────────────────────────────────────────────────
  it('INT-072 PUT /days sobre una activa en versión 2 con una sesión cerrada: solo la estructura nueva, versión 3, la sesión sigue en 2', async () => {
    const { martina } = await e.escena();
    const mia = await crear(martina, 'Mía', {}, DIAS_FUERZA.slice(0, 2));
    expect((await activar(martina, mia.id)).version).toBe(2);
    await sesiones(martina, mia.id, 1, 2);
    const nueva = [{ nombre: 'Full body', ejercicios: [ej('press-en-maquina'), ej('peso-muerto-rumano')] }];
    const r = await pedir(martina, 'PUT', `/v1/routines/${mia.id}/days`, { dias: nueva });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.version).toBe(3);
    expect(r.json.dias.map((d: any) => d.nombre)).toEqual(['Full body']);
    expect(r.json.dias[0].ejercicios.map((x: any) => x.exercise_id)).toEqual([idEjercicioBase('press-en-maquina'), idEjercicioBase('peso-muerto-rumano')]);
    const sesion = await e.prisma.sesionEntreno.findFirstOrThrow({ where: { rutinaId: mia.id } });
    expect(sesion.routineVersion).toBe(2);
    // Los días viejos no se borran: quedan marcados para el historial.
    expect(await e.prisma.diaRutina.count({ where: { rutinaId: mia.id, deletedAt: { not: null } } })).toBe(2);
    expect((await pedir(martina, 'GET', `/v1/routines/${mia.id}`)).json.dias).toHaveLength(1);
  });

  it('INT-154 PUT /days en borrador deja la versión en 1; Rodrigo intenta lo mismo y recibe 404', async () => {
    const { diego } = await e.escena();
    const rodrigo = await e.crear('rodrigo');
    const mia = await crear(diego, 'Mía');
    const dias = [{ nombre: 'Otro', ejercicios: [ej('flexiones', { incremento_kg: 0 })] }];
    const ok = await pedir(diego, 'PUT', `/v1/routines/${mia.id}/days`, { dias });
    expect(ok.status).toBe(200);
    expect(ok.json.version).toBe(1);
    const ajeno = await pedir(rodrigo, 'PUT', `/v1/routines/${mia.id}/days`, { dias: cuerpo('X').dias });
    expect(ajeno.status).toBe(404);
    expect((await pedir(diego, 'GET', `/v1/routines/${mia.id}`)).json.dias.map((d: any) => d.nombre)).toEqual(['Otro']);
  });

  it('CU-20 PUT /days conserva el id de los días y ejercicios que vienen con id (el hilo de la progresión), y valida igual que crear', async () => {
    const { diego } = await e.escena();
    const mia = await crear(diego, 'Mía', {}, DIAS_FUERZA.slice(0, 2));
    const [dia0, dia1] = mia.dias;
    const banca = dia0.ejercicios[0];
    const dias = [
      { id: dia1.id, nombre: 'Tirón A2', ejercicios: [{ ...ej('peso-muerto-rumano', { series: 5 }), id: dia1.ejercicios[0].id }] },
      { id: dia0.id, nombre: dia0.nombre, ejercicios: [{ ...ej('press-de-banca', { reps_min: 6, reps_max: 8 }), id: banca.id }, ej('pec-deck')] },
    ];
    const r = await pedir(diego, 'PUT', `/v1/routines/${mia.id}/days`, { dias });
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    expect(r.json.dias.map((d: any) => d.id)).toEqual([dia1.id, dia0.id]);
    expect(r.json.dias[0]).toMatchObject({ nombre: 'Tirón A2', orden: 0 });
    expect(r.json.dias[0].ejercicios[0]).toMatchObject({ id: dia1.ejercicios[0].id, series: 5 });
    expect(r.json.dias[1].ejercicios[0]).toMatchObject({ id: banca.id, reps_min: 6, reps_max: 8 });
    expect(r.json.dias[1].ejercicios[1].id).not.toBe(dia0.ejercicios[1].id);

    const ajeno = [{ id: randomUUID(), nombre: 'X', ejercicios: [] }];
    expect((await pedir(diego, 'PUT', `/v1/routines/${mia.id}/days`, { dias: ajeno })).status).toBe(400);
    const rango = [{ nombre: 'X', ejercicios: [ej('pec-deck', { reps_min: 15, reps_max: 10 })] }];
    expect((await pedir(diego, 'PUT', `/v1/routines/${mia.id}/days`, { dias: rango })).json.error.code).toBe('REPS_RANGE_INVALID');
  });

  // ── Asignar ─────────────────────────────────────────────────────────────────
  it('INT-074 PERM-10 Camila asigna una plantilla a Martina (201), a Diego (404) y a una ex clienta (404)', async () => {
    const { camila, martina, diego } = await e.escena();
    const exClienta = await e.crear('sofia');
    await vincular(e.prisma, camila, exClienta);
    await desvincular(e.prisma, exClienta, new Date(AHORA));
    const plantilla = await crear(camila, 'Plantilla', {}, DIAS_FUERZA.slice(0, 2));
    const url = `/v1/routines/${plantilla.id}/assign`;

    const ok = await pedir(camila, 'POST', url, { client_id: martina.id });
    expect(ok.status).toBe(201);
    expect(ok.json).toMatchObject({ client_id: martina.id, owner_id: camila.id, origen_id: plantilla.id, estado: 'borrador', nombre: 'Plantilla' });
    expect(ok.json.id).not.toBe(plantilla.id);
    expect(ok.json.dias.map((d: any) => d.nombre)).toEqual(plantilla.dias.map((d: any) => d.nombre));
    expect((await pedir(camila, 'POST', url, { client_id: diego.id })).status).toBe(404);
    expect((await pedir(camila, 'POST', url, { client_id: exClienta.id })).status).toBe(404);
    // La plantilla sigue siendo plantilla.
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: plantilla.id } })).alumnoId).toBeNull();
    // Martina la ve.
    expect((await pedir(martina, 'GET', `/v1/routines/${ok.json.id}`)).status).toBe(200);
  });

  it('INT-075 PERM-11 PERM-12 Martina y Diego llaman a assign con sus rutinas: 403', async () => {
    const { camila, martina, diego } = await e.escena();
    const deMartina = await crear(martina, 'Mía');
    const deDiego = await crear(diego, 'Mía');
    const a = await pedir(martina, 'POST', `/v1/routines/${deMartina.id}/assign`, { client_id: diego.id });
    const b = await pedir(diego, 'POST', `/v1/routines/${deDiego.id}/assign`, { client_id: martina.id });
    expect([a.status, b.status]).toEqual([403, 403]);
    // Tampoco puede crear una rutina para otro.
    expect((await pedir(martina, 'POST', '/v1/routines', cuerpo('Para Diego', { client_id: diego.id }))).status).toBe(403);
    expect(await e.prisma.rutina.count()).toBe(2);
    void camila;
  });

  it('INT-076 P-43 una plantilla asignada a dos clientas deja dos copias independientes', async () => {
    const { camila, martina } = await e.escena();
    const gonzalo = await e.crear('gonzalo');
    await vincular(e.prisma, camila, gonzalo);
    const plantilla = await crear(camila, 'Plantilla');
    const paraMartina = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/assign`, { client_id: martina.id });
    const paraGonzalo = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/assign`, { client_id: gonzalo.id });
    expect([paraMartina.status, paraGonzalo.status]).toEqual([201, 201]);
    await pedir(camila, 'PATCH', `/v1/routines/${paraMartina.json.id}`, { nombre: 'Solo de Martina' });
    await pedir(camila, 'PUT', `/v1/routines/${paraMartina.json.id}/days`, { dias: [{ nombre: 'Cambiado', ejercicios: [ej('pec-deck')] }] });
    const deGonzalo = await pedir(camila, 'GET', `/v1/routines/${paraGonzalo.json.id}`);
    expect(deGonzalo.json.nombre).toBe('Plantilla');
    expect(deGonzalo.json.dias.map((d: any) => d.nombre)).toEqual(['Empuje A']);
    expect(deGonzalo.json.dias[0].ejercicios.map((x: any) => x.id)).not.toEqual(paraMartina.json.dias[0].ejercicios.map((x: any) => x.id));
  });

  it('CU-21 asignar con activar: true deja la copia activa para la clienta', async () => {
    const { camila, martina } = await e.escena();
    const plantilla = await crear(camila, 'Plantilla');
    const r = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/assign`, { client_id: martina.id, activar: true });
    expect(r.status).toBe(201);
    expect(r.json).toMatchObject({ estado: 'activa', version: 2, client_id: martina.id });
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: martina.id } })).rutinaActivaId).toBe(r.json.id);
  });

  // ── Activar ─────────────────────────────────────────────────────────────────
  it('INT-077 PERM-10 Camila activa «Fuerza 4 días» de Martina: queda activa con versión más 1 y la anterior archivada con sus sesiones', async () => {
    const { camila, martina } = await e.escena();
    const hipertrofia = await crear(martina, 'Hipertrofia 3 días');
    await activar(martina, hipertrofia.id);
    await sesiones(martina, hipertrofia.id, 2, 2);
    const fuerza = await crear(camila, 'Fuerza 4 días', { client_id: martina.id }, DIAS_FUERZA);
    expect(fuerza.permisos.activar).toBe(true);

    const r = await activar(camila, fuerza.id);
    expect(r).toMatchObject({ estado: 'activa', version: fuerza.version + 1, activada_at: AHORA, semana_actual: 1 });
    const anterior = await e.prisma.rutina.findUniqueOrThrow({ where: { id: hipertrofia.id } });
    expect(anterior.estado).toBe('archivada');
    expect(await e.prisma.sesionEntreno.count({ where: { rutinaId: hipertrofia.id } })).toBe(2);
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: martina.id } })).rutinaActivaId).toBe(fuerza.id);
    expect(await e.prisma.rutina.count({ where: { alumnoId: martina.id, estado: 'activa' } })).toBe(1);
  });

  it('INT-078 dos rutinas de Diego activadas a la vez: una da 200 y la otra 422 ACTIVE_ROUTINE_CONFLICT; queda una sola activa', async () => {
    const { diego } = await e.escena();
    const a = await crear(diego, 'A');
    const b = await crear(diego, 'B');
    // Para que las dos sean de verdad a la vez, se retiene el perfil de Diego hasta que las dos
    // estén esperando para tomarlo; al soltarlo, la primera gana y la segunda ve el cambio.
    let pedidos: Promise<Awaited<ReturnType<typeof pedir>>>[] = [];
    await e.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM client_profiles WHERE user_id = ${diego.id}::uuid FOR UPDATE`;
      pedidos = [pedir(diego, 'POST', `/v1/routines/${a.id}/activate`), pedir(diego, 'POST', `/v1/routines/${b.id}/activate`)];
      for (let i = 0; i < 100; i++) {
        const [fila] = await e.prisma.$queryRaw<{ n: number }[]>`
          SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%UPDATE client_profiles%'`;
        if ((fila?.n ?? 0) >= 2) break;
        await new Promise((listo) => setTimeout(listo, 20));
      }
    }, { timeout: 10_000 });
    const [ra, rb] = await Promise.all(pedidos) as [Awaited<ReturnType<typeof pedir>>, Awaited<ReturnType<typeof pedir>>];
    expect([ra.status, rb.status].sort()).toEqual([200, 422]);
    expect([ra, rb].find((x) => x.status === 422)!.json.error.code).toBe('ACTIVE_ROUTINE_CONFLICT');
    const activas = await e.prisma.rutina.findMany({ where: { alumnoId: diego.id, estado: 'activa' } });
    expect(activas).toHaveLength(1);
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: diego.id } })).rutinaActivaId).toBe(activas[0]!.id);
  });

  it('INT-079 activar una rutina sin días o con un día vacío da 422 ROUTINE_EMPTY; sigue en borrador y la activa no cambia', async () => {
    const { diego } = await e.escena();
    const activa = await crear(diego, 'Activa');
    await activar(diego, activa.id);
    const sinDias = await e.prisma.rutina.create({ data: { duenoId: diego.id, alumnoId: diego.id, nombre: 'Vacía', semanas: 4 } });
    const r = await pedir(diego, 'POST', `/v1/routines/${sinDias.id}/activate`);
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe('ROUTINE_EMPTY');
    const conDiaVacio = await crear(diego, 'Día vacío', { dias: [{ nombre: 'Nada', ejercicios: [] }] });
    expect((await pedir(diego, 'POST', `/v1/routines/${conDiaVacio.id}/activate`)).json.error.code).toBe('ROUTINE_EMPTY');
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: sinDias.id } })).estado).toBe('borrador');
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: activa.id } })).estado).toBe('activa');
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: diego.id } })).rutinaActivaId).toBe(activa.id);
  });

  it('INT-080 PERM-11 P-06 Martina no activa la de Camila (403); activa la propia y la de Camila queda archivada', async () => {
    const { camila, martina } = await e.escena();
    const deCamila = await crear(camila, 'De Camila', { client_id: martina.id });
    const propia = await crear(martina, 'Propia');
    const rechazo = await pedir(martina, 'POST', `/v1/routines/${deCamila.id}/activate`);
    expect(rechazo.status).toBe(403);
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: deCamila.id } })).estado).toBe('borrador');
    await activar(camila, deCamila.id);
    const r = await activar(martina, propia.id);
    expect(r.estado).toBe('activa');
    expect((await e.prisma.rutina.findUniqueOrThrow({ where: { id: deCamila.id } })).estado).toBe('archivada');
  });

  it('CU-22 una plantilla no se activa (422 BUSINESS_RULE) y el entrenador sin vínculo activo recibe 404', async () => {
    const { camila, martina } = await e.escena();
    const plantilla = await crear(camila, 'Plantilla');
    const r = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/activate`);
    expect(r.status).toBe(422);
    expect(r.json.error.code).toBe('BUSINESS_RULE');
    const paraMartina = await crear(camila, 'Para Martina', { client_id: martina.id });
    await desvincular(e.prisma, martina, new Date(AHORA));
    expect((await pedir(camila, 'POST', `/v1/routines/${paraMartina.id}/activate`)).status).toBe(404);
    // P-16: Camila la conserva en su biblioteca.
    expect((await pedir(camila, 'GET', `/v1/routines/${paraMartina.id}`)).status).toBe(200);
  });

  it('UNI-072 semana_actual cuenta bloques de 7 días desde la primera activación y no pasa del total', async () => {
    const { diego } = await e.escena();
    const mia = await crear(diego, 'Mía', { semanas: 8 });
    await activar(diego, mia.id);
    const semana = async () => (await pedir(diego, 'GET', `/v1/routines/${mia.id}`)).json.semana_actual;
    e.reloj.avanzar('6d');
    expect(await semana()).toBe(1);
    e.reloj.avanzar('1d');
    expect(await semana()).toBe(2);
    e.reloj.avanzar('63d');
    expect(await semana()).toBe(8);
  });

  // ── Duplicar ────────────────────────────────────────────────────────────────
  it('INT-081 PERM-41 Martina duplica la activa que le escribió Camila: borrador suyo con la misma estructura, que puede editar', async () => {
    const { camila, martina } = await e.escena();
    const deCamila = await crear(camila, 'Fuerza 4 días', { client_id: martina.id }, DIAS_FUERZA);
    await activar(camila, deCamila.id);
    await sesiones(martina, deCamila.id, 3, 2);
    const r = await pedir(martina, 'POST', `/v1/routines/${deCamila.id}/duplicate`);
    expect(r.status, JSON.stringify(r.json)).toBe(201);
    expect(r.json).toMatchObject({
      estado: 'borrador', version: 1, owner_id: martina.id, client_id: martina.id, origen_id: deCamila.id,
      nombre: 'Fuerza 4 días (copia)', permisos: { editar: true, activar: true },
    });
    const estructura = (x: any) => x.dias.map((d: any) => [d.nombre, d.ejercicios.map((y: any) => [y.exercise_id, y.series, y.reps_min, y.reps_max])]);
    expect(estructura(r.json)).toEqual(estructura(deCamila));
    expect(await e.prisma.sesionEntreno.count({ where: { rutinaId: r.json.id } })).toBe(0);
    expect((await pedir(martina, 'PATCH', `/v1/routines/${r.json.id}`, { nombre: 'Mi fuerza' })).status).toBe(200);
    // Y puede volver a guardar sus días con los mismos ejercicios.
    const dias = r.json.dias.map((d: any) => ({ id: d.id, nombre: d.nombre, ejercicios: d.ejercicios.map((x: any) => ({ id: x.id, exercise_id: x.exercise_id, series: x.series, reps_min: x.reps_min, reps_max: x.reps_max })) }));
    expect((await pedir(martina, 'PUT', `/v1/routines/${r.json.id}/days`, { dias })).status).toBe(200);
  });

  it('CU-23 duplicar una rutina que no lees da 404; el entrenador duplica como plantilla o para un cliente', async () => {
    const { camila, martina, diego } = await e.escena();
    const deDiego = await crear(diego, 'De Diego');
    expect((await pedir(martina, 'POST', `/v1/routines/${deDiego.id}/duplicate`)).status).toBe(404);
    const plantilla = await crear(camila, 'Plantilla');
    const copia = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/duplicate`, { nombre: 'Plantilla 2' });
    expect(copia.json).toMatchObject({ nombre: 'Plantilla 2', client_id: null, owner_id: camila.id });
    const paraMartina = await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/duplicate`, { client_id: martina.id });
    expect(paraMartina.json).toMatchObject({ client_id: martina.id, nombre: 'Plantilla (copia)' });
    expect((await pedir(camila, 'POST', `/v1/routines/${plantilla.id}/duplicate`, { client_id: diego.id })).status).toBe(404);
  });

  // ── Archivar ────────────────────────────────────────────────────────────────
  it('INT-082 Diego archiva una con 5 sesiones (queda archivada con sus sesiones) y una sin sesiones (archivada con deleted_at)', async () => {
    const { diego } = await e.escena();
    const conSesiones = await crear(diego, 'Con sesiones');
    const sinSesiones = await crear(diego, 'Sin sesiones');
    await sesiones(diego, conSesiones.id, 5);
    const a = await pedir(diego, 'DELETE', `/v1/routines/${conSesiones.id}`);
    const b = await pedir(diego, 'DELETE', `/v1/routines/${sinSesiones.id}`);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.json).toMatchObject({ estado: 'archivada', deleted_at: null });
    expect(b.json).toMatchObject({ estado: 'archivada', deleted_at: AHORA });
    expect(await e.prisma.sesionEntreno.count({ where: { rutinaId: conSesiones.id } })).toBe(5);
    expect(await e.prisma.rutina.count({ where: { id: { in: [conSesiones.id, sinSesiones.id] } } })).toBe(2);
    expect((await pedir(diego, 'GET', `/v1/routines/${sinSesiones.id}`)).status).toBe(404);
    expect((await pedir(diego, 'GET', '/v1/routines')).json.items.map((r: any) => r.id)).toEqual([conSesiones.id]);
    const archivadas = await e.pedirComo(diego, { method: 'GET', url: '/v1/routines', query: { estado: 'archivada' } });
    expect(archivadas.json.items.map((r: any) => r.id)).toEqual([conSesiones.id]);
  });

  it('INT-157 P-56 Diego archiva su rutina activa: queda archivada y sin rutina activa en su perfil', async () => {
    const { diego } = await e.escena();
    const torso = await crear(diego, 'Torso pierna 4 días');
    await activar(diego, torso.id);
    await sesiones(diego, torso.id, 1, 2);
    const r = await pedir(diego, 'DELETE', `/v1/routines/${torso.id}`);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ estado: 'archivada', deleted_at: null });
    expect((await e.prisma.perfilAlumno.findUniqueOrThrow({ where: { usuarioId: diego.id } })).rutinaActivaId).toBeNull();
    // Se puede volver a activar sin reiniciar las semanas (UNI-072).
    const otra = await activar(diego, torso.id);
    expect(otra).toMatchObject({ estado: 'activa', version: 3, activada_at: AHORA });
  });
});
