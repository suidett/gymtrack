// ─────────────────────────────────────────────────────────────────────────────
// Paginación por cursor · Zona: Compartido (API)
//
// Qué hace: arma las listas de §API (`?limit=50&cursor=...` y `{ items, next_cursor }`; CON-008)
// del lado de la API. El cursor es opaco para la app: JSON en base64url con lo que la lista
// necesita para seguir (por ejemplo `{ id }` o `{ cerrada_at, id }`). Un cursor roto o inventado
// da 400 con `details.campo = cursor`. La forma de la query y de la respuesta está en
// packages/shared/src/api/comun.ts (esquemaPaginacion y esquemaPagina).
// Tócalo cuando: haga falta otra forma de recorrer una lista que usen varios módulos.
// No lo toques para: el tope de limit (comun.ts del paquete compartido).
// Depende de: zod y ./errores.
// ─────────────────────────────────────────────────────────────────────────────
import type { Pagina } from '@gymtrack/shared';
import { z } from 'zod';
import { campoInvalido } from './errores';

// ── Cursor ───────────────────────────────────────────────────────────────────
export function codificarCursor(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor), 'utf8').toString('base64url');
}

/** Lee el cursor con su esquema. Sin cursor devuelve undefined; uno inválido lanza 400. */
export function leerCursor<T>(cursor: string | undefined, esquema: z.ZodType<T>): T | undefined {
  if (cursor === undefined) return undefined;
  let crudo: unknown;
  try {
    crudo = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    campoInvalido('cursor', 'El cursor no es válido.');
  }
  const r = esquema.safeParse(crudo);
  if (!r.success) campoInvalido('cursor', 'El cursor no es válido.');
  return r.data;
}

// ── Página ───────────────────────────────────────────────────────────────────
/**
 * Pide a la base `limit + 1` filas y pásalas aquí: si sobra una, hay página siguiente y el cursor
 * sale de la última que se devuelve. `cursorDe` dice qué guardar de esa fila.
 */
export function armarPagina<T>(filas: T[], limit: number, cursorDe: (ultima: T) => unknown): Pagina<T> {
  const hayMas = filas.length > limit;
  const items = hayMas ? filas.slice(0, limit) : filas;
  const ultima = items[items.length - 1];
  return { items, next_cursor: hayMas && ultima !== undefined ? codificarCursor(cursorDe(ultima)) : null };
}

const esquemaCursorId = z.object({ id: z.uuid() });

/**
 * El caso común: recorrer por id (UUID v7, que crece con el tiempo). Devuelve lo que va en
 * findMany; agrega tu `where` encima:
 *   const p = paginaPorId(req.query, 'desc');
 *   const filas = await prisma.x.findMany({ ...p, where: { ...p.where, alumnoId } });
 *   return armarPagina(filas.map(aApi), req.query.limit, (u) => ({ id: u.id }));
 */
export function paginaPorId(query: { limit: number; cursor?: string }, orden: 'asc' | 'desc' = 'asc') {
  const c = leerCursor(query.cursor, esquemaCursorId);
  return {
    where: c ? { id: orden === 'asc' ? { gt: c.id } : { lt: c.id } } : {},
    orderBy: { id: orden },
    take: query.limit + 1,
  };
}
