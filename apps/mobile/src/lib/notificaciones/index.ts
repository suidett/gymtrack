// ─────────────────────────────────────────────────────────────────────────────
// Puerta de los avisos al celular · Zona: Notificaciones (app)
//
// Qué hace: lo que las pantallas usan para los push, ya armado con la plataforma que toca
// (expo-notifications en Android, el Push API en la web), la sesión de la API y AsyncStorage
// para el id del registro:
//   useAvisos()           para Perfil: { estado, mensaje, ocupado, activar, desactivar }. El
//                         botón «Activar avisos» llama a `activar` directo en su onPress (en el
//                         iPhone el permiso solo sale desde un toque).
//   activarAvisos()       lo mismo sin React; devuelve { estado, mensaje } y nunca lanza.
//   renovarAvisos()       al abrir la app o al ingresar: registra de nuevo si ya hay permiso.
//   desactivarAvisos()    al apagar los avisos (al cerrar sesión ya lo hace la sesión sola).
//   probarAvisos(correo)  pide un aviso de prueba (el entrenador, para la demostración).
//   useAbrirAvisos(nav)   en el layout raíz: abre la pantalla del aviso que se tocó.
// Tócalo cuando: una pantalla necesite algo más de los avisos.
// No lo toques para: el flujo (./registro.ts) ni lo de cada plataforma (./plataforma*.ts).
// Depende de: los archivos de esta carpeta (./instancia arma el servicio).
// ─────────────────────────────────────────────────────────────────────────────
export { activarAvisos, avisos, desactivarAvisos, estadoAvisos, plataformaDeAvisos, probarAvisos, renovarAvisos } from './instancia';
export { useAbrirAvisos } from './toques';
export { useAvisos } from './useAvisos';
export { mensajeDeEstado, mensajeDePrueba, type EstadoAvisos, type ResultadoAvisos } from './registro';
