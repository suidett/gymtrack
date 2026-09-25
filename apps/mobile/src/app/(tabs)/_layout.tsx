// ─────────────────────────────────────────────────────────────────────────────
// Pestañas del alumno · Zona: Rutas
//
// Qué hace: define las cinco pestañas de abajo (Hoy, Rutinas, Progreso, Ejercicios, Perfil)
// y dibuja la barra a mano, con texto y sin iconos, tal como está en el diseño.
// Tócalo cuando: agregues, quites o reordenes una pestaña, o cambies cómo se ve la barra.
// No lo toques para: cambiar lo que muestra una pestaña (cada una es su propio archivo en esta
// carpeta) ni las pantallas que están fuera de las pestañas (src/app/_layout.tsx).
// Depende de: @gymtrack/tokens (colors).
// ─────────────────────────────────────────────────────────────────────────────

import { colors } from '@gymtrack/tokens';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Tipos de la barra ────────────────────────────────────────────────────────
// Lo que la barra necesita de React Navigation, tipado a mano para no depender
// de un paquete que expo-router instala por su cuenta y puede mover de lugar.
// `descriptors` puede no tener la entrada de una ruta (por eso el `| undefined`):
// pasa un instante cuando se agrega o quita una pestaña en caliente.
interface PropsBarra {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } } | undefined>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

// ── Barra de pestañas ────────────────────────────────────────────────────────
// Barra de pestañas del diseño: texto sin iconos, la activa con fondo menta suave.
// Se dibuja a mano (y no con la barra por defecto de React Navigation) para que los colores,
// la fuente y el radio salgan de los tokens y no haya que pelear con estilos nativos.
function BarraPestanas({ state, descriptors, navigation }: PropsBarra) {
  const insets = useSafeAreaInsets();
  // paddingBottom: en teléfonos con barra de gestos se respeta el inset del sistema; en los
  // que no la tienen (o en web) quedan 10 px para que los textos no toquen el borde.
  return (
    <View
      className="flex-row gap-1 border-t border-line bg-surface px-2.5 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {state.routes.map((route, index) => {
        const activo = state.index === index;
        const opciones = descriptors[route.key]?.options;
        // El título es el `title` de Tabs.Screen; si no hay, el nombre del archivo (index, rutinas).
        const titulo = typeof opciones?.title === 'string' ? opciones.title : route.name;
        const onPress = () => {
          // Se avisa primero con tabPress por si una pantalla quiere frenar el cambio
          // (por ejemplo, para hacer scroll arriba en vez de navegar). Tocar la pestaña
          // activa no navega de nuevo.
          const evento = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!activo && !evento.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={titulo}
            onPress={onPress}
            className={`flex-1 items-center rounded-tab py-2.5 ${activo ? 'bg-primary-soft' : ''}`}
          >
            <Text
              className={`text-[11.5px] ${activo ? 'font-sans-extrabold text-primary-deep' : 'font-sans-semibold text-ink-faint'}`}
            >
              {titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Pestañas ─────────────────────────────────────────────────────────────────
/**
 * Navegador de pestañas. No recibe props: lo monta el Stack de src/app/_layout.tsx.
 * El orden de los Tabs.Screen es el orden en la barra. Para agregar una pestaña: crea el
 * archivo en esta carpeta y súmala aquí con su `title` (es el texto que se ve abajo).
 * El `name` tiene que ser el nombre del archivo sin extensión; `index` es Hoy.
 */
export default function TabsLayout() {
  // El cast pasa por unknown porque el tipo real de props viene de @react-navigation/bottom-tabs,
  // que no importamos a propósito (ver PropsBarra arriba).
  // sceneStyle con el fondo del token evita un destello blanco al cambiar de pestaña.
  return (
    <Tabs
      tabBar={(props) => <BarraPestanas {...(props as unknown as PropsBarra)} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="rutinas" options={{ title: 'Rutinas' }} />
      <Tabs.Screen name="progreso" options={{ title: 'Progreso' }} />
      <Tabs.Screen name="ejercicios" options={{ title: 'Ejercicios' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
