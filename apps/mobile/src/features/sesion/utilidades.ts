// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de la sesión · Zona: Sesión
//
// Qué hace: las ayudas chicas de la bitácora que hablan con el celular y no con React: leer la hora,
// avisar con vibración cuando termina el descanso y el nombre con el que se pide que la pantalla no se apague.
// Tócalo cuando: quieras cambiar cómo se avisa el fin del descanso (patrón de vibración, tipo de toque)
// o necesites otra ayuda pura que usen varias piezas de la sesión.
// No lo toques para: contar el descanso o decidir cuándo empieza y termina; eso vive en Bitacora.tsx.
// Depende de: nada propio (solo expo-haptics y react-native).
// ─────────────────────────────────────────────────────────────────────────────
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/**
 * Hora actual en milisegundos (lo mismo que Date.now()).
 * Envuelto fuera del componente: la regla de pureza del compilador de React no admite Date.now() en el cuerpo.
 */
export function ahoraMs(): number {
  return Date.now();
}

/**
 * Etiqueta con la que Bitacora.tsx pide mantener la pantalla encendida mientras corre el descanso.
 * Activar y desactivar tienen que usar la misma etiqueta; si no, expo-keep-awake nunca la suelta.
 */
export const KEEP_AWAKE_DESCANSO = 'gymtrack-descanso';

/**
 * Avisa que terminó el descanso: dos vibraciones largas más el toque de "éxito" del sistema.
 * En web no hace nada (no hay motor de vibración). No recibe nada ni devuelve nada.
 */
export function avisarFinDescanso() {
  if (Platform.OS === 'web') return;
  // [espera, vibra, espera, vibra] en milisegundos: vibra 300 ms, pausa 150 ms y vibra otros 300 ms.
  Vibration.vibrate([0, 300, 150, 300]);
  // El háptico es un extra: si el aparato no lo soporta, el aviso ya salió por la vibración.
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
