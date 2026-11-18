// ─────────────────────────────────────────────────────────────────────────────
// Proveedores de push · Zona: Notificaciones (API)
//
// Qué hace: entrega un mensaje a una lista de dispositivos y dice, por cada uno, si salió
// (enviado), si el servicio dijo que ya no existe (invalido: el servicio lo borra) o si falló
// por otra cosa (fallido). Hay tres juegos, según PUSH_DRIVER:
//   real     Expo Push API (POST https://exp.host/--/api/v2/push/send, de a 100) para los tokens
//            de la app Android, y Web Push con la librería web-push y las llaves VAPID para la
//            app web. Cada pedido tiene tope de 10 s y un reintento si falla por red, por tiempo,
//            por un 5xx o por un 429. Expo dice DeviceNotRegistered y el navegador dice 404 o
//            410 cuando el token o la suscripción ya no sirven.
//   consola  no sale nada a internet: guarda en el buzón y deja una línea en el log.
//   memoria  solo el buzón: las pruebas leen lo que se habría mandado y pueden marcar un
//            destino como inválido para probar el borrado.
// Los logs llevan el tipo de aviso, cuántos dispositivos y códigos; nunca un token, un endpoint,
// una llave ni el texto del aviso.
// Tócalo cuando: Expo o Web Push cambien su API, o quieras otro tope o reintento.
// No lo toques para: a quién y cuándo se avisa (./servicio.ts, ./eventos.ts).
// Depende de: web-push, el fetch global de Node 22, ./almacen (tipos) y ./config.
// ─────────────────────────────────────────────────────────────────────────────
import type { DatosAviso } from '@gymtrack/shared';
import type { FastifyBaseLogger } from 'fastify';
import { sendNotification } from 'web-push';
import type { DestinoWeb, DispositivoExpo, DispositivoWeb } from './almacen';
import type { ConfigAvisos, DriverPush } from './config';

export type ResultadoEnvio = 'enviado' | 'invalido' | 'fallido';

export interface MensajePush {
  titulo: string;
  cuerpo: string;
  datos: DatosAviso;
  /** Cuánto sirve si el teléfono está apagado (segundos). Un recordatorio viejo no sirve. */
  vigenciaS: number;
  urgente: boolean;
}

export interface ProveedoresPush {
  readonly nombre: DriverPush;
  expo(dispositivos: readonly DispositivoExpo[], m: MensajePush): Promise<Map<string, ResultadoEnvio>>;
  web(dispositivos: readonly DispositivoWeb[], m: MensajePush): Promise<Map<string, ResultadoEnvio>>;
}

type Log = Pick<FastifyBaseLogger, 'info' | 'warn' | 'error'>;

/** El canal de Android que crea la app (apps/mobile/src/lib/notificaciones). */
export const CANAL_ANDROID = 'avisos';
export const URL_EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
export const TOPE_PUSH_MS = 10_000;
export const LOTE_EXPO = 100;

const esperar = (ms: number) => (ms > 0 ? new Promise((listo) => setTimeout(listo, ms)) : Promise.resolve());

// ── Expo ─────────────────────────────────────────────────────────────────────
export type FetchExpo = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

interface TicketExpo {
  status?: unknown;
  details?: { error?: unknown };
}

export function crearProveedorExpo(o: { accessToken?: string; fetch?: FetchExpo; pausaReintentoMs?: number; log?: Log } = {}) {
  const hacerFetch: FetchExpo = o.fetch ?? ((url, init) => fetch(url, init));
  const pausa = o.pausaReintentoMs ?? 1000;

  async function lote(dispositivos: readonly DispositivoExpo[], m: MensajePush, salida: Map<string, ResultadoEnvio>) {
    const body = JSON.stringify(dispositivos.map((d) => ({
      to: d.destino.token,
      title: m.titulo,
      body: m.cuerpo,
      data: m.datos,
      sound: 'default',
      priority: m.urgente ? 'high' : 'normal',
      channelId: CANAL_ANDROID,
      ttl: m.vigenciaS,
    })));
    const headers: Record<string, string> = {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
      ...(o.accessToken ? { authorization: `Bearer ${o.accessToken}` } : {}),
    };
    let codigo = 'EXPO_RED';
    for (let intento = 1; intento <= 2; intento++) {
      if (intento > 1) await esperar(pausa);
      let res: Awaited<ReturnType<FetchExpo>>;
      try {
        res = await hacerFetch(URL_EXPO_PUSH, { method: 'POST', headers, body, signal: AbortSignal.timeout(TOPE_PUSH_MS) });
      } catch (err) {
        codigo = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError') ? 'EXPO_TIEMPO' : 'EXPO_RED';
        continue;
      }
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as { data?: unknown } | null;
        const tickets = Array.isArray(json?.data) ? (json.data as TicketExpo[]) : [];
        dispositivos.forEach((d, i) => {
          const t = tickets[i];
          if (t?.status === 'ok') salida.set(d.id, 'enviado');
          else if (t?.details?.error === 'DeviceNotRegistered') salida.set(d.id, 'invalido');
          else salida.set(d.id, 'fallido');
        });
        const errores = tickets.filter((t) => t?.status === 'error' && t.details?.error !== 'DeviceNotRegistered');
        if (errores.length) {
          o.log?.warn({ push: 'expo', fallidos: errores.length, codigos: [...new Set(errores.map((t) => String(t.details?.error ?? 'desconocido')))] }, 'Expo rechazó algunos avisos');
        }
        return;
      }
      codigo = `EXPO_${res.status}`;
      // Un 4xx que no es 429 (pedido mal armado, credenciales) no mejora con otro intento.
      if (res.status < 500 && res.status !== 429) break;
    }
    for (const d of dispositivos) salida.set(d.id, 'fallido');
    o.log?.error({ push: 'expo', dispositivos: dispositivos.length, codigo }, 'no se pudo mandar el aviso por Expo');
  }

  return {
    async enviar(dispositivos: readonly DispositivoExpo[], m: MensajePush): Promise<Map<string, ResultadoEnvio>> {
      const salida = new Map<string, ResultadoEnvio>();
      for (let i = 0; i < dispositivos.length; i += LOTE_EXPO) await lote(dispositivos.slice(i, i + LOTE_EXPO), m, salida);
      return salida;
    },
  };
}

// ── Web Push ─────────────────────────────────────────────────────────────────
export type EnviarWebPush = (
  suscripcion: DestinoWeb,
  carga: string,
  opciones: {
    vapidDetails: { subject: string; publicKey: string; privateKey: string };
    TTL: number;
    urgency: 'normal' | 'high';
    timeout: number;
  },
) => Promise<unknown>;

/** Lo que lee el service worker de la app web (apps/mobile/src/lib/notificaciones/sw-avisos.js). */
export function cargaWeb(m: MensajePush): string {
  return JSON.stringify({ titulo: m.titulo, cuerpo: m.cuerpo, url: m.datos.url, tipo: m.datos.tipo });
}

export function crearProveedorWeb(o: { vapid: NonNullable<ConfigAvisos['vapid']>; enviar?: EnviarWebPush; pausaReintentoMs?: number; log?: Log }) {
  const enviarUno: EnviarWebPush = o.enviar ?? ((s, carga, opciones) => sendNotification(s, carga, opciones));
  const pausa = o.pausaReintentoMs ?? 1000;
  const vapidDetails = { subject: o.vapid.contacto, publicKey: o.vapid.publica, privateKey: o.vapid.privada };

  async function uno(d: DispositivoWeb, m: MensajePush): Promise<ResultadoEnvio> {
    let codigo = 'WEB_RED';
    for (let intento = 1; intento <= 2; intento++) {
      if (intento > 1) await esperar(pausa);
      try {
        await enviarUno(d.destino, cargaWeb(m), { vapidDetails, TTL: m.vigenciaS, urgency: m.urgente ? 'high' : 'normal', timeout: TOPE_PUSH_MS });
        return 'enviado';
      } catch (err) {
        const estado = (err as { statusCode?: unknown })?.statusCode;
        // 404 y 410: la suscripción venció o el usuario quitó el permiso.
        if (estado === 404 || estado === 410) return 'invalido';
        codigo = typeof estado === 'number' ? `WEB_${estado}` : 'WEB_RED';
        if (typeof estado === 'number' && estado < 500 && estado !== 429) break;
      }
    }
    o.log?.error({ push: 'web', codigo }, 'no se pudo mandar el aviso por Web Push');
    return 'fallido';
  }

  return {
    async enviar(dispositivos: readonly DispositivoWeb[], m: MensajePush): Promise<Map<string, ResultadoEnvio>> {
      const salida = new Map<string, ResultadoEnvio>();
      // De a 5 a la vez: una persona tiene pocos navegadores; esto es por si un día son más.
      for (let i = 0; i < dispositivos.length; i += 5) {
        const grupo = dispositivos.slice(i, i + 5);
        const r = await Promise.all(grupo.map((d) => uno(d, m)));
        grupo.forEach((d, j) => salida.set(d.id, r[j]!));
      }
      return salida;
    },
  };
}

// ── Buzón (pruebas y local) ──────────────────────────────────────────────────
export interface EnvioPush {
  dispositivoId: string;
  usuarioId: string;
  tipo: 'expo' | 'web';
  /** El token de Expo o el endpoint web (solo en memoria, para las pruebas). */
  destino: string;
  mensaje: MensajePush;
}

export interface BuzonPush {
  todos(): readonly EnvioPush[];
  /** Lo que recibió esa persona, en orden. */
  de(usuarioId: string): EnvioPush[];
  vaciar(): void;
  /** El próximo envío a ese token o endpoint responde «ya no existe» (para probar el borrado). */
  marcarInvalido(destino: string): void;
  /** Lo usan los proveedores de memoria y consola: guarda el envío o dice que el destino no existe. */
  registrar(e: EnvioPush): ResultadoEnvio;
}

export function crearBuzonPush(): BuzonPush {
  const envios: EnvioPush[] = [];
  const invalidos = new Set<string>();
  return {
    todos: () => envios,
    de: (usuarioId) => envios.filter((e) => e.usuarioId === usuarioId),
    vaciar: () => {
      envios.length = 0;
      invalidos.clear();
    },
    marcarInvalido: (destino) => {
      invalidos.add(destino);
    },
    registrar: (e) => {
      if (invalidos.has(e.destino)) return 'invalido';
      envios.push(e);
      return 'enviado';
    },
  };
}

function proveedoresDeBuzon(nombre: 'memoria' | 'consola', buzon: BuzonPush, log?: Log): ProveedoresPush {
  const enviar = async (tipo: 'expo' | 'web', ds: readonly (DispositivoExpo | DispositivoWeb)[], m: MensajePush) => {
    const salida = new Map<string, ResultadoEnvio>();
    for (const d of ds) {
      const destino = d.tipo === 'expo' ? d.destino.token : d.destino.endpoint;
      salida.set(d.id, buzon.registrar({ dispositivoId: d.id, usuarioId: d.usuarioId, tipo, destino, mensaje: m }));
    }
    if (nombre === 'consola' && ds.length) log?.info({ aviso: m.datos.tipo, push: tipo, dispositivos: ds.length }, 'push de desarrollo (no salió a internet)');
    return salida;
  };
  return { nombre, expo: (ds, m) => enviar('expo', ds, m), web: (ds, m) => enviar('web', ds, m) };
}

/** Los proveedores que pide la configuración. `buzon` se usa con memoria y consola. */
export function crearProveedores(config: ConfigAvisos, buzon: BuzonPush, log: Log): ProveedoresPush {
  if (config.driver !== 'real') return proveedoresDeBuzon(config.driver, buzon, log);
  const expo = crearProveedorExpo({ accessToken: config.expoAccessToken, log });
  const web = config.vapid ? crearProveedorWeb({ vapid: config.vapid, log }) : null;
  if (!web) log.warn({ push: 'web' }, 'faltan VAPID_PUBLICA, VAPID_PRIVADA y VAPID_CONTACTO: la app web no recibe avisos');
  return {
    nombre: 'real',
    expo: (ds, m) => expo.enviar(ds, m),
    web: async (ds, m) => (web ? web.enviar(ds, m) : new Map(ds.map((d) => [d.id, 'fallido' as const]))),
  };
}
