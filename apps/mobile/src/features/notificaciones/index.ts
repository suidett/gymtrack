// ─────────────────────────────────────────────────────────────────────────────
// Puerta de la campana · Zona: Notificaciones (app)
//
// Qué hace: lo que las otras áreas y las rutas usan de las notificaciones dentro de la app: la
// Campana (para la barra de arriba de Hoy y de Clientes), la PantallaNotificaciones (la monta la
// ruta src/app/notificaciones.tsx) y, si hiciera falta en otra pantalla, el store y su hook.
// Tócalo cuando: otra pantalla necesite algo más de la campana.
// No lo toques para: cambiar cómo funciona algo (va en su archivo).
// Depende de: los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export { Campana, IconoCampana } from './Campana';
export { PantallaNotificaciones } from './PantallaNotificaciones';
export { almacenNotificaciones, useNotificaciones, useNotificacionesEnVivo } from './instancia';
