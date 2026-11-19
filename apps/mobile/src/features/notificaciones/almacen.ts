// ─────────────────────────────────────────────────────────────────────────────
// Estado de la campana · Zona: Notificaciones (app)
//
// Qué hace: lo que comparten la campana (el contador) y la pantalla Notificaciones (la lista), en
// un store de zustand para toda la app:
//   usar(usuarioId)  al montar con sesión: si es otra cuenta, parte de cero (no se ve lo de la
//                    anterior en un teléfono compartido).
//   refrescar()      pide la primera página y la junta con lo que se ve. Si ya hay una en camino,
//                    espera esa (la campana, la pantalla y el reloj de 15 s no piden dos veces).
//                    `siPasaronMs`: no pide si la última respuesta es más nueva que eso.
//   cargarMas()      la página siguiente, con `antes` = la hora de la última que se ve.
//   leer(id)         la deja leída al tiro y avisa a la API; si la API falla, vuelve a sin leer.
//   leerTodas()      lo mismo con todas; si falla, vuelve como estaba y lanza el error (la
//                    pantalla muestra el aviso).
// Fases: 'inicial' (nunca pidió), 'cargando' (la primera vez), 'listo' y 'error' (falló sin
// datos que mostrar). Con datos, una falla deja la lista y marca `fallo` ('sin_red' o 'error').
// Es una fábrica sin React Native: la API se inyecta, así se prueba en Node
// (./__tests__/almacen.test.ts). La instancia de la app está en ./instancia.ts.
// Tócalo cuando: cambie qué se guarda o cómo se reacciona a una respuesta.
// No lo toques para: las reglas de juntar y marcar (./logica.ts) ni las rutas (./api.ts).
// Depende de: zustand/vanilla, ./api y ./logica.
// ─────────────────────────────────────────────────────────────────────────────
import type { Notificacion } from '@gymtrack/shared';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { POR_PAGINA, type ApiNotificaciones } from './api';
import { antesDe, desmarcarLeida, marcarLeida, marcarTodas, mezclarPrimera, mezclarSiguiente, type Lista } from './logica';

export type FaseNotificaciones = 'inicial' | 'cargando' | 'listo' | 'error';

export interface EstadoNotificaciones {
  usuarioId: string | null;
  items: Notificacion[];
  sinLeer: number;
  hayMas: boolean;
  fase: FaseNotificaciones;
  /** El último pedido falló: por falta de señal o por otra cosa. null si salió bien. */
  fallo: 'sin_red' | 'error' | null;
  /** El que tira la lista hacia abajo ve la ruedita mientras esto es true. */
  refrescando: boolean;
  cargandoMas: boolean;
  /** Cuándo llegó la última respuesta buena (ms). */
  actualizadoAt: number | null;

  usar(usuarioId: string): void;
  refrescar(o?: { manual?: boolean; siPasaronMs?: number }): Promise<void>;
  cargarMas(): Promise<void>;
  leer(id: string): Promise<void>;
  leerTodas(): Promise<void>;
  reiniciar(): void;
}

const VACIO = {
  usuarioId: null, items: [], sinLeer: 0, hayMas: false, fase: 'inicial' as FaseNotificaciones, fallo: null,
  refrescando: false, cargandoMas: false, actualizadoAt: null,
} satisfies Partial<EstadoNotificaciones>;

export function crearAlmacenNotificaciones(o: {
  api: ApiNotificaciones;
  /** true si el error es por falta de señal (esSinConexion de @/lib/sesion). */
  esSinRed: (e: unknown) => boolean;
  ahora?: () => number;
}): StoreApi<EstadoNotificaciones> {
  const ahora = o.ahora ?? (() => Date.now());
  let enCamino: Promise<void> | null = null;
  // Sube con cada cuenta: lo que llega de un pedido de la cuenta anterior se descarta.
  let vuelta = 0;

  return createStore<EstadoNotificaciones>()((set, get) => {
    const lista = (): Lista => ({ items: get().items, sinLeer: get().sinLeer, hayMas: get().hayMas });
    const fijarLista = (l: Lista) => set({ items: l.items, sinLeer: l.sinLeer, hayMas: l.hayMas });

    return {
      ...VACIO,

      usar(usuarioId) {
        if (get().usuarioId === usuarioId) return;
        vuelta += 1;
        enCamino = null;
        set({ ...VACIO, usuarioId });
      },

      reiniciar() {
        vuelta += 1;
        enCamino = null;
        set({ ...VACIO });
      },

      refrescar({ manual = false, siPasaronMs } = {}) {
        const s = get();
        if (!s.usuarioId) return Promise.resolve();
        if (manual) set({ refrescando: true });
        if (enCamino) return enCamino;
        if (!manual && siPasaronMs !== undefined && s.actualizadoAt !== null && ahora() - s.actualizadoAt < siPasaronMs) {
          return Promise.resolve();
        }
        const mia = vuelta;
        if (s.fase === 'inicial' || (s.fase === 'error' && s.items.length === 0)) set({ fase: 'cargando' });
        const pedido = o.api
          .listar()
          .then(
            (pagina) => {
              if (mia !== vuelta) return;
              fijarLista(mezclarPrimera(lista(), pagina, POR_PAGINA));
              set({ fase: 'listo', fallo: null, actualizadoAt: ahora() });
            },
            (e: unknown) => {
              if (mia !== vuelta) return;
              const fallo = o.esSinRed(e) ? 'sin_red' : 'error';
              set((p) => ({ fallo, fase: p.items.length > 0 || p.fase === 'listo' ? 'listo' : 'error' }));
            },
          )
          .finally(() => {
            if (mia !== vuelta) return;
            enCamino = null;
            set({ refrescando: false });
          });
        enCamino = pedido;
        return pedido;
      },

      async cargarMas() {
        const s = get();
        const antes = antesDe(s.items);
        if (!s.usuarioId || !s.hayMas || s.cargandoMas || !antes) return;
        const mia = vuelta;
        set({ cargandoMas: true });
        try {
          const pagina = await o.api.listar(antes);
          if (mia !== vuelta) return;
          fijarLista(mezclarSiguiente(lista(), pagina, POR_PAGINA));
          set({ fallo: null });
        } catch (e) {
          if (mia === vuelta) set({ fallo: o.esSinRed(e) ? 'sin_red' : 'error' });
        } finally {
          if (mia === vuelta) set({ cargandoMas: false });
        }
      },

      async leer(id) {
        const antes = lista();
        const despues = marcarLeida(antes, id);
        if (despues === antes) return;
        const mia = vuelta;
        fijarLista(despues);
        try {
          const r = await o.api.leer(id);
          if (mia === vuelta) set({ sinLeer: r.sin_leer });
        } catch {
          // Sin señal o la API no la encontró: vuelve a quedar sin leer, se intenta al tocarla otra vez.
          if (mia === vuelta) fijarLista(desmarcarLeida(lista(), id));
        }
      },

      async leerTodas() {
        const antes = lista();
        const mia = vuelta;
        fijarLista(marcarTodas(antes));
        try {
          const r = await o.api.leerTodas();
          if (mia === vuelta) set({ sinLeer: r.sin_leer });
        } catch (e) {
          if (mia === vuelta) fijarLista(antes);
          throw e;
        }
      },
    };
  });
}
