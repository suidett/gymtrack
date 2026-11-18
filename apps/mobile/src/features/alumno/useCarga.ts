// ─────────────────────────────────────────────────────────────────────────────
// Carga con caché · Zona: Alumno
//
// Qué hace: el hook con que cada pantalla del alumno pide sus datos. Muestra al tiro lo último
// guardado en el teléfono (AsyncStorage, por cuenta) y lo reemplaza cuando responde la API. Si no
// hay señal se queda con lo guardado y marca `sinConexion`, que la pantalla usa para la banda
// «Sin conexión» y para apagar lo que necesita red. Vuelve a pedir cada vez que la pantalla gana
// el foco (las pestañas no se desmontan). Más `ahora()`, la hora de este momento para usar
// fuera del render.
// Tócalo cuando: cambie cómo se guarda la caché o cuándo se vuelve a pedir.
// No lo toques para: qué se pide (va en la pantalla, con ./api).
// Depende de: AsyncStorage (datos que no son secretos; los tokens van solo al almacén seguro),
// expo-router (useFocusEffect) y @/lib/sesion.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { esSinConexion, useSesion } from '@/lib/sesion';

/** La hora de este momento. Llámala en un efecto, un evento o un inicializador, no al renderizar. */
export const ahora = () => new Date();

// ── Caché en el teléfono ─────────────────────────────────────────────────────
const PREFIJO = 'gymtrack.alumno.';

export async function leerCache<T>(clave: string): Promise<T | null> {
  try {
    const s = await AsyncStorage.getItem(PREFIJO + clave);
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

export async function guardarCache(clave: string, datos: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIJO + clave, JSON.stringify(datos));
  } catch {
    // Sin espacio o sin permiso: la pantalla sigue con lo que tiene en memoria.
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export type EstadoCarga = 'cargando' | 'listo' | 'error';

export interface Carga<T> {
  datos: T | null;
  estado: EstadoCarga;
  sinConexion: boolean;
  error: unknown;
  recargar: () => void;
  /** Cambia los datos en memoria (y en la caché) sin pedir de nuevo: para lo optimista. */
  poner: (f: (d: T | null) => T | null) => void;
}

/**
 * Pide `cargar()` al montar y cada vez que la pantalla gana el foco. `clave` (sin el usuario: se
 * le agrega solo) guarda la respuesta en el teléfono; null para no guardar.
 */
export function useCarga<T>(clave: string | null, cargar: () => Promise<T>): Carga<T> {
  const { usuario } = useSesion();
  const llave = clave && usuario ? `${usuario.id}.${clave}` : null;
  const [datos, setDatos] = useState<T | null>(null);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [sinConexion, setSinConexion] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const cargarRef = useRef(cargar);
  const tieneDatos = useRef(false);

  useEffect(() => {
    cargarRef.current = cargar;
  });

  const pedir = useCallback(() => {
    let vivo = true;
    const desdeCache = llave && !tieneDatos.current ? leerCache<T>(llave) : Promise.resolve(null);
    desdeCache.then((c) => {
      if (vivo && c !== null && !tieneDatos.current) {
        setDatos(c);
        setEstado('listo');
      }
    });
    cargarRef
      .current()
      .then((d) => {
        if (!vivo) return;
        tieneDatos.current = true;
        setDatos(d);
        setEstado('listo');
        setSinConexion(false);
        setError(null);
        if (llave) guardarCache(llave, d);
      })
      .catch(async (e) => {
        if (!vivo) return;
        const enCache = llave ? await leerCache<T>(llave) : null;
        if (!vivo) return;
        const sinRed = esSinConexion(e);
        setSinConexion(sinRed);
        setError(e);
        if (tieneDatos.current || enCache !== null) {
          if (!tieneDatos.current && enCache !== null) setDatos(enCache);
          setEstado('listo');
        } else setEstado('error');
      });
    return () => {
      vivo = false;
    };
  }, [llave]);

  useFocusEffect(pedir);

  const recargar = useCallback(() => {
    pedir();
  }, [pedir]);

  const poner = useCallback(
    (f: (d: T | null) => T | null) => {
      setDatos((d) => {
        const n = f(d);
        if (llave && n !== null) guardarCache(llave, n);
        return n;
      });
    },
    [llave],
  );

  return { datos, estado, sinConexion, error, recargar, poner };
}
