// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta · Zona: Kit de interfaz
//
// Qué hace: el contenedor con borde y esquinas redondeadas donde va casi todo (la rutina de hoy,
// un ejercicio, un aviso). Trae además tres piezas chicas que viven cerca de las tarjetas: Dato
// (una cifra con su leyenda, para las estadísticas), Separador (el título de una sección de la
// pantalla) y Etiqueta (la pastilla de estado o de conteo).
// Tócalo cuando: quieras cambiar el relleno, el borde o los tonos de todas las tarjetas, o cómo
// se ven las cifras, los títulos de sección o las pastillas.
// No lo toques para: cambiar un color de raíz (packages/tokens/index.js) ni el estilo del texto
// en general (Txt.tsx).
// Depende de: Txt (./Txt). Las clases bg-surface, rounded-card, etc. salen del preset de
// packages/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import { Text, View, type ViewProps } from 'react-native';
import { Txt } from './Txt';

// ── Tonos ────────────────────────────────────────────────────────────────────
// El tono es un prop y no una clase que compite: en NativeWind dos bg-* en el mismo
// className se resuelven por el orden del CSS generado, no por el orden escrito.
const TONOS = {
  normal: 'border-line bg-surface',
  primario: 'border-primary-soft bg-primary-soft',
  acento: 'border-accent bg-accent-soft',
  peligro: 'border-danger bg-danger-soft',
} as const;

/** Tono de una tarjeta: 'normal' (blanca) o teñida en 'primario', 'acento' o 'peligro'. */
export type TonoTarjeta = keyof typeof TONOS;

// ── Tarjeta ──────────────────────────────────────────────────────────────────
/**
 * Contenedor base con borde, esquinas redondeadas y relleno de 16 px.
 * Recibe `tono` (por defecto 'normal'), un `className` opcional para el resto del diseño (gap,
 * márgenes, alineación) y el resto de props de View.
 * No le pases bg-* ni border-* por className: usa `tono`, si no el color queda al azar.
 */
export function Tarjeta({ tono = 'normal', className = '', ...p }: ViewProps & { tono?: TonoTarjeta; className?: string }) {
  return <View className={`rounded-card border p-4 ${TONOS[tono]} ${className}`} {...p} />;
}

// ── Piezas chicas ────────────────────────────────────────────────────────────
/**
 * Cifra grande con una leyenda debajo, para las filas de estadísticas (sesiones, volumen, récords).
 * Recibe `valor` ya formateado como texto y `etiqueta`. Está pensada para ir en una fila
 * (flex-row) junto a otras: cada una toma el mismo ancho gracias al flex-1.
 */
export function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <Tarjeta className="flex-1 items-center gap-1 px-2 py-3">
      <Txt v="cifra">{valor}</Txt>
      <Txt v="pequeno" className="text-center">{etiqueta}</Txt>
    </Tarjeta>
  );
}

/**
 * Título de sección de una pantalla ("Mis rutinas", "Esta semana"): texto chico en mayúsculas,
 * con aire arriba. Recibe `titulo` y un `className` opcional para ajustar los márgenes.
 */
export function Separador({ titulo, className = '' }: { titulo: string; className?: string }) {
  return <Txt v="etiqueta" className={`mb-2 mt-5 ${className}`}>{titulo}</Txt>;
}

/**
 * Pastilla con un texto corto: el estado de una rutina o un conteo ("12 ejercicios").
 * Recibe `texto` y `acento`; con acento va en violeta para destacar (la rutina activa),
 * sin acento va en gris.
 */
export function Etiqueta({ texto, acento = false }: { texto: string; acento?: boolean }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${acento ? 'bg-accent-soft' : 'bg-field'}`}>
      <Text className={`font-mono text-[11px] ${acento ? 'text-accent-deep' : 'text-ink-muted'}`}>{texto}</Text>
    </View>
  );
}
