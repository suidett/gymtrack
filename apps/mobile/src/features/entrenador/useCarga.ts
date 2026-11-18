// ─────────────────────────────────────────────────────────────────────────────
// Carga de datos de una pantalla · Zona: Entrenador (app)
//
// Qué hace: el hook con que Clientes, Ficha, Alertas, Ajustar cargas y Perfil piden sus datos:
// carga al entrar y cuando cambia `clave`, vuelve a cargar al volver a la pantalla (por ejemplo
// después de desvincular a alguien desde su ficha) y conserva lo último que llegó si falla la red,
// con la hora en que llegó («Lo que ves es de hoy a las 8:12»).
// Tócalo cuando: haga falta otra forma de recargar (tirar hacia abajo, cada cierto tiempo).
// No lo toques para: qué se carga (cada pantalla pasa su función).
// Depende de: react, expo-router (useFocusEffect) y esSinConexion de @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { esSinConexion } from '@/lib/sesion';

export interface Carga<T> {
  /** 'cargando' solo la primera vez; después de tener datos, recargar no vuelve a 'cargando'. */
  fase: 'cargando' | 'listo' | 'error';
  datos: T | null;
  error: unknown;
  /** El último intento falló por falta de red (los datos, si hay, son los de antes). */
  sinRed: boolean;
  /** Cuándo llegaron los datos que se ven (ms). */
  cargadoAt: number | null;
  recargando: boolean;
}

/**
 * `cargar` pide los datos; `clave` los identifica (el id del cliente, por ejemplo). Devuelve el
 * estado, `recargar()` y `fijar()` para cambiar los datos en el teléfono sin volver a pedirlos
 * (marcar una alerta vista, sacar a alguien de la lista).
 */
export function useCarga<T>(cargar: () => Promise<T>, clave = '') {
  const [c, setC] = useState<Carga<T>>({ fase: 'cargando', datos: null, error: null, sinRed: false, cargadoAt: null, recargando: false });
  const [vuelta, setVuelta] = useState(0);

  const pedir = useEffectEvent(() => cargar());

  useEffect(() => {
    let vivo = true;
    pedir().then(
      (datos) => {
        if (vivo) setC({ fase: 'listo', datos, error: null, sinRed: false, cargadoAt: Date.now(), recargando: false });
      },
      (error: unknown) => {
        if (vivo) setC((p) => ({ ...p, fase: p.datos ? 'listo' : 'error', error, sinRed: esSinConexion(error), recargando: false }));
      },
    );
    return () => {
      vivo = false;
    };
  }, [clave, vuelta]);

  const recargar = useCallback(() => {
    setC((p) => ({ ...p, fase: p.datos ? p.fase : 'cargando', recargando: true }));
    setVuelta((v) => v + 1);
  }, []);

  // Al volver a la pantalla (no la primera vez, que ya carga el efecto) se piden datos frescos.
  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primera.current) {
        primera.current = false;
        return;
      }
      setVuelta((v) => v + 1);
    }, []),
  );

  const fijar = useCallback((f: (d: T) => T) => {
    setC((p) => (p.datos ? { ...p, datos: f(p.datos) } : p));
  }, []);

  return { ...c, recargar, fijar };
}
