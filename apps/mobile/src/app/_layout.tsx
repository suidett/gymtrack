// ─────────────────────────────────────────────────────────────────────────────
// Layout raíz · Zona: Rutas
//
// Qué hace: es lo primero que monta Expo Router. Carga las fuentes, espera a que el store
// termine de leer lo guardado en el teléfono y recién ahí esconde el splash y arma la pila
// de navegación: las pestañas del alumno, la bitácora de sesión y el modal de agregar ejercicio.
// Tócalo cuando: agregues una fuente nueva, cambies cómo se abre una pantalla de la pila
// (modal, gesto de volver) o necesites algo más que deba estar listo antes de mostrar la app.
// No lo toques para: cambiar las pestañas (eso va en (tabs)/_layout.tsx) ni para cambiar
// qué se guarda o cómo se siembra el store (src/store/useStore.ts).
// Depende de: @/store/useStore (la bandera hidratado), @gymtrack/tokens (colors) y
// global.css (las directivas de Tailwind que NativeWind necesita para que funcione className).
// ─────────────────────────────────────────────────────────────────────────────

// El css va primero que todo: NativeWind lo tiene que registrar antes de que se pinte
// cualquier componente con className.
import '../../global.css';

import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { colors } from '@gymtrack/tokens';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '@/store/useStore';

// ── Splash ───────────────────────────────────────────────────────────────────
// Se pide a nivel de módulo, antes de que React monte nada, para que el splash nativo siga
// en pantalla hasta que RootLayout diga que está listo. El catch vacío es porque en web no
// hay splash y la promesa puede rechazar sin que sea un error de verdad.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Raíz de la app. No recibe props: Expo Router lo monta solo.
 * Mientras faltan fuentes o datos muestra un fondo del mismo color que el splash (así no hay
 * parpadeo blanco) y después monta la pila de navegación completa.
 */
export default function RootLayout() {
  // ── Fuentes y datos guardados ────────────────────────────────────────────────
  // Las claves de este objeto son los nombres de familia que usan los tokens
  // (packages/tokens/index.js) y las clases font-sans-* y font-mono-*. Si agregas un peso,
  // agrégalo también allá; si no, la clase existe pero no encuentra la fuente.
  const [fuentesListas, errorFuentes] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });
  // `hidratado` lo prende el store cuando terminó de leer AsyncStorage (con datos o sin ellos).
  // Antes de eso las pantallas verían listas vacías y podrían pisar lo guardado.
  const hidratado = useStore((s) => s.hidratado);
  // Si una fuente falla, igual se abre la app con la fuente del sistema: mejor eso que quedar
  // pegados en el splash para siempre.
  const listo = (fuentesListas || !!errorFuentes) && hidratado;

  // ── Ocultar el splash ────────────────────────────────────────────────────────
  // Va en un efecto y no en el cuerpo del componente porque es un efecto secundario nativo;
  // el catch es por web, igual que arriba.
  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // Mismo color de fondo que el splash (token bg) para que el cambio no se note.
  if (!listo) return <View className="flex-1 bg-bg" />;

  // ── Navegación ───────────────────────────────────────────────────────────────
  // Solo se listan las pantallas que necesitan opciones distintas a las de por defecto.
  // Las demás rutas (rutina/[id], rutina/[id]/ejercicio/[reId], ejercicio/[id],
  // ejercicio/nuevo, +not-found) Expo Router las toma del nombre del archivo.
  // headerShown false: cada pantalla dibuja su propia Cabecera del kit de interfaz.
  // contentStyle con el fondo del token evita un destello blanco al cambiar de pantalla.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        {/* Las cinco pestañas del alumno; su barra vive en (tabs)/_layout.tsx */}
        <Stack.Screen name="(tabs)" />
        {/* Sin deslizar para volver: una sesión en curso no se abandona por accidente, se sale con sus botones */}
        <Stack.Screen name="sesion/[id]" options={{ gestureEnabled: false }} />
        {/* El selector de ejercicios sube como modal encima del editor de la rutina */}
        <Stack.Screen name="rutina/[id]/agregar" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
