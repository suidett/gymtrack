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
  // contaría a todos como la IP de Caddy.
  CONFIAR_PROXY: z.enum(['true', 'false']).default('false'),
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
  confiarProxy: boolean;
  correo: {
    driver: 'resend' | 'consola' | 'memoria';
    resendApiKey?: string;
    remitente: string;
    responderA?: string;
  };
  enlaceRestablecer: string;
  relojFijo?: string;
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
    confiarProxy: e.CONFIAR_PROXY === 'true',
    correo: {
      driver,
      resendApiKey: e.RESEND_API_KEY,
      remitente: e.CORREO_REMITENTE,
      responderA: e.CORREO_RESPONDER_A,
    },
    enlaceRestablecer: e.ENLACE_RESTABLECER_URL,
    relojFijo: e.RELOJ_FIJO,
  };
}
