import { describe, expect, it } from 'vitest';
import {
  CODIGOS_ERROR, ErrorDeApi, crearClienteCuentas, esquemaIngreso, esquemaRegistro, type FetchMinimo,
} from '../index';

// CON-005: cada código del catálogo tiene el estado que fija la tabla de §API.
describe('CON-005 códigos de error por estado', () => {
  const esperado: Record<string, number> = {
    VALIDATION_ERROR: 400, RESET_TOKEN_INVALID: 400,
    UNAUTHENTICATED: 401, TOKEN_INVALID: 401, TOKEN_EXPIRED: 401, INVALID_CREDENTIALS: 401,
    ACCOUNT_DELETED: 401, REFRESH_INVALID: 401, REFRESH_EXPIRED: 401, REFRESH_REUSED: 401,
    FORBIDDEN: 403, NOT_FOUND: 404, INVITATION_NOT_FOUND: 404,
    EMAIL_TAKEN: 409, SESSION_CLOSED: 409, SESSION_IN_PROGRESS: 409, SESSION_DISCARDED: 409,
    INVITATION_USED: 409, ALREADY_LINKED: 409, EXERCISE_IN_ACTIVE_ROUTINE: 409,
    EXERCISE_HAS_HISTORY: 409, SUGGESTION_USED: 409, CONFLICT: 409,
    CONSENT_REQUIRED: 422, REPS_RANGE_INVALID: 422, EXERCISE_NOT_OWNED: 422,
    ACTIVE_ROUTINE_CONFLICT: 422, ROUTINE_EMPTY: 422, BUSINESS_RULE: 422,
    RATE_LIMITED: 429, INTERNAL_ERROR: 500, SERVICE_UNAVAILABLE: 503,
  };
  it('el catálogo y la tabla tienen los mismos códigos', () => {
    expect(Object.keys(CODIGOS_ERROR).sort()).toEqual(Object.keys(esperado).sort());
  });
  it.each(Object.entries(esperado))('%s responde %i', (codigo, estado) => {
    expect(CODIGOS_ERROR[codigo as keyof typeof CODIGOS_ERROR].estado).toBe(estado);
  });
});

// CON-012: los esquemas de entrada son estrictos.
describe('CON-012 esquemas estrictos', () => {
  it('rechaza un campo de más en el registro', () => {
    const r = esquemaRegistro.safeParse({
      rol: 'client', nombre: 'A', apellido: 'B', email: 'a@gymtrack.test', password: '12345678', owner_id: 'x',
    });
    expect(r.success).toBe(false);
  });
  it('normaliza el correo a minúsculas', () => {
    expect(esquemaIngreso.parse({ email: ' CAMILA.ROJAS@gymtrack.test ', password: 'x' }).email)
      .toBe('camila.rojas@gymtrack.test');
  });
});

describe('cliente de cuentas', () => {
  const respuesta = (status: number, cuerpo: unknown, headers: Record<string, string> = {}) => ({
    status, headers: { get: (n: string) => headers[n.toLowerCase()] ?? null }, json: async () => cuerpo,
  });

  it('convierte el sobre de error en ErrorDeApi con el código y el Retry-After', async () => {
    const fetch: FetchMinimo = async () =>
      respuesta(429, { error: { code: 'RATE_LIMITED', message: 'Espera' } }, { 'retry-after': '42' });
    const cliente = crearClienteCuentas({ urlBase: 'http://api', fetch });
    const error = await cliente.ingresar({ email: 'a@gymtrack.test', password: 'x' }).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorDeApi);
    expect(error).toMatchObject({ estado: 429, codigo: 'RATE_LIMITED', reintentarEnS: 42 });
  });

  it('manda el access en las rutas autenticadas y llama a /v1/me', async () => {
    const llamadas: { url: string; headers: Record<string, string> }[] = [];
    const fetch: FetchMinimo = async (url, init) => {
      llamadas.push({ url, headers: init.headers });
      return respuesta(401, { error: { code: 'TOKEN_EXPIRED', message: 'Venció' } });
    };
    const cliente = crearClienteCuentas({ urlBase: 'http://api', fetch, obtenerAccessToken: () => 'abc' });
    await expect(cliente.perfil()).rejects.toMatchObject({ codigo: 'TOKEN_EXPIRED' });
    expect(llamadas[0]).toEqual({ url: 'http://api/v1/me', headers: { accept: 'application/json', authorization: 'Bearer abc' } });
  });

  it('renueva de a uno: tres llamadas simultáneas con el mismo refresh hacen un solo POST /v1/auth/refresh', async () => {
    const tokens = {
      token_type: 'Bearer', access_token: 'a2', access_vence_at: '2026-11-17T13:15:00.000Z',
      refresh_token: 'r2', refresh_vence_at: '2026-12-17T13:00:00.000Z',
    };
    const cuerpos: string[] = [];
    let soltar!: () => void;
    const espera = new Promise<void>((r) => { soltar = r; });
    const fetch: FetchMinimo = async (_url, init) => {
      cuerpos.push(init.body!);
      await espera;
      return respuesta(200, { tokens });
    };
    const cliente = crearClienteCuentas({ urlBase: 'http://api', fetch });
    const tres = [cliente.renovar('r1'), cliente.renovar('r1'), cliente.renovar('r1')];
    // Otro token mientras hay uno en curso: espera su turno, no sale en paralelo.
    const otro = cliente.renovar('r9');
    await Promise.resolve();
    expect(cuerpos).toEqual([JSON.stringify({ refresh_token: 'r1' })]);
    soltar();
    for (const r of await Promise.all(tres)) expect(r.tokens.refresh_token).toBe('r2');
    await otro;
    expect(cuerpos).toEqual([JSON.stringify({ refresh_token: 'r1' }), JSON.stringify({ refresh_token: 'r9' })]);
    // Terminada, la siguiente renovación vuelve a salir.
    await cliente.renovar('r2');
    expect(cuerpos).toHaveLength(3);
  });

  it('si la renovación en curso falla, todas las que la esperaban reciben el mismo error', async () => {
    let llamadas = 0;
    const fetch: FetchMinimo = async () => {
      llamadas += 1;
      return respuesta(401, { error: { code: 'REFRESH_REUSED', message: 'Inicia sesión de nuevo' } });
    };
    const cliente = crearClienteCuentas({ urlBase: 'http://api', fetch });
    const r = await Promise.allSettled([cliente.renovar('r1'), cliente.renovar('r1')]);
    expect(llamadas).toBe(1);
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected']);
    expect((r[0] as PromiseRejectedResult).reason).toMatchObject({ codigo: 'REFRESH_REUSED' });
  });
});
