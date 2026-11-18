// ─────────────────────────────────────────────────────────────────────────────
// Texto · Zona: Kit de interfaz
//
// Qué hace: el texto de la app con las variantes de sistema.css (ceja, título, h2, h3,
// secundario, cuerpo, cifra), más atajos <Ceja>, <Titulo> y <Cifra>. Las variantes de la
// versión 0.1 siguen existiendo con los colores nuevos para no romper el código viejo.
// Tócalo cuando: haga falta una variante nueva que se repite en varias pantallas.
// No lo toques para: un texto de un solo lugar (usa <Text> con las clases completas).
// Depende de: react-native (Text) y las clases del preset de @gymtrack/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { Text, type TextProps } from 'react-native';

// ── Variantes ────────────────────────────────────────────────────────────────
// Cada variante trae fuente, tamaño, alto de línea y color. Las clases de fuente llevan el peso
// en el nombre porque en React Native cada peso cargado es una familia distinta.
const VARIANTES = {
  // Marca «Más» (sistema.css).
  ceja: 'font-sans-semibold text-[13px] leading-[17px] text-texto-2',
  cejaAcento: 'font-sans-semibold text-[13px] leading-[17px] text-acento-texto',
  titulo: 'font-sans-bold text-[28px] leading-[32px] tracking-[-0.28px] text-texto',
  h2: 'font-sans-bold text-[24px] leading-[29px] tracking-[-0.24px] text-texto',
  h3: 'font-sans-bold text-[17px] leading-[22px] text-texto',
  cuerpo: 'font-sans-medium text-[16px] leading-[22px] text-texto',
  sec: 'font-sans-medium text-[14px] leading-[20px] text-texto-2',
  etiquetaCampo: 'font-sans-bold text-[16px] leading-[20px] text-texto',
  error: 'font-sans-semibold text-[14px] leading-[20px] text-peligro',
  cifra: 'font-mono-bold text-[20px] leading-[24px] text-texto',
  cifraGrande: 'font-mono-bold text-[30px] leading-[34px] text-texto',
  cifraSec: 'font-mono-bold text-[14px] leading-[18px] text-texto-2',
  // Nombres de la versión 0.1, con la marca nueva.
  cuerpoMedio: 'font-sans-semibold text-[16px] leading-[22px] text-texto',
  secundario: 'font-sans-medium text-[14px] leading-[20px] text-texto-2',
  pequeno: 'font-sans-medium text-[12px] leading-[16px] text-texto-2',
  etiqueta: 'font-sans-semibold text-[13px] leading-[17px] text-texto-2',
  etiquetaPrimaria: 'font-sans-semibold text-[13px] leading-[17px] text-acento-texto',
  mono: 'font-mono-medium text-[14px] text-texto',
  monoSecundario: 'font-mono-medium text-[12px] text-texto-2',
  enlace: 'font-sans-bold text-[14px] text-acento-texto',
} as const;

/** Nombre de una variante de texto. */
export type VarianteTxt = keyof typeof VARIANTES;

// ── Componente ───────────────────────────────────────────────────────────────
/**
 * Texto con estilo por variante. `v` por defecto es 'cuerpo'; `className` se suma al final
 * (márgenes, alineación). No le pases otro color o fuente por className: en NativeWind dos
 * clases del mismo grupo no se resuelven por el orden escrito. Para eso usa <Text>.
 */
export function Txt({ v = 'cuerpo', className = '', ...p }: TextProps & { v?: VarianteTxt; className?: string }) {
  return <Text className={`${VARIANTES[v]} ${className}`} {...p} />;
}

// ── Atajos ───────────────────────────────────────────────────────────────────
type PropsAtajo = TextProps & { className?: string };

/** Ceja: la línea chica sobre un título («Martes 17 de noviembre»). `acento` la pinta en ámbar. */
export function Ceja({ acento = false, ...p }: PropsAtajo & { acento?: boolean }) {
  return <Txt v={acento ? 'cejaAcento' : 'ceja'} {...p} />;
}

/** Título de pantalla (28) o de sección (`nivel` 2 = 24, 3 = 17). Se anuncia como encabezado. */
export function Titulo({ nivel = 1, ...p }: PropsAtajo & { nivel?: 1 | 2 | 3 }) {
  return <Txt v={nivel === 1 ? 'titulo' : nivel === 2 ? 'h2' : 'h3'} accessibilityRole="header" {...p} />;
}

/** Cifra en JetBrains Mono 700 (kilos, repeticiones, tiempo). `grande` es la del más y menos (30). */
export function Cifra({ grande = false, style, ...p }: PropsAtajo & { grande?: boolean }) {
  return <Txt v={grande ? 'cifraGrande' : 'cifra'} style={[{ fontVariant: ['tabular-nums'] }, style]} {...p} />;
}
