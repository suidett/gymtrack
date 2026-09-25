export interface ColorScale {
  DEFAULT: string;
  deep?: string;
  soft?: string;
  bright?: string;
  muted?: string;
  faint?: string;
}
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
export interface Fonts {
  sans: { regular: string; medium: string; semibold: string; bold: string; extrabold: string };
  mono: { regular: string; medium: string; semibold: string };
}
export interface Radius {
  field: number;
  button: number;
  card: number;
  tab: number;
  pill: number;
}
export const colors: Colors;
export const fonts: Fonts;
export const radius: Radius;
