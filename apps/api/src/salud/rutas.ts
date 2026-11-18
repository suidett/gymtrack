// ─────────────────────────────────────────────────────────────────────────────
// Salud de la API · Zona: Salud (API)
//
// Qué hace: GET /health (sin /v1). Responde 200 con la versión y el commit desplegados cuando la
// base contesta, y 503 con el sobre de error cuando no (INT-140). desplegar.sh y el CI esperan
// ver `"version":"<VERSION>"` en el 200 para dar por bueno un despliegue.
// Tócalo cuando: el chequeo necesite revisar otra dependencia (el bucket, por ejemplo).
// No lo toques para: lógica de negocio. Esta ruta no pide token y tiene que ser barata.
// Depende de: la base (SELECT 1) y la configuración (VERSION, COMMIT_SHA).
// ─────────────────────────────────────────────────────────────────────────────
import { RESPUESTAS_ERROR, RUTAS_CUENTAS } from '@gymtrack/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { BaseDeDatos } from '../db';
import { sobre } from '../errores';

export async function rutasSalud(appBase: FastifyInstance, o: { prisma: BaseDeDatos; version: string; commit: string }) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  app.get(
    RUTAS_CUENTAS.salud.ruta,
    { schema: { response: { 200: RUTAS_CUENTAS.salud.respuesta, ...RESPUESTAS_ERROR } }, logLevel: 'warn' },
    async (req, reply) => {
      try {
        await Promise.race([
          o.prisma.$queryRaw`SELECT 1`,
          new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('la base no respondió en 2 s')), 2000).unref()),
        ]);
        return { estado: 'ok' as const, version: o.version, commit: o.commit, base: 'ok' as const };
      } catch (err) {
        req.log.warn({ motivo: err instanceof Error ? err.message : 'desconocido' }, 'health sin base');
        return reply.status(503).send(sobre('SERVICE_UNAVAILABLE', { version: o.version, commit: o.commit, base: 'sin_conexion' }));
      }
    },
  );
}
