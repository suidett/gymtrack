// ─────────────────────────────────────────────────────────────────────────────
// Envío de la cola · Zona: Entrenar
//
// Qué hace: convierte cada entrada de la cola en sus llamadas a la API: iniciar es
// POST /sessions; series, PUT /sessions/:id/sets; cerrar, las tres seguidas (crear, series y
// cerrar, que la API acepta repetidas sin duplicar: INT-087, INT-092, INT-100) y devuelve el
// resumen del servidor; descartar, POST /sessions/:id/discard; observación, POST /observations.
// Tócalo cuando: cambie una ruta o se pase a mandar las sesiones cerradas en lote por
// POST /sync/sessions (P-18: un resultado por sesión).
// No lo toques para: el orden y los reintentos (cola.ts).
// Depende de: ./cola, ./contrato y @gymtrack/shared (ErrorDeApi). Es puro: `llamar` viene de afuera
// (en la app, api.llamar de @/lib/sesion).
// ─────────────────────────────────────────────────────────────────────────────
import { ErrorDeApi } from '@gymtrack/shared';
import type { Enviar, OpCola } from './cola';
import { RUTAS_APP } from './contrato';

export type Llamar = (metodo: string, ruta: string, op?: { cuerpo?: unknown }) => Promise<unknown>;

/** Arma la función que manda una entrada. Devuelve el JSON de la última llamada. */
export function crearEnvio(llamar: Llamar): Enviar {
  return async (op: OpCola) => {
    switch (op.tipo) {
      case 'iniciar':
        return llamar('POST', RUTAS_APP.crear, { cuerpo: op.cuerpo });
      case 'series':
        return llamar('PUT', RUTAS_APP.series(op.session_id), { cuerpo: op.cuerpo });
      case 'cerrar': {
        await llamar('POST', RUTAS_APP.crear, { cuerpo: op.crear });
        try {
          await llamar('PUT', RUTAS_APP.series(op.session_id), { cuerpo: op.series });
        } catch (e) {
          // Ya estaba cerrada desde este teléfono (un reintento): cerrar devuelve el mismo resumen.
          if (!(e instanceof ErrorDeApi && e.codigo === 'SESSION_CLOSED')) throw e;
        }
        return llamar('POST', RUTAS_APP.cerrar(op.session_id), { cuerpo: op.cerrar });
      }
      case 'descartar':
        return llamar('POST', RUTAS_APP.descartar(op.session_id));
      case 'observacion':
        return llamar('POST', RUTAS_APP.observaciones, { cuerpo: op.cuerpo });
    }
  };
}
