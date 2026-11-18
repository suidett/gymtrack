// ─────────────────────────────────────────────────────────────────────────────
// Servicio de correo · Zona: Correo (API)
//
// Qué hace: elige el adaptador según CORREO_DRIVER (resend en staging y producción; consola en
// local; memoria en pruebas) y manda los correos en segundo plano: la ruta responde sin esperar
// a Resend, así «olvidé mi contraseña» tarda lo mismo exista o no el correo (SEG-008). Si el
// envío falla, se loguea con el tipo y el id del usuario, nunca con el correo.
// Tócalo cuando: agregues un adaptador o cambie cómo se reintenta.
// No lo toques para: el texto de los correos (plantillas.ts).
// Depende de: ./resend, ./desarrollo, ./tipos y la configuración (src/config.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../config';
import { crearAdaptadorConsola, crearAdaptadorMemoria, crearBuzon, type Buzon } from './desarrollo';
import { crearAdaptadorResend } from './resend';
import type { AdaptadorCorreo, CorreoSaliente } from './tipos';

export type { CorreoSaliente } from './tipos';

export interface ServicioCorreo {
  readonly adaptador: AdaptadorCorreo;
  /** El buzón en memoria (consola y memoria). Con Resend es undefined. */
  readonly buzon?: Buzon;
  /** Encola el envío y vuelve de inmediato. */
  enviarEnSegundoPlano(correo: CorreoSaliente): void;
  /** Espera a que terminen los envíos encolados (lo usan las pruebas y el apagado ordenado). */
  esperarPendientes(): Promise<void>;
}

export function crearServicioCorreo(opciones: {
  adaptador: AdaptadorCorreo;
  buzon?: Buzon;
  log: FastifyBaseLogger;
}): ServicioCorreo {
  const pendientes = new Set<Promise<void>>();
  return {
    adaptador: opciones.adaptador,
    buzon: opciones.buzon,
    enviarEnSegundoPlano(correo) {
      const p = opciones.adaptador
        .enviar(correo)
        .catch((err: unknown) => {
          opciones.log.error(
            { correo: correo.etiqueta, usuario_id: correo.usuarioId, motivo: err instanceof Error ? err.message : 'desconocido' },
            'no se pudo enviar el correo',
          );
        })
        .finally(() => pendientes.delete(p));
      pendientes.add(p);
    },
    async esperarPendientes() {
      await Promise.all([...pendientes]);
    },
  };
}

/** Arma el adaptador que pide la configuración. */
export function adaptadorDesdeConfig(config: Config, log: FastifyBaseLogger): { adaptador: AdaptadorCorreo; buzon?: Buzon } {
  if (config.correo.driver === 'resend') {
    return {
      adaptador: crearAdaptadorResend({
        apiKey: config.correo.resendApiKey!,
        remitente: config.correo.remitente,
        responderA: config.correo.responderA,
      }),
    };
  }
  const buzon = crearBuzon();
  if (config.correo.driver === 'consola') {
    return { adaptador: crearAdaptadorConsola({ log, carpeta: process.env.CORREO_CARPETA, buzon }), buzon };
  }
  return { adaptador: crearAdaptadorMemoria(buzon), buzon };
}
