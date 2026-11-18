// ─────────────────────────────────────────────────────────────────────────────
// Sesión, rol y permiso en las rutas · Zona: Compartido (API)
//
// Qué hace: instala en Fastify tres decoradores para el preHandler de las rutas privadas:
//   app.exigirSesion            401 sin access válido; deja al usuario en req.usuario.
//   app.exigirRol('trainer')    lo anterior y 403 FORBIDDEN si el rol no es ese (P-01, PERM-32).
//   app.exigirPermiso('accion') lo anterior y 403 si la matriz de §Roles lo niega para ese actor
//                               (entrenador, alumno vinculado o alumno solo); deja req.actor.
// Y dos lectores para el manejador: usuarioDe(req) y actorDe(req). La validación del token, el
// usuario borrado y el tope de 60 llamadas por minuto siguen siendo los de src/cuentas/autenticacion.ts:
// aquí solo se llama una vez por pedido aunque encadenes varios decoradores.
// Tócalo cuando: necesites otra forma de exigir algo antes de la ruta.
// No lo toques para: cómo se valida el token (src/cuentas/autenticacion.ts) ni la matriz
// (permisos.ts).
// Depende de: ./permisos, ./vinculo, ./errores y el autenticador de cuentas.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { BaseDeDatos } from '../db';
import { ErrorApi } from '../errores';
import type { Rol, Usuario } from '../generado/prisma/client';
import { prohibido } from './errores';
import { puede, type AccionPermiso, type TipoActor } from './permisos';
import { vinculoDelAlumno } from './vinculo';

/** Quién llama: el usuario, su tipo en la matriz y, si es alumno vinculado, su entrenador. */
export interface Actor {
  usuario: Usuario;
  tipo: TipoActor;
  /** Entrenador con vínculo activo (solo alumno vinculado); null en los demás. */
  entrenadorId: string | null;
}

export type PreHandler = (req: FastifyRequest) => Promise<void>;

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler: 401 sin sesión válida. Deja req.usuario. */
    exigirSesion: PreHandler;
    /** preHandler: sesión y uno de estos roles; si no, 403 FORBIDDEN. */
    exigirRol: (...roles: Rol[]) => PreHandler;
    /** preHandler: sesión y permiso de la matriz de §Roles; si no, 403 FORBIDDEN. Deja req.actor. */
    exigirPermiso: (accion: AccionPermiso) => PreHandler;
  }
  interface FastifyRequest {
    actor?: Actor;
  }
}

// ── Lectores para el manejador ───────────────────────────────────────────────
/** El usuario que llama. Úsalo en rutas con exigirSesion, exigirRol o exigirPermiso. */
export function usuarioDe(req: FastifyRequest): Usuario {
  if (!req.usuario) throw new ErrorApi('UNAUTHENTICATED');
  return req.usuario;
}

/** El actor de la matriz (lo calcula una vez por pedido; para el alumno mira trainer_clients). */
export async function actorDe(prisma: Pick<BaseDeDatos, 'vinculoEntrenador'>, req: FastifyRequest): Promise<Actor> {
  if (req.actor) return req.actor;
  const usuario = usuarioDe(req);
  if (usuario.rol === 'trainer') {
    req.actor = { usuario, tipo: 'entrenador', entrenadorId: null };
  } else {
    const v = await vinculoDelAlumno(prisma, usuario.id);
    req.actor = v
      ? { usuario, tipo: 'alumno_vinculado', entrenadorId: v.entrenadorId }
      : { usuario, tipo: 'alumno_solo', entrenadorId: null };
  }
  return req.actor;
}

// ── Instalación ──────────────────────────────────────────────────────────────
/** La llama app.ts una vez, antes de registrar las rutas. */
export function instalarAutenticacion(
  app: FastifyInstance,
  d: { prisma: BaseDeDatos; autenticar: (req: FastifyRequest) => Promise<void> },
): void {
  const exigirSesion: PreHandler = async (req) => {
    if (!req.usuario) await d.autenticar(req);
  };
  const exigirRol = (...roles: Rol[]): PreHandler => async (req) => {
    await exigirSesion(req);
    if (!roles.includes(usuarioDe(req).rol)) prohibido();
  };
  const exigirPermiso = (accion: AccionPermiso): PreHandler => async (req) => {
    await exigirSesion(req);
    const actor = await actorDe(d.prisma, req);
    if (!puede(actor.tipo, accion)) prohibido();
  };
  app.decorate('exigirSesion', exigirSesion);
  app.decorate('exigirRol', exigirRol);
  app.decorate('exigirPermiso', exigirPermiso);
}
