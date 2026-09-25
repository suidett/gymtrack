// ─────────────────────────────────────────────────────────────────────────────
// Txt · Zona: Kit de interfaz
//
// Qué hace: es el texto de toda la app. En vez de repetir fuente, tamaño y color en cada pantalla,
// se elige una variante con nombre: titulo, cuerpo, secundario, cifra, etiqueta, enlace...
// Tócalo cuando: quieras cambiar cómo se ve un tipo de texto en todas partes (por ejemplo, que
// las cifras sean más grandes) o agregar una variante nueva.
// No lo toques para: cambiar un color o una fuente de raíz; eso vive en packages/tokens/index.js.
// Depende de: nada propio (solo React Native). Las clases text-ink, font-sans, etc. salen del
// preset de packages/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { Text, type TextProps } from 'react-native';

// ── Variantes ────────────────────────────────────────────────────────────────
// Texto con variantes. Las clases de fuente llevan el peso en el nombre
// porque en React Native cada peso cargado es una familia distinta.
// Cada variante trae las tres cosas (fuente, tamaño, color). Si agregas una, mantén eso: las
// pantallas confían en que no tienen que completar nada.
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

/** Nombre de una variante de texto: 'titulo', 'cuerpo', 'secundario', 'cifra', 'etiqueta', etc. */
export type VarianteTxt = keyof typeof VARIANTES;

// ── Componente ───────────────────────────────────────────────────────────────
/**
 * Texto con estilo por variante. Úsalo en vez de <Text> en las pantallas.
 * Recibe `v` (la variante, por defecto 'cuerpo'), un `className` opcional que se suma al final
 * (márgenes, alineación) y el resto de props de Text (children, numberOfLines, onPress...).
 * Ojo: si el className contradice la variante (otro text-* o font-*), no gana el que escribiste
 * al final; NativeWind resuelve por el orden del CSS. Para otro color usa <Text> con las clases
 * completas.
 */
export function Txt({ v = 'cuerpo', className = '', ...p }: TextProps & { v?: VarianteTxt; className?: string }) {
  return <Text className={`${VARIANTES[v]} ${className}`} {...p} />;
}
