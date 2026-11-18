// ─────────────────────────────────────────────────────────────────────────────
// Utilidades del entrenador · Zona: Entrenador (app)
//
// Qué hace: la hora actual fuera del cuerpo de los componentes (regla de pureza del compilador
// de React), copiar al portapapeles y abrir el menú de compartir del teléfono.
// Tócalo cuando: se instale expo-clipboard (reemplaza el Clipboard de react-native, que está en
// desuso pero sigue incluido en la versión actual).
// No lo toques para: textos o cálculos (logica.ts).
// Depende de: react-native (Clipboard, Platform, Share).
// ─────────────────────────────────────────────────────────────────────────────
import { Clipboard, Platform, Share } from 'react-native';

export const ahoraMs = (): number => Date.now();
export const ahoraFecha = (): Date => new Date();

/** Copia un texto. En web usa el portapapeles del navegador. */
export async function copiarTexto(texto: string): Promise<void> {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(texto);
    return;
  }
  Clipboard.setString(texto);
}

/** Abre el menú de compartir con el texto. Devuelve false si la persona lo cerró o falló. */
export async function compartirTexto(texto: string): Promise<boolean> {
  try {
    const r = await Share.share({ message: texto });
    return r.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
