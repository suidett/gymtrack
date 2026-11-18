// ─────────────────────────────────────────────────────────────────────────────
// Barra de avance por segmentos · Zona: Kit de interfaz
//
// Qué hace: la barra de sistema.css (.avance): un segmento de 6 dp por paso, separados 3 dp; los
// hechos en ámbar, el actual con el color del texto y los que faltan en superficie alta. Sirve
// para la encuesta (pregunta 3 de 10), los ejercicios de la sesión y la semana de la rutina.
// Tócalo cuando: cambie cómo se ve el avance en toda la app.
// No lo toques para: gráficos de progreso (eso es del área Progreso).
// Depende de: react-native.
// ─────────────────────────────────────────────────────────────────────────────
import { View } from 'react-native';

/**
 * `total` segmentos; los primeros `hechos` van llenos. `actual` (índice desde 0) marca el que
 * está en curso; si no lo pasas no se marca ninguno. `etiqueta` es lo que lee el lector.
 */
export function Avance({ total, hechos, actual, etiqueta }: { total: number; hechos: number; actual?: number; etiqueta?: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 0, max: total, now: hechos }}
      className="flex-row gap-[3px]"
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          className={`h-1.5 flex-1 rounded-[1px] ${i === actual ? 'bg-texto' : i < hechos ? 'bg-hecho-fondo' : 'bg-sup-alta'}`}
        />
      ))}
    </View>
  );
}
