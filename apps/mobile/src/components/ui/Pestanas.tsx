// ─────────────────────────────────────────────────────────────────────────────
// Pestañas de texto · Zona: Kit de interfaz
//
// Qué hace: las pestañas de sistema.css (.pestanas): texto sin íconos, Archivo 600 13 en texto
// secundario; la activa en texto y 700, con el trazo ámbar de 24 × 4 del símbolo encima. Hay dos:
// BarraPestanas, la barra de abajo de 64 dp que usan los layouts de alumno y entrenador con
// Expo Router, y PestanasTexto, la misma pieza dentro de una pantalla (Semana, Mes, Todo).
// La insignia («3» en Alertas) nunca baja de 12.
// Tócalo cuando: cambie cómo se ve una pestaña en toda la app.
// No lo toques para: agregar o quitar una pestaña (eso va en src/app/alumno|entrenador/_layout).
// Depende de: react-native y react-native-safe-area-context.
// ─────────────────────────────────────────────────────────────────────────────
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Una pestaña ──────────────────────────────────────────────────────────────
function Pestana({
  titulo,
  activa,
  insignia,
  onPress,
  alto,
}: {
  titulo: string;
  activa: boolean;
  insignia?: string | number;
  onPress: () => void;
  alto: number;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: activa }}
      accessibilityLabel={insignia ? `${titulo}, ${insignia}` : titulo}
      onPress={onPress}
      className="flex-1 items-center justify-center active:bg-fantasma-pres"
      style={{ height: alto }}
    >
      {activa ? <View className="absolute left-1/2 top-0 -ml-3 h-1 w-6 rounded-b-[1px] bg-trazo-pestana" /> : null}
      <View className="flex-row items-center gap-1">
        <Text numberOfLines={1} className={`text-[13px] ${activa ? 'font-sans-bold text-texto' : 'font-sans-semibold text-texto-2'}`}>
          {titulo}
        </Text>
        {insignia ? (
          <View className="h-5 min-w-5 items-center justify-center rounded-full bg-accion px-1">
            <Text className="font-mono-bold text-[12px] text-accion-texto">{insignia}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── Pestañas dentro de una pantalla ──────────────────────────────────────────
/** Pestañas de texto dentro de una pantalla. Una sola elegida. */
export function PestanasTexto<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly { id: T; nombre: string; insignia?: string | number }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row border-b border-sup-alta">
      {opciones.map((o) => (
        <Pestana key={o.id} titulo={o.nombre} insignia={o.insignia} activa={o.id === valor} onPress={() => onCambio(o.id)} alto={48} />
      ))}
    </View>
  );
}

// ── Barra de abajo para Expo Router ──────────────────────────────────────────
// Lo que la barra necesita de React Navigation, tipado a mano para no importar
// @react-navigation/bottom-tabs (lo instala expo-router por su cuenta).
export interface PropsBarraPestanas {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string; tabBarBadge?: string | number; href?: unknown } } | undefined>;
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

/** Barra de pestañas de 64 dp. Úsala en `<Tabs tabBar={(p) => <BarraPestanas {...(p as unknown as PropsBarraPestanas)} />}>`. */
export function BarraPestanas({ state, descriptors, navigation }: PropsBarraPestanas) {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" className="flex-row border-t border-sup-alta bg-sup" style={{ paddingBottom: insets.bottom }}>
      {state.routes.map((route, index) => {
        const opciones = descriptors[route.key]?.options;
        // `href: null` en las opciones esconde la ruta de la barra (convención de Expo Router).
        if (opciones && 'href' in opciones && opciones.href === null) return null;
        const activa = state.index === index;
        const titulo = typeof opciones?.title === 'string' ? opciones.title : route.name;
        return (
          <Pestana
            key={route.key}
            titulo={titulo}
            activa={activa}
            insignia={opciones?.tabBarBadge}
            alto={64}
            onPress={() => {
              const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!activa && !ev.defaultPrevented) navigation.navigate(route.name);
            }}
          />
        );
      })}
    </View>
  );
}
