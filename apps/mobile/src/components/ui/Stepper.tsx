import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { parseNumero } from '@/lib/tiempo';

export function Stepper({
  valor,
  onCambio,
  paso = 1,
  min = 0,
  max = 9999,
  formato,
  grande = false,
  editable = false,
}: {
  valor: number;
  onCambio: (v: number) => void;
  paso?: number;
  min?: number;
  max?: number;
  formato?: (v: number) => string;
  grande?: boolean;
  /** Permite tocar la cifra y escribirla, para no dar 32 toques hasta llegar a 80 kg. */
  editable?: boolean;
}) {
  const redondear = (n: number) => Math.round(n * 100) / 100;
  const borrador = useRef<string | null>(null);
  const confirmar = () => {
    if (borrador.current == null) return;
    const n = parseNumero(borrador.current);
    borrador.current = null;
    if (n != null) onCambio(Math.min(max, Math.max(min, redondear(n))));
  };
  const btn = `items-center justify-center rounded-full bg-primary-soft active:opacity-70 ${grande ? 'h-14 w-14' : 'h-10 w-10'}`;
  const txt = `font-sans-bold text-primary-deep ${grande ? 'text-2xl' : 'text-lg'}`;
  const cifra = `text-center font-mono-semibold text-ink ${grande ? 'min-w-[96px] text-3xl' : 'min-w-[64px] text-lg'}`;
  return (
    <View className="flex-row items-center gap-2">
      <Pressable accessibilityLabel={`bajar ${paso}`} className={btn} onPress={() => onCambio(Math.max(min, redondear(valor - paso)))}>
        <Text className={txt}>−</Text>
      </Pressable>
      {editable ? (
        <TextInput
          key={valor}
          defaultValue={String(valor).replace('.', ',')}
          onChangeText={(t) => {
            borrador.current = t;
          }}
          onBlur={confirmar}
          onSubmitEditing={confirmar}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="escribir el valor"
          className={`${cifra} rounded-field border border-line bg-surface px-2 py-1`}
        />
      ) : (
        <Text className={cifra}>{formato ? formato(valor) : String(valor).replace('.', ',')}</Text>
      )}
      <Pressable accessibilityLabel={`subir ${paso}`} className={btn} onPress={() => onCambio(Math.min(max, redondear(valor + paso)))}>
        <Text className={txt}>+</Text>
      </Pressable>
    </View>
  );
}
