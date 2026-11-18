// ─────────────────────────────────────────────────────────────────────────────
// Abrir la pantalla del aviso al tocarlo (Android) · Zona: Notificaciones (app)
//
// Qué hace: useAbrirAvisos(navegar) escucha el último aviso que la persona tocó (también el que
// abrió la app desde cerrada) y llama a `navegar` con la ruta que trae (`data.url`: la ficha del
// alumno, Alertas, Hoy). Cada aviso se abre una sola vez y una ruta que no es de la app se ignora.
// Se usa una vez, en el layout raíz, con el router: useAbrirAvisos((ruta) => router.push(ruta)).
// En la versión web Metro usa ./toques.web.ts.
// Tócalo cuando: cambie qué se hace al tocar un aviso.
// Depende de: expo-notifications, react y ./registro (rutaDelAviso).
// ─────────────────────────────────────────────────────────────────────────────
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { rutaDelAviso } from './registro';

export function useAbrirAvisos(navegar: (ruta: string) => void): void {
  const ultima = Notifications.useLastNotificationResponse();
  const abierta = useRef<string | null>(null);
  useEffect(() => {
    if (!ultima || ultima.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = ultima.notification.request.identifier;
    if (abierta.current === id) return;
    abierta.current = id;
    const ruta = rutaDelAviso(ultima.notification.request.content.data);
    if (ruta) navegar(ruta);
  }, [ultima, navegar]);
}
