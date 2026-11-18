// ─────────────────────────────────────────────────────────────────────────────
// Rutas desde el contrato · Zona: Compartido (API)
//
// Qué hace: convierte una definición del catálogo de @gymtrack/shared (RUTAS_EJERCICIOS.listar,
// etc.) en lo que Fastify necesita: esquemaDe(def) arma el `schema` con el MISMO objeto Zod de
// entrada y salida más las respuestas de error (CON-001), y urlDe(def) le quita el `/v1` porque
// los módulos ya se registran bajo ese prefijo. Así ninguna ruta define un esquema propio.
//   app.get(urlDe(R.listar), { schema: esquemaDe(R.listar), preHandler: app.exigirSesion }, manejador)
// Tócalo cuando: cambie cómo se arma el schema de Fastify para todas las rutas.
// No lo toques para: la forma de una ruta (su archivo en packages/shared/src/api).
// Depende de: @gymtrack/shared (DefinicionRuta y RESPUESTAS_ERROR_API).
// ─────────────────────────────────────────────────────────────────────────────
import { RESPUESTAS_ERROR_API, type DefinicionRuta } from '@gymtrack/shared';

export const PREFIJO_API = '/v1';

/** El `schema` de Fastify de una definición, con los tipos de entrada y salida inferidos. */
export type EsquemaFastify<D extends DefinicionRuta> = {
  body: D['cuerpo'];
  querystring: D['query'];
  params: D['params'];
  response: { [K in D['exito']]: D['respuesta'] } & typeof RESPUESTAS_ERROR_API;
};

export function esquemaDe<const D extends DefinicionRuta>(def: D): EsquemaFastify<D> {
  const schema: Record<string, unknown> = { response: { ...RESPUESTAS_ERROR_API, [def.exito]: def.respuesta } };
  if (def.cuerpo) schema.body = def.cuerpo;
  if (def.query) schema.querystring = def.query;
  if (def.params) schema.params = def.params;
  return schema as EsquemaFastify<D>;
}

/** La ruta sin el prefijo `/v1` (el módulo ya está montado ahí). Falla si la ruta no cuelga de /v1. */
export function urlDe(def: Pick<DefinicionRuta, 'ruta'>): string {
  if (!def.ruta.startsWith(`${PREFIJO_API}/`)) {
    throw new Error(`La ruta ${def.ruta} tiene que empezar con ${PREFIJO_API}/ (CON-014)`);
  }
  return def.ruta.slice(PREFIJO_API.length);
}
