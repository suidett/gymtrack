// ─────────────────────────────────────────────────────────────────────────────
// PanelDescanso · Zona: Sesión
//
// Qué hace: la tarjeta de descanso que aparece en el pie de la bitácora después de marcar una serie:
// los segundos que faltan, una barra que se va vaciando, qué serie viene y los botones "+30 s" y "Saltar".
// Tócalo cuando: cambies cómo se ve el descanso o qué botones ofrece.
// No lo toques para: contar el tiempo o decidir cuándo empieza y termina el descanso; eso es de Bitacora.tsx,
// que le pasa `restante` ya calculado cada segundo. La vibración al terminar está en utilidades.ts.
// Depende de: @gymtrack/shared (fmtDuracion), @/components/ui (Boton).
// ─────────────────────────────────────────────────────────────────────────────
import { fmtDuracion } from '@gymtrack/shared';
import { Text, View } from 'react-native';
import { Boton } from '@/components/ui';

/**
 * Panel visual del descanso. Es tonto a propósito: no tiene reloj propio.
 * Recibe `restante` y `total` en segundos, el texto `siguiente` ("Siguiente: serie 2 · Sentadilla"),
 * `onMas` (suma 30 s) y `onSaltar` (termina el descanso ahora). Muestra la tarjeta con la cuenta regresiva.
 */
export function PanelDescanso({
  restante,
  total,
  siguiente,
  onMas,
  onSaltar,
}: {
  restante: number;
  total: number;
  siguiente: string;
  onMas: () => void;
  onSaltar: () => void;
}) {
  // La barra muestra lo que falta, no lo que pasó: parte llena y se vacía. Con total 0 no hay descanso
  // que dibujar, y el Math.min cubre el instante en que restante pueda quedar por encima de total.
  const pct = total > 0 ? Math.min(100, Math.round((restante / total) * 100)) : 0;
  return (
    <View className="mb-3 rounded-card bg-accent-soft p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text className="font-mono text-[11px] uppercase tracking-widest text-accent-deep">Descanso</Text>
          <Text className="font-mono-semibold text-4xl text-accent-deep">{fmtDuracion(restante)}</Text>
        </View>
        <View className="gap-2">
          <Boton titulo="+30 s" variante="fantasma" chico onPress={onMas} />
          <Boton titulo="Saltar" variante="acento" chico onPress={onSaltar} />
        </View>
      </View>
      <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/60">
        <View className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </View>
      <Text className="mt-2 font-sans text-xs text-accent-deep">{siguiente}</Text>
    </View>
  );
}
