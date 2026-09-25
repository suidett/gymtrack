// ─────────────────────────────────────────────────────────────────────────────
// Fila · Zona: Kit de interfaz
//
// Qué hace: una fila de lista dentro de una tarjeta (una rutina, una sesión, un récord): lo
// principal a la izquierda, algo chico a la derecha (una flecha, una cifra) y una línea abajo que
// la separa de la siguiente. Si le pasas onPress, se vuelve tocable.
// Tócalo cuando: quieras cambiar el alto, la separación o el efecto de toque de todas las filas.
// No lo toques para: decidir qué va en cada fila (eso lo arma cada pantalla) ni el estilo del
// texto de adentro (Txt.tsx).
// Depende de: nada propio (solo React Native). La clase border-line sale del preset de
// packages/tokens.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

/**
 * Fila de lista con contenido a la izquierda y a la derecha.
 * Recibe `izquierda` (ocupa todo el ancho que sobra), `derecha` opcional, `onPress` opcional (sin
 * él la fila no reacciona al toque ni se atenúa) y `ultimo`, que quita la línea de abajo para que
 * la última fila no dibuje un borde doble con el de la tarjeta. Es la pantalla la que marca cuál
 * es la última, con el índice del map.
 */
export function Fila({
  onPress,
  izquierda,
  derecha,
  ultimo = false,
}: {
  onPress?: () => void;
  izquierda: ReactNode;
  derecha?: ReactNode;
  ultimo?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`flex-row items-center gap-3 py-3 ${ultimo ? '' : 'border-b border-line'} ${onPress ? 'active:opacity-70' : ''}`}
    >
      <View className="flex-1">{izquierda}</View>
      {derecha}
    </Pressable>
  );
}
