import { Pressable, Text, type PressableProps } from 'react-native';

const BOTONES = {
  primario: { caja: 'bg-primary', texto: 'text-white' },
  secundario: { caja: 'bg-primary-soft', texto: 'text-primary-deep' },
  fantasma: { caja: 'bg-transparent border border-line', texto: 'text-ink' },
  peligro: { caja: 'bg-danger-soft', texto: 'text-danger' },
  acento: { caja: 'bg-accent', texto: 'text-white' },
  acentoSuave: { caja: 'bg-accent-soft', texto: 'text-accent-deep' },
} as const;

export type VarianteBoton = keyof typeof BOTONES;

export function Boton({
  titulo,
  variante = 'primario',
  chico = false,
  className = '',
  disabled,
  ...p
}: PressableProps & { titulo: string; variante?: VarianteBoton; chico?: boolean; className?: string }) {
  const e = BOTONES[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`items-center justify-center rounded-button ${chico ? 'px-4 py-2.5' : 'px-5 py-4'} ${e.caja} ${
        disabled ? 'opacity-40' : 'active:opacity-80'
      } ${className}`}
      {...p}
    >
      <Text className={`font-sans-bold ${chico ? 'text-sm' : 'text-base'} ${e.texto}`}>{titulo}</Text>
    </Pressable>
  );
}

export function BotonRedondo({
  glifo,
  onPress,
  disabled = false,
  etiqueta,
}: {
  glifo: string;
  onPress: () => void;
  disabled?: boolean;
  etiqueta?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? glifo}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full border border-line bg-surface ${disabled ? 'opacity-30' : 'active:opacity-70'}`}
    >
      <Text className="font-sans-bold text-lg text-ink">{glifo}</Text>
    </Pressable>
  );
}
