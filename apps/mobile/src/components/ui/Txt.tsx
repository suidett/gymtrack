import { Text, type TextProps } from 'react-native';

// Texto con variantes. Las clases de fuente llevan el peso en el nombre
// porque en React Native cada peso cargado es una familia distinta.
const VARIANTES = {
  titulo: 'font-sans-extrabold text-2xl text-ink',
  h2: 'font-sans-bold text-lg text-ink',
  h3: 'font-sans-bold text-base text-ink',
  cuerpo: 'font-sans text-base text-ink',
  cuerpoMedio: 'font-sans-semibold text-base text-ink',
  secundario: 'font-sans text-sm text-ink-muted',
  pequeno: 'font-sans text-xs text-ink-faint',
  etiqueta: 'font-mono text-[11px] uppercase tracking-widest text-ink-muted',
  etiquetaPrimaria: 'font-mono text-[11px] uppercase tracking-widest text-primary',
  cifra: 'font-mono-semibold text-2xl text-ink',
  cifraGrande: 'font-mono-semibold text-4xl text-ink',
  mono: 'font-mono text-sm text-ink',
  monoSecundario: 'font-mono text-xs text-ink-muted',
  enlace: 'font-sans-bold text-sm text-primary-deep',
} as const;

export type VarianteTxt = keyof typeof VARIANTES;

export function Txt({ v = 'cuerpo', className = '', ...p }: TextProps & { v?: VarianteTxt; className?: string }) {
  return <Text className={`${VARIANTES[v]} ${className}`} {...p} />;
}
