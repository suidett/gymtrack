// ─────────────────────────────────────────────────────────────────────────────
// Páginas legales · Zona: Acceso
//
// Qué hace: abre los términos de uso o la política de privacidad si app.json los define en
// `extra` (urlTerminos, urlPrivacidad); si no, avisa que todavía no están. Lo usan Crear cuenta,
// «Completa tu cuenta» (después de Google) y la Encuesta.
// Tócalo cuando: cambie dónde viven esas direcciones.
// No lo toques para: el texto que las enlaza (cada pantalla).
// Depende de: expo-constants y react-native (Linking).
// ─────────────────────────────────────────────────────────────────────────────
import Constants from 'expo-constants';
import { Linking } from 'react-native';

/** Abre una página legal si app.json la define en `extra`; si no, avisa que todavía no está. */
export function abrirLegal(clave: 'urlTerminos' | 'urlPrivacidad', avisar: (t: string) => void) {
  const url = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[clave];
  if (typeof url === 'string' && url) {
    Linking.openURL(url).catch(() => avisar('No pudimos abrir la página. Intenta de nuevo.'));
    return;
  }
  avisar(clave === 'urlTerminos' ? 'Los términos de uso se publican antes de la primera prueba.' : 'La política de privacidad se publica antes de la primera prueba.');
}
