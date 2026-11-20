// ─────────────────────────────────────────────────────────────────────────────
// Rutas de cuentas y perfil · Zona: Cuentas (API)
//
// Qué hace: registra en Fastify las rutas de §API «Cuentas y perfil» que existen hoy, cada una
// con su esquema de entrada y de salida tomado tal cual de @gymtrack/shared (CON-001): registro,
// ingreso, ingreso con Google (./google.ts), refresh, cierre de sesión, olvidé mi contraseña,
// restablecer y GET /v1/me (con el entrenador, la encuesta pendiente y el recordatorio de
// client_profiles, igual que PATCH /v1/me). Aplica los límites de intentos por IP (5 ingresos y 5 con Google por
// minuto, 5 registros por hora, 30 refresh por minuto, 10 enlaces y 10 restablecimientos por hora)
// y por correo (3 enlaces por hora), y delega la lógica en servicio.ts. La IP es `req.ip`: detrás de Caddy sale de CONFIAR_PROXY (config.ts).
// Tócalo cuando: agregues una ruta de cuentas (PATCH /me, push-tokens, DELETE /me, export).
// No lo toques para: la lógica (servicio.ts) ni la forma de los datos (packages/shared).
// Depende de: ./servicio, ./google, ./autenticacion, src/seguridad/limitador.ts y @gymtrack/shared.
// ─────────────────────────────────────────────────────────────────────────────
import { RESPUESTAS_ERROR, RUTAS_CUENTAS } from '@gymtrack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { BaseDeDatos } from '../db';
import { ErrorApi } from '../errores';
import { claveDeIp, crearLimitador, LIMITES, type Limitador } from '../seguridad/limitador';
import { rutaGoogle, type VerificadorGoogle } from './google';
import { usuarioApiCompleto, type ServicioCuentas } from './servicio';

export interface LimitadoresPorIp {
  registro: Limitador;
  renovacion: Limitador;
  recuperacion: Limitador;
  restablecimiento: Limitador;
  google: Limitador;
}

export interface OpcionesRutasCuentas {
  cuentas: ServicioCuentas;
  /** Para completar GET /v1/me con el vínculo y la encuesta. */
  prisma: BaseDeDatos;
  autenticar: (req: FastifyRequest) => Promise<void>;
  limitadorIngreso: Limitador;
  limitadorRecuperacion: Limitador;
  /** Si no vienen, se crean aquí con el reloj de la app (app.gymtrack.reloj). */
  limitadoresPorIp?: Partial<LimitadoresPorIp>;
  /** Los client ID de Google aceptados (config.google.clientIds). */
  clientIdsGoogle: readonly string[];
  /** Por defecto, el real con clientIdsGoogle (src/cuentas/google.ts). */
  verificadorGoogle?: VerificadorGoogle;
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
  const reloj = appBase.gymtrack.reloj;
  const porIp: LimitadoresPorIp = {
    registro: o.limitadoresPorIp?.registro ?? crearLimitador({ ...LIMITES.registroPorIp, reloj }),
    renovacion: o.limitadoresPorIp?.renovacion ?? crearLimitador({ ...LIMITES.renovacionPorIp, reloj }),
    recuperacion: o.limitadoresPorIp?.recuperacion ?? crearLimitador({ ...LIMITES.recuperacionPorIp, reloj }),
    restablecimiento: o.limitadoresPorIp?.restablecimiento ?? crearLimitador({ ...LIMITES.restablecimientoPorIp, reloj }),
    // El ingreso con Google tiene el mismo tope que el ingreso con correo, en su propia cuenta.
    google: o.limitadoresPorIp?.google ?? crearLimitador({ ...LIMITES.ingresoPorIp, reloj }),
  };
  // Junto a los demás límites de la app, así quien los vacía (las pruebas) vacía también estos.
  Object.assign(appBase.gymtrack.limitadores, {
    registroPorIp: porIp.registro,
    renovacionPorIp: porIp.renovacion,
    recuperacionPorIp: porIp.recuperacion,
    restablecimientoPorIp: porIp.restablecimiento,
    googlePorIp: porIp.google,
  });

  // ── Registro e ingreso ─────────────────────────────────────────────────────
  app.post(R.registrar.ruta, { schema: esquema(R.registrar) }, async (req, reply) => {
    revisarLimite(porIp.registro, claveDeIp(req.ip));
    const sesion = await o.cuentas.registrar(req.body);
    return reply.status(R.registrar.exito).send(sesion);
  });

  app.post(R.ingresar.ruta, { schema: esquema(R.ingresar) }, async (req) => {
    revisarLimite(o.limitadorIngreso, claveDeIp(req.ip));
    return o.cuentas.ingresar(req.body);
  });

  // POST /v1/auth/google: verifica el id_token y entra o crea la cuenta (./google.ts).
  rutaGoogle(appBase, {
    cuentas: o.cuentas,
    prisma: o.prisma,
    limitadorIntentos: porIp.google,
    limitadorRegistro: porIp.registro,
    verificador: o.verificadorGoogle,
    clientIds: o.clientIdsGoogle,
  });

  // ── Refresh y cierre de sesión ─────────────────────────────────────────────
  app.post(R.renovar.ruta, { schema: esquema(R.renovar) }, async (req) => {
    revisarLimite(porIp.renovacion, claveDeIp(req.ip));
    return o.cuentas.renovar(req.body.refresh_token);
  });

  app.post(R.cerrarSesion.ruta, { schema: esquema(R.cerrarSesion) }, async (req) => {
    await o.cuentas.cerrarSesion(req.body.refresh_token);
    return { cerrada: true as const };
  });

  // ── Recuperación de contraseña ─────────────────────────────────────────────
  app.post(R.olvideContrasena.ruta, { schema: esquema(R.olvideContrasena) }, async (req, reply) => {
    revisarLimite(porIp.recuperacion, claveDeIp(req.ip));
    revisarLimite(o.limitadorRecuperacion, req.body.email);
    await o.cuentas.pedirRecuperacion(req.body.email);
    // 202 siempre, con el mismo cuerpo, exista o no el correo (§API; INT-014).
    return reply.status(R.olvideContrasena.exito).send({
      mensaje: 'Si el correo tiene una cuenta, te enviamos un enlace que vale por 1 hora.',
    });
  });

  app.post(R.restablecerContrasena.ruta, { schema: esquema(R.restablecerContrasena) }, async (req) => {
    revisarLimite(porIp.restablecimiento, claveDeIp(req.ip));
    await o.cuentas.restablecer(req.body.token, req.body.password);
    return { restablecida: true as const };
  });

  // Con la sesión abierta: el límite del ingreso por persona, para que no sirva para adivinar.
  app.post(R.cambiarContrasena.ruta, { schema: esquema(R.cambiarContrasena), preHandler: o.autenticar }, async (req) => {
    const usuario = req.usuario!;
    revisarLimite(o.limitadorIngreso, `cambio:${usuario.id}`);
    return o.cuentas.cambiarContrasena(usuario, req.body);
  });

  // ── Perfil ─────────────────────────────────────────────────────────────────
  // La misma forma que responde PATCH /v1/me: el recordatorio_hora vive en client_profiles.
  app.get(
    R.perfil.ruta,
    { schema: { response: { 200: R.perfil.respuesta, ...RESPUESTAS_ERROR } }, preHandler: o.autenticar },
    async (req) => usuarioApiCompleto(o.prisma, req.usuario!),
  );
}
