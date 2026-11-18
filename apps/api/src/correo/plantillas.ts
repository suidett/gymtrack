// ─────────────────────────────────────────────────────────────────────────────
// Plantillas de correo · Zona: Correo (API)
//
// Qué hace: arma el asunto, el HTML y el texto plano de cada correo, en español de Chile con
// tuteo y con la marca (menta para la acción, tinta para el texto, Manrope con respaldo del
// sistema). Hoy son dos: bienvenida y recuperación de contraseña (con el enlace y la hora en que
// vence, en la zona del usuario). Todo lo que viene del usuario (el nombre) se escapa.
// Tócalo cuando: cambie un texto o agregues un correo (por ejemplo el resumen semanal, P-33).
// No lo toques para: cómo sale el correo (resend.ts, desarrollo.ts) ni cuándo se manda
// (src/cuentas/servicio.ts).
// Depende de: @gymtrack/tokens (colores de la marca).
// ─────────────────────────────────────────────────────────────────────────────
import { colors } from '@gymtrack/tokens';

export interface Plantilla {
  asunto: string;
  html: string;
  texto: string;
}

// ── Utilidades ───────────────────────────────────────────────────────────────
export function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** «martes 17 de noviembre, 11:00» en la zona del usuario. */
export function fmtVencimiento(fecha: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('es-CL', {
    timeZone: zona, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(fecha);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return `${p('weekday')} ${p('day')} de ${p('month')}, ${p('hour')}:${p('minute')}`;
}

/** El marco con la marca: lo usan estas plantillas y las de los avisos (src/modulos/notificaciones). */
export function marco(titulo: string, cuerpoHtml: string): string {
  return `<!doctype html>
<html lang="es-CL">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:${colors.bg};font-family:Manrope,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:${colors.ink.DEFAULT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${colors.surface};border:1px solid ${colors.line};border-radius:16px;">
        <tr><td style="padding:28px 28px 8px 28px;">
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.2px;color:${colors.ink.DEFAULT};">Gym<span style="color:${colors.primary.DEFAULT};">Track</span></div>
        </td></tr>
        <tr><td style="padding:8px 28px 28px 28px;font-size:16px;line-height:1.55;">
          ${cuerpoHtml}
        </td></tr>
      </table>
      <p style="max-width:520px;font-size:12px;line-height:1.5;color:${colors.ink.muted};margin:16px auto 0 auto;">
        Este correo lo mandó GymTrack porque alguien usó esta dirección en la app. No respondas a este mensaje con tu contraseña: nunca te la vamos a pedir.
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

export function boton(texto: string, url: string): string {
  return `<p style="margin:24px 0;"><a href="${escaparHtml(url)}" style="display:inline-block;background:${colors.primary.DEFAULT};color:${colors.ink.DEFAULT};text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px;">${escaparHtml(texto)}</a></p>`;
}

// ── Bienvenida ───────────────────────────────────────────────────────────────
export function plantillaBienvenida(d: { nombre: string; rol: 'trainer' | 'client' }): Plantilla {
  const asunto = 'Te damos la bienvenida a GymTrack';
  const siguiente = d.rol === 'client'
    ? 'Lo primero es la encuesta inicial: son 10 preguntas y te toma un par de minutos. Con eso se arma tu rutina, la escribas tú o tu entrenador.'
    : 'Desde Clientes puedes generar un código de invitación para que tus alumnos se vinculen contigo y armarles su rutina.';
  const texto = [
    `Hola, ${d.nombre}:`,
    '',
    `Tu cuenta de ${d.rol === 'client' ? 'alumno' : 'entrenador'} en GymTrack ya está lista.`,
    siguiente,
    '',
    'Si no creaste esta cuenta, ignora este correo.',
    '',
    'El equipo de GymTrack',
  ].join('\n');
  const html = marco(asunto, `
          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px 0;">Hola, ${escaparHtml(d.nombre)}</h1>
          <p style="margin:0 0 12px 0;">Tu cuenta de ${d.rol === 'client' ? 'alumno' : 'entrenador'} en GymTrack ya está lista.</p>
          <p style="margin:0 0 12px 0;">${siguiente}</p>
          <p style="margin:16px 0 0 0;color:${colors.ink.muted};font-size:14px;">Si no creaste esta cuenta, ignora este correo.</p>`);
  return { asunto, html, texto };
}

// ── Recuperación de contraseña ───────────────────────────────────────────────
export function plantillaRecuperacion(d: { nombre: string; enlace: string; venceAt: Date; zona: string }): Plantilla {
  const asunto = 'Restablece tu contraseña de GymTrack';
  const vence = fmtVencimiento(d.venceAt, d.zona);
  const texto = [
    `Hola, ${d.nombre}:`,
    '',
    'Pediste restablecer tu contraseña. Abre este enlace para elegir una nueva:',
    d.enlace,
    '',
    `El enlace vence el ${vence} (hora de ${d.zona}) y sirve una sola vez.`,
    'Si no lo pediste tú, ignora este correo: tu contraseña sigue igual.',
    '',
    'El equipo de GymTrack',
  ].join('\n');
  const html = marco(asunto, `
          <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px 0;">Hola, ${escaparHtml(d.nombre)}</h1>
          <p style="margin:0 0 12px 0;">Pediste restablecer tu contraseña. Toca el botón para elegir una nueva.</p>
          ${boton('Elegir contraseña nueva', d.enlace)}
          <p style="margin:0 0 12px 0;">El enlace vence el <strong>${escaparHtml(vence)}</strong> (hora de ${escaparHtml(d.zona)}) y sirve una sola vez.</p>
          <p style="margin:16px 0 0 0;color:${colors.ink.muted};font-size:14px;">Si no lo pediste tú, ignora este correo: tu contraseña sigue igual.</p>`);
  return { asunto, html, texto };
}
