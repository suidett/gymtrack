// ─────────────────────────────────────────────────────────────────────────────
// FilaSet · Zona: Sesión
//
// Qué hace: una fila de la tabla de series que no se está editando. Muestra número, kilos, reps y RIR
// y, a la derecha, el estado: hecha (visto), hecha con fallo (signo), pendiente (círculo vacío) o el botón
// para quitarla. Al tocarla, la bitácora la convierte en la fila activa para corregirla.
// Tócalo cuando: cambies qué columnas se ven, cómo se ve una serie hecha o con fallo, o el botón de quitar.
// No lo toques para: la fila en edición (FilaActiva.tsx) ni la regla de cuándo se puede quitar una serie;
// eso lo decide Bitacora.tsx y llega ya resuelto en onQuitar.
// Depende de: @gymtrack/shared (fmtNum, WorkoutSet).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum, type WorkoutSet } from '@gymtrack/shared';
import { Pressable, Text, View } from 'react-native';

/**
 * Fila de solo lectura de una serie.
 * Recibe la serie (`set`), `onPress` para pasar a editarla y, opcionalmente, `onQuitar`: si viene, aparece
 * el botón de quitar en lugar del círculo de pendiente. Muestra una fila de la tabla.
 * Los anchos de columna (w-12, flex-1, flex-1, w-14, w-10) tienen que calzar con la fila de títulos de
 * Bitacora.tsx; si cambias uno, cambia el otro.
 */
export function FilaSet({ set, onPress, onQuitar }: { set: WorkoutSet; onPress: () => void; onQuitar?: () => void }) {
  const hecha = set.completada;
  // Las pendientes van en gris claro para que la vista caiga en lo que ya se hizo.
  const color = hecha ? 'text-ink' : 'text-ink-faint';
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`editar serie ${set.serieN}`}
      className="flex-row items-center border-t border-line px-1 py-2.5 active:opacity-70"
    >
      <Text className={`w-12 font-mono text-sm ${color}`}>{set.serieN}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{fmtNum(set.pesoKg)}</Text>
      <Text className={`flex-1 font-mono-medium text-base ${color}`}>{set.reps}</Text>
      <Text className={`w-14 font-mono text-sm ${color}`}>{set.rir ?? '–'}</Text>
      {/* Estado a la derecha: visto o signo si está hecha; si no, quitar (cuando se puede) o el círculo vacío.
          hitSlop agranda la zona de toque del botón de quitar sin agrandar el dibujo. */}
      <View className="w-10 items-end">
        {hecha ? (
          <View className={`h-7 w-7 items-center justify-center rounded-full ${set.fallo ? 'bg-danger-soft' : 'bg-primary'}`}>
            <Text className={`font-sans-bold text-xs ${set.fallo ? 'text-danger' : 'text-white'}`}>{set.fallo ? '!' : '✓'}</Text>
          </View>
        ) : onQuitar ? (
          <Pressable onPress={onQuitar} hitSlop={8} accessibilityLabel="quitar serie" className="h-7 w-7 items-center justify-center rounded-full bg-field">
            <Text className="font-sans-bold text-xs text-ink-muted">×</Text>
          </Pressable>
        ) : (
          <View className="h-7 w-7 rounded-full border border-line" />
        )}
      </View>
    </Pressable>
  );
}
