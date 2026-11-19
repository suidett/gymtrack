// ─────────────────────────────────────────────────────────────────────────────
// Dirección del visor 3D · Zona: Componentes (app)
//
// Qué hace: arma la dirección de la página que dibuja el maniquí 3D de un ejercicio de la
// biblioteca (docs/pantallas/3d/ver.html, publicada en el sitio de las maquetas). La comparten
// VisorEjercicio3D.tsx (Android) y VisorEjercicio3D.web.tsx (iPhone y navegador).
// Tócalo cuando: la página del visor cambie de lugar (o EXPO_PUBLIC_URL_3D en el entorno).
// No lo toques para: cómo se ve el visor (ver.html y ./VisorEjercicio3D).
// ─────────────────────────────────────────────────────────────────────────────

const BASE = process.env.EXPO_PUBLIC_URL_3D || 'https://gymtrack-5dd46.web.app/3d/ver.html';

/** Fondo del visor mientras carga: el mismo --sup de la marca, así no parpadea en blanco. */
export const FONDO_VISOR_3D = '#1A1D20';

/** La página del visor para un ejercicio de la biblioteca (`press-de-banca`). */
export function urlVisor3D(slug: string): string {
  return `${BASE}#ej=${encodeURIComponent(slug)}`;
}
