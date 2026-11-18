// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de integración entre módulos · Zona: Pruebas (API)
//
// Qué hace: prueba lo que une a los módulos y que ninguno prueba solo: GET /v1/me y el ingreso
// leen el vínculo y la encuesta (cuentas + perfil), y cerrar una sesión por la API corre la
// detección de alertas (sesiones + alertas). Ids del plan: INT-002, INT-022, INT-099. También el
// CORS de la versión web (Expo web en localhost; CORS_ORIGENES en staging).
// Tócalo cuando: cambie cómo se conectan cuentas, perfil, sesiones o alertas.
// No lo toques para: las reglas de cada módulo (cada uno tiene su archivo en test/<módulo>).
// Depende de: ./ayudas y ./progreso/datos.
// ─────────────────────────────────────────────────────────────────────────────
import { expect, it } from 'vitest';
import { AHORA, CLAVE, describeConBase, idEjercicioBase, PERSONAS, usarEntornoApi, uuidV7Fijo } from './ayudas';
import { crearSesion, haceDias, series } from './progreso/datos';

const BANCA = idEjercicioBase('press-de-banca');

const ENCUESTA = {
  objetivo: 'ganar_masa',
  experiencia: 'uno_a_tres_anos',
  dias_semana: 4,
  lugar: 'gimnasio_completo',
  minutos_sesion: 60,
  fecha_nacimiento: '1997-03-12',
  altura_cm: 165,
  peso_kg: 63.4,
  lesiones: { zonas: ['ninguna'] },
};

describeConBase('Integración entre módulos', () => {
  const e = usarEntornoApi();

  it('INT-002 INT-022 GET /me y el ingreso dicen si falta la encuesta y quién es el entrenador del vínculo', async () => {
    const camila = await e.crear('camila');
    const registro = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS.sofia, password: CLAVE } });
    expect(registro.status).toBe(201);
    expect(registro.json.usuario).toMatchObject({ encuesta_pendiente: true, entrenador: null });
    const token = registro.json.tokens.access_token as string;
    const comoSofia = (o: Parameters<typeof e.pedir>[0]) => e.pedir({ ...o, headers: { authorization: `Bearer ${token}` } });

    const codigo = (await e.pedirComo(camila, { method: 'POST', url: '/v1/trainer/invitations' })).json.codigo as string;
    const encuesta = await comoSofia({
      method: 'POST',
      url: '/v1/me/survey',
      payload: { consentimiento_salud: true, politica_version: '1', respuestas: { ...ENCUESTA, codigo_entrenador: codigo.toLowerCase() } },
    });
    expect(encuesta.status).toBe(201);

    const me = await comoSofia({ method: 'GET', url: '/v1/me' });
    expect(me.status).toBe(200);
    expect(me.json).toMatchObject({ encuesta_pendiente: false, entrenador: { id: camila.id, nombre: 'Camila', apellido: 'Rojas' } });

    const login = await e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: PERSONAS.sofia.email, password: CLAVE } });
    expect(login.json.usuario).toMatchObject({ encuesta_pendiente: false, entrenador: { id: camila.id } });

    // El entrenador nunca tiene encuesta pendiente ni entrenador.
    const deCamila = await e.pedirComo(camila, { method: 'GET', url: '/v1/me' });
    expect(deCamila.json).toMatchObject({ encuesta_pendiente: false, entrenador: null });
  });

  it('INT-099 cerrar por POST /sessions/:id/finish la tercera sesión sin superar el mejor 1RM crea el estancamiento', async () => {
    const { camila, martina } = await e.escena();
    // Mejor 1RM de 80 (60 × 10) y dos sesiones sin superarlo, como en la semilla `estancamiento`.
    for (const [i, pesoKg] of [60, 58.5, 60].entries()) {
      await crearSesion(e.prisma, { alumnoId: martina.id, cerradaAt: haceDias(AHORA, (3 - i) * 3), series: series(3, { ejercicioId: BANCA, pesoKg, reps: 10 }) });
    }
    const id = uuidV7Fijo(AHORA, 'sesion-int-099');
    const inicio = new Date(new Date(AHORA).getTime() - 3_600_000).toISOString();
    const creada = await e.pedirComo(martina, { method: 'POST', url: '/v1/sessions', payload: { id, routine_day_id: null, iniciada_at: inicio } });
    expect(creada.status).toBe(201);
    const lote = {
      series: [1, 2, 3].map((n) => ({
        id: uuidV7Fijo(AHORA, `serie-int-099-${n}`), exercise_id: BANCA, serie_n: n, peso_kg: 57.5, reps: 10, rir: 2, completada: true,
      })),
    };
    expect((await e.pedirComo(martina, { method: 'PUT', url: `/v1/sessions/${id}/sets`, payload: lote })).status).toBe(200);
    const cierre = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${id}/finish`, payload: { cerrada_at: new Date(AHORA).toISOString() } });
    expect(cierre.status).toBe(200);
    expect(cierre.json.alertas_creadas).toEqual([{ tipo: 'estancamiento', exercise_id: BANCA, nombre: 'Press de banca' }]);
    const alerta = await e.prisma.alerta.findFirstOrThrow({ where: { alumnoId: martina.id, tipo: 'estancamiento' } });
    expect(alerta.entrenadorId).toBe(camila.id);

    // El reintento del cierre devuelve el mismo resumen y no repite la alerta (INT-100).
    const otra = await e.pedirComo(martina, { method: 'POST', url: `/v1/sessions/${id}/finish`, payload: { cerrada_at: new Date(AHORA).toISOString() } });
    expect(otra.json.alertas_creadas).toHaveLength(1);
    expect(await e.prisma.alerta.count({ where: { alumnoId: martina.id } })).toBe(1);
  });

  it('INFRA-CORS (sin id en el plan) Expo web en localhost puede llamar a la API (preflight y respuesta); un origen ajeno no recibe permiso', async () => {
    const pre = await e.pedir({
      method: 'OPTIONS', url: '/v1/auth/login',
      headers: { origin: 'http://localhost:8081', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    expect(String(pre.headers['access-control-allow-headers'])).toContain('authorization');
    const salud = await e.pedir({ method: 'GET', url: '/health', headers: { origin: 'http://127.0.0.1:19006' } });
    expect(salud.headers['access-control-allow-origin']).toBe('http://127.0.0.1:19006');
    const ajeno = await e.pedir({ method: 'GET', url: '/health', headers: { origin: 'https://otro-sitio.example' } });
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });
});
