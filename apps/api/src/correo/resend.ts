// ─────────────────────────────────────────────────────────────────────────────
// Adaptador de Resend · Zona: Correo (API)
//
// Qué hace: manda el correo por la API HTTPS de Resend (POST https://api.resend.com/emails) con
// la clave RESEND_API_KEY y el remitente CORREO_REMITENTE, que tiene que ser de un dominio
// verificado en Resend (ver apps/api/README.md). Es el adaptador de staging y producción; nunca
// se usa SMTP directo desde el VPS (infraestructura-vps-firebase.md).
// Tócalo cuando: Resend cambie su API o quieras mandar etiquetas o cabeceras nuevas.
// No lo toques para: el texto de los correos (plantillas.ts). Las pruebas no llaman a Resend:
// le pasan un fetch falso y revisan lo que se habría enviado.
// Depende de: ./tipos y el fetch global de Node 22.
// ─────────────────────────────────────────────────────────────────────────────
import type { AdaptadorCorreo, CorreoSaliente } from './tipos';

type FetchResend = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
  Promise<{ ok: boolean; status: number }>;

export const URL_RESEND = 'https://api.resend.com/emails';

export function crearAdaptadorResend(opciones: {
  apiKey: string;
  remitente: string;
  responderA?: string;
  fetch?: FetchResend;
}): AdaptadorCorreo {
  const hacerFetch: FetchResend = opciones.fetch ?? ((url, init) => fetch(url, init));
  return {
    nombre: 'resend',
    async enviar(correo: CorreoSaliente) {
      const res = await hacerFetch(URL_RESEND, {
        method: 'POST',
        headers: { authorization: `Bearer ${opciones.apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          from: opciones.remitente,
          to: [correo.para],
          subject: correo.asunto,
          html: correo.html,
          text: correo.texto,
          ...(opciones.responderA ? { reply_to: opciones.responderA } : {}),
          tags: [{ name: 'tipo', value: correo.etiqueta }],
        }),
      });
      // El cuerpo de la respuesta de Resend puede traer el destinatario: no se copia al error.
      if (!res.ok) throw new Error(`Resend respondió ${res.status} al enviar ${correo.etiqueta}`);
    },
  };
}
