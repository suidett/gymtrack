// ─────────────────────────────────────────────────────────────────────────────
// Sincronizar la cola · Zona: Entrenar
//
// Qué hace: manda la cola de Entrenar cuando hay algo pendiente: al tiro cuando entra algo nuevo
// (en menos de un segundo, así queda en la base casi en tiempo real), al montar, cada 30 s y cada
// vez que la app vuelve al frente. Como no hay NetInfo, «volver la señal» se detecta así: el
// próximo intento que llega a la API vacía la cola. Hoy lo monta (sus pestañas quedan vivas toda la
// sesión del alumno) y el registro también.
// Tócalo cuando: cambie cuándo se intenta mandar.
// No lo toques para: qué se manda (cola.ts, transporte.ts).
// Depende de: react-native (AppState), ./almacen y ./cola.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { sincronizar, useEntrenar } from './almacen';
import { hayNuevaPendiente } from './cola';

/** Respaldo: reintenta lo pendiente cada 30 s (por si se cortó la señal). */
const CADA_MS = 30_000;
/** Espera corta antes de mandar algo recién encolado, para juntar dos toques seguidos. */
const AL_TIRO_MS = 400;

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
    // Al tiro: cada vez que entra algo nuevo a la cola (una serie, una observación, el cierre) se
    // manda a los AL_TIRO_MS, así queda en la base en segundos y no al próximo turno de 30 s. Si
    // no hay señal falla callado y lo vuelve a intentar el reloj o la vuelta al frente.
    let espera: ReturnType<typeof setTimeout> | undefined;
    // Solo lo que entra nuevo: un reintento sin señal también cambia la cola, y si eso disparara
    // otro envío quedaría intentando en bucle. Esos reintentos los hace el reloj.
    const alCambiar = useEntrenar.subscribe((s, antes) => {
      const cola = s.porUsuario[uid]?.cola;
      const previa = antes.porUsuario[uid]?.cola;
      if (!cola || cola === previa) return;
      if (!hayNuevaPendiente(cola, previa ?? [])) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(intentar, AL_TIRO_MS);
    });
    const reloj = setInterval(intentar, CADA_MS);
    const sub = AppState.addEventListener('change', (e) => {
      if (e === 'active') intentar();
    });
    return () => {
      if (espera) clearTimeout(espera);
      alCambiar();
      clearInterval(reloj);
      sub.remove();
    };
  }, [uid, alTerminar]);
}
