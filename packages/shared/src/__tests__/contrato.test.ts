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
    FORBIDDEN: 403, NOT_FOUND: 404, EMAIL_TAKEN: 409, RATE_LIMITED: 429,
    INTERNAL_ERROR: 500, SERVICE_UNAVAILABLE: 503,
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
});
