// ─────────────────────────────────────────────────────────────────────────────
// Tipos de los tokens · Zona: Diseño
//
// Qué hace: le cuenta a TypeScript qué forma tiene lo que exporta index.js (JavaScript puro)
// para que en la app `import { temas } from '@gymtrack/tokens'` tenga autocompletado y avise si
// alguien pide un color o una fuente que no existe.
// Tócalo cuando: agregues, renombres o saques una clave en index.js. Se escribe a mano.
// No lo toques para: cambiar un valor (index.js) ni para agregar clases (tailwind.preset.js).
// Depende de: nada que importe. Tiene que calzar clave por clave con index.js.
// ─────────────────────────────────────────────────────────────────────────────

// ── Temas ────────────────────────────────────────────────────────────────────
/** Nombre de un tema: modo gimnasio (oscuro, principal) o clara. */
export type NombreTema = 'gimnasio' | 'clara';

/** Nombre de un color del tema; cada uno es también una clase: bg-fondo, text-texto-2... */
export type NombreColor =
  | 'fondo' | 'sup' | 'sup-alta' | 'texto' | 'texto-2'
  | 'accion' | 'accion-texto' | 'accion-pres' | 'acento-texto' | 'fila-hecha' | 'borde'
  | 'peligro' | 'peligro-sobre' | 'peligro-pres' | 'desh-fondo' | 'desh-texto' | 'foco'
  | 'sec-fondo' | 'sec-borde' | 'sec-pres' | 'sec-pres-borde' | 'fantasma-pres'
  | 'chip-fondo' | 'chip-texto'
  | 'riel-apagado' | 'riel-apagado-borde' | 'perilla-apagada'
  | 'riel-encendido' | 'riel-encendido-borde' | 'riel-encendido-pres' | 'perilla-encendida'
  | 'marcar-borde' | 'hecho-fondo' | 'hecho-borde' | 'hecho-pres' | 'visto'
  | 'simb-v' | 'simb-h' | 'campo-fondo' | 'campo-borde' | 'campo-edicion'
  | 'trazo-pestana' | 'aviso-fondo' | 'aviso-texto';

/** Un tema: un hexadecimal por cada nombre de color. */
export type Tema = Record<NombreColor, string>;

export interface Marca {
  ambar: string;
  grafito: string;
  claro: string;
  fondoClaro: string;
  fondoIcono: string;
  simbolo: {
    grilla: number;
    vertical: [number, number, number, number];
    tramoIzquierdo: [number, number, number, number];
    tramoDerecho: [number, number, number, number];
    radio: number;
  };
}

// ── Fuentes, radios, medidas, movimiento ─────────────────────────────────────
export interface Fonts {
  sans: { regular: string; medium: string; semibold: string; bold: string; extrabold: string };
  mono: { regular: string; medium: string; semibold: string; bold: string };
}

export interface Radius {
  control: number;
  perilla: number;
  hoja: number;
  pill: number;
  field: number;
  button: number;
  card: number;
  tab: number;
}

export interface Medidas {
  boton: number;
  botonAlto: number;
  empezar: number;
  paso: number;
  marcar: number;
  chipVisible: number;
  chipToque: number;
  toqueMinimo: number;
  icono: number;
  rielInterruptor: [number, number];
  perilla: number;
  margenPantalla: number;
  pestanas: number;
}

export interface Movimiento {
  soltar: number;
  marcarRelleno: number;
  marcarVisto: number;
  marcarFila: number;
  cifra: number;
  estado: number;
  curvaSalida: [number, number, number, number];
  repeticion: { inicio: number; paso: number; rapido: number; pasosAntesDeRapido: number };
}

/** Paleta con los nombres de la versión 0.1, con valores de «Más» (solo para código viejo). */
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

// ── Lo que exporta index.js ──────────────────────────────────────────────────
export const marca: Marca;
export const temas: Record<NombreTema, Tema>;
export const nombresColor: NombreColor[];
/** Variables CSS del tema ({ '--fondo': '15 17 19', ... }) para `vars()` de NativeWind. */
export function variablesTema(nombre: NombreTema): Record<string, string>;
export const fonts: Fonts;
export const radius: Radius;
export const medidas: Medidas;
export const movimiento: Movimiento;
/** @deprecated Usa `useTema().c` en la app; esto queda fijo en modo gimnasio. */
export const colors: Colors;
