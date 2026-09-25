import { Pressable, Text, View } from 'react-native';

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
