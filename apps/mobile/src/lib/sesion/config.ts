// ─────────────────────────────────────────────────────────────────────────────
// Dirección de la API · Zona: Sesión de cuenta
//
// Qué hace: decide a qué servidor habla la app. Sale de EXPO_PUBLIC_API_URL (en .env o en el
// perfil de eas.json); si no está, usa la API local en el puerto 3000. En el emulador de Android,
// localhost es el propio emulador, por eso ahí el valor por defecto es 10.0.2.2.
// Tócalo cuando: cambie el puerto local o cómo se elige el servidor.
// No lo toques para: cambiar una ruta (packages/shared/src/api/).
// Depende de: react-native (Platform).
// ─────────────────────────────────────────────────────────────────────────────
import { Platform } from 'react-native';

/** Quita la barra final para que `${URL_API}/v1/me` no quede con dos barras. */
export function normalizarUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

const porDefecto = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

/** Origen de la API, sin barra final. Expo reemplaza EXPO_PUBLIC_* al empaquetar. */
export const URL_API = normalizarUrl(process.env.EXPO_PUBLIC_API_URL || porDefecto);
