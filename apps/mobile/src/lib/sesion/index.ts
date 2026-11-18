// ─────────────────────────────────────────────────────────────────────────────
// Puerta de la sesión de cuenta · Zona: Sesión de cuenta
//
// Qué hace: junta lo que las pantallas usan de la sesión: useSesion, el gestor `api` (con
// `api.llamar` para cualquier ruta autenticada), la URL de la API y las ayudas de errores.
// Tócalo cuando: agregues un archivo a esta carpeta que las pantallas necesiten.
// No lo toques para: cambiar cómo funciona algo (va en su archivo).
// Depende de: los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export * from './SesionProvider';
export { URL_API } from './config';
export { esSinConexion, aErrorDeApi, type GestorSesion, type MotivoCierre, type OpcionesLlamada } from './gestor';
export { ErrorDeApi } from '@gymtrack/shared';
