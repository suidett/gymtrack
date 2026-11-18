// ─────────────────────────────────────────────────────────────────────────────
// Ayudantes de prueba · Zona: Pruebas (API)
//
// Qué hace: arma la API para una prueba (reloj fijo, buzón en memoria, logs capturados), vacía
// la base antes de cada caso, crea a las personas de datos-de-prueba.md por la API (con la
// contraseña de SEMILLA_CLAVE o una al azar por corrida) y envuelve `app.inject` para revisar en
// cada respuesta 4xx y 5xx el sobre de error y su código (CON-004).
// Tócalo cuando: necesites otra persona o una forma nueva de preparar datos.
// No lo toques para: escribir una prueba (van en los *.test.ts).
// Depende de: src/app.ts, src/config.ts, src/db.ts y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { CODIGOS_ERROR, esquemaSobreError } from '@gymtrack/shared';
import type { FastifyInstance, InjectOptions } from 'fastify';
import { randomBytes } from 'node:crypto';
import { Writable } from 'node:stream';
import { afterAll, beforeAll, beforeEach, describe, expect } from 'vitest';
import { construirApp } from '../src/app';
import { leerConfig } from '../src/config';
import { crearAdaptadorMemoria, crearBuzon, type Buzon } from '../src/correo/desarrollo';
import { crearPrisma, type BaseDeDatos } from '../src/db';
import { crearRelojFijo, type RelojFijo } from '../src/reloj';

// ── Reloj y claves ───────────────────────────────────────────────────────────
/** datos-de-prueba.md: martes 17 de noviembre de 2026, 10:00 en Santiago. */
export const AHORA = '2026-11-17T13:00:00.000Z';
/** Contraseña de las personas: SEMILLA_CLAVE o 12 caracteres al azar por corrida (nunca en el repo). */
export const CLAVE = process.env.SEMILLA_CLAVE ?? randomBytes(9).toString('base64url');
export const HAY_BASE = Boolean(process.env.DATABASE_URL);
/** describe que se salta, con aviso, cuando no hay base. */
export const describeConBase = describe.skipIf(!HAY_BASE);
/** Una URL que no lleva a ninguna base: para armar la API sin conectarse. */
export const URL_SIN_BASE = 'postgresql://nadie:nada@127.0.0.1:1/ninguna?connect_timeout=1';

// ── Personas (datos-de-prueba.md) ────────────────────────────────────────────
export const PERSONAS = {
  camila: { rol: 'trainer', nombre: 'Camila', apellido: 'Rojas', email: 'camila.rojas@gymtrack.test' },
  martina: { rol: 'client', nombre: 'Martina', apellido: 'Fuentes', email: 'martina.fuentes@gymtrack.test' },
  diego: { rol: 'client', nombre: 'Diego', apellido: 'Muñoz', email: 'diego.munoz@gymtrack.test' },
  rodrigo: { rol: 'trainer', nombre: 'Rodrigo', apellido: 'Pérez', email: 'rodrigo.perez@gymtrack.test' },
  gonzalo: { rol: 'client', nombre: 'Gonzalo', apellido: 'Reyes', email: 'gonzalo.reyes@gymtrack.test' },
  sofia: { rol: 'client', nombre: 'Sofía', apellido: 'Lagos', email: 'sofia.lagos@gymtrack.test' },
} as const;
export type Persona = keyof typeof PERSONAS;

// ── Entorno de una prueba ────────────────────────────────────────────────────
export interface Entorno {
  app: FastifyInstance;
  prisma: BaseDeDatos;
  reloj: RelojFijo;
  buzon: Buzon;
  logs: string[];
  pedir: (o: InjectOptions) => Promise<{ status: number; json: any; headers: Record<string, unknown> }>;
  registrar: (p: Persona, extra?: Record<string, unknown>) => Promise<{ usuario: any; tokens: any }>;
  ingresar: (p: Persona, clave?: string) => Promise<{ status: number; json: any }>;
  esperarCorreos: () => Promise<void>;
}

/** Revisa el sobre de error de cualquier respuesta 4xx o 5xx (CON-004). */
export function revisarSobre(status: number, json: unknown) {
  if (status < 400) return;
  const r = esquemaSobreError.safeParse(json);
  expect(r.success, `respuesta ${status} sin el sobre de error: ${JSON.stringify(json)}`).toBe(true);
  if (r.success) expect(CODIGOS_ERROR[r.data.error.code].estado, `código ${r.data.error.code} con estado ${status}`).toBe(status);
}

export async function armarApp(opciones: { url?: string; antesDeListo?: (app: FastifyInstance) => void } = {}) {
  const config = leerConfig({ ...process.env, NODE_ENV: 'test', DATABASE_URL: opciones.url ?? process.env.DATABASE_URL ?? URL_SIN_BASE });
  const prisma = crearPrisma(config.databaseUrl);
  const reloj = crearRelojFijo(AHORA);
  const buzon = crearBuzon();
  const logs: string[] = [];
  const destinoLogs = new Writable({
    write(trozo, _enc, listo) {
      logs.push(String(trozo));
      listo();
    },
  });
  const app = await construirApp({
    config: { ...config, version: 'sha-prueba', commit: 'abc1234' },
    prisma, reloj, destinoLogs,
    correo: { adaptador: crearAdaptadorMemoria(buzon), buzon },
  });
  opciones.antesDeListo?.(app);
  await app.ready();
  const pedir: Entorno['pedir'] = async (o) => {
    const res = await app.inject(o);
    const json = res.body ? JSON.parse(res.body) : undefined;
    revisarSobre(res.statusCode, json);
    return { status: res.statusCode, json, headers: res.headers };
  };
  return { app, prisma, reloj, buzon, logs, pedir };
}

/** Prepara el entorno de un archivo de integración: la app una vez y la base vacía en cada caso. */
export function usarEntorno(): Entorno {
  const e = {} as Entorno;
  beforeAll(async () => {
    Object.assign(e, await armarApp());
    e.registrar = async (p, extra = {}) => {
      const r = await e.pedir({ method: 'POST', url: '/v1/auth/register', payload: { ...PERSONAS[p], password: CLAVE, ...extra } });
      expect(r.status, JSON.stringify(r.json)).toBe(201);
      return r.json;
    };
    e.ingresar = (p, clave = CLAVE) =>
      e.pedir({ method: 'POST', url: '/v1/auth/login', payload: { email: PERSONAS[p].email, password: clave } });
    e.esperarCorreos = () => e.app.gymtrack.correo.esperarPendientes();
  });
  beforeEach(async () => {
    await e.prisma.$executeRaw`TRUNCATE TABLE push_tokens, password_resets, refresh_tokens, users RESTART IDENTITY CASCADE`;
    e.reloj.fijar(AHORA);
    e.buzon.vaciar();
    for (const l of Object.values(e.app.gymtrack.limitadores)) l.vaciar();
  });
  afterAll(async () => {
    await e.app?.close();
    await e.prisma?.$disconnect();
  });
  return e;
}

/** Lee el payload de un JWT sin verificarlo (solo para revisar iat y exp en las pruebas). */
export function payloadJwt(token: string): Record<string, any> {
  return JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'));
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` });
