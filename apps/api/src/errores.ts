// ─────────────────────────────────────────────────────────────────────────────
// Errores de la API · Zona: Configuración (API)
//
// Qué hace: arma todas las respuestas de error con el sobre único de §API
// (`{ error: { code, message, details } }`) y los códigos del paquete compartido. Traduce los
// errores de validación de Zod (400 con el campo y el motivo), los de serialización (la salida
// no cumplió su esquema: CON-002) y cualquier error inesperado (500, sin filtrar detalles).
// Tócalo cuando: haya un tipo de error nuevo que traducir.
// No lo toques para: agregar un código (va en packages/shared/src/api/errores.ts).
// Depende de: @gymtrack/shared (CODIGOS_ERROR) y fastify-type-provider-zod.
// ─────────────────────────────────────────────────────────────────────────────
import { CODIGOS_ERROR, type CodigoError } from '@gymtrack/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod';

// ── Error con código ─────────────────────────────────────────────────────────
/** Lánzalo desde una ruta o un servicio; el manejador lo convierte en el sobre. */
export class ErrorApi extends Error {
  readonly estado: number;
  constructor(
    readonly codigo: CodigoError,
    readonly detalles?: Record<string, unknown>,
    mensaje?: string,
    /** Para un 429: segundos que van en Retry-After. */
    readonly reintentarEnS?: number,
  ) {
    super(mensaje ?? CODIGOS_ERROR[codigo].mensaje);
    this.estado = CODIGOS_ERROR[codigo].estado;
  }
}

export function sobre(codigo: CodigoError, detalles?: Record<string, unknown>, mensaje?: string) {
  return {
    error: {
      code: codigo,
      message: mensaje ?? CODIGOS_ERROR[codigo].mensaje,
      ...(detalles ? { details: detalles } : {}),
    },
  };
}

// ── Manejador ────────────────────────────────────────────────────────────────
export function crearManejadorDeErrores(opciones: { detallarSerializacion: boolean }) {
  return function manejar(error: FastifyError, req: FastifyRequest, reply: FastifyReply) {
    if (error instanceof ErrorApi) {
      if (error.reintentarEnS !== undefined) reply.header('retry-after', String(error.reintentarEnS));
      return reply.status(error.estado).send(sobre(error.codigo, error.detalles, error.message));
    }

    // 400: la entrada no pasó el esquema. `details.campo` es el primer campo que falló.
    if (hasZodFastifySchemaValidationErrors(error)) {
      const errores = error.validation.map((v) => {
        const params = v.params as { keys?: string[] };
        const campo = v.keyword === 'unrecognized_keys' && params.keys?.length
          ? params.keys.join(',')
          : v.instancePath.replace(/^\//, '').replace(/\//g, '.') || '(cuerpo)';
        return { campo, motivo: v.message ?? 'inválido' };
      });
      return reply.status(400).send(sobre('VALIDATION_ERROR', { ...errores[0], errores }));
    }

    // La respuesta no cumplió su esquema de salida: es un error nuestro (CON-002). En pruebas el
    // detalle dice la ruta y el campo para que la prueba que lo produjo falle con algo útil.
    if (isResponseSerializationError(error)) {
      const issues = error.cause.issues.map((i) => ({ campo: i.path.join('.'), motivo: i.message }));
      req.log.error({ ruta: `${error.method} ${error.url}`, issues }, 'respuesta fuera de su esquema');
      return reply.status(500).send(
        sobre('INTERNAL_ERROR', opciones.detallarSerializacion ? { ruta: `${error.method} ${error.url}`, issues } : undefined),
      );
    }

    // JSON mal formado, cuerpo demasiado grande, content-type que no corresponde.
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      if (error.statusCode === 429) return reply.status(429).send(sobre('RATE_LIMITED'));
      if (error.statusCode === 404) return reply.status(404).send(sobre('NOT_FOUND'));
      return reply.status(400).send(sobre('VALIDATION_ERROR', { campo: '(cuerpo)', motivo: error.code ?? 'inválido' }));
    }

    // Lo inesperado se loguea con su pila (sin el cuerpo de la petición) y sale como 500 genérico.
    req.log.error({ err: error }, 'error inesperado');
    return reply.status(500).send(sobre('INTERNAL_ERROR'));
  };
}
