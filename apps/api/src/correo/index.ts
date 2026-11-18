// ─────────────────────────────────────────────────────────────────────────────
// Servicio de correo · Zona: Correo (API)
//
// Qué hace: elige el adaptador según CORREO_DRIVER (resend o smtp, que es Gmail con clave de
// aplicación, en staging y producción; consola en local; memoria en pruebas) y manda los correos
// en segundo plano: la ruta responde sin esperar a Resend ni a Gmail. Con prepararEnSegundoPlano también la búsqueda, lo que se guarda y el armado del
// correo pasan fuera del pedido, así «olvidé mi contraseña» hace el mismo trabajo exista o no el
// correo (SEG-008). Si algo falla, se loguea el tipo de correo, el id del usuario y el tipo y
// código del error, nunca el correo ni el mensaje del error.
// Tócalo cuando: agregues un adaptador o cambie cómo se reintenta.
// No lo toques para: el texto de los correos (plantillas.ts).
// Depende de: ./resend, ./smtp, ./desarrollo, ./tipos y la configuración (src/config.ts).
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from '../config';
import { resumenError } from '../errores';
import { crearAdaptadorConsola, crearAdaptadorMemoria, crearBuzon, type Buzon } from './desarrollo';
import { crearAdaptadorResend } from './resend';
import { crearAdaptadorSmtp } from './smtp';
import type { AdaptadorCorreo, CorreoSaliente, EtiquetaCorreo } from './tipos';

export type { CorreoSaliente } from './tipos';

export interface ServicioCorreo {
  readonly adaptador: AdaptadorCorreo;
  /** El buzón en memoria (consola y memoria). Con Resend o SMTP es undefined. */
  readonly buzon?: Buzon;
  /** Encola el envío y vuelve de inmediato. */
  enviarEnSegundoPlano(correo: CorreoSaliente): void;
  /**
   * Corre `preparar` después de responder (buscar al usuario, guardar el enlace, armar el correo)
   * y, si devuelve un correo, lo envía. Vuelve de inmediato: el pedido cuesta lo mismo haya o no
   * correo que mandar.
   */
  prepararEnSegundoPlano(etiqueta: EtiquetaCorreo, preparar: () => Promise<CorreoSaliente | undefined>): void;
  /** Espera a que terminen los envíos encolados (lo usan las pruebas y el apagado ordenado). */
  esperarPendientes(): Promise<void>;
}

export function crearServicioCorreo(opciones: {
  adaptador: AdaptadorCorreo;
  buzon?: Buzon;
  log: FastifyBaseLogger;
}): ServicioCorreo {
  const pendientes = new Set<Promise<void>>();
  function enFondo(etiqueta: EtiquetaCorreo, preparar: () => Promise<CorreoSaliente | undefined>) {
    let usuarioId: string | undefined;
    // setImmediate: el trabajo empieza después de que la respuesta salió.
    const p = new Promise<void>((listo) => setImmediate(listo))
      .then(preparar)
      .then(async (correo) => {
        if (!correo) return;
        usuarioId = correo.usuarioId;
        await opciones.adaptador.enviar(correo);
      })
      .catch((err: unknown) => {
        opciones.log.error({ correo: etiqueta, usuario_id: usuarioId, error: resumenError(err) }, 'no se pudo enviar el correo');
      })
      .finally(() => pendientes.delete(p));
    pendientes.add(p);
  }
  return {
    adaptador: opciones.adaptador,
    buzon: opciones.buzon,
    enviarEnSegundoPlano(correo) {
      enFondo(correo.etiqueta, async () => correo);
    },
    prepararEnSegundoPlano: enFondo,
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
  // Gmail con clave de aplicación (src/correo/smtp.ts). config.ts ya exigió usuario y clave.
  if (config.correo.driver === 'smtp' && config.correo.smtp) {
    return {
      adaptador: crearAdaptadorSmtp({
        ...config.correo.smtp,
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
