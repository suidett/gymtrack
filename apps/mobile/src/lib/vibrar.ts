// ─────────────────────────────────────────────────────────────────────────────
// Vibraciones de la marca · Zona: Utilidades
//
// Qué hace: las vibraciones que pide tokens.json (movimiento): presionar un botón, cambiar una
// cifra, chocar con un límite, marcar una serie y cambiar un interruptor. En web no hace nada.
// Tócalo cuando: cambie qué vibración lleva un gesto.
// No lo toques para: animaciones (cada pieza de components/ui las define).
// Depende de: expo-haptics y react-native (Platform).
// ─────────────────────────────────────────────────────────────────────────────
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const activo = Platform.OS !== 'web';
const nada = () => {};

/** Al presionar un botón: impacto liviano; «Empezar entrenamiento» usa el medio. */
export function vibrarPresion(fuerte = false) {
  if (!activo) return;
  Haptics.impactAsync(fuerte ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(nada);
}

/** Al cambiar una cifra con más o menos, o un interruptor. */
export function vibrarSeleccion() {
  if (!activo) return;
  Haptics.selectionAsync().catch(nada);
}

/** Al chocar con el mínimo o el máximo. */
export function vibrarLimite() {
  if (!activo) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(nada);
}

/** Al marcar una serie hecha o terminar de guardar. */
export function vibrarConfirmar() {
  if (!activo) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(nada);
}
