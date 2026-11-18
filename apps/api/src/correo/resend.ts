// ─────────────────────────────────────────────────────────────────────────────
// Adaptador de Resend · Zona: Correo (API)
//
// Qué hace: manda el correo por la API HTTPS de Resend (POST https://api.resend.com/emails) con
// la clave RESEND_API_KEY y el remitente CORREO_REMITENTE, que tiene que ser de un dominio
// verificado en Resend (ver apps/api/README.md). Es uno de los dos adaptadores de staging y
// producción; el otro es Gmail por SMTP con clave de aplicación (./smtp.ts, CORREO_DRIVER=smtp).
// Cada intento tiene 10 s de tope (AbortSignal.timeout) y, si falla por red, por tiempo, por un
// 5xx o por un 429, se reintenta una vez con la misma Idempotency-Key, así Resend no lo manda dos
// veces si el primero sí llegó. Un 4xx (clave mala, remitente sin verificar) no se reintenta.
// Tócalo cuando: Resend cambie su API o quieras mandar etiquetas o cabeceras nuevas.
// No lo toques para: el texto de los correos (plantillas.ts). Las pruebas no llaman a Resend:
// le pasan un fetch falso y revisan lo que se habría enviado.
// Depende de: ./tipos y el fetch global de Node 22.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from 'node:crypto';
import type { AdaptadorCorreo, CorreoSaliente } from './tipos';

type FetchResend = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number }>;

export const URL_RESEND = 'https://api.resend.com/emails';
export const TOPE_RESEND_MS = 10_000;
export const INTENTOS_RESEND = 2;

/** Error de envío con un código corto para el log (RESEND_422, RESEND_TIEMPO, RESEND_RED). */
export class ErrorResend extends Error {
  readonly code: string;
  constructor(etiqueta: string, estado?: number, causa?: unknown) {
    super(estado ? `Resend respondió ${estado} al enviar ${etiqueta}` : `Resend no respondió al enviar ${etiqueta}`);
    this.name = 'ErrorResend';
    const porTiempo = causa instanceof Error && (causa.name === 'TimeoutError' || causa.name === 'AbortError');
    this.code = estado ? `RESEND_${estado}` : porTiempo ? 'RESEND_TIEMPO' : 'RESEND_RED';
  }
}

export function crearAdaptadorResend(opciones: {
  apiKey: string;
  remitente: string;
  responderA?: string;
  fetch?: FetchResend;
  /** Espera antes del reintento (por defecto 1 s; las pruebas usan 0). */
  pausaReintentoMs?: number;
}): AdaptadorCorreo {
  const hacerFetch: FetchResend = opciones.fetch ?? ((url, init) => fetch(url, init));
  const pausa = opciones.pausaReintentoMs ?? 1000;
  return {
    nombre: 'resend',
    async enviar(correo: CorreoSaliente) {
      const headers = {
        authorization: `Bearer ${opciones.apiKey}`,
        'content-type': 'application/json',
        'idempotency-key': `gymtrack-${correo.etiqueta}-${randomUUID()}`,
      };
      const body = JSON.stringify({
        from: opciones.remitente,
        to: [correo.para],
        subject: correo.asunto,
        html: correo.html,
        text: correo.texto,
        ...(opciones.responderA ? { reply_to: opciones.responderA } : {}),
        tags: [{ name: 'tipo', value: correo.etiqueta }],
      });
      let error: ErrorResend | undefined;
      for (let intento = 1; intento <= INTENTOS_RESEND; intento++) {
        if (intento > 1 && pausa > 0) await new Promise((listo) => setTimeout(listo, pausa));
        let res: { ok: boolean; status: number };
        try {
          res = await hacerFetch(URL_RESEND, { method: 'POST', headers, body, signal: AbortSignal.timeout(TOPE_RESEND_MS) });
        } catch (err) {
          error = new ErrorResend(correo.etiqueta, undefined, err);
          continue;
        }
        if (res.ok) return;
        // El cuerpo de la respuesta de Resend puede traer el destinatario: no se copia al error.
        error = new ErrorResend(correo.etiqueta, res.status);
        if (res.status < 500 && res.status !== 429) break;
      }
      throw error!;
    },
  };
}
