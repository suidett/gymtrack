import { Text, View, type ViewProps } from 'react-native';
import { Txt } from './Txt';

// El tono es un prop y no una clase que compite: en NativeWind dos bg-* en el mismo
// className se resuelven por el orden del CSS generado, no por el orden escrito.
const TONOS = {
  normal: 'border-line bg-surface',
  primario: 'border-primary-soft bg-primary-soft',
  acento: 'border-accent bg-accent-soft',
  peligro: 'border-danger bg-danger-soft',
} as const;

export type TonoTarjeta = keyof typeof TONOS;

export function Tarjeta({ tono = 'normal', className = '', ...p }: ViewProps & { tono?: TonoTarjeta; className?: string }) {
  return <View className={`rounded-card border p-4 ${TONOS[tono]} ${className}`} {...p} />;
}

export function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <Tarjeta className="flex-1 items-center gap-1 px-2 py-3">
      <Txt v="cifra">{valor}</Txt>
      <Txt v="pequeno" className="text-center">{etiqueta}</Txt>
    </Tarjeta>
  );
}

export function Separador({ titulo, className = '' }: { titulo: string; className?: string }) {
  return <Txt v="etiqueta" className={`mb-2 mt-5 ${className}`}>{titulo}</Txt>;
}

export function Etiqueta({ texto, acento = false }: { texto: string; acento?: boolean }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${acento ? 'bg-accent-soft' : 'bg-field'}`}>
      <Text className={`font-mono text-[11px] ${acento ? 'text-accent-deep' : 'text-ink-muted'}`}>{texto}</Text>
    </View>
  );
}
