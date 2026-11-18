// ─────────────────────────────────────────────────────────────────────────────
// Rutas de cuentas y perfil · Zona: Cuentas (API)
//
// Qué hace: registra en Fastify las rutas de §API «Cuentas y perfil» que existen hoy, cada una
// con su esquema de entrada y de salida tomado tal cual de @gymtrack/shared (CON-001): registro,
// ingreso, refresh, cierre de sesión, olvidé mi contraseña, restablecer y GET /v1/me. Aplica los
// límites de intentos (5 ingresos por minuto por IP, 3 recuperaciones por hora por correo) y
// delega la lógica en servicio.ts.
// Tócalo cuando: agregues una ruta de cuentas (PATCH /me, push-tokens, DELETE /me, export).
// No lo toques para: la lógica (servicio.ts) ni la forma de los datos (packages/shared).
// Depende de: ./servicio, ./autenticacion, src/seguridad/limitador.ts y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { RESPUESTAS_ERROR, RUTAS_CUENTAS } from '@gymtrack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { ErrorApi } from '../errores';
import type { Limitador } from '../seguridad/limitador';
import { aUsuarioApi, type ServicioCuentas } from './servicio';

export interface OpcionesRutasCuentas {
  cuentas: ServicioCuentas;
  autenticar: (req: FastifyRequest) => Promise<void>;
  limitadorIngreso: Limitador;
  limitadorRecuperacion: Limitador;
}

const esquema = <C, E extends number, R>(r: { cuerpo: C; exito: E; respuesta: R }) => ({
  body: r.cuerpo,
  response: { [r.exito]: r.respuesta, ...RESPUESTAS_ERROR } as Record<E, R> & typeof RESPUESTAS_ERROR,
});

function revisarLimite(limitador: Limitador, clave: string) {
  const r = limitador.intentar(clave);
  if (!r.permitido) throw new ErrorApi('RATE_LIMITED', { reintentar_en_s: r.reintentarEnS }, undefined, r.reintentarEnS);
}

export async function rutasCuentas(appBase: FastifyInstance, o: OpcionesRutasCuentas) {
  const app = appBase.withTypeProvider<ZodTypeProvider>();
  const R = RUTAS_CUENTAS;

  // ── Registro e ingreso ─────────────────────────────────────────────────────
  app.post(R.registrar.ruta, { schema: esquema(R.registrar) }, async (req, reply) => {
    const sesion = await o.cuentas.registrar(req.body);
    return reply.status(R.registrar.exito).send(sesion);
  });

  app.post(R.ingresar.ruta, { schema: esquema(R.ingresar) }, async (req) => {
    revisarLimite(o.limitadorIngreso, req.ip);
    return o.cuentas.ingresar(req.body);
  });

  // ── Refresh y cierre de sesión ─────────────────────────────────────────────
  app.post(R.renovar.ruta, { schema: esquema(R.renovar) }, async (req) => o.cuentas.renovar(req.body.refresh_token));

  app.post(R.cerrarSesion.ruta, { schema: esquema(R.cerrarSesion) }, async (req) => {
    await o.cuentas.cerrarSesion(req.body.refresh_token);
    return { cerrada: true as const };
  });

  // ── Recuperación de contraseña ─────────────────────────────────────────────
  app.post(R.olvideContrasena.ruta, { schema: esquema(R.olvideContrasena) }, async (req, reply) => {
    revisarLimite(o.limitadorRecuperacion, req.body.email);
    await o.cuentas.pedirRecuperacion(req.body.email);
    // 202 siempre, con el mismo cuerpo, exista o no el correo (§API; INT-014).
    return reply.status(R.olvideContrasena.exito).send({
      mensaje: 'Si el correo tiene una cuenta, te enviamos un enlace que vale por 1 hora.',
    });
  });

  app.post(R.restablecerContrasena.ruta, { schema: esquema(R.restablecerContrasena) }, async (req) => {
    await o.cuentas.restablecer(req.body.token, req.body.password);
    return { restablecida: true as const };
  });

  // ── Perfil ─────────────────────────────────────────────────────────────────
  app.get(
    R.perfil.ruta,
    { schema: { response: { 200: R.perfil.respuesta, ...RESPUESTAS_ERROR } }, preHandler: o.autenticar },
    async (req) => aUsuarioApi(req.usuario!),
  );
}
