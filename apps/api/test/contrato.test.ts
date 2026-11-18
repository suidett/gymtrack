// Contrato entre la app y la API (plan-de-validacion.md, CON). No necesitan base: la API se arma
// con una URL que no lleva a ninguna y estas pruebas no llegan a consultarla.
import {
  crearClienteCuentas, esquemaUsuario, LISTA_RUTAS_API, RESPUESTAS_ERROR, RUTAS_CUENTAS, type FetchMinimo,
} from '@gymtrack/shared';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { armarApp, CLAVE, describeConBase, URL_SIN_BASE, usarEntorno } from './ayudantes';

type Armada = Awaited<ReturnType<typeof armarApp>>;

describe('Contrato sin base', () => {
  let a: Armada;
  beforeAll(async () => {
    a = await armarApp({ url: URL_SIN_BASE });
  });
  afterAll(async () => {
    await a.app.close();
    await a.prisma.$disconnect();
  });

  it('CON-001 cada ruta registrada usa el esquema de entrada y de salida de @gymtrack/shared', () => {
    // Todas las rutas de todos los módulos (CATALOGO_API en packages/shared/src/api/index.ts).
    const catalogo = LISTA_RUTAS_API;
    const rutas = a.app.gymtrack.rutas;
    expect(rutas).toHaveLength(catalogo.length);
    for (const r of rutas) {
      const c = catalogo.find((x) => x.ruta === r.url && x.metodo === r.metodo);
      expect(c, `${r.metodo} ${r.url} está en CATALOGO_API`).toBeDefined();
      const schema = r.schema as { body?: unknown; querystring?: unknown; params?: unknown; response: Record<string, unknown> };
      // El mismo objeto, no una copia: ninguna ruta define un esquema propio en apps/api.
      expect(schema.body).toBe(c!.cuerpo);
      expect(schema.querystring).toBe(c!.query);
      expect(schema.params).toBe(c!.params);
      expect(schema.response[c!.exito]).toBe(c!.respuesta);
      for (const [estado, esquema] of Object.entries(RESPUESTAS_ERROR)) expect(schema.response[estado]).toBe(esquema);
    }
  });

  it('CON-002 una respuesta que no cumple su esquema de salida falla con la ruta y el campo', async () => {
    const rota = await armarApp({
      url: URL_SIN_BASE,
      antesDeListo: (app) => {
        app.withTypeProvider<ZodTypeProvider>().get(
          '/v1/prueba-rota',
          { schema: { response: { 200: esquemaUsuario, ...RESPUESTAS_ERROR } } },
          async () => ({ id: 'no-es-uuid' }) as never,
        );
      },
    });
    const r = await rota.pedir({ method: 'GET', url: '/v1/prueba-rota' });
    expect(r.status).toBe(500);
    expect(r.json.error.code).toBe('INTERNAL_ERROR');
    expect(r.json.error.details.ruta).toBe('GET /v1/prueba-rota');
    expect(r.json.error.details.issues.map((i: { campo: string }) => i.campo)).toContain('email');
    await rota.app.close();
    await rota.prisma.$disconnect();
  });

  it('CON-004 las respuestas 4xx y 5xx traen el sobre { error: { code, message, details } } con un código del catálogo', async () => {
    // a.pedir revisa el sobre en cada respuesta >= 400 (lo mismo hace en toda la suite INT).
    const casos = [
      await a.pedir({ method: 'GET', url: '/v1/no-existe' }),
      await a.pedir({ method: 'GET', url: '/v1/me' }),
      await a.pedir({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer basura' } }),
      await a.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: 'malo' } }),
      await a.pedir({ method: 'POST', url: '/v1/auth/login', headers: { 'content-type': 'application/json' }, payload: '{no es json' }),
      await a.pedir({ method: 'GET', url: '/health' }),
    ];
    expect(casos.map((c) => c.status)).toEqual([404, 401, 401, 400, 400, 503]);
    expect(casos.map((c) => c.json.error.code)).toEqual([
      'NOT_FOUND', 'UNAUTHENTICATED', 'TOKEN_INVALID', 'VALIDATION_ERROR', 'VALIDATION_ERROR', 'SERVICE_UNAVAILABLE',
    ]);
  });

  it('CON-012 los esquemas de entrada son estrictos: un campo de más da 400 antes de tocar la base', async () => {
    const r = await a.pedir({
      method: 'POST', url: '/v1/auth/register',
      payload: { rol: 'client', nombre: 'A', apellido: 'B', email: 'a@gymtrack.test', password: CLAVE, estado: 'activo' },
    });
    expect(r.status).toBe(400);
    expect(r.json.error.details.campo).toBe('estado');
  });

  it('CON-014 todas las rutas cuelgan de /v1 salvo /health', async () => {
    const sinPrefijo = await a.pedir({ method: 'POST', url: '/auth/login', payload: { email: 'a@gymtrack.test', password: 'x' } });
    expect(sinPrefijo.status).toBe(404);
    expect((await a.pedir({ method: 'GET', url: '/me' })).status).toBe(404);
    expect(a.app.hasRoute({ method: 'GET', url: '/health' })).toBe(true);
    for (const r of Object.values(RUTAS_CUENTAS)) if (r.ruta !== '/health') expect(r.ruta.startsWith('/v1/')).toBe(true);
  });
});

// El cliente tipado de shared contra la API real: si los dos se desincronizan, esto falla.
describeConBase('Cliente de cuentas contra la API', () => {
  const e = usarEntorno();
  it('registra, lee el perfil, renueva y cierra sesión con el cliente de @gymtrack/shared', async () => {
    let access: string | null = null;
    const fetch: FetchMinimo = async (url, init) => {
      const res = await e.app.inject({
        method: init.method as 'GET', url: new URL(url).pathname, headers: init.headers, payload: init.body,
      });
      return { status: res.statusCode, headers: { get: (n) => (res.headers[n.toLowerCase()] as string) ?? null }, json: async () => res.json() };
    };
    const cliente = crearClienteCuentas({ urlBase: 'http://api.local', fetch, obtenerAccessToken: () => access });
    const sesion = await cliente.registrar({ rol: 'client', nombre: 'Diego', apellido: 'Muñoz', email: 'diego.munoz@gymtrack.test', password: CLAVE });
    access = sesion.tokens.access_token;
    expect((await cliente.perfil()).email).toBe('diego.munoz@gymtrack.test');
    const { tokens } = await cliente.renovar(sesion.tokens.refresh_token);
    await expect(cliente.renovar(sesion.tokens.refresh_token)).rejects.toMatchObject({ codigo: 'REFRESH_REUSED', estado: 401 });
    await expect(cliente.cerrarSesion(tokens.refresh_token)).resolves.toEqual({ cerrada: true });
    expect((await cliente.salud()).estado).toBe('ok');
  });
});
