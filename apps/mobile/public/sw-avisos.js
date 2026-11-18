// ─────────────────────────────────────────────────────────────────────────────
// Service worker de los avisos · Zona: Notificaciones (app web)
//
// Qué hace: corre en el navegador aunque la app esté cerrada. Cuando llega un push de la API
// (Web Push con VAPID) muestra el aviso con el título y el texto que trae, y al tocarlo abre la
// pantalla que indica (`url`, siempre una ruta de la app) o enfoca la app si ya estaba abierta y
// le pide que navegue (mensaje «gymtrack-abrir», que escucha useAbrirAvisos de
// src/lib/notificaciones/toques.web.ts).
// Cada push muestra un aviso: Safari en el iPhone cancela la suscripción si llegan push sin aviso.
// Dónde vive: aquí, en apps/mobile/public (Expo copia public/ tal cual en `expo export -p web`),
// así queda en la raíz del sitio como /sw-avisos.js y controla toda la app (alcance «/»). Lo
// registra registrarServiceWorker de src/lib/notificaciones/plataforma.web.ts. firebase.json lo
// sirve sin caché, así una versión nueva entra al abrir la app.
// Si la app web suma otro service worker en «/» (por ejemplo para funcionar sin señal), en vez
// de registrar este hay que sumarlo al otro con importScripts('/sw-avisos.js').
// Tócalo cuando: cambie cómo se ve el aviso o qué hace al tocarlo.
// No lo toques para: el texto de cada aviso (lo arma la API, src/modulos/notificaciones/textos.ts).
// Depende de: nada: es JavaScript del navegador, sin librerías ni empaquetado.
// ─────────────────────────────────────────────────────────────────────────────

/** Solo rutas de la app: un aviso nunca abre otro sitio. */
function rutaSegura(url) {
  return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') ? url : '/';
}

self.addEventListener('install', () => {
  // La versión nueva entra sin esperar a que se cierren todas las pestañas.
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { cuerpo: evento.data ? evento.data.text() : '' };
  }
  const titulo = typeof datos.titulo === 'string' && datos.titulo ? datos.titulo : 'GymTrack';
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: typeof datos.cuerpo === 'string' ? datos.cuerpo : '',
      icon: '/icono-192.png',
      badge: '/icono-192.png',
      lang: 'es-CL',
      data: { url: rutaSegura(datos.url), tipo: typeof datos.tipo === 'string' ? datos.tipo : 'aviso' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = rutaSegura(evento.notification.data && evento.notification.data.url);
  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          await ventana.focus();
          ventana.postMessage({ tipo: 'gymtrack-abrir', url });
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
