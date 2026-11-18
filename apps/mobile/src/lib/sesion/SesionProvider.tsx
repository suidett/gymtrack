// ─────────────────────────────────────────────────────────────────────────────
// Estado de la sesión en React · Zona: Sesión de cuenta
//
// Qué hace: al abrir la app restaura la sesión guardada y la deja disponible para todas las
// pantallas con useSesion(): estado (cargando, sin sesión, con sesión), usuario, rol y las
// acciones ingresar, registrar, entrar con una sesión ya armada (Google), cerrar sesión y
// refrescar el usuario. Al entrar o restaurar la sesión renueva el registro de los avisos del
// teléfono (si ya dio permiso) y, antes de cerrar sesión, lo borra. Si la API rechaza el
// refresh, pasa sola a «sin sesión» y la navegación lleva a Ingreso.
// Tócalo cuando: necesites un dato más de la sesión en todas las pantallas.
// No lo toques para: cambiar cómo se renueva un token (gestor.ts) ni a dónde va cada rol
// (src/app/_layout.tsx).
// Depende de: ./gestor, ./almacen, ./config, @/lib/notificaciones y @gymtrack/shared (tipos).
// ─────────────────────────────────────────────────────────────────────────────
import type { EntradaIngreso, EntradaRegistro, Sesion, Usuario } from '@gymtrack/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { almacenSeguro } from './almacen';
import { URL_API } from './config';
import { crearGestorSesion, type GestorSesion, type MotivoCierre } from './gestor';

// ── Instancia única ──────────────────────────────────────────────────────────
/**
 * El gestor de la app. Úsalo fuera de React (en un store o una cola) con `api.llamar(...)`;
 * dentro de un componente, `useSesion().api` es el mismo objeto.
 */
export const api: GestorSesion = crearGestorSesion({
  urlBase: URL_API,
  fetch: (url, init) => fetch(url, init),
  almacen: almacenSeguro,
});

// ── Tipos ────────────────────────────────────────────────────────────────────
export type EstadoSesion = 'cargando' | 'sin-sesion' | 'con-sesion';
/** Rol en palabras de la app. La API dice 'client' y 'trainer'. */
export type Rol = 'alumno' | 'entrenador';

export interface ValorSesion {
  estado: EstadoSesion;
  usuario: Usuario | null;
  rol: Rol | null;
  /** true si se entró con el usuario guardado porque la API no respondió. */
  sinConexion: boolean;
  /** Por qué terminó la última sesión, para mostrar «Tu sesión venció» en Ingreso. */
  ultimoCierre: MotivoCierre | null;
  ingresar(datos: EntradaIngreso): Promise<Usuario>;
  registrar(datos: EntradaRegistro): Promise<Usuario>;
  /** Entra con la sesión que entregó otra ruta (POST /v1/auth/google). */
  entrarConSesion(s: Sesion): Promise<Usuario>;
  cerrarSesion(): Promise<void>;
  /** Vuelve a pedir GET /v1/me (por ejemplo después de terminar la encuesta). */
  refrescarUsuario(): Promise<Usuario | null>;
  /** Cambia el usuario en memoria sin llamar a la API (después de un PATCH /me propio). */
  actualizarUsuario(cambios: Partial<Usuario>): void;
  api: GestorSesion;
}

const Contexto = createContext<ValorSesion | null>(null);

/** 'client' a 'alumno', 'trainer' a 'entrenador'. */
export function rolDe(usuario: Usuario | null): Rol | null {
  if (!usuario) return null;
  return usuario.rol === 'trainer' ? 'entrenador' : 'alumno';
}

// ── Proveedor ────────────────────────────────────────────────────────────────
export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>('cargando');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [sinConexion, setSinConexion] = useState(false);
  const [ultimoCierre, setUltimoCierre] = useState<MotivoCierre | null>(null);

  // Restaurar al abrir. Los setState van dentro de la promesa, no directo en el efecto.
  useEffect(() => {
    let vivo = true;
    api
      .restaurar()
      .then((r) => {
        if (!vivo) return;
        setUsuario(r?.usuario ?? null);
        setSinConexion(r?.sinConexion ?? false);
        setEstado(r ? 'con-sesion' : 'sin-sesion');
      })
      .catch(() => {
        if (!vivo) return;
        setUsuario(null);
        setEstado('sin-sesion');
      });
    const dejar = api.alCerrar((motivo) => {
      setUltimoCierre(motivo);
      setUsuario(null);
      setEstado('sin-sesion');
    });
    return () => {
      vivo = false;
      dejar();
    };
  }, []);

  const ingresar = useCallback(async (datos: EntradaIngreso) => {
    const u = await api.ingresar(datos);
    setUsuario(u);
    setSinConexion(false);
    setUltimoCierre(null);
    setEstado('con-sesion');
    return u;
  }, []);

  const registrar = useCallback(async (datos: EntradaRegistro) => {
    const u = await api.registrar(datos);
    setUsuario(u);
    setSinConexion(false);
    setUltimoCierre(null);
    setEstado('con-sesion');
    return u;
  }, []);

  const entrarConSesion = useCallback(async (s: Sesion) => {
    const u = await api.entrarConSesion(s);
    setUsuario(u);
    setSinConexion(false);
    setUltimoCierre(null);
    setEstado('con-sesion');
    return u;
  }, []);

  const cerrarSesion = useCallback(() => api.cerrarSesion(), []);

  const refrescarUsuario = useCallback(async () => {
    try {
      const u = await api.refrescarUsuario();
      setUsuario(u);
      setSinConexion(false);
      return u;
    } catch {
      return null;
    }
  }, []);

  const actualizarUsuario = useCallback((cambios: Partial<Usuario>) => {
    setUsuario((u) => (u ? { ...u, ...cambios } : u));
  }, []);

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      rol: rolDe(usuario),
      sinConexion,
      ultimoCierre,
      ingresar,
      registrar,
      entrarConSesion,
      cerrarSesion,
      refrescarUsuario,
      actualizarUsuario,
      api,
    }),
    [estado, usuario, sinConexion, ultimoCierre, ingresar, registrar, entrarConSesion, cerrarSesion, refrescarUsuario, actualizarUsuario],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
/** La sesión actual. Solo funciona dentro de <SesionProvider> (lo pone src/app/_layout.tsx). */
export function useSesion(): ValorSesion {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSesion necesita <SesionProvider> más arriba.');
  return v;
}
