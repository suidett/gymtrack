// ─────────────────────────────────────────────────────────────────────────────
// Filas de lista · Zona: Kit de interfaz
//
// Qué hace: la fila de sistema.css (.lista-filas > li): alto mínimo de 56 dp, contenido a la
// izquierda y a la derecha, línea de 1 dp en superficie alta entre filas. Con `onPress` se vuelve
// tocable, se oscurece al presionar y muestra la flecha a la derecha si no pasas `derecha`.
// Tócalo cuando: cambie cómo se ve una fila de lista en toda la app.
// No lo toques para: la fila de una serie en el registro (eso es del área Sesión).
// Depende de: ./Icono y ./Txt.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icono } from './Icono';
import { Txt } from './Txt';

/**
 * Fila. `izquierda` ocupa lo que sobra; `derecha` opcional. `ultimo` quita la línea de abajo
 * (la pantalla marca cuál es la última con el índice del map). `titulo` y `detalle` son un
 * atajo para el caso común de dos líneas de texto.
 */
export function Fila({
  onPress,
  izquierda,
  titulo,
  detalle,
  derecha,
  ultimo = false,
  etiqueta,
}: {
  onPress?: () => void;
  izquierda?: ReactNode;
  titulo?: string;
  detalle?: string;
  derecha?: ReactNode;
  ultimo?: boolean;
  /** Lo que lee el lector de pantalla (por defecto el título). */
  etiqueta?: string;
}) {
  const contenido = izquierda ?? (
    <View className="gap-0.5">
      {titulo ? <Txt v="cuerpoMedio">{titulo}</Txt> : null}
      {detalle ? <Txt v="sec">{detalle}</Txt> : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={etiqueta ?? titulo}
      className={`min-h-[56px] flex-row items-center gap-3 py-2 ${ultimo ? '' : 'border-b border-sup-alta'} ${onPress ? 'active:bg-fantasma-pres' : ''}`}
    >
      <View className="flex-1">{contenido}</View>
      {derecha ?? (onPress ? <Icono nombre="adelante" tamano={20} /> : null)}
    </Pressable>
  );
}
