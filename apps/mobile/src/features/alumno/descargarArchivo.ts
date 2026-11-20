// ─────────────────────────────────────────────────────────────────────────────
// Bajar un archivo de la API · Zona: Alumno (Perfil, exportar mis datos)
//
// Qué hace: en el teléfono (APK) abre la URL firmada en el navegador, que baja el ZIP y lo deja
// en Descargas. La versión web vive en descargarArchivo.web.ts.
// Tócalo cuando: cambie cómo se entrega el archivo en el teléfono.
// No lo toques para: la web (descargarArchivo.web.ts) ni cómo se pide la URL (./api, exportarDatos).
// Depende de: react-native (Linking).
// ─────────────────────────────────────────────────────────────────────────────
import { Linking } from 'react-native';

/** Abre la URL firmada: el navegador del teléfono baja el archivo. */
export async function descargarArchivo(url: string, _nombre: string): Promise<void> {
  await Linking.openURL(url);
}
