// ─────────────────────────────────────────────────────────────────────────────
// Entorno de prueba de los módulos · Zona: Pruebas (API)
//
// Qué hace: lo que un archivo *.int.test.ts de un módulo llama una vez arriba:
//   const e = usarEntornoApi();
// Arma la API una vez por archivo (todos los módulos de src/modulos registrados, reloj fijo en el
// martes 17 de noviembre de 2026 a las 13:00 UTC, buzón en memoria, logs capturados) y antes de
// cada caso vacía la base, la vuelve a sembrar, devuelve el reloj a AHORA, vacía el buzón y todos
// los limitadores. Trae `pedir` (revisa el sobre de error en cada 4xx y 5xx, CON-004) y
// `pedirComo(persona, ...)`, que firma un access para esa persona con el reloj del momento.
// Tócalo cuando: todos los módulos necesiten algo más en el entorno.
// No lo toques para: la API en sí (src/app.ts) ni las pruebas de cuentas (usan test/ayudantes.ts).
// Depende de: test/ayudantes.ts (armarApp), ./base y ./personas.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance, InjectOptions } from 'fastify';
import { PREFIJO_API } from '../../src/compartido/rutas';
import type { PluginModulo } from '../../src/compartido/modulos';
import { afterAll, beforeAll, beforeEach } from 'vitest';
import { AHORA, armarApp } from '../ayudantes';
import { reiniciarBase } from './base';
import { crearEscena, crearPersona, tokenPara, type Escena, type Persona, type PersonaDePrueba } from './personas';

type Armada = Awaited<ReturnType<typeof armarApp>>;
export type Respuesta = Awaited<ReturnType<Armada['pedir']>>;

export interface EntornoApi extends Armada {
  /** Pide como esa persona: agrega `Authorization: Bearer` con un access firmado ahora. */
  pedirComo: (persona: PersonaDePrueba, o: InjectOptions) => Promise<Respuesta>;
  /** Un access de esa persona firmado con el reloj de la prueba (vale 15 minutos desde ahí). */
  tokenDe: (persona: PersonaDePrueba) => Promise<string>;
  /** Crea una persona de datos-de-prueba.md (camila, martina, diego, rodrigo, gonzalo, sofia). */
  crear: (p: Persona) => Promise<PersonaDePrueba>;
  /** Crea la escena base: Camila, Martina vinculada a Camila y Diego solo. */
  escena: () => Promise<Escena>;
  esperarCorreos: () => Promise<void>;
}

/**
 * Monta un módulo de prueba bajo /v1 con el mismo contexto que los de src/modulos. Úsalo en
 * `antesDeListo` para probar algo de src/compartido sin tocar un módulo real.
 */
export function montarModulo(app: FastifyInstance, plugin: PluginModulo): void {
  app.register(async (sub) => plugin(sub, app.gymtrack.contexto), { prefix: PREFIJO_API });
}

export function usarEntornoApi(opciones: { antesDeListo?: (app: FastifyInstance) => void } = {}): EntornoApi {
  const e = {} as EntornoApi;
  beforeAll(async () => {
    Object.assign(e, await armarApp({ antesDeListo: opciones.antesDeListo }));
    e.tokenDe = (persona) => tokenPara(e.app.gymtrack.firmador, persona, e.reloj.ahora());
    e.pedirComo = async (persona, o) =>
      e.pedir({ ...o, headers: { ...(o.headers ?? {}), authorization: `Bearer ${await e.tokenDe(persona)}` } });
    e.crear = (p) => crearPersona(e.prisma, p);
    e.escena = () => crearEscena(e.prisma);
    e.esperarCorreos = () => e.app.gymtrack.correo.esperarPendientes();
  });
  beforeEach(async () => {
    await reiniciarBase(e.prisma);
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
