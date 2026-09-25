// ─────────────────────────────────────────────────────────────────────────────
// Pantalla · Zona: Kit de interfaz
//
// Qué hace: el marco de toda pantalla. Pantalla pone el fondo, respeta la barra de estado y el
// notch, y decide si el contenido hace scroll; Cabecera es la fila de arriba con el título, un
// subtítulo opcional, el botón de volver y espacio para un botón a la derecha.
// Tócalo cuando: quieras cambiar los márgenes de todas las pantallas, cómo se lleva el scroll con
// el teclado, o cómo se ve y adónde vuelve el botón de atrás.
// No lo toques para: las pestañas de abajo (src/app/(tabs)/_layout.tsx) ni el contenido de cada
// pantalla (cada archivo de src/app).
// Depende de: Txt (./Txt).
// ─────────────────────────────────────────────────────────────────────────────
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './Txt';

// ── Marco de pantalla ────────────────────────────────────────────────────────
/**
 * Contenedor de una pantalla completa.
 * Recibe `children`, `scroll` (por defecto true: el contenido va en un ScrollView con aire abajo,
 * para que lo último no quede pegado al borde) y `sinPadding`, que quita el margen lateral cuando
 * la pantalla arma su propia lista de borde a borde.
 * Con scroll en false el contenido va en un View de alto completo: úsalo cuando adentro hay una
 * FlatList u otra cosa que hace su propio scroll, porque un scroll dentro de otro se pelea.
 */
export function Pantalla({
  children,
  scroll = true,
  sinPadding = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  sinPadding?: boolean;
}) {
  // El alto de la barra de estado se pone a mano y no con SafeAreaView, para que el fondo llegue
  // hasta arriba y solo baje el contenido.
  const insets = useSafeAreaInsets();
  const padding = sinPadding ? '' : 'px-5';
  // keyboardShouldPersistTaps: con el teclado abierto, el primer toque a un botón lo aprieta en
  // vez de solo cerrar el teclado.
  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={`${padding} pb-12 pt-3`}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${padding} pt-3`}>{children}</View>
      )}
    </View>
  );
}

// ── Cabecera ─────────────────────────────────────────────────────────────────
/**
 * Fila de título de una pantalla.
 * Recibe `titulo`, `subtitulo` opcional, `atras` (muestra el botón de volver) y `derecha`, un
 * nodo que va al final de la fila (un Boton chico, por ejemplo).
 * El botón de volver va a la pantalla anterior; si no hay historial (se abrió la app directo en
 * esta ruta, por ejemplo desde un enlace en web) manda a Hoy para no dejar al alumno pegado.
 */
export function Cabecera({
  titulo,
  subtitulo,
  atras = false,
  derecha,
}: {
  titulo: string;
  subtitulo?: string;
  atras?: boolean;
  derecha?: ReactNode;
}) {
  return (
    <View className="mb-4 flex-row items-center gap-3">
      {atras ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="volver"
          onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/'))}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface border border-line"
        >
          <Text className="font-sans-bold text-xl text-ink">‹</Text>
        </Pressable>
      ) : null}
      <View className="flex-1">
        <Txt v="titulo">{titulo}</Txt>
        {subtitulo ? <Txt v="secundario" className="mt-0.5">{subtitulo}</Txt> : null}
      </View>
      {derecha}
    </View>
  );
}
