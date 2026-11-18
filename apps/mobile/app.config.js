// ─────────────────────────────────────────────────────────────────────────────
// Configuración dinámica de la app · Zona: Configuración (app)
//
// Qué hace: parte de app.json (todo lo fijo vive ahí) y suma lo que depende de archivos o
// variables que no siempre están:
//   android.googleServicesFile  el google-services.json de Firebase (FCM, para los push de
//                               Android). Se usa la variable GOOGLE_SERVICES_JSON si existe (EAS la
//                               crea con `eas env:create --type file`) o apps/mobile/google-services.json
//                               si el dueño lo descargó ahí. Sin ninguno de los dos el APK se arma
//                               igual, pero no recibe push (Activar avisos muestra el error).
//   extra.eas.projectId         el proyecto de EAS. Lo normal es que esté en app.json (`eas init`
//                               lo muestra; con este archivo hay que pegarlo a mano en app.json).
//                               También se acepta la variable EAS_PROJECT_ID.
// Tócalo cuando: algo de la configuración dependa del entorno.
// No lo toques para: el nombre, los íconos, los plugins o el esquema (van en app.json).
// Depende de: app.json (Expo lo pasa como `config`).
// ─────────────────────────────────────────────────────────────────────────────
const { existsSync } = require('node:fs');
const { join } = require('node:path');

/** El google-services.json que toca, o undefined si no hay. */
function archivoDeFirebase() {
  const deEas = process.env.GOOGLE_SERVICES_JSON;
  if (deEas && existsSync(deEas)) return deEas;
  if (existsSync(join(__dirname, 'google-services.json'))) return './google-services.json';
  return undefined;
}

module.exports = ({ config }) => {
  const googleServicesFile = archivoDeFirebase();
  const projectId = config.extra?.eas?.projectId ?? (process.env.EAS_PROJECT_ID || undefined);
  return {
    ...config,
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
    extra: { ...config.extra, ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}) },
  };
};
