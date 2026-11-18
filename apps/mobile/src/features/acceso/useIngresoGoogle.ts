// ─────────────────────────────────────────────────────────────────────────────
// Estado del ingreso con Google · Zona: Acceso
//
// Qué hace: lo que Ingreso y Crear cuenta comparten de «Continuar con Google»: si se puede usar
// en esta plataforma, la revisión de red antes de abrir Google, el envío del id_token a la API,
// el paso «Completa tu cuenta» cuando el correo no tiene cuenta (rol, nombre y apellido), los
// mensajes de cada falla y la espera de un 429. En web, Ingreso además recoge la vuelta de Google
// (googleWeb.ts). Con la sesión en la mano entra igual que el ingreso normal: el layout raíz lleva
// a cada rol a su inicio.
// Tócalo cuando: cambie el orden del ingreso con Google o qué pasa con una cuenta nueva.
// No lo toques para: los textos (google.ts), el botón (BotonGoogle.tsx) ni el paso de la cuenta
// nueva (PasoCuentaGoogle.tsx).
// Depende de: @/lib/sesion, expo-constants, expo-router, ./google, ./googleApi, ./googleWeb y
// ./componentes.
// ─────────────────────────────────────────────────────────────────────────────
import type { PerfilGoogle, Sesion } from '@gymtrack/shared';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSesion } from '@/lib/sesion';
import { useCuentaRegresiva } from './componentes';
import { esErrorDeRed, type MensajePantalla } from './errores';
import {
  clientIdPara,
  errorDeGoogle,
  leerClientIdsGoogle,
  MENSAJES_GOOGLE,
  mensajeDeFallo,
  type FalloGoogle,
  type ResultadoErrorGoogle,
} from './google';
import { enviarAGoogle } from './googleApi';
import { tomarRetornoWeb, verRetornoWeb } from './googleWeb';
import { rolApi, type FormCuentaGoogle, type RolAcceso } from './validacion';

// ── Disponibilidad ───────────────────────────────────────────────────────────
// Expo reemplaza cada process.env.EXPO_PUBLIC_* al empaquetar: tienen que ir escritos así.
export const IDS_GOOGLE = leerClientIdsGoogle({
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
});

/**
 * true si esta plataforma tiene client ID. En Expo Go no: Google no acepta su dirección de
 * vuelta (exp://...), solo la del APK (com.gymtrack.app:/oauthredirect) y la de la web.
 */
export const GOOGLE_DISPONIBLE =
  clientIdPara(Platform.OS, IDS_GOOGLE) !== null &&
  !(Platform.OS !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface PasoGoogle {
  idToken: string;
  perfil: PerfilGoogle;
  /** El rol que ya estaba marcado en la pantalla (o al irse a Google, en web). */
  rol: RolAcceso | null;
}

export function useIngresoGoogle(o: { rol: RolAcceso | null; leerRetorno?: boolean }) {
  const { api, entrarConSesion } = useSesion();
  const navegacion = useNavigation();
  const espera = useCuentaRegresiva();
  // La vuelta de Google en web se mira al montar: si trae un token, se parte cargando.
  const [retorno] = useState(() => (o.leerRetorno ? verRetornoWeb() : null));
  const [cargando, setCargando] = useState(retorno?.lectura.tipo === 'token');
  const [mensaje, setMensaje] = useState<MensajePantalla | null>(
    retorno?.lectura.tipo === 'fallo' ? mensajeDeFallo(retorno.lectura.fallo) : null,
  );
  const [paso, setPaso] = useState<PasoGoogle | null>(null);
  const iniciarEspera = espera.iniciar;

  const mostrar = useCallback(
    (r: ResultadoErrorGoogle) => {
      if (r.tipo === 'bloqueo') iniciarEspera(r.esperaS);
      // Un error de campo fuera del paso de la cuenta nueva no tiene dónde ir: el token no sirvió.
      setMensaje(r.tipo === 'campo' ? MENSAJES_GOOGLE.token : r.mensaje);
    },
    [iniciarEspera],
  );

  /** Con la sesión de la API: entra igual que el ingreso normal y el layout raíz lleva al inicio. */
  const terminar = useCallback(
    async (s: Sesion) => {
      await entrarConSesion(s);
    },
    [entrarConSesion],
  );

  /** Con el id_token de Google: entra, o abre el paso de la cuenta nueva. */
  const recibirToken = useCallback(
    async (idToken: string, rol: RolAcceso | null) => {
      setCargando(true);
      setMensaje(null);
      try {
        const r = await enviarAGoogle(api, { id_token: idToken });
        if (r.resultado === 'falta_rol') setPaso({ idToken, perfil: r.perfil, rol });
        else await terminar({ usuario: r.usuario, tokens: r.tokens });
      } catch (e) {
        mostrar(errorDeGoogle(e));
      } finally {
        setCargando(false);
      }
    },
    [api, mostrar, terminar],
  );

  // Web: Google volvió a /ingreso con un token. Se gasta una sola vez por carga de la página.
  useEffect(() => {
    if (!o.leerRetorno) return;
    const r = tomarRetornoWeb();
    if (!r) return;
    // Expo Router guarda el fragmento (#state=...&id_token=...) como parámetro «#» de esta ruta y
    // lo vuelve a poner en la dirección: se deja vacío para que el token no quede a la vista.
    // Va con la navegación de la pantalla (router.setParams cambiaría la ruta de afuera) y en el
    // turno siguiente: los efectos del enrutador corren después de los de la pantalla y, en la
    // primera carga, volverían a escribir la dirección con el fragmento.
    setTimeout(() => navegacion.setParams({ '#': '' } as never), 0);
    if (r.lectura.tipo !== 'token') return;
    const { idToken } = r.lectura;
    // Fuera del cuerpo del efecto, como pide la regla de los efectos de React.
    void Promise.resolve().then(() => recibirToken(idToken, r.rol ?? o.rol));
    // Solo al montar: el retorno es de esta carga de la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Antes de abrir Google: sin red se avisa aquí, sin mandar a la persona a una página en blanco. */
  const antesDeAbrir = useCallback(async (): Promise<boolean> => {
    if (espera.resta > 0) return false;
    setMensaje(null);
    setCargando(true);
    try {
      await api.cliente.salud();
    } catch (e) {
      if (esErrorDeRed(e)) {
        setCargando(false);
        setMensaje(MENSAJES_GOOGLE.red);
        return false;
      }
      // La API respondió (aunque sea 503): hay red, se sigue.
    }
    return true;
  }, [api, espera.resta]);

  /** Google no entregó un token (cancelado, sin red, error). null: nada que mostrar. */
  const recibirFallo = useCallback((f: FalloGoogle | null) => {
    setCargando(false);
    if (f) setMensaje(mensajeDeFallo(f));
  }, []);

  /**
   * Segundo envío con rol, nombre y apellido. Devuelve el error para el formulario del paso, o
   * null si entró (o si el error ya quedó en `mensaje`).
   */
  const crearCuenta = useCallback(
    async (f: FormCuentaGoogle): Promise<ResultadoErrorGoogle | null> => {
      if (!paso || !f.rol) return null;
      setCargando(true);
      setMensaje(null);
      try {
        const r = await enviarAGoogle(api, { id_token: paso.idToken, rol: rolApi(f.rol), nombre: f.nombre, apellido: f.apellido });
        if (r.resultado === 'sesion') await terminar({ usuario: r.usuario, tokens: r.tokens });
        else setMensaje(MENSAJES_GOOGLE.otro);
        return null;
      } catch (e) {
        const r = errorDeGoogle(e);
        if (r.tipo === 'campo') return r;
        // El token de Google dura 1 hora: si venció, se vuelve al inicio para pedir otro.
        if (r.tipo === 'mensaje' && r.mensaje === MENSAJES_GOOGLE.token) setPaso(null);
        mostrar(r);
        return null;
      } finally {
        setCargando(false);
      }
    },
    [api, mostrar, paso, terminar],
  );

  const volver = useCallback(() => {
    setPaso(null);
    setMensaje(null);
  }, []);

  const limpiarMensaje = useCallback(() => setMensaje(null), []);

  return {
    disponible: GOOGLE_DISPONIBLE,
    cargando,
    mensaje,
    paso,
    /** Segundos que faltan para volver a intentar después de un 429 (0 si nada). */
    espera: espera.resta,
    antesDeAbrir,
    recibirToken,
    recibirFallo,
    crearCuenta,
    volver,
    limpiarMensaje,
  };
}

export type IngresoGoogle = ReturnType<typeof useIngresoGoogle>;
