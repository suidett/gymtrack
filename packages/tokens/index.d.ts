// ─────────────────────────────────────────────────────────────────────────────
// Tipos de los tokens · Zona: Diseño
//
// Qué hace: le cuenta a TypeScript qué forma tiene lo que exporta index.js (que es JavaScript
// puro) para que en la app `import { colors } from '@gymtrack/tokens'` tenga autocompletado y
// avise si alguien pide un color o una fuente que no existe.
// Tócalo cuando: agregues, renombres o saques una clave en index.js. Este archivo se escribe a
// mano, no se genera: si no lo actualizas, la clave existe al correr pero TypeScript la rechaza.
// No lo toques para: cambiar un valor (eso es index.js) ni para agregar clases de Tailwind
// (tailwind.preset.js).
// Depende de: nada que importe. Describe a index.js y tiene que calzar clave por clave con él.
// ─────────────────────────────────────────────────────────────────────────────

// ── Colores ──────────────────────────────────────────────────────────────────
/**
 * Forma genérica de una familia de color: el tono base más variantes opcionales.
 * Hoy ninguna de las interfaces de abajo la usa (cada familia declara sus variantes exactas
 * para que TypeScript avise si pides `primary.muted`, que no existe). Queda disponible para
 * escribir un helper que acepte cualquier familia.
 */
export interface ColorScale {
  DEFAULT: string;
  deep?: string;
  soft?: string;
  bright?: string;
  muted?: string;
  faint?: string;
}
/**
 * La paleta completa, tal como la exporta index.js. Las familias con DEFAULT son las que en
 * Tailwind se usan sin sufijo (`bg-primary`) y con variante (`bg-primary-soft`); las que son
 * un string dan una sola clase (`bg-surface`, `border-line`).
 */
export interface Colors {
  primary: { DEFAULT: string; deep: string; soft: string; bright: string };
  accent: { DEFAULT: string; deep: string; soft: string; bright: string };
  ink: { DEFAULT: string; muted: string; faint: string };
  bg: string;
  surface: string;
  line: string;
  field: string;
  danger: { DEFAULT: string; soft: string };
  gym: { bg: string; card: string; line: string; text: string; muted: string };
}

// ── Fuentes ──────────────────────────────────────────────────────────────────
/**
 * Nombre de familia de cada peso, tal como lo registra expo-font. Son los que van en el
 * `fontFamily` de un estilo o detrás de las clases font-sans-* y font-mono-* del preset.
 */
export interface Fonts {
  sans: { regular: string; medium: string; semibold: string; bold: string; extrabold: string };
  mono: { regular: string; medium: string; semibold: string };
}

// ── Radios ───────────────────────────────────────────────────────────────────
/**
 * Radios de esquina en píxeles. `pill` es "totalmente redondo" y no tiene clase propia en el
 * preset (ahí se usa `rounded-full`).
 */
export interface Radius {
  field: number;
  button: number;
  card: number;
  tab: number;
  pill: number;
}

// ── Lo que exporta index.js ──────────────────────────────────────────────────
/** Paleta de la app. Úsala desde código solo cuando el componente no acepta className. */
export const colors: Colors;
/** Familias tipográficas por peso. */
export const fonts: Fonts;
/** Radios de esquina en píxeles. */
export const radius: Radius;
