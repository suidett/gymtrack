// ─────────────────────────────────────────────────────────────────────────────
// Puerta del área Entrenador · Zona: Entrenador (app)
//
// Qué hace: junta lo que las rutas del entrenador (src/app/entrenador/*, src/app/cliente/[id]/*)
// importan de esta carpeta: sus cinco pantallas y la cuenta de alertas nuevas para la insignia.
// Tócalo cuando: agregues una pantalla del entrenador.
// No lo toques para: cambiar una pantalla (va en su archivo).
// Depende de: los archivos de esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
export { PantallaClientes } from './PantallaClientes';
export { PantallaFicha } from './PantallaFicha';
export { PantallaAlertas } from './PantallaAlertas';
export { PantallaAjustarCargas } from './PantallaAjustarCargas';
export { PantallaPerfilEntrenador } from './PantallaPerfilEntrenador';
export { useInsigniaAlertas } from './instancia';
