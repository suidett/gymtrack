import { colors } from '@gymtrack/tokens';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Lo que la barra necesita de React Navigation, tipado a mano para no depender
// de un paquete que expo-router instala por su cuenta y puede mover de lugar.
interface PropsBarra {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } } | undefined>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

// Barra de pestañas del diseño: texto sin iconos, la activa con fondo menta suave.
function BarraPestanas({ state, descriptors, navigation }: PropsBarra) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row gap-1 border-t border-line bg-surface px-2.5 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
    >
      {state.routes.map((route, index) => {
        const activo = state.index === index;
        const opciones = descriptors[route.key]?.options;
        const titulo = typeof opciones?.title === 'string' ? opciones.title : route.name;
        const onPress = () => {
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

export default function TabsLayout() {
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
