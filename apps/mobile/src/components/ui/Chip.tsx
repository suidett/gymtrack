// ─────────────────────────────────────────────────────────────────────────────
// Chip · Zona: Kit de interfaz
//
// Qué hace: las pastillas para elegir una opción entre varias, como el método de progresión de
// una rutina. Chip es una sola; Chips arma la fila completa a partir de una lista y avisa cuál
// quedó elegida.
// Tócalo cuando: quieras cambiar cómo se ve una opción elegida o no elegida, o cómo se
// distribuyen las pastillas (hoy van en fila y saltan de línea si no caben).
// No lo toques para: definir las opciones en sí (cada pantalla trae su lista) ni para pastillas
// que solo se leen y no se tocan (eso es Etiqueta, en Tarjeta.tsx).
// Depende de: nada propio (solo React Native). Las clases bg-primary, border-line, etc. salen del
// preset de packages/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { Pressable, Text, View } from 'react-native';

// ── Una pastilla ─────────────────────────────────────────────────────────────
/**
 * Una opción tocable.
 * Recibe `titulo`, `activo` (si está elegida se pinta con el color primario) y `onPress`.
 * Le avisa al lector de pantalla que es un botón y si está seleccionada.
 */
export function Chip({ titulo, activo, onPress }: { titulo: string; activo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      className={`rounded-full px-3.5 py-2 ${activo ? 'bg-primary' : 'border border-line bg-surface'}`}
    >
      <Text className={`font-sans-semibold text-[13px] ${activo ? 'text-white' : 'text-ink-muted'}`}>{titulo}</Text>
    </Pressable>
  );
}

// ── Grupo de pastillas ───────────────────────────────────────────────────────
/**
 * Fila de chips donde una sola queda elegida (como un grupo de radio).
 * Recibe `opciones` (lista de { id, nombre }), `valor` (el id elegido) y `onCambio`, que se llama
 * con el id de la pastilla tocada. El genérico T deja `valor` y `onCambio` tipados con los mismos
 * ids de las opciones, así el compilador te avisa si pasas uno que no existe.
 * Tocar la que ya está elegida vuelve a llamar onCambio con el mismo id; no la deselecciona.
 */
export function Chips<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: readonly { id: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {opciones.map((o) => (
        <Chip key={o.id} titulo={o.nombre} activo={o.id === valor} onPress={() => onCambio(o.id)} />
      ))}
    </View>
  );
}
