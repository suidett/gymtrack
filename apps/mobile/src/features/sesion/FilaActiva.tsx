// ─────────────────────────────────────────────────────────────────────────────
// FilaActiva · Zona: Sesión
//
// Qué hace: la fila destacada de la serie que el alumno está registrando ahora: kilos y reps con botones
// grandes, el RIR de 0 a 4, y los botones "Serie hecha" y "Fallé" (o "Guardar cambios" y "Sin fallo"
// cuando está corrigiendo una serie ya hecha).
// Tócalo cuando: cambies qué se registra en una serie (otro campo, otro rango de RIR) o cómo se ve la fila.
// No lo toques para: guardar el dato o marcar la serie; eso lo hace el store a través de los callbacks que
// le pasa Bitacora.tsx. Las filas que no se editan son FilaSet.tsx.
// Depende de: @gymtrack/shared (fmtNum, WorkoutSet), @/components/ui (Boton, Stepper).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtNum, type WorkoutSet } from '@gymtrack/shared';
import { Pressable, Text, View } from 'react-native';
import { Boton, Stepper } from '@/components/ui';

/**
 * Fila en edición de una serie.
 * Recibe la serie (`set`), `esTiempo` (el ejercicio se mide en segundos, no en reps), `pasoKg` (cuánto suma
 * o resta cada toque en kilos) y cuatro callbacks: `onCambio` con el parche del dato que cambió, `onMarcar`
 * (serie hecha, o guardar cambios si ya estaba hecha), `onFallo` (hecha pero no llegó) y `onLimpiarFallo`.
 * Muestra la tarjeta destacada. Cada cambio se guarda al toque: no hay botón de aceptar por campo.
 */
export function FilaActiva({
  set,
  esTiempo,
  pasoKg,
  onCambio,
  onMarcar,
  onFallo,
  onLimpiarFallo,
}: {
  set: WorkoutSet;
  esTiempo: boolean;
  pasoKg: number;
  onCambio: (p: Partial<WorkoutSet>) => void;
  onMarcar: () => void;
  onFallo: () => void;
  onLimpiarFallo: () => void;
}) {
  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View className="my-1 rounded-card border border-primary bg-primary-soft p-3">
      {/* Título: número de serie y, si se está corrigiendo, el estado que ya tenía */}
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-[11px] uppercase tracking-widest text-primary-deep">
          Serie {set.serieN}
          {set.completada ? ' · editando' : ''}
        </Text>
        {set.completada ? (
          <Text className="font-sans-semibold text-xs text-primary-deep">{set.fallo ? 'hecha con fallo' : 'hecha'}</Text>
        ) : null}
      </View>
      {/* Kilos. En ejercicios de tiempo el peso es lastre (chaleco, disco), por eso cambia la etiqueta */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'kg (lastre)' : 'kg'}</Text>
        <Stepper grande editable valor={set.pesoKg} onCambio={(v) => onCambio({ pesoKg: v })} paso={pasoKg} min={0} max={999} formato={(v) => fmtNum(v)} />
      </View>
      {/* Reps o segundos. Se redondea porque el Stepper editable acepta decimales al escribir la cifra */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-mono text-xs text-ink-muted">{esTiempo ? 'segundos' : 'reps'}</Text>
        <Stepper grande editable valor={set.reps} onCambio={(v) => onCambio({ reps: Math.round(v) })} paso={esTiempo ? 5 : 1} min={0} max={999} />
      </View>
      {/* RIR (reps en reserva). Tocar el número ya elegido lo deja en null: se puede dejar sin registrar */}
      <View className="mt-3 flex-row items-center gap-2">
        <Text className="w-12 font-mono text-xs text-ink-muted">RIR</Text>
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <Pressable
            key={r}
            accessibilityLabel={`RIR ${r}`}
            onPress={() => onCambio({ rir: set.rir === r ? null : r })}
            className={`h-9 w-9 items-center justify-center rounded-full ${set.rir === r ? 'bg-primary' : 'border border-line bg-white'}`}
          >
            <Text className={`font-mono-semibold text-sm ${set.rir === r ? 'text-white' : 'text-ink'}`}>{r}</Text>
          </Pressable>
        ))}
      </View>
      {/* Botones. "Fallé" también marca la serie como hecha, pero con la bandera de fallo encendida */}
      <View className="mt-3 flex-row gap-2">
        <Boton titulo={set.completada ? 'Guardar cambios' : 'Serie hecha'} className="flex-1" onPress={onMarcar} />
        {set.completada && set.fallo ? (
          <Boton titulo="Sin fallo" variante="secundario" onPress={onLimpiarFallo} />
        ) : (
          <Boton titulo="Fallé" variante="peligro" onPress={onFallo} />
        )}
      </View>
    </View>
  );
}
