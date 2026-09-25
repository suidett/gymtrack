import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

/** Envuelto fuera del componente: la regla de pureza del compilador de React no admite Date.now() en el cuerpo. */
export function ahoraMs(): number {
  return Date.now();
}

export const KEEP_AWAKE_DESCANSO = 'gymtrack-descanso';

export function avisarFinDescanso() {
  if (Platform.OS === 'web') return;
  Vibration.vibrate([0, 300, 150, 300]);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
