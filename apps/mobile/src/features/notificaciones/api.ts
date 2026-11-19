// ─────────────────────────────────────────────────────────────────────────────
// Llamadas de la campana · Zona: Notificaciones (app)
//
// Qué hace: las tres llamadas de las notificaciones dentro de la app, sobre una función `llamar`
// inyectada (en el teléfono, api.llamar de @/lib/sesion, que pone el Bearer y renueva el token;
// en las pruebas, una falsa):
//   listar(antes?)   GET  /v1/notificaciones?limite=30[&antes=<iso>]  la página y cuántas sin leer
//   leer(id)         POST /v1/notificaciones/:id/leer                  marca una leída
//   leerTodas()      POST /v1/notificaciones/leer-todas                marca todas
// Las respuestas se validan con los esquemas de @gymtrack/shared (los mismos de la API).
// Tócalo cuando: cambie una ruta, su consulta o cuántas se piden por página.
// No lo toques para: qué hace la app con la respuesta (./almacen.ts).
// Depende de: @gymtrack/shared (RUTAS_NOTIFICACIONES y sus esquemas).
// ─────────────────────────────────────────────────────────────────────────────
import {
  RUTAS_NOTIFICACIONES as R,
  type ListaNotificaciones,
  type NotificacionesLeidas,
  type NotificacionLeida,
} from '@gymtrack/shared';

/** La forma de api.llamar de @/lib/sesion (sin importar el gestor, para probar en Node). */
export type Llamar = <T = unknown>(
  metodo: string,
  ruta: string,
  op?: { cuerpo?: unknown; consulta?: Record<string, string | number | boolean | undefined | null>; esquema?: { parse(d: unknown): T } },
) => Promise<T>;

/** Cuántas trae cada página: una pantalla y media de notificaciones (la API acepta hasta 50). */
export const POR_PAGINA = 30;

export interface ApiNotificaciones {
  listar(antes?: string): Promise<ListaNotificaciones>;
  leer(id: string): Promise<NotificacionLeida>;
  leerTodas(): Promise<NotificacionesLeidas>;
}

export function crearApiNotificaciones(llamar: Llamar): ApiNotificaciones {
  return {
    listar: (antes) =>
      llamar(R.listar.metodo, R.listar.ruta, { consulta: { limite: POR_PAGINA, antes }, esquema: R.listar.respuesta }),
    leer: (id) =>
      llamar(R.leer.metodo, R.leer.ruta.replace(':id', encodeURIComponent(id)), { esquema: R.leer.respuesta }),
    leerTodas: () => llamar(R.leerTodas.metodo, R.leerTodas.ruta, { esquema: R.leerTodas.respuesta }),
  };
}
