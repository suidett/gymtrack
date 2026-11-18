// ─────────────────────────────────────────────────────────────────────────────
// Abrir la pantalla del aviso al tocarlo (app web) · Zona: Notificaciones (app)
//
// Qué hace: en la web el toque lo recibe el service worker (apps/mobile/public/sw-avisos.js): si
// la app estaba cerrada, la abre directo en la ruta del aviso; si estaba abierta, la enfoca y le
// manda el mensaje «gymtrack-abrir» con la ruta. useAbrirAvisos escucha ese mensaje y navega. Misma firma
// que ./toques.ts, así el layout raíz la usa igual en las dos plataformas.
// Tócalo cuando: cambie el mensaje entre el service worker y la app.
// Depende de: react, el navegador y ./registro (rutaDelAviso).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { rutaDelAviso } from './registro';

export function useAbrirAvisos(navegar: (ruta: string) => void): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const alMensaje = (e: MessageEvent) => {
      const datos = e.data as { tipo?: unknown } | null;
      if (datos?.tipo !== 'gymtrack-abrir') return;
      const ruta = rutaDelAviso(datos);
      if (ruta) navegar(ruta);
    };
    navigator.serviceWorker.addEventListener('message', alMensaje);
    return () => navigator.serviceWorker.removeEventListener('message', alMensaje);
  }, [navegar]);
}
