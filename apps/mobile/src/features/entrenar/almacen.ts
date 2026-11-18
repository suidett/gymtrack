// ─────────────────────────────────────────────────────────────────────────────
// Almacén de Entrenar · Zona: Entrenar
//
// Qué hace: guarda en el teléfono, por alumno, lo último que llegó de Hoy (para abrir sin señal),
// la sesión en curso (cada serie marcada se escribe al instante, antes de cualquier llamada), la
// cola de envíos sin señal y los últimos cierres con su resumen. Expone las acciones que usan las
// pantallas y `sincronizar`, que manda la cola con api.llamar y aplica lo que responde la API.
// Persiste con zustand en AsyncStorage, como el store de la 0.1. Los tokens no pasan por aquí.
// Tócalo cuando: una pantalla de Entrenar necesite guardar algo nuevo o una acción nueva.
// No lo toques para: las reglas de la sesión (sesionLocal.ts) ni de la cola (cola.ts).
// Depende de: zustand, AsyncStorage, @/lib/sesion (api, esSinConexion) y los archivos puros de
// esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { api, esSinConexion } from '@/lib/sesion';
import { aplicarProceso, encolar, procesarCola, reintentarRechazadas, type Enviar, type NuevaOp, type OpCola, type ResultadoProceso } from './cola';
import { cuerpoCerrar, cuerpoCrear, cuerpoObservacion, cuerpoSeries, normalizarCierre, normalizarHoy, RUTAS_APP } from './contrato';
import { ahora, isoConZona } from './formato';
import { nuevoId } from './ids';
import type { CierreGuardado, DiaHoy, Hoy, ObservacionGuardada, SesionLocal } from './modelo';
import * as S from './sesionLocal';
import { crearEnvio } from './transporte';

// ── Estado ───────────────────────────────────────────────────────────────────
export interface DatosUsuario {
  hoy: Hoy | null;
  hoyAt: number | null;
  sesion: SesionLocal | null;
  cola: OpCola[];
  cierres: Record<string, CierreGuardado>;
  /** true si el último intento de mandar o de leer Hoy no encontró señal. */
  sinRed: boolean;
}

export const DATOS_VACIOS: DatosUsuario = Object.freeze({ hoy: null, hoyAt: null, sesion: null, cola: [], cierres: {}, sinRed: false }) as DatosUsuario;

/** Cuántos cierres se guardan (para Rutina completada y para no repetir el día sin señal). */
const MAX_CIERRES = 10;

interface EstadoEntrenar {
  porUsuario: Record<string, DatosUsuario>;
  deviceId: string | null;
  hidratado: boolean;

  guardarHoy: (uid: string, hoy: Hoy) => void;
  marcarSinRed: (uid: string, sinRed: boolean) => void;
  /** Arma la sesión del día, la deja en curso y encola el iniciar. Devuelve el id. */
  empezar: (uid: string, dia: DiaHoy) => string | null;
  /** Reemplaza la sesión en curso por la que devuelve `fn` (reglas de sesionLocal.ts). */
  cambiarSesion: (uid: string, fn: (s: SesionLocal) => SesionLocal, encolarSeries?: boolean) => void;
  /** Cierra la sesión en curso: calcula el resumen local, la guarda y encola el cierre. */
  terminar: (uid: string) => string | null;
  /** Descarta la sesión en curso (o una que solo conoce la API). */
  descartar: (uid: string, sessionId: string) => void;
  /** Encola una observación o dolor; con `cierreId`, queda también en el cierre para mostrarla. */
  anotar: (uid: string, o: ObservacionGuardada & { sessionId?: string | null; exerciseId?: string | null; cierreId?: string }) => void;
  reintentar: (uid: string) => void;
  aplicar: (uid: string, r: ResultadoProceso) => void;
}

function datosDe(s: EstadoEntrenar, uid: string): DatosUsuario {
  return s.porUsuario[uid] ?? DATOS_VACIOS;
}

// Entradas que se están mandando ahora mismo (ver encolar en cola.ts).
const enVuelo = new Set<string>();

export const useEntrenar = create<EstadoEntrenar>()(
  persist(
    (set, get) => {
      const mod = (uid: string, fn: (d: DatosUsuario) => DatosUsuario) =>
        set((s) => ({ porUsuario: { ...s.porUsuario, [uid]: fn(datosDe(s, uid)) } }));
      const conCola = (d: DatosUsuario, op: NuevaOp): DatosUsuario => ({ ...d, cola: encolar(d.cola, op, enVuelo) });
      const idTelefono = () => {
        const actual = get().deviceId;
        if (actual) return actual;
        const id = nuevoId();
        set({ deviceId: id });
        return id;
      };
      const base = (sessionId: string | null) => ({ id: nuevoId(), session_id: sessionId, creada_at: isoConZona(ahora()) });

      return {
        porUsuario: {},
        deviceId: null,
        hidratado: false,

        guardarHoy(uid, hoy) {
          mod(uid, (d) => ({ ...d, hoy, hoyAt: ahora(), sinRed: false }));
        },
        marcarSinRed(uid, sinRed) {
          mod(uid, (d) => (d.sinRed === sinRed ? d : { ...d, sinRed }));
        },
        empezar(uid, dia) {
          const d = datosDe(get(), uid);
          if (d.sesion) return d.sesion.id;
          if (!d.hoy) return null;
          const sesion = S.crearSesion(d.hoy, dia, { id: nuevoId(), nuevoId, ahoraMs: ahora(), deviceId: idTelefono() });
          mod(uid, (x) => conCola({ ...x, sesion }, { ...base(sesion.id), tipo: 'iniciar', session_id: sesion.id, cuerpo: cuerpoCrear(sesion) }));
          return sesion.id;
        },
        cambiarSesion(uid, fn, encolarSeries = false) {
          mod(uid, (d) => {
            if (!d.sesion) return d;
            const sesion = fn(d.sesion);
            if (sesion === d.sesion) return d;
            const x = { ...d, sesion };
            return encolarSeries ? conCola(x, { ...base(sesion.id), tipo: 'series', session_id: sesion.id, cuerpo: cuerpoSeries(sesion) }) : x;
          });
        },
        terminar(uid) {
          const d = datosDe(get(), uid);
          const s = d.sesion;
          if (!s) return null;
          const ms = ahora();
          const local = S.resumenLocal(s, ms, d.hoy?.proximo ?? null);
          const cerradaAt = isoConZona(ms);
          const cierre: CierreGuardado = {
            id: s.id,
            nombre_dia: s.nombre_dia,
            semana: s.semana,
            routine_id: s.routine_id,
            routine_day_id: s.routine_day_id,
            cerrada_at: cerradaAt,
            local,
            servidor: null,
            envio: 'pendiente',
            motivo: null,
            observacion: null,
            entrenador_nombre: s.entrenador_nombre,
            peso_corporal: d.hoy?.peso_corporal ?? null,
          };
          mod(uid, (x) => {
            // Se guardan los últimos MAX_CIERRES; el más viejo sale primero.
            const cierres = { ...x.cierres, [s.id]: cierre };
            const orden = Object.values(cierres).sort((a, b) => a.cerrada_at.localeCompare(b.cerrada_at));
            for (const viejo of orden.slice(0, Math.max(0, orden.length - MAX_CIERRES))) delete cierres[viejo.id];
            return conCola(
              { ...x, sesion: null, cierres },
              { ...base(s.id), tipo: 'cerrar', session_id: s.id, crear: cuerpoCrear(s), series: cuerpoSeries(s), cerrar: cuerpoCerrar(cerradaAt, local.duracion_s) },
            );
          });
          return s.id;
        },
        descartar(uid, sessionId) {
          mod(uid, (d) =>
            conCola(
              { ...d, sesion: d.sesion?.id === sessionId ? null : d.sesion, hoy: d.hoy?.sesion_en_curso?.id === sessionId ? { ...d.hoy, sesion_en_curso: null } : d.hoy },
              { ...base(sessionId), tipo: 'descartar', session_id: sessionId },
            ),
          );
        },
        anotar(uid, o) {
          const cuerpo = cuerpoObservacion({ ...o });
          mod(uid, (d) => {
            const x = conCola(d, { ...base(o.sessionId ?? null), tipo: 'observacion', cuerpo });
            const c = o.cierreId ? x.cierres[o.cierreId] : undefined;
            if (!c || !o.cierreId) return x;
            return { ...x, cierres: { ...x.cierres, [o.cierreId]: { ...c, observacion: { tipo: o.tipo, texto: o.texto.trim(), zona: o.zona, intensidad: o.intensidad } } } };
          });
        },
        reintentar(uid) {
          mod(uid, (d) => ({ ...d, cola: reintentarRechazadas(d.cola) }));
        },
        aplicar(uid, r) {
          mod(uid, (d) => {
            const cierres = { ...d.cierres };
            for (const res of r.resultados) {
              if (res.op.tipo !== 'cerrar' || !res.op.session_id) continue;
              const c = cierres[res.op.session_id];
              if (!c) continue;
              cierres[res.op.session_id] =
                res.resultado === 'enviada'
                  ? { ...c, servidor: normalizarCierre(res.datos, c.local), envio: 'enviada', motivo: null }
                  : { ...c, envio: 'rechazada', motivo: res.motivo ?? null };
            }
            return { ...d, cola: aplicarProceso(d.cola, r), cierres, sinRed: r.detenida === 'sin_red' };
          });
        },
      };
    },
    {
      name: 'gymtrack-entrenar-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ porUsuario: s.porUsuario, deviceId: s.deviceId }),
      onRehydrateStorage: () => () => {
        useEntrenar.setState({ hidratado: true });
      },
    },
  ),
);

/** Lo del alumno `uid` (o lo vacío si no hay nada guardado). Referencia estable para zustand. */
export function useDatosEntrenar(uid: string | null | undefined): DatosUsuario {
  return useEntrenar((s) => (uid ? (s.porUsuario[uid] ?? DATOS_VACIOS) : DATOS_VACIOS));
}

// ── Red ──────────────────────────────────────────────────────────────────────
let corriendo: Promise<ResultadoProceso | null> | null = null;

/**
 * Manda la cola del alumno. Si ya se está mandando, devuelve esa misma promesa. Sin sesión de
 * cuenta (el refresh venció) no manda nada y la cola queda para cuando vuelva a ingresar.
 */
export function sincronizar(uid: string): Promise<ResultadoProceso | null> {
  if (corriendo) return corriendo;
  corriendo = (async () => {
    try {
      const cola = datosDe(useEntrenar.getState(), uid).cola;
      if (!api.tieneSesion() || !cola.some((o) => o.estado === 'pendiente')) return null;
      const enviar: Enviar = async (op) => {
        enVuelo.add(op.id);
        try {
          return await enviarOp(op);
        } finally {
          enVuelo.delete(op.id);
        }
      };
      const r = await procesarCola(cola, enviar, { esSinRed: esSinConexion });
      useEntrenar.getState().aplicar(uid, r);
      return r;
    } finally {
      corriendo = null;
    }
  })();
  return corriendo;
}

const enviarOp: Enviar = crearEnvio((m, ruta, o) => api.llamar(m, ruta, o ?? {}));

/** Pide Hoy a la API y lo guarda. Sin señal deja lo último guardado. */
export async function cargarHoy(uid: string): Promise<'ok' | 'sin_red' | 'error'> {
  try {
    const json = await api.llamar('GET', RUTAS_APP.hoy);
    useEntrenar.getState().guardarHoy(uid, normalizarHoy(json));
    return 'ok';
  } catch (e) {
    if (esSinConexion(e)) {
      useEntrenar.getState().marcarSinRed(uid, true);
      return 'sin_red';
    }
    return 'error';
  }
}
