// ─────────────────────────────────────────────────────────────────────────────
// Stepper · Zona: Kit de interfaz
//
// Qué hace: el control de menos y más para números: series, repeticiones, RIR, descanso en
// segundos y, en la bitácora, el peso de cada serie. Sube y baja de a un paso, respeta un mínimo
// y un máximo, y si es editable deja tocar la cifra y escribirla directo.
// Tócalo cuando: quieras cambiar cómo se ve o se siente (tamaño de los botones, la cifra, el
// redondeo) o cómo confirma lo que se escribió a mano.
// No lo toques para: decidir el paso o los límites de cada dato (eso lo pasa cada pantalla; el
// incremento por ejercicio sale de la biblioteca en packages/shared) ni para formatear kilos
// (fmtKg en packages/shared).
// Depende de: parseNumero de src/lib/tiempo.ts (convierte "47,5" a número).
// ─────────────────────────────────────────────────────────────────────────────
import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { parseNumero } from '@/lib/tiempo';

// ── Componente ───────────────────────────────────────────────────────────────
/**
 * Control numérico con botones de menos y más.
 * Recibe `valor` y `onCambio` (se llama con el número nuevo, ya acotado a min y max), `paso` (por
 * defecto 1; puede ser decimal, como 0.5 kg), `min` y `max`, `formato` para mostrar la cifra con
 * unidad ("80 kg", "90 s"), `grande` para la versión de la bitácora y `editable` para poder tocar
 * la cifra y escribirla.
 * Con editable no se aplica `formato`: se muestra el número pelado, con coma decimal.
 */
export function Stepper({
  valor,
  onCambio,
  paso = 1,
  min = 0,
  max = 9999,
  formato,
  grande = false,
  editable = false,
}: {
  valor: number;
  onCambio: (v: number) => void;
  paso?: number;
  min?: number;
  max?: number;
  formato?: (v: number) => string;
  grande?: boolean;
  /** Permite tocar la cifra y escribirla, para no dar 32 toques hasta llegar a 80 kg. */
  editable?: boolean;
}) {
  // Redondea a dos decimales para que sumar 0.1 varias veces no deje 0.30000000000000004.
  const redondear = (n: number) => Math.round(n * 100) / 100;
  // Lo que se va tecleando en la cifra editable. Es una ref y no estado porque no hace falta
  // redibujar con cada tecla: se lee entero al confirmar. null significa "nada pendiente".
  const borrador = useRef<string | null>(null);
  // Corre al salir del campo o al apretar enter. Un texto vacío o inválido se descarta y la cifra
  // vuelve a lo que estaba; uno válido se redondea y se acota antes de avisar.
  const confirmar = () => {
    if (borrador.current == null) return;
    const n = parseNumero(borrador.current);
    borrador.current = null;
    if (n != null) onCambio(Math.min(max, Math.max(min, redondear(n))));
  };
  // Clases para los dos tamaños: el normal para los editores y el grande para la bitácora, donde
  // el alumno toca entre series con las manos cansadas.
  // Si hay una cifra escrita y todavía no confirmada, + y − parten de ella y no del valor viejo.
  const base = () => {
    if (borrador.current == null) return valor;
    const n = parseNumero(borrador.current);
    borrador.current = null;
    return n ?? valor;
  };
  const btn = `items-center justify-center rounded-full bg-primary-soft active:opacity-70 ${grande ? 'h-14 w-14' : 'h-10 w-10'}`;
  const txt = `font-sans-bold text-primary-deep ${grande ? 'text-2xl' : 'text-lg'}`;
  const cifra = `text-center font-mono-semibold text-ink ${grande ? 'min-w-[96px] text-3xl' : 'min-w-[64px] text-lg'}`;
  return (
    <View className="flex-row items-center gap-2">
      {/* El signo de menos es el tipográfico (U+2212), no el guion: mide lo mismo que el más. */}
      <Pressable accessibilityLabel={`bajar ${paso}`} className={btn} onPress={() => onCambio(Math.max(min, redondear(base() - paso)))}>
        <Text className={txt}>−</Text>
      </Pressable>
      {/* La key vuelve a montar el campo cuando el valor cambia desde afuera (los botones, otra
          serie): así defaultValue muestra la cifra nueva sin tener que volverlo controlado. */}
      {editable ? (
        <TextInput
          key={valor}
          defaultValue={String(valor).replace('.', ',')}
          onChangeText={(t) => {
            borrador.current = t;
          }}
          onBlur={confirmar}
          onSubmitEditing={confirmar}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel="escribir el valor"
          className={`${cifra} rounded-field border border-line bg-surface px-2 py-1`}
        />
      ) : (
        <Text className={cifra}>{formato ? formato(valor) : String(valor).replace('.', ',')}</Text>
      )}
      <Pressable accessibilityLabel={`subir ${paso}`} className={btn} onPress={() => onCambio(Math.min(max, redondear(base() + paso)))}>
        <Text className={txt}>+</Text>
      </Pressable>
    </View>
  );
}
