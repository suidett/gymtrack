// ─────────────────────────────────────────────────────────────────────────────
// Configuración de los avisos · Zona: Notificaciones (API)
//
// Qué hace: lee y valida las variables de los avisos al celular, igual para la API y el worker:
//   PUSH_DRIVER        real (Expo y Web Push), consola (solo log) o memoria (buzón de pruebas).
//                      Por defecto: producción real, pruebas memoria, local consola.
//   VAPID_PUBLICA, VAPID_PRIVADA, VAPID_CONTACTO   las llaves de Web Push de la app web (las tres
//                      o ninguna). Sin ellas la app Android igual recibe; la web no.
//   EXPO_ACCESS_TOKEN  solo si se activa «Enhanced push security» en Expo.
//   AVISOS_URL_APP     la dirección de la app web, para el botón de los correos (opcional).
// Una llave con forma incorrecta no deja arrancar (mejor no subir que subir sin avisos y no
// saberlo). Las llaves nunca se loguean.
// Tócalo cuando: agregues una variable de los avisos (y anótala en .env.ejemplo y en el README).
// No lo toques para: el tope ni los minutos del recordatorio (packages/shared/src/api/notificaciones.ts).
// Depende de: zod y @gymtrack/shared (medirBase64Url).
// ─────────────────────────────────────────────────────────────────────────────
import { medirBase64Url } from '@gymtrack/shared';
import { z } from 'zod';

export type DriverPush = 'real' | 'consola' | 'memoria';

export interface ConfigAvisos {
  driver: DriverPush;
  /** null: Web Push apagado (faltan las llaves). */
  vapid: { publica: string; privada: string; contacto: string } | null;
  expoAccessToken?: string;
  /** Sin barra final. null: los correos van sin botón. */
  urlApp: string | null;
}

const opcional = z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().optional());

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PUSH_DRIVER: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['real', 'consola', 'memoria']).optional()),
  VAPID_PUBLICA: opcional,
  VAPID_PRIVADA: opcional,
  VAPID_CONTACTO: opcional,
  EXPO_ACCESS_TOKEN: opcional,
  AVISOS_URL_APP: opcional,
});

/** Lee la configuración de los avisos. Lanza un Error con la lista de problemas. */
export function leerConfigAvisos(env: Record<string, string | undefined> = process.env): ConfigAvisos {
  const r = esquema.safeParse(env);
  if (!r.success) {
    throw new Error(`Configuración de avisos inválida: ${r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  }
  const e = r.data;
  const problemas: string[] = [];
  const driver: DriverPush = e.PUSH_DRIVER ?? (e.NODE_ENV === 'production' ? 'real' : e.NODE_ENV === 'test' ? 'memoria' : 'consola');

  let vapid: ConfigAvisos['vapid'] = null;
  const llaves = [e.VAPID_PUBLICA, e.VAPID_PRIVADA, e.VAPID_CONTACTO];
  if (llaves.some(Boolean)) {
    if (!llaves.every(Boolean)) problemas.push('VAPID_PUBLICA, VAPID_PRIVADA y VAPID_CONTACTO van las tres juntas');
    const publica = e.VAPID_PUBLICA ? medirBase64Url(e.VAPID_PUBLICA) : null;
    if (e.VAPID_PUBLICA && !(publica?.bytes === 65 && publica.primero === 0x04)) {
      problemas.push('VAPID_PUBLICA tiene que ser la llave pública en base64url (65 bytes): genérala con `npx web-push generate-vapid-keys`');
    }
    if (e.VAPID_PRIVADA && medirBase64Url(e.VAPID_PRIVADA)?.bytes !== 32) {
      problemas.push('VAPID_PRIVADA tiene que ser la llave privada en base64url (32 bytes)');
    }
    // Apple rechaza el JWT de VAPID si el contacto no es mailto: o https: (y no acepta localhost).
    if (e.VAPID_CONTACTO && !/^(mailto:[^@\s]+@[^@\s]+\.[^@\s]+|https:\/\/[^\s/]+\.[^\s]+)$/.test(e.VAPID_CONTACTO)) {
      problemas.push('VAPID_CONTACTO tiene que ser mailto:correo@dominio o una dirección https');
    }
    if (!problemas.length) vapid = { publica: e.VAPID_PUBLICA!, privada: e.VAPID_PRIVADA!, contacto: e.VAPID_CONTACTO! };
  }

  let urlApp: string | null = null;
  if (e.AVISOS_URL_APP) {
    if (!/^https?:\/\/[^\s/]+(\/[^\s]*)?$/.test(e.AVISOS_URL_APP)) problemas.push('AVISOS_URL_APP tiene que ser una dirección http(s)');
    else if (e.NODE_ENV === 'production' && !e.AVISOS_URL_APP.startsWith('https://')) problemas.push('AVISOS_URL_APP va con https en producción');
    else urlApp = e.AVISOS_URL_APP.replace(/\/+$/, '');
  }

  if (problemas.length) throw new Error(`Configuración de avisos inválida: ${problemas.join('; ')}`);
  return { driver, vapid, expoAccessToken: e.EXPO_ACCESS_TOKEN, urlApp };
}
