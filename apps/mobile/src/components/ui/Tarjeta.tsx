// ─────────────────────────────────────────────────────────────────────────────
// Tarjeta y piezas chicas · Zona: Kit de interfaz
//
// Qué hace: la superficie de sistema.css (.tarjeta): fondo de superficie, borde de 1 dp en
// superficie alta, radio 8 y relleno de 16. El tono 'hecha' es el fondo de una fila o serie
// hecha (ámbar oscuro en modo gimnasio). Más Dato, Separador (cabeza de sección) y Etiqueta.
// Tócalo cuando: cambie cómo se ve una tarjeta en toda la app.
// No lo toques para: el color de una tarjeta en una sola pantalla (usa `tono`).
// Depende de: ./Txt.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';
import { Txt } from './Txt';

// ── Tonos ────────────────────────────────────────────────────────────────────
// El tono es un prop y no una clase que compite: en NativeWind dos bg-* en el mismo className
// se resuelven por el orden del CSS generado, no por el orden escrito.
const TONOS = {
  normal: 'border-sup-alta bg-sup',
  hecha: 'border-hecho-borde bg-fila-hecha',
  alta: 'border-sup-alta bg-sup-alta',
  peligro: 'border-peligro bg-sup',
  // Nombres de la versión 0.1.
  primario: 'border-hecho-borde bg-fila-hecha',
  acento: 'border-hecho-borde bg-fila-hecha',
} as const;

/** Tono de una tarjeta. */
export type TonoTarjeta = keyof typeof TONOS;

// ── Tarjeta ──────────────────────────────────────────────────────────────────
/**
 * Contenedor con borde, radio 8 y relleno de 16. `tono` por defecto 'normal'. Con `onPress` se
 * vuelve tocable y se oscurece al presionar. No le pases bg-* ni border-* por className.
 */
export function Tarjeta({
  tono = 'normal',
  className = '',
  onPress,
  etiqueta,
  ...p
}: ViewProps & { tono?: TonoTarjeta; className?: string; onPress?: () => void; etiqueta?: string }) {
  const base = `rounded-control border p-4 ${TONOS[tono]} ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={etiqueta} className={`${base} active:opacity-80`}>
        {p.children}
      </Pressable>
    );
  }
  return <View className={base} {...p} />;
}

// ── Piezas chicas ────────────────────────────────────────────────────────────
/** Cifra con una leyenda debajo, para filas de estadísticas. Va en una fila con otras. */
export function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <Tarjeta className="flex-1 items-center gap-1 px-2 py-3">
      <Txt v="cifra">{valor}</Txt>
      <Txt v="pequeno" className="text-center">
        {etiqueta}
      </Txt>
    </Tarjeta>
  );
}

/**
 * Cabeza de sección (sistema.css, .seccion-cabeza): título de 16 a la izquierda y, si pasas
 * `derecha`, un enlace o cifra a la derecha. 24 arriba y 8 abajo.
 */
export function Separador({ titulo, className = '', derecha }: { titulo: string; className?: string; derecha?: ReactNode }) {
  return (
    <View className={`mb-2 mt-6 flex-row items-baseline justify-between ${className}`}>
      <Text accessibilityRole="header" className="font-sans-bold text-[16px] text-texto">
        {titulo}
      </Text>
      {derecha}
    </View>
  );
}

/** Pastilla con un texto corto (estado o conteo). `acento` la pinta con el fondo de hecha. */
export function Etiqueta({ texto, acento = false }: { texto: string; acento?: boolean }) {
  return (
    <View className={`rounded-control border px-2 py-1 ${acento ? 'border-hecho-borde bg-fila-hecha' : 'border-sup-alta bg-sup-alta'}`}>
      <Text className={`font-sans-semibold text-[12px] ${acento ? 'text-acento-texto' : 'text-texto-2'}`}>{texto}</Text>
    </View>
  );
}
