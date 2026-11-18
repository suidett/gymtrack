// ─────────────────────────────────────────────────────────────────────────────
// Instancia de los avisos de la app · Zona: Notificaciones (app)
//
// Qué hace: arma una sola vez el servicio de avisos con la plataforma que toca (Metro elige
// ./plataforma.ts en Android y ./plataforma.web.ts en la web), la sesión de la API (api.llamar
// pone el token y lo renueva) y AsyncStorage para el id del registro, que no es un secreto.
// También le pide a la sesión que, antes de cerrarla, borre este teléfono en la API.
// Tócalo cuando: cambie dónde se guarda el id o con qué se llama a la API.
// No lo toques para: el flujo (./registro.ts).
// Depende de: @react-native-async-storage/async-storage, @/lib/sesion y esta carpeta.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/lib/sesion';
import { plataforma } from './plataforma';
import { crearAvisos, type MemoriaAvisos } from './registro';

const CLAVE = 'gymtrack.avisos.dispositivo';

const memoria: MemoriaAvisos = {
  leer: () => AsyncStorage.getItem(CLAVE),
  guardar: (v) => AsyncStorage.setItem(CLAVE, v),
  borrar: () => AsyncStorage.removeItem(CLAVE),
};

/** El servicio de avisos de la app (uno solo). */
export const avisos = crearAvisos({
  plataforma,
  memoria,
  // `api` se lee al llamar, no al importar: así no importa el orden en que cargan los módulos.
  llamar: (metodo, ruta, op) => api.llamar(metodo, ruta, op),
});

export const estadoAvisos = avisos.estado;
export const activarAvisos = avisos.activar;
export const renovarAvisos = avisos.renovar;
export const desactivarAvisos = avisos.desactivar;
export const probarAvisos = avisos.probar;

// Antes de cerrar sesión (todavía con el token) se borra este teléfono en la API: así no le
// llegan avisos de la cuenta que se fue. Si no hay señal se cierra igual.
api.antesDeCerrarSesion(() => avisos.desactivar());
/** Qué plataforma de avisos usa esta versión (android o web), por si una pantalla cambia un texto. */
export const plataformaDeAvisos = plataforma.nombre;
