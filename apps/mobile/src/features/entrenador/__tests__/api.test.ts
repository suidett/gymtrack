// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de las llamadas del entrenador · Zona: Entrenador (app)
//
// Qué hace: prueba con un `llamar` falso (sin red) que las pantallas del entrenador llamen a las
// rutas de §API con el método, la consulta y el cuerpo correctos: lista de clientes por cursor,
// código de invitación en sus dos formas, alertas abiertas y resueltas, resolver con o sin nota,
// sobrescribir una sugerencia y mandar un consejo. Los ids son los del plan de pruebas.
// Tócalo cuando: cambie una ruta o un cuerpo en ../api.ts.
// Depende de: vitest, ../api y ErrorDeApi de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi, esquemaAlertaCambio, esquemaQueryAlertasEntrenador } from '@gymtrack/shared';
import { describe, expect, it } from 'vitest';
import { crearApiEntrenador, type Llamar } from '../api';
import { esquemaAlerta, esquemaClienteLista, esquemaFicha } from '../contrato';
import { comoSeResolvio } from '../logica';

interface Llamada {
  metodo: string;
  ruta: string;
  cuerpo?: unknown;
  consulta?: Record<string, unknown>;
}

/** `llamar` falso: anota cada llamada y responde con lo que diga `responder`. */
function falso(responder: (l: Llamada, n: number) => unknown) {
  const llamadas: Llamada[] = [];
  const llamar: Llamar = async (metodo, ruta, op = {}) => {
    const l = { metodo, ruta, cuerpo: op.cuerpo, consulta: op.consulta };
    llamadas.push(l);
    const r = responder(l, llamadas.length);
    if (r instanceof Error) throw r;
    return (op.esquema ? op.esquema.parse(r) : r) as never;
  };
  return { llamar, llamadas };
}

describe('Clientes', () => {
  it('CON-008: junta las páginas de GET /v1/trainer/clients siguiendo next_cursor', async () => {
    const { llamar, llamadas } = falso((l) =>
      l.consulta?.cursor
        ? { items: [{ id: 'b', nombre: 'Diego', apellido: 'Araya' }], next_cursor: null }
        : { items: [{ id: 'a', nombre: 'Antonia', apellido: 'Herrera' }], next_cursor: 'c1', adherencia_semana_pasada_pct: 84 },
    );
    const r = await crearApiEntrenador(llamar).listarClientes();
    expect(r.items.map((c) => c.id)).toEqual(['a', 'b']);
    expect(r.adherenciaSemanaPasada).toBe(84);
    expect(llamadas.map((l) => [l.metodo, l.ruta, l.consulta])).toEqual([
      ['GET', '/v1/trainer/clients', { limit: 100 }],
      ['GET', '/v1/trainer/clients', { limit: 100, cursor: 'c1' }],
    ]);
  });

  it('APP-041: desvincular llama a DELETE /v1/trainer/clients/:id', async () => {
    const { llamar, llamadas } = falso(() => undefined);
    await crearApiEntrenador(llamar).desvincular('0192c-mf');
    expect(llamadas).toEqual([{ metodo: 'DELETE', ruta: '/v1/trainer/clients/0192c-mf', cuerpo: undefined, consulta: undefined }]);
  });
});

describe('Código de invitación', () => {
  it('APP-039: acepta { codigo, vence_at } y { invitacion: {...} }', async () => {
    const plano = falso(() => ({ codigo: 'K7P2QX', vence_at: '2026-11-24T09:41:00-03:00' }));
    expect(await crearApiEntrenador(plano.llamar).crearInvitacion()).toEqual({ codigo: 'K7P2QX', vence_at: '2026-11-24T09:41:00-03:00' });
    expect(plano.llamadas[0]).toMatchObject({ metodo: 'POST', ruta: '/v1/trainer/invitations' });
    const envuelto = falso(() => ({ invitacion: { codigo: 'R4M8TD', vence_at: '2026-11-24T09:41:00-03:00' } }));
    expect((await crearApiEntrenador(envuelto.llamar).crearInvitacion()).codigo).toBe('R4M8TD');
  });

  it('APP-039: lee el último código con GET /v1/trainer/invitations (null si nunca pidió)', async () => {
    const con = falso(() => ({
      invitacion: { codigo: 'H4M9TB', vence_at: '2026-11-15T09:00:00-03:00', estado: 'invitado', vigente: false, created_at: '2026-11-08T09:00:00-03:00' },
    }));
    expect(await crearApiEntrenador(con.llamar).invitacionActual()).toEqual({
      codigo: 'H4M9TB',
      vence_at: '2026-11-15T09:00:00-03:00',
      estado: 'invitado',
      vigente: false,
    });
    expect(con.llamadas[0]).toMatchObject({ metodo: 'GET', ruta: '/v1/trainer/invitations' });
    const sin = falso(() => ({ invitacion: null }));
    expect(await crearApiEntrenador(sin.llamar).invitacionActual()).toBeNull();
  });
});

describe('Alertas', () => {
  it('APP-042: pide las abiertas por defecto y las resueltas con estado=resueltas (esquemaQueryAlertasEntrenador)', async () => {
    const { llamar, llamadas } = falso(() => ({ items: [], next_cursor: null }));
    const api = crearApiEntrenador(llamar);
    await api.listarAlertas();
    await api.listarAlertas(true);
    expect(llamadas.map((l) => l.consulta)).toEqual([{ limit: 100 }, { estado: 'resueltas', limit: 100 }]);
    expect(esquemaQueryAlertasEntrenador.safeParse(llamadas[1]?.consulta).success).toBe(true);
  });

  it('APP-042: marcar vista y resolver con lo marcado van por PATCH /v1/alerts/:id con acciones', async () => {
    const { llamar, llamadas } = falso(() => ({}));
    const api = crearApiEntrenador(llamar);
    await api.cambiarEstadoAlerta('a1', 'vista');
    await api.cambiarEstadoAlerta('a2', 'resuelta', ['cargas', 'consejo']);
    await api.cambiarEstadoAlerta('a3', 'resuelta', []);
    expect(llamadas.map((l) => [l.metodo, l.ruta, l.cuerpo])).toEqual([
      ['PATCH', '/v1/alerts/a1', { estado: 'vista' }],
      ['PATCH', '/v1/alerts/a2', { estado: 'resuelta', acciones: ['cargas', 'consejo'] }],
      ['PATCH', '/v1/alerts/a3', { estado: 'resuelta' }],
    ]);
    // CON-012: el cuerpo pasa el esquema estricto de la API.
    for (const l of llamadas) expect(esquemaAlertaCambio.safeParse(l.cuerpo).success).toBe(true);
  });

  it('APP-042: la alerta que manda la API (client, exercise, reporte, acciones) se lee con sus nombres', () => {
    const a = esquemaAlerta.parse({
      id: 'a1', tipo: 'baja_rendimiento', estado: 'resuelta', client: { id: 'c1', nombre: 'Martina', apellido: 'Soto' },
      exercise: { id: 'e1', nombre: 'Press de banca' }, detalle: { valor: 900, promedio: 1000 }, pide_motivos: false,
      reporte: { id: 'r1', motivos: ['sueno'], comentario: null, consejos_mostrados: 3, created_at: '2026-11-16T12:00:00Z' },
      acciones: ['cargas'], created_at: '2026-11-15T12:00:00Z', vista_at: null, resuelta_at: '2026-11-16T13:00:00Z',
    });
    expect(a.cliente).toEqual({ id: 'c1', nombre: 'Martina', apellido: 'Soto' });
    expect(a.ejercicio).toEqual({ id: 'e1', nombre: 'Press de banca' });
    expect(a.motivos?.lista).toEqual(['sueno']);
    expect(comoSeResolvio(a)).toBe('Ajustaste las cargas');
  });

  it('APP-042: otro error al resolver se informa y no se repite', async () => {
    const { llamar, llamadas } = falso(() => new ErrorDeApi(404, 'NOT_FOUND' as never, 'No existe'));
    await expect(crearApiEntrenador(llamar).cambiarEstadoAlerta('a9', 'resuelta', ['nada'])).rejects.toBeInstanceOf(ErrorDeApi);
    expect(llamadas).toHaveLength(1);
  });
});

describe('Ajustar cargas y consejos', () => {
  it('APP-043: sobrescribir manda peso y rango por PATCH /v1/suggestions/:id', async () => {
    const { llamar, llamadas } = falso(() => ({}));
    await crearApiEntrenador(llamar).sobrescribir('s1', { peso_kg: 20, reps_min: 10, reps_max: 12, nota: 'Bajamos a 20 para sacar 3 series limpias.' });
    expect(llamadas[0]).toMatchObject({
      metodo: 'PATCH',
      ruta: '/v1/suggestions/s1',
      cuerpo: { peso_kg: 20, reps_min: 10, reps_max: 12, nota: 'Bajamos a 20 para sacar 3 series limpias.' },
    });
  });

  it('APP-043: las sugerencias se leen aunque la API mande una lista suelta', async () => {
    const s = { id: 's1', nombre: 'Press militar con barra', sugerencia: { peso_kg: 42.5, reps_min: 6, reps_max: 8 } };
    const suelta = falso(() => [s]);
    const r = await crearApiEntrenador(suelta.llamar).listarSugerencias('mf');
    expect(r.items[0]?.nombre).toBe('Press militar con barra');
    expect(r.proxima_sesion).toBeNull();
    expect(suelta.llamadas[0]?.ruta).toBe('/v1/clients/mf/suggestions');
  });

  it('APP-041: el consejo va como observación de tipo consejo, con el cliente y sobre qué es', async () => {
    const { llamar, llamadas } = falso(() => ({}));
    await crearApiEntrenador(llamar).enviarConsejo({ clienteId: 'mf', texto: '  Baja a 37,5 esta semana.  ', sessionId: 'ses1', exerciseId: 'ej1' });
    expect(llamadas[0]).toMatchObject({
      metodo: 'POST',
      ruta: '/v1/observations',
      cuerpo: { tipo: 'consejo', texto: 'Baja a 37,5 esta semana.', client_id: 'mf', session_id: 'ses1', exercise_id: 'ej1' },
    });
  });
});

describe('Forma real de la API del entrenador', () => {
  it('APP-040: la fila de GET /trainer/clients (rutina, adherencia_semana, ultima_sesion) llega a lo que muestra Clientes', () => {
    const c = esquemaClienteLista.parse({
      id: 'c1', nombre: 'Martina', apellido: 'Soto', estado: 'activo', vinculado_at: '2026-10-01T12:00:00Z',
      rutina: { id: 'r1', nombre: 'Fuerza', metodo_progresion: 'doble_progresion', dias_por_semana: 4 }, sin_rutina: false, entrena_hoy: true,
      ultima_sesion: { id: 's1', estado: 'cerrada', iniciada_at: '2026-11-16T21:00:00Z', cerrada_at: '2026-11-16T22:00:00Z', dia_nombre: 'Pierna A' },
      adherencia_semana: { semana_inicio: '2026-11-16', hechas: 1, planificadas: 4, pct: 25 }, alertas_abiertas: 1, alertas_nuevas: 1, revisar: true,
    });
    expect(c.rutina_activa).toEqual({ id: 'r1', nombre: 'Fuerza', dias_semana: 4 });
    expect(c.adherencia_semana_pct).toBe(25);
    expect(c.semana).toEqual({ hechas: 1, perdidas: 0, planificadas: 4 });
    expect(c.ultima_sesion_at).toBe('2026-11-16T22:00:00Z');
    expect(c.ultima_sesion_nombre).toBe('Pierna A');
  });

  it('APP-041: la ficha de la API (mes, medidas.ultima, ultimas_sesiones con dia_nombre) se lee completa', () => {
    const f = esquemaFicha.parse({
      cliente: { id: 'c1', nombre: 'Martina', apellido: 'Soto', timezone: 'America/Santiago', unidades: 'kg', vinculado_at: null, cuenta_creada_at: '2026-10-01T12:00:00Z' },
      rutina_activa: {
        id: 'r1', nombre: 'Fuerza', metodo_progresion: 'doble_progresion', semanas: 8, semana_actual: 3, version: 2, activada_at: null, owner_id: 't1',
        dias: [{ id: 'd1', nombre: 'Pierna A', orden: 0, dia_semana: 2 }, { id: 'd2', nombre: 'Empuje', orden: 1, dia_semana: 4 }],
      },
      adherencia_semana: { semana_inicio: '2026-11-16', hechas: 1, planificadas: 2, pct: 50 },
      mes: { sesiones: 9, volumen_kg: 41000, prs: 3 },
      ultimas_sesiones: [{ id: 's1', estado: 'cerrada', dia_nombre: 'Pierna A', iniciada_at: '2026-11-16T21:00:00Z', cerrada_at: '2026-11-16T22:00:00Z', duracion_s: 3600, volumen_kg: 5000, series_completadas: 12 }],
      prs: [],
      medidas: { ultima: { id: 'm1', fecha: '2026-11-15', peso_kg: 63.4, cintura_cm: 70, cadera_cm: null, pecho_cm: null, brazo_cm: null, muslo_cm: null, grasa_pct: null, nota: null, updated_at: '2026-11-15T12:00:00Z' }, registros: 4, tendencia: { peso_kg: { actual: 63.4, fecha: '2026-11-15', referencia: 64, fecha_referencia: '2026-10-16', cambio: -0.6 } } },
      fotos: 2, encuesta: null, observaciones: [], alertas: [],
    });
    expect(f.sesiones_mes).toBe(9);
    expect(f.records_mes).toBe(3);
    expect(f.rutina_activa?.semana_dias).toEqual(['descanso', 'plan', 'descanso', 'plan', 'descanso', 'descanso', 'descanso']);
    expect(f.ultimas_sesiones[0]).toMatchObject({ nombre: 'Pierna A', cerrada_at: '2026-11-16T22:00:00Z' });
    expect(f.peso).toMatchObject({ actual_kg: 63.4, ultimos_30_dias_kg: -0.6 });
    expect(f.medidas).toMatchObject({ fecha: '2026-11-15', cintura_cm: 70 });
  });
});
