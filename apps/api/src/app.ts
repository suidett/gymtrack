// ─────────────────────────────────────────────────────────────────────────────
// Armado de la API · Zona: Configuración (API)
//
// Qué hace: construye la instancia de Fastify con todo conectado: validación y serialización con
// Zod, el manejador de errores con el sobre único, el reloj, los límites de intentos, el correo y
// las rutas. No escucha ningún puerto: servidor.ts la levanta y las pruebas la usan con
// `app.inject`, sin red.
// Tócalo cuando: agregues un grupo de rutas o una dependencia compartida.
// No lo toques para: la lógica de una ruta (va en su carpeta: src/cuentas, src/salud).
// Depende de: src/config.ts, src/errores.ts, src/correo, src/seguridad, src/cuentas y src/salud.
// ─────────────────────────────────────────────────────────────────────────────
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { DestinationStream } from 'pino';
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
import { crearFirmador } from './seguridad/tokens';

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
  limitadores: { ingreso: Limitador; recuperacion: Limitador; usuario: Limitador };
  /** Las rutas registradas con su esquema: las recorre CON-001. */
  rutas: { metodo: string; url: string; schema: unknown }[];
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

  // ── Dependencias compartidas ───────────────────────────────────────────────
  const reloj = d.reloj ?? (config.relojFijo ? crearRelojFijo(config.relojFijo) : relojDelSistema);
  const { adaptador, buzon } = d.correo ?? adaptadorDesdeConfig(config, app.log);
  const correo = crearServicioCorreo({ adaptador, buzon, log: app.log });
  const limitadores = {
    ingreso: crearLimitador({ ...LIMITES.ingresoPorIp, reloj }),
    recuperacion: crearLimitador({ ...LIMITES.recuperacionPorCorreo, reloj }),
    usuario: crearLimitador({ ...LIMITES.llamadasPorUsuario, reloj }),
  };
  const firmador = crearFirmador(config.jwtSecreto);
  const cuentas = crearServicioCuentas({ prisma: d.prisma, reloj, firmador, correo, config });
  const rutas: Internos['rutas'] = [];
  app.addHook('onRoute', (r) => {
    for (const metodo of [r.method].flat()) if (metodo !== 'HEAD') rutas.push({ metodo, url: r.url, schema: r.schema });
  });
  app.decorate('gymtrack', { reloj, correo, limitadores, rutas });

  // Al cerrar, se esperan los correos en curso para no perder una bienvenida a medio enviar.
  app.addHook('onClose', async () => {
    await correo.esperarPendientes();
  });

  // ── Rutas ──────────────────────────────────────────────────────────────────
  await app.register(rutasSalud, { prisma: d.prisma, version: config.version, commit: config.commit });
  await app.register(rutasCuentas, {
    cuentas,
    autenticar: crearAutenticador({ prisma: d.prisma, reloj, firmador, limitador: limitadores.usuario }),
    limitadorIngreso: limitadores.ingreso,
    limitadorRecuperacion: limitadores.recuperacion,
  });

  return app;
}
