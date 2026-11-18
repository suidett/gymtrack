// ─────────────────────────────────────────────────────────────────────────────
// Chips · Zona: Kit de interfaz
//
// Qué hace: las opciones tocables de sistema.css (.chip): 48 dp de toque con 40 dp visibles,
// borde de 2 dp, radio 8. Por defecto la letra es la cifra (JetBrains Mono 700, para RIR o
// repeticiones); con `texto` es Archivo 600. El elegido se pinta con el texto del tema de fondo.
// `Chips` es el grupo donde queda una sola elegida.
// Tócalo cuando: cambie cómo se ve una opción elegible en toda la app.
// No lo toques para: filtros con varias elegidas a la vez (arma la lista con <Chip> sueltos).
// Depende de: react-native y ../../lib/vibrar.
// ─────────────────────────────────────────────────────────────────────────────
import { Pressable, Text, View } from 'react-native';
import { vibrarSeleccion } from '@/lib/vibrar';

// ── Una opción ───────────────────────────────────────────────────────────────
/**
 * Una opción. `titulo` es lo que dice, `activo` si está elegida. `texto` la escribe en Archivo
 * (para palabras); sin él va en mono (para cifras). `ancho` la estira a lo que sobre (fila de RIR).
 */
export function Chip({
  titulo,
  activo,
  onPress,
  texto = true,
  ancho = false,
  etiqueta,
}: {
  titulo: string;
  activo: boolean;
  onPress: () => void;
  texto?: boolean;
  ancho?: boolean;
  /** Lo que lee el lector de pantalla si el título no alcanza («RIR 2»). */
  etiqueta?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        vibrarSeleccion();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? titulo}
      accessibilityState={{ selected: activo }}
      className={`h-12 justify-center py-1 ${ancho ? 'flex-1' : ''}`}
    >
      {({ pressed }) => (
        <View
          className={`h-10 items-center justify-center rounded-control border-2 ${texto ? 'px-3.5' : 'px-2'} ${
            activo ? 'border-chip-fondo bg-chip-fondo' : pressed ? 'border-borde bg-fantasma-pres' : 'border-borde bg-transparent'
          }`}
        >
          <Text
            className={`${texto ? 'font-sans-semibold text-[15px]' : 'font-mono-bold text-[16px]'} ${activo ? 'text-chip-texto' : 'text-texto'}`}
          >
            {titulo}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Grupo ────────────────────────────────────────────────────────────────────
/**
 * Fila de chips donde una sola queda elegida. `opciones` es una lista de { id, nombre }; `valor`
 * el id elegido; `onCambio` recibe el id tocado. `cifras` las escribe en mono y las estira
 * (fila de RIR 0 a 4); sin él son palabras y bajan de línea si no caben.
 */
export function Chips<T extends string>({
  opciones,
  valor,
  onCambio,
  cifras = false,
}: {
  opciones: readonly { id: T; nombre: string }[];
  valor: T;
  onCambio: (v: T) => void;
  cifras?: boolean;
}) {
  return (
    <View className={`flex-row gap-2 ${cifras ? '' : 'flex-wrap'}`}>
      {opciones.map((o) => (
        <Chip key={o.id} titulo={o.nombre} texto={!cifras} ancho={cifras} activo={o.id === valor} onPress={() => onCambio(o.id)} />
      ))}
    </View>
  );
}
