// ─────────────────────────────────────────────────────────────────────────────
// Adaptador SMTP (Gmail con clave de aplicación) · Zona: Correo (API)
//
// Qué hace: manda el correo por SMTP con nodemailer. Está pensado para Gmail: smtp.gmail.com,
// puerto 465 con TLS desde el primer byte, el usuario es la cuenta de Gmail y la clave es una
// clave de aplicación de Google (16 letras), nunca la contraseña de la cuenta. Con 587 usa
// STARTTLS y exige que el servidor lo ofrezca. Usa las mismas plantillas que Resend.
// Cada intento tiene tope de tiempo (conectar, saludo y socket) y, si falla por red, por tiempo o
// por una respuesta temporal (4xx de SMTP), se reintenta una vez. Una respuesta permanente
// (535 clave mala, 550 destinatario) no se reintenta.
// La clave nunca sale de aquí: el error que sube tiene un código corto (SMTP_EAUTH, SMTP_535,
// SMTP_TIEMPO, SMTP_RED) y un mensaje sin la clave, sin el destinatario y sin lo que respondió
// el servidor; el logger de nodemailer va apagado.
// Tócalo cuando: cambie el proveedor SMTP o quieras otro tope o reintento.
// No lo toques para: el texto de los correos (plantillas.ts) ni para elegir el adaptador (index.ts).
// Las pruebas no se conectan a Gmail: le pasan un transporte falso y revisan lo que se habría
// enviado (test/notificaciones-correo.test.ts).
// Depende de: ./tipos y nodemailer.
// ─────────────────────────────────────────────────────────────────────────────
import { createTransport } from 'nodemailer';
import type { AdaptadorCorreo, CorreoSaliente } from './tipos';

/** Lo que el adaptador necesita de nodemailer (las pruebas pasan uno falso). */
export interface TransporteSmtp {
  sendMail(mensaje: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    replyTo?: string;
    headers?: Record<string, string>;
  }): Promise<unknown>;
}

export interface OpcionesSmtp {
  host: string;
  puerto: number;
  usuario: string;
  /** La clave de aplicación de Google. No se loguea nunca. */
  clave: string;
  remitente: string;
  responderA?: string;
  /** Para las pruebas: un transporte falso en vez de nodemailer. */
  transporte?: TransporteSmtp;
  /** Espera antes del reintento (por defecto 1 s; las pruebas usan 0). */
  pausaReintentoMs?: number;
}

/** Tope de cada etapa de un intento: conectar, el saludo del servidor y el socket quieto. */
export const TOPE_SMTP_MS = 10_000;
export const INTENTOS_SMTP = 2;

/** Error de envío con un código corto para el log. Nunca lleva la clave ni el destinatario. */
export class ErrorSmtp extends Error {
  readonly code: string;
  readonly reintentable: boolean;
  constructor(etiqueta: string, codigo: string, reintentable: boolean) {
    super(`SMTP no aceptó el correo ${etiqueta} (${codigo})`);
    this.name = 'ErrorSmtp';
    this.code = codigo;
    this.reintentable = reintentable;
  }
}

/** Traduce un error de nodemailer a ErrorSmtp sin copiar su mensaje (puede traer la respuesta del servidor). */
export function clasificarErrorSmtp(err: unknown, etiqueta: string): ErrorSmtp {
  const e = (typeof err === 'object' && err !== null ? err : {}) as { code?: unknown; responseCode?: unknown };
  const respuesta = typeof e.responseCode === 'number' ? e.responseCode : undefined;
  const codigo = typeof e.code === 'string' ? e.code : undefined;
  if (codigo === 'EAUTH') return new ErrorSmtp(etiqueta, respuesta ? `SMTP_${respuesta}` : 'SMTP_EAUTH', false);
  if (respuesta !== undefined) return new ErrorSmtp(etiqueta, `SMTP_${respuesta}`, respuesta >= 400 && respuesta < 500);
  if (codigo === 'ETIMEDOUT') return new ErrorSmtp(etiqueta, 'SMTP_TIEMPO', true);
  if (codigo === 'ECONNECTION' || codigo === 'ESOCKET' || codigo === 'EDNS' || codigo === 'ECONNRESET' || codigo === 'ECONNREFUSED') {
    return new ErrorSmtp(etiqueta, 'SMTP_RED', true);
  }
  return new ErrorSmtp(etiqueta, codigo ? `SMTP_${codigo}` : 'SMTP_DESCONOCIDO', false);
}

/** El transporte de nodemailer con los topes de tiempo y TLS obligatorio. */
export function crearTransporteNodemailer(o: Pick<OpcionesSmtp, 'host' | 'puerto' | 'usuario' | 'clave'>): TransporteSmtp {
  const implicito = o.puerto === 465;
  return createTransport({
    host: o.host,
    port: o.puerto,
    secure: implicito,
    requireTLS: !implicito,
    auth: { user: o.usuario, pass: o.clave },
    connectionTimeout: TOPE_SMTP_MS,
    greetingTimeout: TOPE_SMTP_MS,
    socketTimeout: TOPE_SMTP_MS,
    dnsTimeout: TOPE_SMTP_MS,
    // Sin logger ni debug: lo que nodemailer escribiría puede traer la conversación SMTP.
    logger: false,
    debug: false,
    tls: { minVersion: 'TLSv1.2', servername: o.host },
  });
}

export function crearAdaptadorSmtp(opciones: OpcionesSmtp): AdaptadorCorreo {
  const transporte = opciones.transporte ?? crearTransporteNodemailer(opciones);
  const pausa = opciones.pausaReintentoMs ?? 1000;
  return {
    nombre: 'smtp',
    async enviar(correo: CorreoSaliente) {
      const mensaje = {
        from: opciones.remitente,
        to: correo.para,
        subject: correo.asunto,
        text: correo.texto,
        html: correo.html,
        ...(opciones.responderA ? { replyTo: opciones.responderA } : {}),
        headers: { 'X-GymTrack-Tipo': correo.etiqueta },
      };
      let error: ErrorSmtp | undefined;
      for (let intento = 1; intento <= INTENTOS_SMTP; intento++) {
        if (intento > 1 && pausa > 0) await new Promise((listo) => setTimeout(listo, pausa));
        try {
          await transporte.sendMail(mensaje);
          return;
        } catch (err) {
          error = clasificarErrorSmtp(err, correo.etiqueta);
          if (!error.reintentable) break;
        }
      }
      throw error!;
    },
  };
}
