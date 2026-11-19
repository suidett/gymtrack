// ─────────────────────────────────────────────────────────────────────────────
// Validaciones de forma y de fondo de la API · Zona: Pruebas (API)
//
// Qué hace: prueba contra PostgreSQL 16 real, con app.inject, las reglas que se agregaron para la
// evaluación (docs/pruebas/validaciones.md, ids VAL-xxx) y el arreglo de GET /v1/me, que ahora
// trae recordatorio_hora de client_profiles. Cada caso revisa el estado, el código del catálogo y
// el campo (details.campo), y donde importa el motivo en español que la app pone bajo el campo:
// nombre con letras, contraseña fácil de adivinar o igual al correo, encuesta con edad de 14 a
// 100 años e IMC posible, PATCH /me vacío, nombre de ejercicio repetido, días repetidos y topes
// de repeticiones o segundos en rutinas, sesiones y sugerencias, serie hecha sin repeticiones,
// duración más larga que la sesión, dolor sin zona, medidas fuera de rango o de hace más de un
// año (y null como «no lo medí»), foto con fecha futura, «otro» sin comentario y «nada» con otras
// acciones al resolver.
// La escena: Camila entrenadora, Martina vinculada a Camila, Diego solo (sin entrenador).
// Tócalo cuando: cambie una de estas reglas (packages/shared/src/api/reglas.ts o el módulo).
// Depende de: ./ayudas y ./progreso/datos (rutina y sesión armadas directo en la base).
// ─────────────────────────────────────────────────────────────────────────────
import { expect, it } from 'vitest';
import { generarSugerenciasDeCierre } from '../src/modulos/progreso/sugerencias';
import { AHORA, CLAVE, describeConBase, idEjercicioBase, usarEntornoApi, uuidV7Fijo, type PersonaDePrueba } from './ayudas';
import { crearRutina, crearSesion, haceDias, series } from './progreso/datos';

const BANCA = idEjercicioBase('press-de-banca');
const PLANCHA = idEjercicioBase('plancha-frontal');
let n = 0;
const idv7 = () => uuidV7Fijo('2026-11-17T12:00:00.000Z', `prueba-validaciones:${++n}`);

const respuestas = (extra: Record<string, unknown> = {}) => ({
  objetivo: 'ganar_masa', experiencia: 'uno_a_tres_anos', dias_semana: 4, lugar: 'gimnasio_completo', minutos_sesion: 60,
  fecha_nacimiento: '1998-03-12', altura_cm: 165, peso_kg: 61.5, lesiones: { zonas: ['ninguna'] }, ...extra,
});
const encuesta = (extra: Record<string, unknown> = {}) => ({ respuestas: respuestas(extra), consentimiento_salud: true, politica_version: '1' });
const ejercicioRutina = (extra: Record<string, unknown> = {}) => ({ exercise_id: BANCA, series: 3, reps_min: 8, reps_max: 10, ...extra });

describeConBase('Validaciones de forma y de fondo', () => {
  const e = usarEntornoApi();

  /** Espera el estado, el código y el campo; devuelve el motivo que la app pone bajo el campo. */
  function esperarError(r: { status: number; json: any }, estado: number, codigo: string, campo?: string): string | undefined {
    expect(r.status, JSON.stringify(r.json)).toBe(estado);
    expect(r.json.error.code).toBe(codigo);
    if (campo !== undefined) expect(r.json.error.details.campo).toBe(campo);
    return r.json.error.details?.motivo;
  }

  // ── GET /v1/me ─────────────────────────────────────────────────────────────
  it('VAL-043 GET /me trae recordatorio_activo y recordatorio_hora de client_profiles (antes no traía la hora)', async () => {
    const { camila, martina } = await e.escena();
    const patch = await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload: { recordatorio_activo: false, recordatorio_hora: '07:30' } });
    expect(patch.status).toBe(200);
    const me = await e.pedirComo(martina, { method: 'GET', url: '/v1/me' });
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ recordatorio_activo: false, recordatorio_hora: '07:30', entrenador: { nombre: 'Camila' } });
    const deCamila = await e.pedirComo(camila, { method: 'GET', url: '/v1/me' });
    expect(deCamila.json).toMatchObject({ recordatorio_activo: null, recordatorio_hora: null });
    // El ingreso no cambia de forma: la sesión trae al usuario sin el recordatorio.
    const ingreso = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: martina.email, password: CLAVE } });
    expect(ingreso.json.usuario).not.toHaveProperty('recordatorio_hora');
  });

  it('VAL-042 PATCH /me sin campos y con una hora imposible da 400', async () => {
    const { martina } = await e.escena();
    expect(esperarError(await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload: {} }), 400, 'VALIDATION_ERROR')).toBe('Manda al menos un campo para cambiar.');
    esperarError(await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload: { recordatorio_hora: '25:00' } }), 400, 'VALIDATION_ERROR', 'recordatorio_hora');
    const motivo = esperarError(await e.pedirComo(martina, { method: 'PATCH', url: '/v1/me', payload: { apellido: 'Fuentes2' } }), 400, 'VALIDATION_ERROR', 'apellido');
    expect(motivo).toBe('Tu apellido solo puede tener letras, espacios, guiones y apóstrofos.');
  });

  // ── Registro y contraseñas ─────────────────────────────────────────────────
  it('VAL-001 VAL-004 VAL-005 registro: nombre con números, contraseña de las más usadas o igual al correo dan 400', async () => {
    const registrar = (payload: Record<string, unknown>) =>
      e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { rol: 'client', nombre: 'Ana', apellido: 'Paz', email: 'ana.paz@gymtrack.test', password: CLAVE, ...payload } });
    expect(esperarError(await registrar({ nombre: 'Ana99' }), 400, 'VALIDATION_ERROR', 'nombre')).toBe('Tu nombre solo puede tener letras, espacios, guiones y apóstrofos.');
    expect(esperarError(await registrar({ password: '12345678' }), 400, 'VALIDATION_ERROR', 'password')).toBe('Esa contraseña es muy fácil de adivinar. Usa otra.');
    expect(esperarError(await registrar({ password: 'Ana.Paz@gymtrack.test' }), 400, 'VALIDATION_ERROR', 'password')).toBe('La contraseña no puede ser tu correo.');
    expect((await registrar({ nombre: 'María José', apellido: "O'Ryan Muñoz" })).status).toBe(201);
    // Correo repetido (sin importar mayúsculas): 409 EMAIL_TAKEN.
    esperarError(await registrar({ email: 'ANA.PAZ@gymtrack.test' }), 409, 'EMAIL_TAKEN');
  });

  it('VAL-006 restablecer con una contraseña fácil de adivinar da 400 antes de mirar el enlace', async () => {
    const r = await e.pedir({ method: 'POST', url: '/v1/auth/password/reset', payload: { token: 'inventado', password: 'qwerty123' } });
    esperarError(r, 400, 'VALIDATION_ERROR', 'password');
  });

  // ── Encuesta ───────────────────────────────────────────────────────────────
  it('VAL-010 encuesta: nacimiento futuro, menor de 14 o mayor de 100 años dan 422 con el campo', async () => {
    const sofia = await e.crear('sofia');
    const responder = (extra: Record<string, unknown>) => e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta(extra) });
    expect(esperarError(await responder({ fecha_nacimiento: '2027-01-01' }), 422, 'BUSINESS_RULE', 'respuestas.fecha_nacimiento')).toBe('La fecha de nacimiento no puede ser futura.');
    expect(esperarError(await responder({ fecha_nacimiento: '2013-01-01' }), 422, 'BUSINESS_RULE', 'respuestas.fecha_nacimiento')).toBe('Para usar GymTrack necesitas tener 14 años o más.');
    const vieja = await responder({ fecha_nacimiento: '1920-05-01' });
    expect(esperarError(vieja, 422, 'BUSINESS_RULE', 'respuestas.fecha_nacimiento')).toBe('Revisa el año: la edad máxima es 100 años.');
    expect(vieja.json.error.message).toBe('Revisa el año: la edad máxima es 100 años.');
    expect(await e.prisma.respuestaEncuesta.count()).toBe(0);
  });

  it('VAL-011 VAL-012 encuesta: altura fuera de 120 a 230 da 400; altura y peso que no calzan dan 422', async () => {
    const sofia = await e.crear('sofia');
    const responder = (extra: Record<string, unknown>) => e.pedirComo(sofia, { method: 'POST', url: '/v1/me/survey', payload: encuesta(extra) });
    esperarError(await responder({ altura_cm: 110 }), 400, 'VALIDATION_ERROR', 'respuestas.altura_cm');
    esperarError(await responder({ peso_kg: 301 }), 400, 'VALIDATION_ERROR', 'respuestas.peso_kg');
    expect(esperarError(await responder({ altura_cm: 125, peso_kg: 290 }), 422, 'BUSINESS_RULE', 'respuestas.peso_kg')).toBe('Revisa tu altura y tu peso: juntos no calzan.');
    expect((await responder({})).status).toBe(201);
  });

  // ── Ejercicios ─────────────────────────────────────────────────────────────
  it('VAL-039 VAL-036 ejercicio propio: nombre de la biblioteca o propio repetido da 409; sin letras, 400', async () => {
    const { martina } = await e.escena();
    const crear = (nombre: string) => e.pedirComo(martina, {
      method: 'POST', url: '/v1/exercises',
      payload: { nombre, grupo_muscular: 'Pecho', equipo: 'Barra', patron: 'empuje', tipo_carga: 'kg', incremento_default_kg: 2.5 },
    });
    const base = await crear('  press de BANCA ');
    expect(esperarError(base, 409, 'CONFLICT', 'nombre')).toBe('«Press de banca» ya está en la biblioteca.');
    const mio = await crear('Press con pausa');
    expect(mio.status).toBe(201);
    expect(base.json.error.details.regla).toBe('nombre_repetido');
    expect((await crear('Press con Pausa')).json.error.message).toBe('Ya tienes un ejercicio llamado «Press con pausa».');
    expect(esperarError(await crear('!!!'), 400, 'VALIDATION_ERROR', 'nombre')).toBe('El nombre necesita al menos una letra.');
    // Renombrar al de la biblioteca también choca; dejar el mismo nombre no.
    const renombrar = (nombre: string) => e.pedirComo(martina, { method: 'PATCH', url: `/v1/exercises/${mio.json.id}`, payload: { nombre } });
    esperarError(await renombrar('Sentadilla trasera'), 409, 'CONFLICT', 'nombre');
    expect((await renombrar('Press con pausa')).status).toBe(200);
  });

  // ── Rutinas ────────────────────────────────────────────────────────────────
  it('VAL-032 rutina: dos días con el mismo nombre o el mismo día de la semana dan 400 en el segundo', async () => {
    const { martina } = await e.escena();
    const crear = (dias: unknown[]) => e.pedirComo(martina, { method: 'POST', url: '/v1/routines', payload: { nombre: 'Fuerza', semanas: 8, dias } });
    const nombre = await crear([{ nombre: 'Pierna A', ejercicios: [ejercicioRutina()] }, { nombre: 'pierna a', ejercicios: [ejercicioRutina()] }]);
    expect(esperarError(nombre, 400, 'VALIDATION_ERROR', 'dias.1.nombre')).toBe('Ya hay otro día con ese nombre.');
    const semana = await crear([{ nombre: 'A', dia_semana: 1, ejercicios: [ejercicioRutina()] }, { nombre: 'B', dia_semana: 1, ejercicios: [ejercicioRutina()] }]);
    expect(esperarError(semana, 400, 'VALIDATION_ERROR', 'dias.1.dia_semana')).toBe('Ya hay otro día el lunes.');
    expect((await crear([{ nombre: 'A', dia_semana: 1, ejercicios: [ejercicioRutina()] }, { nombre: 'B', dia_semana: 4, ejercicios: [ejercicioRutina()] }])).status).toBe(201);
  });

  it('VAL-038 VAL-033 rutina: más de 60 reps con carga da 422; 90 s de plancha sirve; 11 series y 601 s de descanso dan 400', async () => {
    const { martina } = await e.escena();
    const crear = (ej: Record<string, unknown>) =>
      e.pedirComo(martina, { method: 'POST', url: '/v1/routines', payload: { nombre: 'Fuerza', semanas: 8, dias: [{ nombre: 'A', ejercicios: [ejercicioRutina(ej)] }] } });
    const reps = await crear({ reps_max: 61 });
    expect(esperarError(reps, 422, 'BUSINESS_RULE', 'dias.0.ejercicios.0.reps_max')).toBe('Las repeticiones van hasta 60 por serie.');
    expect((await crear({ exercise_id: PLANCHA, reps_min: 60, reps_max: 90 })).status).toBe(201);
    expect(esperarError(await crear({ exercise_id: PLANCHA, reps_min: 60, reps_max: 601 }), 400, 'VALIDATION_ERROR', 'dias.0.ejercicios.0.reps_max')).toBeDefined();
    esperarError(await crear({ series: 11 }), 400, 'VALIDATION_ERROR', 'dias.0.ejercicios.0.series');
    esperarError(await crear({ descanso_s: 601 }), 400, 'VALIDATION_ERROR', 'dias.0.ejercicios.0.descanso_s');
    esperarError(await crear({ reps_min: 12, reps_max: 8 }), 422, 'REPS_RANGE_INVALID', 'dias.0.ejercicios.0.reps_min');
  });

  it('VAL-047 asignar una rutina a un alumno que no es tuyo da 404 y no crea nada', async () => {
    const { camila, diego } = await e.escena();
    const plantilla = await e.pedirComo(camila, { method: 'POST', url: '/v1/routines', payload: { nombre: 'Plantilla', semanas: 4, dias: [{ nombre: 'A', ejercicios: [ejercicioRutina()] }] } });
    expect(plantilla.status).toBe(201);
    esperarError(await e.pedirComo(camila, { method: 'POST', url: `/v1/routines/${plantilla.json.id}/assign`, payload: { client_id: diego.id } }), 404, 'NOT_FOUND');
    expect(await e.prisma.rutina.count({ where: { alumnoId: diego.id } })).toBe(0);
  });

  // ── Sesiones ───────────────────────────────────────────────────────────────
  async function sesionEnCurso(alumno: PersonaDePrueba) {
    const id = idv7();
    const r = await e.pedirComo(alumno, { method: 'POST', url: '/v1/sessions', payload: { id, routine_day_id: null, iniciada_at: '2026-11-17T12:15:00.000Z', device_id: 'tel' } });
    expect(r.status).toBe(201);
    return id;
  }
  const serie = (extra: Record<string, unknown> = {}) => ({ id: idv7(), exercise_id: BANCA, serie_n: 1, peso_kg: 60, reps: 8, rir: 2, completada: true, ...extra });

  it('VAL-031 VAL-030 series: 501 kg da 400; 61 reps con carga y 0 reps sin fallo dan 422; 0 reps al fallo y 90 s de plancha sirven', async () => {
    const { diego } = await e.escena();
    const id = await sesionEnCurso(diego);
    const guardar = (s: Record<string, unknown>) => e.pedirComo(diego, { method: 'PUT', url: `/v1/sessions/${id}/sets`, payload: { series: [serie(s)] } });
    esperarError(await guardar({ peso_kg: 501 }), 400, 'VALIDATION_ERROR', 'series.0.peso_kg');
    esperarError(await guardar({ peso_kg: -2.5 }), 400, 'VALIDATION_ERROR', 'series.0.peso_kg');
    expect(esperarError(await guardar({ reps: 61 }), 422, 'BUSINESS_RULE', 'series.0.reps')).toBe('Las repeticiones van hasta 60 por serie.');
    expect(esperarError(await guardar({ reps: 0 }), 422, 'BUSINESS_RULE', 'series.0.reps')).toContain('al menos 1 repetición');
    expect((await guardar({ reps: 0, fallo: true })).status).toBe(200);
    expect((await guardar({ exercise_id: PLANCHA, peso_kg: 0, reps: 90 })).status).toBe(200);
    expect(await e.prisma.serie.count({ where: { sesionId: id } })).toBe(2);
  });

  it('VAL-048 cerrar: la duración no puede pasar el tiempo entre inicio y cierre; cerrar dos veces da el mismo resumen', async () => {
    const { diego } = await e.escena();
    const id = await sesionEnCurso(diego);
    await e.pedirComo(diego, { method: 'PUT', url: `/v1/sessions/${id}/sets`, payload: { series: [serie()] } });
    const cerrar = (payload: Record<string, unknown>) => e.pedirComo(diego, { method: 'POST', url: `/v1/sessions/${id}/finish`, payload: { cerrada_at: '2026-11-17T13:00:00.000Z', device_id: 'tel', ...payload } });
    // De 12:15 a 13:00 son 2.700 s: 4.000 no puede ser.
    expect(esperarError(await cerrar({ duracion_s: 4000 }), 422, 'BUSINESS_RULE', 'duracion_s')).toBe('La duración no puede ser más larga que el tiempo entre el inicio y el cierre.');
    esperarError(await cerrar({ cerrada_at: '2026-11-17T12:00:00.000Z' }), 422, 'BUSINESS_RULE', 'cerrada_at');
    const primera = await cerrar({ duracion_s: 2700 });
    expect(primera.status).toBe(200);
    const segunda = await cerrar({ duracion_s: 2700 });
    expect(segunda.status).toBe(200);
    expect(segunda.json.session).toEqual(primera.json.session);
    // Desde otro teléfono ya no se puede cerrar ni guardar series.
    esperarError(await cerrar({ device_id: 'otro' }), 409, 'SESSION_CLOSED');
    esperarError(await e.pedirComo(diego, { method: 'PUT', url: `/v1/sessions/${id}/sets`, payload: { series: [serie()] } }), 409, 'SESSION_CLOSED');
  });

  it('VAL-034 observaciones: dolor sin zona o con 0 da 400; zona o intensidad en una observación común, 400', async () => {
    const { martina } = await e.escena();
    const observar = (payload: Record<string, unknown>) => e.pedirComo(martina, { method: 'POST', url: '/v1/observations', payload: { exercise_id: BANCA, texto: 'Molesta', ...payload } });
    expect(esperarError(await observar({ tipo: 'dolor', dolor_intensidad: 6 }), 400, 'VALIDATION_ERROR', 'dolor_zona')).toBe('Indica dónde te duele.');
    esperarError(await observar({ tipo: 'dolor', dolor_zona: 'rodilla', dolor_intensidad: 0 }), 400, 'VALIDATION_ERROR', 'dolor_intensidad');
    esperarError(await observar({ tipo: 'observacion', dolor_intensidad: 4 }), 400, 'VALIDATION_ERROR', 'dolor_intensidad');
    esperarError(await observar({ texto: '   ' }), 400, 'VALIDATION_ERROR', 'texto');
    expect((await observar({ tipo: 'dolor', dolor_zona: 'rodilla', dolor_intensidad: 6 })).status).toBe(201);
  });

  // ── Progreso ───────────────────────────────────────────────────────────────
  it('VAL-020 VAL-021 VAL-022 medidas: fuera de rango o de hace más de un año dan 400; null es «no lo medí» y no borra', async () => {
    const { martina } = await e.escena();
    const medir = (payload: Record<string, unknown>) => e.pedirComo(martina, { method: 'POST', url: '/v1/me/body-metrics', payload });
    expect(esperarError(await medir({ brazo_cm: 150 }), 400, 'VALIDATION_ERROR', 'brazo_cm')).toBe('El brazo va de 15 a 80 cm.');
    expect(esperarError(await medir({ peso_kg: 18 }), 400, 'VALIDATION_ERROR', 'peso_kg')).toBe('El peso va de 30 a 300 kg.');
    expect(esperarError(await medir({ fecha: '2025-11-01', peso_kg: 62 }), 400, 'VALIDATION_ERROR', 'fecha')).toBe('La fecha puede ser de hasta un año atrás.');
    esperarError(await medir({ fecha: '2026-11-18', peso_kg: 62 }), 400, 'VALIDATION_ERROR', 'fecha');
    esperarError(await medir({ cintura_cm: null }), 400, 'VALIDATION_ERROR', 'peso_kg');
    // Lo que manda la app instalada: lo no medido en null.
    expect((await medir({ fecha: '2026-11-17', cintura_cm: 71.5, cadera_cm: 96 })).status).toBe(201);
    const nulo = await medir({ fecha: '2026-11-17', cintura_cm: 72, cadera_cm: null, grasa_pct: null });
    expect(nulo.status).toBe(200);
    expect(nulo.json).toMatchObject({ cintura_cm: 72, cadera_cm: 96, grasa_pct: null });
  });

  it('VAL-023 fotos: la fecha no puede ser futura ni de hace más de un año', async () => {
    const { martina } = await e.escena();
    const pedir = (fecha: string) => e.pedirComo(martina, {
      method: 'POST', url: '/v1/me/photos', payload: { tipo: 'frente', fecha, content_type: 'image/jpeg', bytes: 1000, consentimiento_fotos: true },
    });
    expect(esperarError(await pedir('2026-11-20'), 400, 'VALIDATION_ERROR', 'fecha')).toBe('La fecha no puede ser futura.');
    esperarError(await pedir('2024-01-01'), 400, 'VALIDATION_ERROR', 'fecha');
    expect(await e.prisma.fotoProgreso.count()).toBe(0);
  });

  it('VAL-035 sugerencia: más de 60 repeticiones en un ejercicio con carga da 422; más de 500 kg, 400', async () => {
    const { camila, martina } = await e.escena();
    const rutina = await crearRutina(e.prisma, { duenoId: camila.id, alumnoId: martina.id, dias: [{ nombre: 'Empuje A', ejercicios: [{ slug: 'press-de-banca', series: 3, repsMin: 8, repsMax: 10 }] }] });
    const dia = rutina.dias[0]!;
    const sesionId = await crearSesion(e.prisma, {
      alumnoId: martina.id, cerradaAt: haceDias(AHORA, 2), rutinaId: rutina.id, diaRutinaId: dia.id,
      series: series(3, { ejercicioId: BANCA, ejercicioRutinaId: dia.ejercicios[0]!.id, pesoKg: 45, reps: 10, rir: 2 }),
    });
    const [sug] = await generarSugerenciasDeCierre(e.prisma, sesionId);
    const cambiar = (payload: Record<string, unknown>) => e.pedirComo(camila, { method: 'PATCH', url: `/v1/suggestions/${sug!.id}`, payload });
    expect(esperarError(await cambiar({ reps_min: 8, reps_max: 80 }), 422, 'BUSINESS_RULE', 'reps_max')).toBe('Las repeticiones van hasta 60 por serie.');
    esperarError(await cambiar({ peso_kg: 900 }), 400, 'VALIDATION_ERROR', 'peso_kg');
    expect((await cambiar({ peso_kg: 50, reps_min: 6, reps_max: 8 })).status).toBe(200);
  });

  // ── Alertas ────────────────────────────────────────────────────────────────
  it('VAL-040 VAL-041 motivos: «otro» sin comentario da 400; resolver con «nada» y otra acción, o acciones al marcar vista, 400', async () => {
    const { camila, martina } = await e.escena();
    const a = await e.prisma.alerta.create({ data: { alumnoId: martina.id, entrenadorId: camila.id, tipo: 'baja_rendimiento', detalle: {} } });
    const reportar = (payload: Record<string, unknown>) => e.pedirComo(martina, { method: 'POST', url: '/v1/me/drop-reports', payload: { alert_id: a.id, ...payload } });
    expect(esperarError(await reportar({ motivos: ['otro'] }), 400, 'VALIDATION_ERROR', 'comentario')).toBe('Cuéntanos cuál es el otro motivo.');
    esperarError(await reportar({ motivos: ['sueno', 'sueno'] }), 400, 'VALIDATION_ERROR', 'motivos');
    expect((await reportar({ motivos: ['otro'], comentario: 'Cambio de turno en el trabajo' })).status).toBe(201);
    const resolver = (payload: Record<string, unknown>) => e.pedirComo(camila, { method: 'PATCH', url: `/v1/alerts/${a.id}`, payload });
    expect(esperarError(await resolver({ estado: 'resuelta', acciones: ['nada', 'cargas'] }), 400, 'VALIDATION_ERROR', 'acciones')).toBe('«Nada» no va con otras acciones.');
    esperarError(await resolver({ estado: 'vista', acciones: ['cargas'] }), 400, 'VALIDATION_ERROR', 'acciones');
    expect((await resolver({ estado: 'resuelta', acciones: ['nada'] })).json).toMatchObject({ estado: 'resuelta', acciones: ['nada'] });
  });
});
