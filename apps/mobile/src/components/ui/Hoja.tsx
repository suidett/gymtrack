// ─────────────────────────────────────────────────────────────────────────────
// Hoja inferior · Zona: Kit de interfaz
//
// Qué hace: la hoja de sistema.css (.velo y .hoja): un velo negro al 55 % y, abajo, una
// superficie con esquinas de 12 arriba, relleno 20/16/28, título, texto y una fila de acciones
// de 56 dp que se reparten el ancho. Sirve para confirmar («¿Descartar la sesión?») y para
// elegir algo sin salir de la pantalla. Tocar el velo o el botón atrás de Android la cierra.
// Tócalo cuando: cambie cómo se ve o se cierra una hoja en toda la app.
// No lo toques para: el contenido de una hoja en particular (pásalo como children).
// Depende de: react-native (Modal), ./Txt y react-native-safe-area-context.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/lib/tema';
import { Txt } from './Txt';

/**
 * Hoja inferior. `visible` y `onCerrar` la controlan; `titulo` y `texto` arriba; `children` en
 * el medio; `acciones` (por ejemplo dos <Boton alto className="flex-1">) en una fila al final.
 */
export function Hoja({
  visible,
  onCerrar,
  titulo,
  texto,
  children,
  acciones,
}: {
  visible: boolean;
  onCerrar: () => void;
  titulo?: string;
  texto?: string;
  children?: ReactNode;
  acciones?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { c } = useTema();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      {/* El Modal se pinta fuera del árbol de la raíz en Android: el fondo va con el hexadecimal. */}
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <Pressable className="flex-1" accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onCerrar} />
        <View
          accessibilityViewIsModal
          className="rounded-t-hoja border-t px-4 pt-5"
          style={{ backgroundColor: c.sup, borderColor: c['sup-alta'], paddingBottom: 28 + insets.bottom }}
        >
          {titulo ? (
            <Txt v="h3" accessibilityRole="header">
              {titulo}
            </Txt>
          ) : null}
          {texto ? (
            <Txt v="sec" className="mt-2">
              {texto}
            </Txt>
          ) : null}
          {children}
          {acciones ? <View className="mt-5 flex-row gap-2">{acciones}</View> : null}
        </View>
      </View>
    </Modal>
  );
}
