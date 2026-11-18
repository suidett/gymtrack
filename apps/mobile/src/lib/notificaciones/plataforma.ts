// ─────────────────────────────────────────────────────────────────────────────
// Avisos en el teléfono (Android) · Zona: Notificaciones (app)
//
// Qué hace: lo que la app nativa necesita de expo-notifications para recibir push:
//   - crea el canal de Android «avisos» (Android 13 no muestra la pregunta de permiso sin un
//     canal), con importancia alta; la API manda cada push a ese canal;
//   - pide el permiso y saca el token de Expo con el projectId de EAS;
//   - muestra el aviso aunque la app esté abierta (banner, lista y sonido).
// En Expo Go de Android no llegan push remotos: hace falta el APK de EAS (perfil preview).
// En la versión web Metro usa ./plataforma.web.ts en vez de este archivo.
// Tócalo cuando: cambie el canal, el sonido o cómo se saca el token.
// No lo toques para: el flujo de activar (./registro.ts).
// Depende de: expo-notifications, expo-constants y react-native.
// ─────────────────────────────────────────────────────────────────────────────
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlataformaAvisos, Permiso } from './registro';

/** El mismo canal que usa la API (CANAL_ANDROID en apps/api/src/modulos/notificaciones/proveedores.ts). */
export const CANAL_ANDROID = 'avisos';

// Con la app abierta el aviso igual se ve: sin esto expo-notifications no muestra nada.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

async function prepararCanal(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Avisos',
    description: 'Alertas de tus alumnos, mensajes de tu entrenador, rutinas y recordatorios.',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#F5B83D',
  });
}

function projectIdDeEas(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

async function leerPermiso(): Promise<Permiso> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return 'no_disponible';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'concedido';
  return p.canAskAgain ? 'sin_pedir' : 'denegado';
}

export const plataforma: PlataformaAvisos = {
  nombre: Platform.OS === 'ios' ? 'ios' : 'android',
  permiso: leerPermiso,
  async pedirPermiso() {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return 'no_disponible';
    await prepararCanal();
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return 'concedido';
    if (!actual.canAskAgain) return 'denegado';
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'concedido' : 'denegado';
  },
  async destino() {
    await prepararCanal();
    const projectId = projectIdDeEas();
    // Sin projectId (falta `eas init`) Expo no puede dar un token: se ve como error al activar.
    if (!projectId) throw new Error('Falta extra.eas.projectId en app.json (corre `npx eas-cli@latest init`).');
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { tipo: 'expo', token: data, plataforma: Platform.OS === 'ios' ? 'ios' : 'android' };
  },
  async olvidar() {
    // El token de Expo sigue sirviendo para otra cuenta: basta con borrarlo en la API.
  },
};
