import { fmtNum, type WorkoutSet } from '@gymtrack/shared';
import { Pressable, Text, View } from 'react-native';

export function FilaSet({ set, onPress, onQuitar }: { set: WorkoutSet; onPress: () => void; onQuitar?: () => void }) {
  const hecha = set.completada;
  const color = hecha ? 'text-ink' : 'text-ink-faint';
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`editar serie ${set.serieN}`}
      className="flex-row items-center border-t border-line px-1 py-2.5 active:opacity-70"
    >
      <Text className={`w-12 font-mono text-sm ${color}`}>{set.serieN}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{fmtNum(set.pesoKg)}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{set.reps}</Text>
      <Text className={`w-14 font-mono text-sm ${color}`}>{set.rir ?? '–'}</Text>
      <View className="w-10 items-end">
        {hecha ? (
          <View className={`h-7 w-7 items-center justify-center rounded-full ${set.fallo ? 'bg-danger-soft' : 'bg-primary'}`}>
            <Text className={`font-sans-bold text-xs ${set.fallo ? 'text-danger' : 'text-white'}`}>{set.fallo ? '!' : '✓'}</Text>
          </View>
        ) : onQuitar ? (
          <Pressable onPress={onQuitar} hitSlop={8} accessibilityLabel="quitar serie" className="h-7 w-7 items-center justify-center rounded-full bg-field">
            <Text className="font-sans-bold text-xs text-ink-muted">×</Text>
          </Pressable>
        ) : (
          <View className="h-7 w-7 rounded-full border border-line" />
        )}
      </View>
    </Pressable>
  );
}
