// ─────────────────────────────────────────────────────────────────────────────
// Sincronizar la cola · Zona: Entrenar
//
// Qué hace: manda la cola de Entrenar cuando hay algo pendiente: al montar, cada 30 s y cada vez
// que la app vuelve al frente. Como no hay NetInfo, «volver la señal» se detecta así: el próximo
// intento que llega a la API vacía la cola. Hoy lo monta (sus pestañas quedan vivas toda la
// sesión del alumno) y el registro también.
// Tócalo cuando: cambie cuándo se intenta mandar.
// No lo toques para: qué se manda (cola.ts, transporte.ts).
// Depende de: react-native (AppState) y ./almacen.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sincronizar, useEntrenar } from './almacen';

const CADA_MS = 30_000;

export function useSincronizar(uid: string | null | undefined, alTerminar?: () => void) {
  useEffect(() => {
    if (!uid) return;
    const intentar = () => {
      const cola = useEntrenar.getState().porUsuario[uid]?.cola ?? [];
      if (!cola.some((o) => o.estado === 'pendiente')) return;
      sincronizar(uid)
        .then((r) => {
          if (r && r.enviadas.size > 0) alTerminar?.();
        })
        .catch(() => undefined);
    };
    intentar();
    const reloj = setInterval(intentar, CADA_MS);
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') intentar();
    });
    return () => {
      clearInterval(reloj);
      sub.remove();
    };
  }, [uid, alTerminar]);
}
