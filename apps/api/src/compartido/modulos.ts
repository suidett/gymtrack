// ─────────────────────────────────────────────────────────────────────────────
// Registro automático de módulos · Zona: Compartido (API)
//
// Qué hace: cada carpeta src/modulos/<nombre>/ con un index.ts que exporta por defecto
// `definirModulo(...)` se registra sola bajo /v1, sin tocar app.ts. Al correr desde el código
// fuente (dev con tsx, Vitest) se leen las carpetas; en el build, scripts/construir.mjs fija la
// lista en __MODULOS_API__ y esbuild empaqueta cada index.ts (el import con plantilla de abajo).
// Cada módulo recibe el contexto (base, reloj, configuración, correo y un creador de limitadores
// que las pruebas vacían solas) y una instancia de Fastify con el proveedor de tipos de Zod.
// Las carpetas que empiezan con «_» o «.» se saltan (para borradores).
// Tócalo cuando: el módulo necesite algo más del contexto.
// No lo toques para: escribir las rutas de un módulo (src/modulos/<nombre>/).
// Depende de: Fastify, fastify-type-provider-zod, src/seguridad/limitador.ts y node:fs.
// ─────────────────────────────────────────────────────────────────────────────
import type {
  FastifyBaseLogger, FastifyInstance, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerDefault,
} from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config';
import type { ServicioCorreo } from '../correo';
import type { BaseDeDatos } from '../db';
import type { Reloj } from '../reloj';
import type { Limitador } from '../seguridad/limitador';
import { PREFIJO_API } from './rutas';

// ── Contrato de un módulo ────────────────────────────────────────────────────
export interface ContextoModulo {
  prisma: BaseDeDatos;
  /** La única fuente de «ahora»: nunca uses Date.now() ni new Date() sin argumento. */
  reloj: Reloj;
  config: Config;
  correo: ServicioCorreo;
  /**
   * Un limitador de intentos propio (por ejemplo, 10 códigos fallidos por hora por alumno, P-27).
   * Queda en app.gymtrack.limitadores con ese nombre, así las pruebas lo vacían antes de cada caso.
   */
  crearLimitador: (nombre: string, opciones: { maximo: number; ventanaMs: number }) => Limitador;
}

/** Fastify con los tipos de Zod: `req.body`, `req.query` y `req.params` salen del esquema. */
export type AppModulo = FastifyInstance<
  RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, FastifyBaseLogger, ZodTypeProvider
>;

/** El plugin que exporta por defecto cada src/modulos/<nombre>/index.ts. */
export type PluginModulo = ((app: FastifyInstance, ctx: ContextoModulo) => Promise<void>) & { readonly esModuloGymtrack: true };

/**
 * Envuelve las rutas de un módulo. En src/modulos/<nombre>/index.ts:
 *   export default definirModulo(async (app, ctx) => { app.get(urlDe(R.x), {...}, manejador) });
 */
export function definirModulo(registrar: (app: AppModulo, ctx: ContextoModulo) => Promise<void> | void): PluginModulo {
  const plugin = async (app: FastifyInstance, ctx: ContextoModulo) => {
    await registrar(app.withTypeProvider<ZodTypeProvider>(), ctx);
  };
  return Object.assign(plugin, { esModuloGymtrack: true as const });
}

// ── Descubrimiento ───────────────────────────────────────────────────────────
// En el build esbuild reemplaza este identificador por la lista de carpetas (scripts/construir.mjs).
declare const __MODULOS_API__: readonly string[] | undefined;

const CARPETA_MODULOS = new URL('../modulos/', import.meta.url);

/** Los nombres de las carpetas de src/modulos con index.ts, en orden alfabético. */
export function nombresDeModulos(): string[] {
  if (typeof __MODULOS_API__ !== 'undefined') return [...__MODULOS_API__];
  const carpeta = fileURLToPath(CARPETA_MODULOS);
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .filter((d) => existsSync(fileURLToPath(new URL(`${d.name}/index.ts`, CARPETA_MODULOS))))
    .map((d) => d.name)
    .sort();
}

export async function cargarModulos(): Promise<{ nombre: string; plugin: PluginModulo }[]> {
  return Promise.all(
    nombresDeModulos().map(async (nombre) => {
      const m = (await import(`../modulos/${nombre}/index.ts`)) as { default?: unknown };
      if (typeof m.default !== 'function' || (m.default as Partial<PluginModulo>).esModuloGymtrack !== true) {
        throw new Error(`src/modulos/${nombre}/index.ts tiene que hacer «export default definirModulo(...)»`);
      }
      return { nombre, plugin: m.default as PluginModulo };
    }),
  );
}

/** Registra todos los módulos bajo /v1. La llama app.ts una vez; devuelve los nombres registrados. */
export async function registrarModulos(app: FastifyInstance, ctx: ContextoModulo): Promise<string[]> {
  const modulos = await cargarModulos();
  for (const { plugin } of modulos) {
    await app.register(async (sub) => plugin(sub, ctx), { prefix: PREFIJO_API });
  }
  return modulos.map((m) => m.nombre);
}
