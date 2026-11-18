// ─────────────────────────────────────────────────────────────────────────────
// Pruebas de CORS para la app web publicada · Zona: Pruebas (API)
//
// Qué hace: arma la API sin base (nada de esto la toca) con CORS_ORIGENES como en el VPS y
// revisa que el navegador del iPhone, desde https://gymtrack-app-5dd46.web.app, pueda llamar
// (preflight, respuesta y errores legibles) y que ningún otro origen reciba permiso.
// WEB-003: solo el origen de la app web publicada; ni localhost, ni firebaseapp.com, ni http, ni
// un dominio parecido. La app nativa (sin Origin) sigue igual.
// WEB-004: CORS_ORIGENES mal escrito no deja arrancar la API; la barra final y las mayúsculas se
// arreglan solas.
// Tócalo cuando: cambie quién puede llamar a la API desde un navegador.
// No lo toques para: el CORS de Expo web en localhost (integracion.int.test.ts, INFRA-CORS).
// Depende de: src/app.ts, src/config.ts y ./ayudantes (URL_SIN_BASE, AHORA).
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { construirApp, leerOrigenesCors } from '../src/app';
import { leerConfig } from '../src/config';
import { crearAdaptadorMemoria, crearBuzon } from '../src/correo/desarrollo';
import { crearPrisma, type BaseDeDatos } from '../src/db';
import { crearRelojFijo } from '../src/reloj';
import { AHORA, URL_SIN_BASE } from './ayudantes';

const APP_WEB = 'https://gymtrack-app-5dd46.web.app';

async function armar(corsOrigenes: string) {
  const config = leerConfig({ NODE_ENV: 'test', DATABASE_URL: URL_SIN_BASE, LOG_LEVEL: 'silent', CORS_ORIGENES: corsOrigenes });
  const prisma = crearPrisma(config.databaseUrl);
  const buzon = crearBuzon();
  const app = await construirApp({ config, prisma, reloj: crearRelojFijo(AHORA), correo: { adaptador: crearAdaptadorMemoria(buzon), buzon } });
  return { app, prisma };
}

const preflight = (app: FastifyInstance, origin: string) =>
  app.inject({
    method: 'OPTIONS',
    url: '/v1/auth/login',
    headers: { origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization, content-type' },
  });

describe('WEB-003 la API solo deja llamar a la app web publicada', () => {
  let app: FastifyInstance;
  let prisma: BaseDeDatos;
  beforeAll(async () => {
    ({ app, prisma } = await armar(APP_WEB));
    await app.ready();
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('WEB-003 el preflight desde la app web recibe permiso para POST con authorization y content-type', async () => {
    const r = await preflight(app, APP_WEB);
    expect(r.statusCode).toBe(204);
    expect(r.headers['access-control-allow-origin']).toBe(APP_WEB);
    expect(String(r.headers['access-control-allow-methods'])).toContain('POST');
    expect(String(r.headers['access-control-allow-headers'])).toContain('authorization');
    expect(String(r.headers['access-control-allow-headers'])).toContain('content-type');
    expect(r.headers.vary).toBe('Origin');
  });

  it('WEB-003 un error de la API llega legible a la app web (400 con el sobre y el permiso)', async () => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/login', headers: { origin: APP_WEB }, payload: {} });
    expect(r.statusCode).toBe(400);
    expect(r.headers['access-control-allow-origin']).toBe(APP_WEB);
    expect(String(r.headers['access-control-expose-headers'])).toContain('retry-after');
    expect(r.json().error.code).toBeTruthy();
  });

  it.each([
    ['localhost con CORS_ORIGENES puesto', 'http://localhost:8081'],
    ['el otro dominio de Firebase', 'https://gymtrack-app-5dd46.firebaseapp.com'],
    ['la misma app por http', 'http://gymtrack-app-5dd46.web.app'],
    ['un dominio que termina parecido', 'https://gymtrack-app-5dd46.web.app.otro.example'],
    ['un dominio que empieza parecido', 'https://otro-gymtrack-app-5dd46.web.app'],
    ['las maquetas', 'https://gymtrack-5dd46.web.app'],
    ['un archivo local', 'null'],
  ])('WEB-003 %s no recibe permiso', async (_caso, origen) => {
    const pre = await preflight(app, origen);
    expect(pre.headers['access-control-allow-origin']).toBeUndefined();
    expect(pre.headers['access-control-allow-methods']).toBeUndefined();
    expect(pre.headers.vary).toBe('Origin');
    const r = await app.inject({ method: 'POST', url: '/v1/auth/login', headers: { origin: origen }, payload: {} });
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('WEB-003 la app nativa (sin Origin) no cambia: sin cabeceras de CORS', async () => {
    const r = await app.inject({ method: 'POST', url: '/v1/auth/login', payload: {} });
    expect(r.statusCode).toBe(400);
    expect(r.headers['access-control-allow-origin']).toBeUndefined();
    expect(r.headers.vary).toBeUndefined();
  });
});

describe('WEB-004 CORS_ORIGENES mal escrito no deja arrancar la API', () => {
  it('WEB-004 la barra final y las mayúsculas se arreglan; se aceptan varios orígenes', () => {
    expect([...leerOrigenesCors(['https://GymTrack-App-5dd46.web.app/', 'https://gymtrack-staging.web.app'], true)]).toEqual([
      APP_WEB,
      'https://gymtrack-staging.web.app',
    ]);
  });

  it.each([
    ['el comodín', '*'],
    ['un comodín en el dominio', 'https://*.web.app'],
    ['sin esquema', 'gymtrack-app-5dd46.web.app'],
    ['con ruta', 'https://gymtrack-app-5dd46.web.app/ingreso'],
    ['con consulta', 'https://gymtrack-app-5dd46.web.app/?a=1'],
    ['con usuario y clave', 'https://yo:clave@gymtrack-app-5dd46.web.app'],
    ['null', 'null'],
    ['otro esquema', 'ftp://gymtrack-app-5dd46.web.app'],
  ])('WEB-004 rechaza %s', (_caso, origen) => {
    expect(() => leerOrigenesCors([origen], false)).toThrow(/CORS_ORIGENES/);
  });

  it('WEB-004 http solo fuera de producción', () => {
    expect([...leerOrigenesCors(['http://192.168.1.20:8081'], false)]).toEqual(['http://192.168.1.20:8081']);
    expect(() => leerOrigenesCors(['http://gymtrack-app-5dd46.web.app'], true)).toThrow(/CORS_ORIGENES/);
  });

  it('WEB-004 la API no arranca con un origen mal escrito', async () => {
    await expect(armar('https://gymtrack-app-5dd46.web.app/ingreso')).rejects.toThrow(/CORS_ORIGENES/);
  });
});
