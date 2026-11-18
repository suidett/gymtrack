// ─────────────────────────────────────────────────────────────────────────────
// Layout raíz · Zona: Rutas
//
// Qué hace: es lo primero que monta Expo Router. Pone el tema (modo gimnasio o clara), la sesión
// con la API y el aviso flotante; carga las fuentes de la marca, espera a que la sesión guardada
// se restaure y recién ahí esconde el splash. Decide qué ve cada uno: sin sesión, (acceso); el
// alumno, sus 5 pestañas (alumno) y sus pantallas completas; el entrenador, sus 5 pestañas
// (entrenador/) y las suyas; las de rutina y ejercicio las ven los dos. Con sesión, renueva el
// registro de los avisos del teléfono (si ya dio permiso) y abre la pantalla del aviso tocado.
// Tócalo cuando: sumes una pantalla a pantalla completa, cambies quién puede entrar a una o
// cómo se abre (modal, sin gesto de volver), o algo más deba estar listo antes de mostrar la app.
// No lo toques para: las pestañas (alumno)/_layout.tsx y entrenador/_layout.tsx, ni el contenido
// de una pantalla (su archivo).
// Depende de: @/lib/tema, @/lib/sesion, @/lib/fuentes, @/lib/notificaciones, @/components/ui (AvisoProvider),
// @/store/useStore (la bandera hidratado del store local de la 0.1) y global.css.
// ─────────────────────────────────────────────────────────────────────────────

// El css va primero que todo: NativeWind lo tiene que registrar antes de pintar nada.
import '../../global.css';

import { Stack, useRouter, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AvisoProvider } from '@/components/ui';
import { useFuentes } from '@/lib/fuentes';
import { renovarAvisos, useAbrirAvisos } from '@/lib/notificaciones';
import { SesionProvider, useSesion } from '@/lib/sesion';
import { TemaProvider, useTema } from '@/lib/tema';
import { useStore } from '@/store/useStore';

// ── Splash ───────────────────────────────────────────────────────────────────
// Se pide antes de que React monte nada; el catch es por web, donde no hay splash.
SplashScreen.preventAutoHideAsync().catch(() => {});

/** Raíz de la app. Expo Router la monta sola. */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TemaProvider>
        <SesionProvider>
          <AvisoProvider>
            <Navegacion />
          </AvisoProvider>
        </SesionProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}

// ── Navegación por rol ───────────────────────────────────────────────────────
function Navegacion() {
  const fuentes = useFuentes();
  // El store local de la 0.1 (rutinas y sesiones en el teléfono) sigue vivo mientras las áreas
  // deciden si lo usan; se espera que termine de leer para no pisar lo guardado.
  const hidratado = useStore((s) => s.hidratado);
  const { estado, rol, usuario } = useSesion();
  const { modo, c } = useTema();
  const listo = fuentes && hidratado && estado !== 'cargando';

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // Mismo color que el splash mientras tanto, para que no haya destello.
  if (!listo) return <View className="flex-1 bg-fondo" />;

  const conSesion = estado === 'con-sesion';
  const esAlumno = conSesion && rol === 'alumno';
  const esEntrenador = conSesion && rol === 'entrenador';

  // Stack.Protected: si la guarda es false la pantalla no existe; Expo Router lleva a la primera
  // disponible. Por eso el orden importa: (acceso), después el inicio de cada rol.
  // headerShown false: cada pantalla dibuja su <Cabecera>. contentStyle evita un destello blanco.
  return (
    <>
      <StatusBar style={modo === 'gimnasio' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.fondo }, animation: 'fade' }}>
        <Stack.Protected guard={!conSesion}>
          <Stack.Screen name="(acceso)" />
        </Stack.Protected>

        <Stack.Protected guard={esAlumno}>
          <Stack.Screen name="(alumno)" />
          {/* La encuesta no se abandona con el gesto: se sale con sus botones. */}
          <Stack.Screen name="encuesta" options={{ gestureEnabled: false }} />
          {/* Una sesión en curso no se abandona por accidente. */}
          <Stack.Screen name="sesion/[id]/index" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
          <Stack.Screen name="sesion/[id]/completada" options={{ gestureEnabled: false }} />
          <Stack.Screen name="motivos/[alertaId]" options={{ animation: 'slide_from_bottom' }} />
        </Stack.Protected>

        <Stack.Protected guard={esEntrenador}>
          <Stack.Screen name="entrenador" />
          <Stack.Screen name="cliente/[id]/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="cliente/[id]/ajustar-cargas" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>

        <Stack.Protected guard={conSesion}>
          <Stack.Screen name="rutina/nueva" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="rutina/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ejercicio/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack.Protected>
      </Stack>
      {conSesion && usuario ? <AvisosConSesion usuarioId={usuario.id} /> : null}
    </>
  );
}

// ── Avisos al celular ────────────────────────────────────────────────────────
/**
 * Solo con sesión y con la navegación ya montada: al entrar (o al abrir la app con la sesión
 * guardada) vuelve a registrar el teléfono si ya dio permiso, sin preguntar nada; y al tocar un
 * aviso abre su pantalla (Alertas, la ficha del alumno, Hoy).
 */
function AvisosConSesion({ usuarioId }: { usuarioId: string }) {
  const router = useRouter();
  useEffect(() => {
    void renovarAvisos();
  }, [usuarioId]);
  // En el turno siguiente: el Stack recién montado tiene que estar listo para navegar.
  const abrir = useCallback((ruta: string) => setTimeout(() => router.push(ruta as Href), 0), [router]);
  useAbrirAvisos(abrir);
  return null;
}
