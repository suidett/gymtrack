// ─────────────────────────────────────────────────────────────────────────────
// Botón «Continuar con Google» · Zona: Acceso
//
// Qué hace: la línea «o» y el botón de Google bajo el formulario de Ingreso y de Crear cuenta.
// Arma el pedido con expo-auth-session (proveedor de Google) y:
// - en Android (APK) abre Google en una pestaña del navegador, recibe el código en
//   com.gymtrack.app:/oauthredirect y lo canjea por el id_token (PKCE, sin secreto);
// - en web se va a Google con la página entera y vuelve a /ingreso con el id_token (googleWeb.ts).
// El id_token se lo pasa a useIngresoGoogle, que habla con la API. Solo se dibuja si la
// plataforma tiene client ID (si no, el hook de Google se cae al montar).
// Tócalo cuando: cambie cómo se ve el botón o cómo se pide el token a Google.
// No lo toques para: qué se hace con el token (useIngresoGoogle.ts) ni los textos de error
// (google.ts).
// Depende de: expo-auth-session, react-native-svg, ./google, ./googleWeb y ./useIngresoGoogle.
// ─────────────────────────────────────────────────────────────────────────────
import { exchangeCodeAsync, ResponseType } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { vibrarPresion } from '@/lib/vibrar';
import { esErrorDeRed, formatoReloj } from './errores';
import { leerAutorizacion } from './google';
import { guardarIntentoWeb, irAGoogle, RUTA_RETORNO_WEB } from './googleWeb';
import { IDS_GOOGLE, type IngresoGoogle } from './useIngresoGoogle';
import type { RolAcceso } from './validacion';

// En Android la vuelta es com.gymtrack.app:/oauthredirect (el paquete, lo pone el proveedor);
// en web, <origen>/ingreso. Fuera del componente para que el pedido no se rearme en cada render.
const VUELTA = { path: RUTA_RETORNO_WEB };

/** La «G» de Google en sus cuatro colores (la que piden sus normas para el botón de ingreso). */
function LogoGoogle() {
  return (
    // Fondo blanco fijo en los dos temas: la «G» va siempre sobre blanco.
    <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#FFFFFF' }}>
      <Svg width={18} height={18} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
    </View>
  );
}

/** La línea con «o» entre el formulario y Google. El lector de pantalla no la lee. */
function SeparadorO() {
  return (
    <View className="mt-6 flex-row items-center gap-3" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View className="h-px flex-1 bg-sup-alta" />
      <Text className="font-sans-medium text-[13px] text-texto-2">o</Text>
      <View className="h-px flex-1 bg-sup-alta" />
    </View>
  );
}

function BotonGoogle({ google, rol, disabled }: { google: IngresoGoogle; rol: RolAcceso | null; disabled: boolean }) {
  const web = Platform.OS === 'web';
  const [pedido, , abrir] = Google.useAuthRequest(
    {
      webClientId: IDS_GOOGLE.web ?? undefined,
      androidClientId: IDS_GOOGLE.android ?? undefined,
      // Android: código con PKCE, que se canjea abajo. Web: el id_token directo, con nonce.
      responseType: web ? ResponseType.IdToken : ResponseType.Code,
      shouldAutoExchangeCode: false,
      // Deja elegir la cuenta cada vez (un teléfono compartido en el gimnasio).
      selectAccount: true,
      language: 'es-419',
    },
    VUELTA,
  );
  const ocupado = useRef(false);
  const espera = google.espera;
  const apagado = disabled || google.cargando || !pedido || espera > 0;

  async function tocar() {
    if (!pedido || ocupado.current) return;
    ocupado.current = true;
    try {
      if (!(await google.antesDeAbrir())) return;
      if (web) {
        if (!pedido.url || !pedido.nonce) return google.recibirFallo('proveedor');
        guardarIntentoWeb({ state: pedido.state, nonce: pedido.nonce, rol });
        irAGoogle(pedido.url);
        return;
      }
      const lectura = leerAutorizacion(await abrir());
      if (lectura.tipo === 'nada') return google.recibirFallo(null);
      if (lectura.tipo === 'fallo') return google.recibirFallo(lectura.fallo);
      if (lectura.tipo === 'token') return google.recibirToken(lectura.idToken, rol);
      const tokens = await exchangeCodeAsync(
        {
          clientId: pedido.clientId,
          code: lectura.codigo,
          redirectUri: pedido.redirectUri,
          extraParams: { code_verifier: pedido.codeVerifier ?? '' },
        },
        Google.discovery,
      );
      if (!tokens.idToken) return google.recibirFallo('proveedor');
      await google.recibirToken(tokens.idToken, rol);
    } catch (e) {
      google.recibirFallo(esErrorDeRed(e) ? 'red' : 'proveedor');
    } finally {
      ocupado.current = false;
    }
  }

  const titulo = espera > 0 ? `Espera ${formatoReloj(espera)}` : 'Continuar con Google';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continuar con Google"
      accessibilityHint="Abre Google para elegir tu cuenta"
      accessibilityState={{ disabled: apagado, busy: google.cargando }}
      disabled={apagado}
      onPressIn={() => vibrarPresion()}
      onPress={tocar}
      className="mt-6 w-full"
    >
      {({ pressed }) => (
        <View
          className={`min-h-[48px] flex-row items-center justify-center gap-3 rounded-control border-2 px-5 ${
            apagado ? 'border-desh-fondo bg-desh-fondo' : pressed ? 'border-sec-pres-borde bg-sec-pres' : 'border-sec-borde bg-sec-fondo'
          }`}
        >
          <View style={{ opacity: apagado ? 0.5 : 1 }}>
            <LogoGoogle />
          </View>
          <Text className={`font-sans-semibold text-[16px] ${apagado ? 'text-desh-texto' : 'text-texto'}`}>
            {google.cargando ? 'Conectando con Google…' : titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * La parte de Google de Ingreso y Crear cuenta: la línea «o» y el botón. No dibuja nada si la
 * plataforma no tiene client ID (iPhone nativo, Expo Go o sin EXPO_PUBLIC_GOOGLE_CLIENT_ID_*).
 */
export function SeccionGoogle({ google, rol, disabled = false }: { google: IngresoGoogle; rol: RolAcceso | null; disabled?: boolean }) {
  if (!google.disponible) return null;
  return (
    <View>
      <SeparadorO />
      <BotonGoogle google={google} rol={rol} disabled={disabled} />
    </View>
  );
}
