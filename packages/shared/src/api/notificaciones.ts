// ─────────────────────────────────────────────────────────────────────────────
// Contrato de notificaciones · Zona: Contrato
//
// Qué hace: los esquemas Zod de entrada y salida de las rutas de avisos al celular y su catálogo
// RUTAS_NOTIFICACIONES, que la API registra en apps/api/src/modulos/notificaciones:
//   POST   /notificaciones/dispositivos       registra el token de Expo (app Android) o la
//                                             suscripción push web (app web: endpoint y llaves).
//                                             201 la primera vez; 200 si ya estaba.
//   DELETE /notificaciones/dispositivos/:id   lo borra (al cerrar sesión o al apagar los avisos).
//   POST   /notificaciones/prueba             manda un aviso al propio usuario (solo entrenador,
//                                             o cualquiera fuera de producción).
// La forma va revisada aquí (formato del token, URL https, llaves en base64url) y el fondo
// también: la suscripción web solo puede apuntar a un servicio de push conocido (FCM, Apple,
// Mozilla, Windows), así la API nunca hace un POST a una dirección que eligió el cliente, y las
// llaves tienen que medir lo que mide una llave P-256 (65 bytes) y un secreto de 16 bytes.
// Reglas: los nombres llevan «Aviso» porque index.ts junta todo con export *. Campos en
// snake_case salvo la suscripción web, que va tal como la entrega el navegador
// (PushSubscription.toJSON(): endpoint, expirationTime, keys). Los cuerpos van con
// z.strictObject (CON-012).
// Tócalo cuando: cambie lo que se registra de un dispositivo o lo que devuelve la prueba.
// No lo toques para: los textos de los avisos ni cuándo salen (apps/api/src/modulos/notificaciones).
// Depende de: zod y ./comun (DefinicionRuta, esquemas base).
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod';
import { esquemaFechaHora, esquemaParamsId, esquemaUuid, type CatalogoRutas } from './comun';

// ── Reglas de §Notificaciones ────────────────────────────────────────────────
/** Tope de push al día por persona, fuera de los del descanso (PRD §Notificaciones, P-20). */
export const TOPE_AVISOS_DIA = 2;
/** El recordatorio sale 30 minutos antes de la hora habitual (P-21). */
export const MINUTOS_ANTES_RECORDATORIO = 30;

// ── Listas cerradas ──────────────────────────────────────────────────────────
/** expo: token de Expo (la app Android); web: suscripción del Push API (la app web del iPhone). */
export const TIPOS_DISPOSITIVO_AVISO = ['expo', 'web'] as const;
export type TipoDispositivoAviso = (typeof TIPOS_DISPOSITIVO_AVISO)[number];
export const PLATAFORMAS_AVISO = ['android', 'ios', 'web'] as const;
export type PlataformaAviso = (typeof PLATAFORMAS_AVISO)[number];

/**
 * Servicios de push web a los que la API acepta mandar (el host o un subdominio). Cubre Chrome y
 * Edge en Android (FCM), Safari en iPhone y Mac (Apple), Firefox (Mozilla) y Edge en Windows.
 */
export const SERVICIOS_PUSH_WEB = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.apple.com',
  'push.services.mozilla.com',
  'notify.windows.com',
] as const;

// ── Ayudas puras (sirven en Node y en el teléfono, sin URL ni Buffer) ────────
const ALFABETO_B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Bytes que trae un texto en base64 o base64url (con o sin relleno), o null si no es válido.
 * `primero` es el primer byte (la llave pública P-256 sin comprimir empieza con 0x04).
 */
export function medirBase64Url(texto: string): { bytes: number; primero: number | null } | null {
  const limpio = texto.replace(/=+$/, '');
  if (!/^[A-Za-z0-9_\-+/]*$/.test(limpio) || limpio.length % 4 === 1) return null;
  const valor = (c: string) => {
    if (c === '-' || c === '+') return 62;
    if (c === '_' || c === '/') return 63;
    return ALFABETO_B64.indexOf(c);
  };
  const bytes = Math.floor((limpio.length * 3) / 4);
  const primero = limpio.length >= 2 ? ((valor(limpio[0]!) << 2) | (valor(limpio[1]!) >> 4)) & 0xff : null;
  return { bytes, primero };
}

/** El host de una URL https (en minúsculas), o null si no es https o no se puede leer. */
export function hostDeUrlHttps(url: string): string | null {
  const m = /^https:\/\/([A-Za-z0-9.-]+)(?::(\d{1,5}))?(?:[/?#][^\s]*)?$/.exec(url);
  if (!m) return null;
  const host = m[1]!.toLowerCase();
  if (host.startsWith('.') || host.endsWith('.') || host.includes('..')) return null;
  return host;
}

/** true si el endpoint es https y de un servicio de push conocido (SERVICIOS_PUSH_WEB). */
export function esServicioPushWeb(endpoint: string): boolean {
  const host = hostDeUrlHttps(endpoint);
  if (!host) return false;
  return SERVICIOS_PUSH_WEB.some((s) => host === s || host.endsWith(`.${s}`));
}

// ── Entrada ──────────────────────────────────────────────────────────────────
/** Token de Expo: `ExponentPushToken[...]` o `ExpoPushToken[...]` (el mismo formato de perfil). */
export const esquemaTokenExpoAviso = z
  .string()
  .trim()
  .max(200, { error: 'El token de Expo es demasiado largo.' })
  .regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$/, { error: 'El token de Expo no tiene el formato esperado.' });

const llaveP256 = z
  .string()
  .trim()
  .max(100, { error: 'La llave p256dh es demasiado larga.' })
  .refine((v) => {
    const m = medirBase64Url(v);
    return m !== null && m.bytes === 65 && m.primero === 0x04;
  }, { error: 'La llave p256dh tiene que ser una llave pública P-256 en base64url (65 bytes).' });

const secretoAuth = z
  .string()
  .trim()
  .max(32, { error: 'El secreto auth es demasiado largo.' })
  .refine((v) => medirBase64Url(v)?.bytes === 16, { error: 'El secreto auth tiene que medir 16 bytes en base64url.' });

/** La suscripción tal como la entrega el navegador: `JSON.parse(JSON.stringify(subscription))`. */
export const esquemaSuscripcionWebAviso = z.strictObject({
  endpoint: z
    .string()
    .trim()
    .min(1, { error: 'Falta el endpoint de la suscripción.' })
    .max(2048, { error: 'El endpoint es demasiado largo.' })
    .refine((v) => hostDeUrlHttps(v) !== null, { error: 'El endpoint tiene que ser una dirección https.' })
    .refine(esServicioPushWeb, { error: 'El endpoint no es de un servicio de push conocido.' }),
  /** Milisegundos desde 1970 en que vence, o null (casi siempre null). */
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.strictObject({ p256dh: llaveP256, auth: secretoAuth }),
});

export const esquemaDispositivoAvisoEntrada = z.discriminatedUnion('tipo', [
  z.strictObject({
    tipo: z.literal('expo'),
    token: esquemaTokenExpoAviso,
    plataforma: z.enum(['android', 'ios'], { error: 'La plataforma va como android o ios.' }),
  }),
  z.strictObject({
    tipo: z.literal('web'),
    suscripcion: esquemaSuscripcionWebAviso,
  }),
], { error: 'El tipo va como expo o web.' });
export type DispositivoAvisoEntrada = z.infer<typeof esquemaDispositivoAvisoEntrada>;

/** POST /notificaciones/prueba (cuerpo opcional). `correo`: además del push, un correo a tu dirección. */
export const esquemaPruebaAvisoEntrada = z.strictObject({ correo: z.boolean().optional() }).nullish();

// ── Salida ───────────────────────────────────────────────────────────────────
export const esquemaDispositivoAviso = z.object({
  id: esquemaUuid,
  tipo: z.enum(TIPOS_DISPOSITIVO_AVISO),
  plataforma: z.enum(PLATAFORMAS_AVISO),
  created_at: esquemaFechaHora,
});
export type DispositivoAviso = z.infer<typeof esquemaDispositivoAviso>;

export const esquemaDispositivoAvisoBorrado = z.object({ borrado: z.literal(true) });

export const RESULTADOS_ENVIO_AVISO = ['enviado', 'invalido', 'fallido'] as const;

export const esquemaPruebaAviso = z.object({
  /** Cuántos teléfonos o navegadores tenías registrados. */
  dispositivos: z.number().int().nonnegative(),
  /** Cuántos aceptó el servicio de push (Expo o el del navegador). */
  enviados: z.number().int().nonnegative(),
  /** Cuántos dijo el servicio que ya no existen: se borraron. */
  invalidos: z.number().int().nonnegative(),
  fallidos: z.number().int().nonnegative(),
  /** true si además se encoló el correo de prueba. */
  correo: z.boolean(),
  resultados: z.array(z.object({
    dispositivo_id: esquemaUuid,
    tipo: z.enum(TIPOS_DISPOSITIVO_AVISO),
    plataforma: z.enum(PLATAFORMAS_AVISO),
    resultado: z.enum(RESULTADOS_ENVIO_AVISO),
  })),
});
export type PruebaAviso = z.infer<typeof esquemaPruebaAviso>;

/**
 * Lo que trae cada push en `data` (Expo) o en el cuerpo cifrado (web): la app y el service worker
 * lo leen para abrir la pantalla al tocarlo.
 */
export const esquemaDatosAviso = z.object({
  tipo: z.string(),
  /** Ruta de la app que se abre al tocar (`/entrenador/alertas`, `/cliente/<id>`, `/`). */
  url: z.string(),
});
export type DatosAviso = z.infer<typeof esquemaDatosAviso>;

// ── Catálogo ─────────────────────────────────────────────────────────────────
export const RUTAS_NOTIFICACIONES = {
  registrarDispositivo: {
    // 201 si es nuevo; 200 si el mismo token o el mismo endpoint ya estaba (no se duplica).
    metodo: 'POST', ruta: '/v1/notificaciones/dispositivos', publica: false,
    cuerpo: esquemaDispositivoAvisoEntrada, exito: 201, respuesta: esquemaDispositivoAviso,
  },
  borrarDispositivo: {
    metodo: 'DELETE', ruta: '/v1/notificaciones/dispositivos/:id', publica: false,
    params: esquemaParamsId, exito: 200, respuesta: esquemaDispositivoAvisoBorrado,
  },
  prueba: {
    metodo: 'POST', ruta: '/v1/notificaciones/prueba', publica: false,
    cuerpo: esquemaPruebaAvisoEntrada, exito: 200, respuesta: esquemaPruebaAviso,
  },
} as const satisfies CatalogoRutas;
