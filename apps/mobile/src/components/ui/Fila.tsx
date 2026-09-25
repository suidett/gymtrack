import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

export function Fila({
  onPress,
  izquierda,
  derecha,
  ultimo = false,
}: {
  onPress?: () => void;
  izquierda: ReactNode;
  derecha?: ReactNode;
  ultimo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 py-3 ${ultimo ? '' : 'border-b border-line'} ${onPress ? 'active:opacity-70' : ''}`}
    >
      <View className="flex-1">{izquierda}</View>
      {derecha}
    </Pressable>
  );
}
