// ─────────────────────────────────────────────────────────────────────────────
// Instancia de la campana · Zona: Notificaciones (app)
//
// Qué hace: arma para la app lo que en ./api.ts, ./almacen.ts y ./sondeo.ts son fábricas puras:
//   almacenNotificaciones        el store único, con las llamadas sobre api.llamar de @/lib/sesion.
//   useNotificaciones(selector)  lee el store desde un componente (el contador, la lista).
//   useNotificacionesEnVivo(id)  lo monta la campana y la pantalla: deja el store en esa cuenta y
//                                se suscribe al reloj de 15 s (que para con la app en segundo
//                                plano y pide al tiro al volver, con AppState; en la web
//                                AppState sigue a la pestaña visible). Al volver a la pantalla
//                                también pide, si la última respuesta tiene más de 3 s.
// Tócalo cuando: cambie a qué se conecta la campana (otra fuente de «ahora está al frente»).
// No lo toques para: las reglas (./logica.ts, ./almacen.ts, ./sondeo.ts).
// Depende de: react, react-native (AppState), expo-router (useFocusEffect), zustand y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { api, esSinConexion } from '@/lib/sesion';
import { crearAlmacenNotificaciones, type EstadoNotificaciones } from './almacen';
import { crearApiNotificaciones } from './api';
import { crearSondeo } from './sondeo';

// ── Store y reloj únicos ─────────────────────────────────────────────────────
export const almacenNotificaciones = crearAlmacenNotificaciones({
  api: crearApiNotificaciones(api.llamar),
  esSinRed: esSinConexion,
});

const sondeo = crearSondeo({
  consultar: () => void almacenNotificaciones.getState().refrescar(),
  estadoInicial: AppState.currentState ?? 'active',
});
AppState.addEventListener('change', (estado) => sondeo.alCambiarEstado(estado));

/** Al volver a una pantalla con la campana, no se pide de nuevo si la lista tiene menos de esto. */
const FRESCA_MS = 3_000;

// ── Hooks ────────────────────────────────────────────────────────────────────
export function useNotificaciones<T>(selector: (s: EstadoNotificaciones) => T): T {
  return useStore(almacenNotificaciones, selector);
}

/** La campana y la pantalla lo montan: la lista se mantiene al día mientras se miran. */
export function useNotificacionesEnVivo(usuarioId: string | null | undefined): void {
  useEffect(() => {
    if (!usuarioId) return;
    almacenNotificaciones.getState().usar(usuarioId);
    return sondeo.suscribir();
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      if (usuarioId) void almacenNotificaciones.getState().refrescar({ siPasaronMs: FRESCA_MS });
    }, [usuarioId]),
  );
}
