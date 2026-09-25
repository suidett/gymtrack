import { fmtNum, type WorkoutSet } from '@gymtrack/shared';
import { Pressable, Text, View } from 'react-native';
import { Boton, Stepper } from '@/components/ui';

export function FilaActiva({
  set,
  esTiempo,
  pasoKg,
  onCambio,
  onMarcar,
  onFallo,
  onLimpiarFallo,
}: {
  set: WorkoutSet;
  esTiempo: boolean;
  pasoKg: number;
  onCambio: (p: Partial<WorkoutSet>) => void;
  onMarcar: () => void;
  onFallo: () => void;
  onLimpiarFallo: () => void;
}) {
  return (
    <View className="my-1 rounded-card border border-primary bg-primary-soft p-3">
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-primary-deep">
          Serie {set.serieN}
          {set.completada ? ' · editando' : ''}
        </Text>
        {set.completada ? (
          <Text className="font-sans-semibold text-xs text-primary-deep">{set.fallo ? 'hecha con fallo' : 'hecha'}</Text>
        ) : null}
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'kg (lastre)' : 'kg'}</Text>
        <Stepper grande editable valor={set.pesoKg} onCambio={(v) => onCambio({ pesoKg: v })} paso={pasoKg} min={0} max={999} formato={(v) => fmtNum(v)} />
      </View>
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'segundos' : 'reps'}</Text>
        <Stepper grande editable valor={set.reps} onCambio={(v) => onCambio({ reps: Math.round(v) })} paso={esTiempo ? 5 : 1} min={0} max={999} />
      </View>
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="w-12 font-mono text-xs text-ink-muted">RIR</Text>
        {[0, 1, 2, 3, 4].map((r) => (
          <Pressable
            key={r}
            accessibilityLabel={`RIR ${r}`}
            onPress={() => onCambio({ rir: set.rir === r ? null : r })}
            className={`h-9 w-9 items-center justify-center rounded-full ${set.rir === r ? 'bg-primary' : 'border border-line bg-white'}`}
          >
            <Text className={`font-mono-semibold text-sm ${set.rir === r ? 'text-white' : 'text-ink'}`}>{r}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mt-3 flex-row gap-2">
        <Boton titulo={set.completada ? 'Guardar cambios' : 'Serie hecha'} className="flex-1" onPress={onMarcar} />
        {set.completada && set.fallo ? (
          <Boton titulo="Sin fallo" variante="secundario" onPress={onLimpiarFallo} />
        ) : (
          <Boton titulo="Fallé" variante="peligro" onPress={onFallo} />
        )}
      </View>
    </View>
  );
}
