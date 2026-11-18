// ─────────────────────────────────────────────────────────────────────────────
// Autenticación de las rutas privadas · Zona: Cuentas (API)
//
// Qué hace: el preHandler de toda ruta que no es pública. Lee `Authorization: Bearer <access>`,
// verifica el JWT con el reloj inyectado, carga al usuario (si ya no existe o está marcado para
// borrado, 401 aunque el token no haya vencido) y aplica el tope de 60 llamadas por minuto por
// usuario (§Seguridad; SEG-011). Deja al usuario en `req.usuario`.
// Tócalo cuando: cambie cómo se identifica a quien llama.
// No lo toques para: la firma o la duración del token (src/seguridad/tokens.ts).
// Depende de: src/seguridad/tokens.ts, src/seguridad/limitador.ts y la base.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyRequest } from 'fastify';
import type { BaseDeDatos } from '../db';
import { ErrorApi } from '../errores';
import type { Usuario } from '../generado/prisma/client';
import type { Reloj } from '../reloj';
import type { Limitador } from '../seguridad/limitador';
import type { Firmador } from '../seguridad/tokens';

declare module 'fastify' {
  interface FastifyRequest {
    usuario?: Usuario;
  }
}

export function crearAutenticador(d: { prisma: BaseDeDatos; reloj: Reloj; firmador: Firmador; limitador: Limitador }) {
  return async function autenticar(req: FastifyRequest): Promise<void> {
    const cabecera = req.headers.authorization;
    const m = cabecera ? /^Bearer\s+(\S+)$/i.exec(cabecera) : null;
    if (!m) throw new ErrorApi('UNAUTHENTICATED');
    const claims = await d.firmador.verificarAccess(m[1]!, d.reloj.ahora());
    if (claims === 'vencido') throw new ErrorApi('TOKEN_EXPIRED');
    if (claims === 'invalido') throw new ErrorApi('TOKEN_INVALID');
    const usuario = await d.prisma.usuario.findUnique({ where: { id: claims.sub } });
    if (!usuario || usuario.deletedAt) throw new ErrorApi('TOKEN_INVALID');
    const limite = d.limitador.intentar(usuario.id);
    if (!limite.permitido) {
      throw new ErrorApi('RATE_LIMITED', { reintentar_en_s: limite.reintentarEnS }, undefined, limite.reintentarEnS);
    }
    req.usuario = usuario;
  };
}
