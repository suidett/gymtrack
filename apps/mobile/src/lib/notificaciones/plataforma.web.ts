// ─────────────────────────────────────────────────────────────────────────────
// Avisos en la app web (iPhone y navegadores) · Zona: Notificaciones (app)
//
// Qué hace: lo mismo que ./plataforma.ts, pero con el Push API del navegador, para la app web que
// el iPhone instala desde Safari («Agregar a pantalla de inicio»):
//   - registra el service worker /sw-avisos.js (el archivo vive en apps/mobile/public/sw-avisos.js
//     y Expo lo publica en la raíz del sitio), que es quien muestra el aviso y abre la
//     pantalla al tocarlo; si la app ya tiene otro en «/», usa ese (que lo importa);
//   - pide el permiso con Notification.requestPermission() (en el iPhone solo desde un toque y
//     solo con la app abierta desde la pantalla de inicio, iOS 16.4 o más);
//   - se suscribe con la clave pública VAPID de EXPO_PUBLIC_VAPID_PUBLICA (la misma VAPID_PUBLICA
//     de la API) y entrega la suscripción (endpoint y llaves) para registrarla en la API.
// Metro usa este archivo solo al armar la versión web; en Android usa ./plataforma.ts.
// Tócalo cuando: cambie el service worker o cómo se suscribe el navegador.
// No lo toques para: el flujo de activar (./registro.ts) ni lo que hace el service worker al
// recibir el aviso (apps/mobile/public/sw-avisos.js).
// Depende de: el navegador (Notification, serviceWorker, PushManager) y ./registro.
// ─────────────────────────────────────────────────────────────────────────────
import { base64UrlABytes, type PlataformaAvisos, type Permiso } from './registro';

/** Donde se publica el service worker: en la raíz, para que controle toda la app (alcance «/»). */
export const RUTA_SERVICE_WORKER = '/sw-avisos.js';
const CLAVE_VAPID = process.env.EXPO_PUBLIC_VAPID_PUBLICA ?? '';

const hayNavegador = () => typeof window !== 'undefined' && typeof navigator !== 'undefined';

/** true si el navegador puede recibir push (en el iPhone, solo la app agregada a la pantalla de inicio). */
function soportaPush(): boolean {
  return hayNavegador() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function esIphone(): boolean {
  if (!hayNavegador()) return false;
  // El iPad con iPadOS se presenta como Mac; se le nota en la pantalla táctil.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function abiertaDesdeInicio(): boolean {
  if (!hayNavegador()) return false;
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function sinSoporte(): Permiso {
  return esIphone() && !abiertaDesdeInicio() ? 'instalar_primero' : 'no_disponible';
}

/**
 * El service worker que controla «/». Si la app ya registró uno (por ejemplo /sw.js para
 * funcionar sin señal) se usa ese, que tiene que traer los avisos con importScripts('/sw-avisos.js'):
 * dos service workers en el mismo alcance se pisan. Si no hay ninguno, registra /sw-avisos.js.
 */
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  const actual = await navigator.serviceWorker.getRegistration('/');
  const registro = actual ?? (await navigator.serviceWorker.register(RUTA_SERVICE_WORKER, { scope: '/' }));
  await navigator.serviceWorker.ready;
  return registro;
}

/** true si la suscripción se hizo con otra clave VAPID (la API la rotó): hay que hacerla de nuevo. */
function esDeOtraClave(s: PushSubscription, clave: Uint8Array): boolean {
  const usada = s.options?.applicationServerKey;
  if (!usada) return false;
  const a = new Uint8Array(usada);
  return a.length !== clave.length || a.some((b, i) => b !== clave[i]);
}

export const plataforma: PlataformaAvisos = {
  nombre: 'web',
  async permiso() {
    if (!soportaPush()) return sinSoporte();
    if (!CLAVE_VAPID) return 'no_disponible';
    if (Notification.permission === 'granted') return 'concedido';
    return Notification.permission === 'denied' ? 'denegado' : 'sin_pedir';
  },
  async pedirPermiso() {
    if (!soportaPush()) return sinSoporte();
    if (!CLAVE_VAPID) return 'no_disponible';
    if (Notification.permission === 'granted') return 'concedido';
    // Lo primero del toque, sin esperar otra cosa antes: si no, Safari no muestra la pregunta.
    const r = await Notification.requestPermission();
    return r === 'granted' ? 'concedido' : 'denegado';
  },
  async destino() {
    const clave = base64UrlABytes(CLAVE_VAPID);
    const registro = await registrarServiceWorker();
    let s = await registro.pushManager.getSubscription();
    if (s && esDeOtraClave(s, clave)) {
      await s.unsubscribe();
      s = null;
    }
    s ??= await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave as BufferSource });
    const json = s.toJSON();
    return {
      tipo: 'web',
      suscripcion: {
        endpoint: json.endpoint ?? s.endpoint,
        expirationTime: json.expirationTime ?? null,
        keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      },
    };
  },
  async olvidar() {
    if (!soportaPush()) return;
    const registro = await navigator.serviceWorker.getRegistration('/');
    const s = await registro?.pushManager.getSubscription();
    await s?.unsubscribe();
  },
};
