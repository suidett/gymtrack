// ─────────────────────────────────────────────────────────────────────────────
// Configuración de la API · Zona: Configuración (API)
//
// Qué hace: lee y valida las variables de entorno una sola vez al arrancar (con Zod) y entrega un
// objeto tipado. Si falta algo obligatorio o hay una combinación peligrosa, la API no arranca:
// es mejor un contenedor que no sube que uno que sube mal.
// Tócalo cuando: agregues una variable. Ponla también en .env.ejemplo y en el README de la API.
// No lo toques para: valores de una regla de negocio que no cambian por entorno (los 15 minutos
// del access, la hora del enlace): esos viven en src/seguridad/tokens.ts y en el servicio.
// Depende de: zod. Lo usan servidor.ts, worker.ts y las pruebas.
// ─────────────────────────────────────────────────────────────────────────────
import { randomBytes } from 'node:crypto';
import { BlockList, isIP, isIPv4, isIPv6 } from 'node:net';
import { z } from 'zod';

// ── Esquema de variables ─────────────────────────────────────────────────────
const esquemaEntorno = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1).optional(),
  // HS256: al menos 32 bytes de azar (`openssl rand -hex 32`).
  JWT_SECRET: z.string().min(32).optional(),
  // Lo que /health devuelve. VERSION la fija compose (sha-<commit> o v1.2.3); COMMIT_SHA la
  // graba el Dockerfile al construir la imagen.
  VERSION: z.string().min(1).default('dev'),
  COMMIT_SHA: z.string().min(1).default('desconocido'),
  // Detrás de Caddy la IP real llega en X-Forwarded-For. Sin esto el límite de ingresos por IP
  // contaría a todos como la IP de Caddy. Se lee con leerConfiarProxy (abajo): saltos, IPs o false.
  CONFIAR_PROXY: z.string().trim().optional(),
  // Correo.
  CORREO_DRIVER: z.enum(['resend', 'consola', 'memoria']).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  CORREO_REMITENTE: z.string().min(3).default('GymTrack <hola@gymtrack.test>'),
  CORREO_RESPONDER_A: z.string().optional(),
  // Base del enlace del correo de recuperación; se le agrega ?token=... Puede ser el esquema de
  // la app (gymtrack://restablecer) o una página web que abre la app.
  ENLACE_RESTABLECER_URL: z.string().min(1).default('gymtrack://restablecer'),
  // Solo para pruebas y desarrollo: la API parte con este «ahora» (ISO con zona).
  RELOJ_FIJO: z.iso.datetime({ offset: true }).optional(),
  // Orígenes web que pueden llamar a la API desde un navegador (la versión web de la app),
  // separados por coma. La app nativa no lo necesita. Fuera de producción, sin valor, se aceptan
  // http://localhost:* y http://127.0.0.1:* (Expo web).
  CORS_ORIGENES: z.string().trim().optional(),
});

export type Entorno = z.infer<typeof esquemaEntorno>;

export interface Config {
  entorno: Entorno['NODE_ENV'];
  puerto: number;
  host: string;
  nivelLog: Entorno['LOG_LEVEL'];
  databaseUrl: string;
  jwtSecreto: string;
  version: string;
  commit: string;
  /** Va tal cual a `trustProxy` de Fastify: false, la función de saltos o las IPs/redes del proxy. */
  confiarProxy: ConfiarProxy;
  correo: {
    driver: 'resend' | 'consola' | 'memoria';
    resendApiKey?: string;
    remitente: string;
    responderA?: string;
  };
  enlaceRestablecer: string;
  relojFijo?: string;
  /** Orígenes web con permiso (CORS). `localhost`: cualquier http://localhost:* o 127.0.0.1:*. */
  cors: { origenes: string[]; localhost: boolean };
}

// ── Proxy de confianza ───────────────────────────────────────────────────────
/** Lo que entiende `trustProxy` de Fastify: si la dirección del salto `salto` es un proxy creíble. */
export type FuncionConfianza = (direccion: string, salto: number) => boolean;
/** false: la IP del socket. Una función: cuántos saltos se creen. Una lista: las IPs o redes del proxy. */
export type ConfiarProxy = false | string[] | FuncionConfianza;

const REDES_CON_NOMBRE = new Set(['loopback', 'linklocal', 'uniquelocal']);

// Redes privadas y locales: de donde puede venir Caddy dentro de Docker o del mismo equipo.
const REDES_PRIVADAS = new BlockList();
for (const [red, prefijo] of [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8], ['169.254.0.0', 16]] as const) {
  REDES_PRIVADAS.addSubnet(red, prefijo, 'ipv4');
}
for (const [red, prefijo] of [['fc00::', 7], ['fe80::', 10], ['::1', 128]] as const) REDES_PRIVADAS.addSubnet(red, prefijo, 'ipv6');

function esDireccionPrivada(direccion: string): boolean {
  const v4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(direccion)?.[1] ?? direccion;
  if (isIPv4(v4)) return REDES_PRIVADAS.check(v4, 'ipv4');
  return isIPv6(direccion) && REDES_PRIVADAS.check(direccion, 'ipv6');
}

/**
 * Cree `saltos` proxies desde el socket hacia atrás. El primero (quien abrió la conexión) además
 * tiene que venir de una red privada: Fastify 5 ya no acepta un número en trustProxy porque así
 * cualquiera que llegue directo, sin pasar por Caddy, elegiría su IP con un X-Forwarded-For.
 */
export function confiarEnSaltos(saltos: number): FuncionConfianza {
  return (direccion, salto) => salto < saltos && (salto > 0 || esDireccionPrivada(direccion));
}

function esIpORed(texto: string): boolean {
  if (REDES_CON_NOMBRE.has(texto)) return true;
  const [ip = '', prefijo, ...resto] = texto.split('/');
  const version = isIP(ip);
  if (!version || resto.length) return false;
  if (prefijo === undefined) return true;
  return /^\d{1,3}$/.test(prefijo) && Number(prefijo) <= (version === 4 ? 32 : 128);
}

/**
 * CONFIAR_PROXY acepta:
 *   - un número de saltos: `1` = solo Caddy (el valor por defecto en producción); se usa la
 *     última IP de X-Forwarded-For, la que agregó Caddy, y lo que el cliente inventó a la
 *     izquierda no cuenta;
 *   - las IPs o redes del proxy separadas por coma (`172.18.0.0/16,10.0.0.2`, o `uniquelocal`);
 *   - `false` o `0`: nadie, se usa la IP del socket (el valor por defecto fuera de producción).
 * `true` se lee como `1`: creerle a toda la cadena dejaría que cualquiera elija su IP con un
 * X-Forwarded-For inventado y se salte los límites por IP.
 * Devuelve el valor listo para `trustProxy` de Fastify, o un Error con el motivo.
 */
export function leerConfiarProxy(valor: string | undefined, produccion: boolean): ConfiarProxy | Error {
  if (valor === undefined || valor === '') return produccion ? confiarEnSaltos(1) : false;
  if (valor === 'false' || valor === '0') return false;
  if (valor === 'true') return confiarEnSaltos(1);
  if (/^\d{1,2}$/.test(valor)) return confiarEnSaltos(Number(valor));
  const partes = valor.split(',').map((p) => p.trim()).filter(Boolean);
  if (partes.length && partes.every(esIpORed)) return partes;
  return new Error('CONFIAR_PROXY tiene que ser un número de saltos (1), IPs o redes del proxy separadas por coma, o false');
}

// ── Lectura ──────────────────────────────────────────────────────────────────
/** Lee la configuración desde `env` (por defecto process.env). Lanza un Error con la lista de problemas. */
export function leerConfig(env: Record<string, string | undefined> = process.env): Config {
  const r = esquemaEntorno.safeParse(env);
  if (!r.success) {
    const lista = r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${lista}`);
  }
  const e = r.data;
  const problemas: string[] = [];

  // SEG-032: en producción nadie puede adelantar el reloj (purga, vencimientos, alertas).
  if (e.NODE_ENV === 'production' && e.RELOJ_FIJO) {
    problemas.push('RELOJ_FIJO no se permite con NODE_ENV=production');
  }
  if (!e.DATABASE_URL) problemas.push('falta DATABASE_URL');

  // Fuera de producción se acepta un secreto al azar por proceso (los tokens mueren al reiniciar).
  let jwtSecreto = e.JWT_SECRET;
  if (!jwtSecreto) {
    if (e.NODE_ENV === 'production') problemas.push('falta JWT_SECRET (al menos 32 caracteres)');
    else jwtSecreto = randomBytes(32).toString('hex');
  }

  const driver = e.CORREO_DRIVER ?? (e.NODE_ENV === 'production' ? 'resend' : e.NODE_ENV === 'test' ? 'memoria' : 'consola');
  if (driver === 'resend' && !e.RESEND_API_KEY) problemas.push('CORREO_DRIVER=resend necesita RESEND_API_KEY');
  if (e.NODE_ENV === 'production' && driver !== 'resend') {
    problemas.push('en producción los correos salen por Resend (CORREO_DRIVER=resend)');
  }

  const confiarProxy = leerConfiarProxy(e.CONFIAR_PROXY, e.NODE_ENV === 'production');
  if (confiarProxy instanceof Error) problemas.push(confiarProxy.message);

  if (problemas.length) throw new Error(`Configuración inválida: ${problemas.join('; ')}`);

  return {
    entorno: e.NODE_ENV,
    puerto: e.PORT,
    host: e.HOST,
    nivelLog: e.LOG_LEVEL,
    databaseUrl: e.DATABASE_URL!,
    jwtSecreto: jwtSecreto!,
    version: e.VERSION,
    commit: e.COMMIT_SHA,
    confiarProxy: confiarProxy as ConfiarProxy,
    correo: {
      driver,
      resendApiKey: e.RESEND_API_KEY,
      remitente: e.CORREO_REMITENTE,
      responderA: e.CORREO_RESPONDER_A,
    },
    enlaceRestablecer: e.ENLACE_RESTABLECER_URL,
    relojFijo: e.RELOJ_FIJO,
    cors: {
      origenes: (e.CORS_ORIGENES ?? '').split(',').map((o) => o.trim()).filter(Boolean),
      localhost: e.NODE_ENV !== 'production' && !e.CORS_ORIGENES,
    },
  };
}
