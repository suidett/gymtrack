import { fmtDuracion } from '@gymtrack/shared';
import { Text, View } from 'react-native';
import { Boton } from '@/components/ui';

export function PanelDescanso({
  restante,
  total,
  siguiente,
  onMas,
  onSaltar,
}: {
  restante: number;
  total: number;
  siguiente: string;
  onMas: () => void;
  onSaltar: () => void;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((restante / total) * 100)) : 0;
  return (
    <View className="mb-3 rounded-card bg-accent-soft p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="font-mono text-[11px] uppercase tracking-widest text-accent-deep">Descanso</Text>
          <Text className="font-mono-semibold text-4xl text-accent-deep">{fmtDuracion(restante)}</Text>
        </View>
        <View className="gap-2">
          <Boton titulo="+30 s" variante="fantasma" chico onPress={onMas} />
          <Boton titulo="Saltar" variante="acento" chico onPress={onSaltar} />
        </View>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/60">
        <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-2 font-sans text-xs text-accent-deep">{siguiente}</Text>
    </View>
  );
}
