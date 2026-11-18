// ─────────────────────────────────────────────────────────────────────────────
// Armado de la API · Zona: Configuración (API)
//
// Qué hace: construye la instancia de Fastify con todo conectado: validación y serialización con
// Zod, el manejador de errores con el sobre único, el reloj, los límites de intentos, el correo,
// los decoradores de sesión, rol y permiso (src/compartido) y las rutas: salud, cuentas y todos
// los módulos de src/modulos, que se registran solos bajo /v1. No escucha ningún puerto:
// servidor.ts la levanta y las pruebas la usan con `app.inject`, sin red.
// Tócalo cuando: agregues una dependencia compartida o algo que todos los módulos reciben.
// No lo toques para: agregar un módulo (crea su carpeta en src/modulos; ver README) ni para la
// lógica de una ruta (va en su carpeta: src/cuentas, src/salud, src/modulos/<nombre>).
// Depende de: src/config.ts, src/errores.ts, src/correo, src/seguridad, src/cuentas, src/salud y
// src/compartido.
// ─────────────────────────────────────────────────────────────────────────────
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { DestinationStream } from 'pino';
import { instalarAutenticacion } from './compartido/autenticacion';
import { registrarModulos, type ContextoModulo } from './compartido/modulos';
import type { Config } from './config';
import { adaptadorDesdeConfig, crearServicioCorreo, type ServicioCorreo } from './correo';
import type { Buzon } from './correo/desarrollo';
import type { AdaptadorCorreo } from './correo/tipos';
import { crearAutenticador } from './cuentas/autenticacion';
import { rutasCuentas } from './cuentas/rutas';
import { crearServicioCuentas } from './cuentas/servicio';
import type { BaseDeDatos } from './db';
import { crearManejadorDeErrores, sobre } from './errores';
import { crearRelojFijo, relojDelSistema, type Reloj } from './reloj';
import { rutasSalud } from './salud/rutas';
import { crearLimitador, LIMITES, type Limitador } from './seguridad/limitador';
import { crearFirmador, type Firmador } from './seguridad/tokens';

export interface Dependencias {
  config: Config;
  prisma: BaseDeDatos;
  /** Por defecto: RELOJ_FIJO si viene (fuera de producción) o la hora del sistema. */
  reloj?: Reloj;
  /** Para reemplazar el adaptador que pide la configuración (las pruebas de Resend). */
  correo?: { adaptador: AdaptadorCorreo; buzon?: Buzon };
  /** Para capturar los logs (SEG-018). */
  destinoLogs?: DestinationStream;
}

export interface Internos {
  reloj: Reloj;
  correo: ServicioCorreo;
  /** Los de cuentas más los que cada módulo crea con ctx.crearLimitador (las pruebas los vacían todos). */
  limitadores: { ingreso: Limitador; recuperacion: Limitador; usuario: Limitador } & Record<string, Limitador>;
  /** Las rutas registradas con su esquema: las recorre CON-001. */
  rutas: { metodo: string; url: string; schema: unknown }[];
  /** Firma los access tokens: las ayudas de prueba lo usan para dar sesión sin pasar por el ingreso. */
  firmador: Firmador;
  /** Los módulos de src/modulos que quedaron registrados, en orden. */
  modulos: string[];
  /** El mismo contexto que recibe cada módulo (las pruebas lo usan para montar un módulo de prueba). */
  contexto: ContextoModulo;
}

declare module 'fastify' {
  interface FastifyInstance {
    gymtrack: Internos;
  }
}

export async function construirApp(d: Dependencias): Promise<FastifyInstance> {
  const { config } = d;
  const app = Fastify({
    logger: {
      level: config.nivelLog,
      // Por si alguien loguea una petición entera: nunca cabeceras de sesión ni contraseñas.
      redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.refresh_token', '*.token'],
      ...(d.destinoLogs ? { stream: d.destinoLogs } : {}),
    },
    trustProxy: config.confiarProxy,
    bodyLimit: 64 * 1024,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(crearManejadorDeErrores({ detallarSerializacion: config.entorno !== 'production' }));
  app.setNotFoundHandler((_req, reply) => reply.status(404).send(sobre('NOT_FOUND')));

  // ── CORS para la versión web de la app (CORS_ORIGENES; en local, localhost) ─
  const origenLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const origenPermitido = (o: string) => config.cors.origenes.includes(o) || (config.cors.localhost && origenLocal.test(o));
  app.addHook('onRequest', async (req, reply) => {
    const origen = req.headers.origin;
    if (!origen || !origenPermitido(origen)) return;
    reply.header('access-control-allow-origin', origen).header('vary', 'Origin').header('access-control-expose-headers', 'retry-after');
    if (req.method === 'OPTIONS') {
      reply
        .header('access-control-allow-methods', 'GET, POST, PUT, PATCH, DELETE')
        .header('access-control-allow-headers', 'authorization, content-type')
        .header('access-control-max-age', '600');
      return reply.code(204).send();
    }
  });

  // ── Dependencias compartidas ───────────────────────────────────────────────
  const reloj = d.reloj ?? (config.relojFijo ? crearRelojFijo(config.relojFijo) : relojDelSistema);
  const { adaptador, buzon } = d.correo ?? adaptadorDesdeConfig(config, app.log);
  const correo = crearServicioCorreo({ adaptador, buzon, log: app.log });
  const limitadores: Internos['limitadores'] = {
    ingreso: crearLimitador({ ...LIMITES.ingresoPorIp, reloj }),
    recuperacion: crearLimitador({ ...LIMITES.recuperacionPorCorreo, reloj }),
    usuario: crearLimitador({ ...LIMITES.llamadasPorUsuario, reloj }),
  };
  const firmador = crearFirmador(config.jwtSecreto);
  const cuentas = crearServicioCuentas({ prisma: d.prisma, reloj, firmador, correo, config });
  const autenticar = crearAutenticador({ prisma: d.prisma, reloj, firmador, limitador: limitadores.usuario });
  const rutas: Internos['rutas'] = [];
  app.addHook('onRoute', (r) => {
    for (const metodo of [r.method].flat()) if (metodo !== 'HEAD') rutas.push({ metodo, url: r.url, schema: r.schema });
  });
  const contexto: ContextoModulo = {
    prisma: d.prisma,
    reloj,
    config,
    correo,
    crearLimitador: (nombre, opciones) => {
      if (limitadores[nombre]) throw new Error(`Ya hay un limitador llamado ${nombre}`);
      return (limitadores[nombre] = crearLimitador({ ...opciones, reloj }));
    },
  };
  const internos: Internos = { reloj, correo, limitadores, rutas, firmador, modulos: [], contexto };
  app.decorate('gymtrack', internos);
  // app.exigirSesion, app.exigirRol(...) y app.exigirPermiso(...) para todas las rutas privadas.
  instalarAutenticacion(app, { prisma: d.prisma, autenticar });

  // Al cerrar, se esperan los correos en curso para no perder una bienvenida a medio enviar.
  app.addHook('onClose', async () => {
    await correo.esperarPendientes();
  });

  // ── Rutas ──────────────────────────────────────────────────────────────────
  await app.register(rutasSalud, { prisma: d.prisma, version: config.version, commit: config.commit });
  await app.register(rutasCuentas, {
    cuentas,
    prisma: d.prisma,
    autenticar: app.exigirSesion,
    limitadorIngreso: limitadores.ingreso,
    limitadorRecuperacion: limitadores.recuperacion,
  });

  // Cada carpeta de src/modulos se registra sola bajo /v1 (src/compartido/modulos.ts).
  internos.modulos = await registrarModulos(app, contexto);

  return app;
}
