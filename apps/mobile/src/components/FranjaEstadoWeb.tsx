// ─────────────────────────────────────────────────────────────────────────────
// Franja bajo la barra de estado, en la web instalada · Zona: Diseño
//
// Qué hace: en el iPhone, la app web instalada se dibuja bajo la barra de estado
// (black-translucent en public/index.html), que siempre trae la hora y la batería en blanco. En
// modo gimnasio el fondo es oscuro y se leen bien; en modo claro quedarían blancas sobre blanco.
// Por eso, solo en la web y en modo claro, pinta una franja grafito del alto de esa barra.
// En el teléfono (APK) no hace nada: ahí la barra la maneja expo-status-bar.
// Tócalo cuando: cambie el estilo de la barra de estado de la web.
// No lo toques para: los colores del tema (packages/tokens).
// Depende de: @/lib/tema y react-native-safe-area-context.
// ─────────────────────────────────────────────────────────────────────────────
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/lib/tema';

/** El grafito del modo gimnasio (temas.gimnasio.fondo). */
const GRAFITO = '#0F1113';

export function FranjaEstadoWeb() {
  const { modo } = useTema();
  const { top } = useSafeAreaInsets();
  if (Platform.OS !== 'web' || modo !== 'clara' || top <= 0) return null;
  return (
    <View
      pointerEvents="none"
      aria-hidden
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top, backgroundColor: GRAFITO, zIndex: 1000 }}
    />
  );
}
