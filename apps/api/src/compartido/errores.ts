// ─────────────────────────────────────────────────────────────────────────────
// Errores para los módulos · Zona: Compartido (API)
//
// Qué hace: atajos para lanzar los errores de §API con el sobre único desde cualquier módulo:
// 404 «no existe o no es tuyo» (mismo cuerpo en los dos casos), 403 «tu rol no permite esto»
// (supuesto P-01 del plan), 409 por estado, 422 por regla de negocio y 400 por un campo. Todos son
// ErrorApi: el manejador de src/errores.ts los convierte en `{ error: { code, message, details } }`.
// Tócalo cuando: haga falta otro atajo que usen varios módulos.
// No lo toques para: agregar un código (va en packages/shared/src/api/errores.ts) ni para cambiar
// el sobre (src/errores.ts).
// Depende de: src/errores.ts y los códigos de @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import type { CodigoError } from '@gymtrack/shared';
import { ErrorApi } from '../errores';

export { ErrorApi, sobre } from '../errores';

/** Lanza el error del catálogo que digas, con detalles opcionales. */
export function fallar(codigo: CodigoError, detalles?: Record<string, unknown>, mensaje?: string): never {
  throw new ErrorApi(codigo, detalles, mensaje);
}

/**
 * 404 NOT_FOUND. Úsalo igual para lo que no existe y para lo que no es tuyo (§API): nunca pongas
 * en `details` algo que deje adivinar que el recurso existe.
 */
export function noEncontrado(): never {
  throw new ErrorApi('NOT_FOUND');
}

/** 403 FORBIDDEN: tu rol no permite esto sobre algo que sí ves (P-01). Sin datos en la respuesta. */
export function prohibido(): never {
  throw new ErrorApi('FORBIDDEN');
}

/** 400 VALIDATION_ERROR con el campo y el motivo, igual que los errores de Zod. */
export function campoInvalido(campo: string, motivo: string): never {
  throw new ErrorApi('VALIDATION_ERROR', { campo, motivo, errores: [{ campo, motivo }] });
}

/** Devuelve el valor o lanza 404 si es null o undefined. `const r = existeOFalla(await prisma...)`. */
export function existeOFalla<T>(valor: T | null | undefined): T {
  if (valor === null || valor === undefined) noEncontrado();
  return valor;
}
