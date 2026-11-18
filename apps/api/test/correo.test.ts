// Módulo de correo sin red: plantillas, adaptador de Resend con un fetch falso (nunca se llama a
// la API real de Resend) y adaptador de consola sin datos personales ni tokens en el log.
import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { crearAdaptadorConsola, crearBuzon } from '../src/correo/desarrollo';
import { escaparHtml, fmtVencimiento, plantillaBienvenida, plantillaRecuperacion } from '../src/correo/plantillas';
import { crearAdaptadorResend, URL_RESEND } from '../src/correo/resend';
import type { CorreoSaliente } from '../src/correo/tipos';

const TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd';
const recuperacion = (): CorreoSaliente => ({
  ...plantillaRecuperacion({
    nombre: 'Martina', enlace: `gymtrack://restablecer?token=${TOKEN}`,
    venceAt: new Date('2026-11-17T14:00:00Z'), zona: 'America/Santiago',
  }),
  para: 'martina.fuentes@gymtrack.test', etiqueta: 'recuperacion', usuarioId: '0192c000-0000-7000-8000-000000000001',
});

describe('plantillas', () => {
  it('la recuperación trae el enlace, la hora de vencimiento en la zona del usuario y tuteo', () => {
    const c = recuperacion();
    expect(c.asunto).toBe('Restablece tu contraseña de GymTrack');
    expect(c.texto).toContain(`gymtrack://restablecer?token=${TOKEN}`);
    expect(c.texto).toContain('martes 17 de noviembre, 11:00');
    expect(c.texto).toContain('Si no lo pediste tú');
    expect(c.html).toContain('#45B392');
    expect(c.html).toContain('lang="es-CL"');
  });
  it('la hora sigue la zona: Punta Arenas está en UTC-3 todo el año', () => {
    expect(fmtVencimiento(new Date('2026-07-01T15:00:00Z'), 'America/Santiago')).toBe('miércoles 1 de julio, 11:00');
    expect(fmtVencimiento(new Date('2026-07-01T15:00:00Z'), 'America/Punta_Arenas')).toBe('miércoles 1 de julio, 12:00');
  });
  it('la bienvenida cambia el siguiente paso según el rol y escapa el nombre', () => {
    const alumno = plantillaBienvenida({ nombre: '<b>Ana</b>', rol: 'client' });
    expect(alumno.html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(alumno.html).not.toContain('<b>Ana</b>');
    expect(alumno.texto).toContain('encuesta inicial');
    expect(plantillaBienvenida({ nombre: 'Camila', rol: 'trainer' }).texto).toContain('código de invitación');
    expect(escaparHtml(`"'&`)).toBe('&quot;&#39;&amp;');
  });
});

describe('adaptador de Resend (fetch falso)', () => {
  it('manda POST a la API de Resend con la clave, el remitente y el correo', async () => {
    const llamadas: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
    const resend = crearAdaptadorResend({
      apiKey: 're_prueba_no_real', remitente: 'GymTrack <hola@gymtrack.test>', responderA: 'equipo@gymtrack.test',
      fetch: async (url, init) => {
        llamadas.push({ url, init });
        return { ok: true, status: 200 };
      },
    });
    await resend.enviar(recuperacion());
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0]!.url).toBe(URL_RESEND);
    expect(llamadas[0]!.init.headers.authorization).toBe('Bearer re_prueba_no_real');
    const body = JSON.parse(llamadas[0]!.init.body);
    expect(body).toMatchObject({
      from: 'GymTrack <hola@gymtrack.test>', to: ['martina.fuentes@gymtrack.test'],
      subject: 'Restablece tu contraseña de GymTrack', reply_to: 'equipo@gymtrack.test',
      tags: [{ name: 'tipo', value: 'recuperacion' }],
    });
    expect(body.html).toContain(TOKEN);
  });
  it('si Resend responde error, falla sin copiar el destinatario al mensaje', async () => {
    const resend = crearAdaptadorResend({ apiKey: 'x', remitente: 'y', fetch: async () => ({ ok: false, status: 422 }) });
    const error = await resend.enviar(recuperacion()).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Resend respondió 422 al enviar recuperacion');
  });
});

describe('adaptador de consola', () => {
  it('guarda el correo en el buzón y loguea solo el tipo, el id y el token enmascarado', async () => {
    const lineas: string[] = [];
    const log = pino({ level: 'info' }, new Writable({ write(t, _e, listo) { lineas.push(String(t)); listo(); } }));
    const buzon = crearBuzon();
    await crearAdaptadorConsola({ log, buzon }).enviar(recuperacion());
    expect(buzon.ultimo('martina.fuentes@gymtrack.test')?.etiqueta).toBe('recuperacion');
    const texto = lineas.join('');
    expect(texto).toContain('recuperacion');
    expect(texto).toContain('0192c000-0000-7000-8000-000000000001');
    expect(texto).toContain('token=AbCd…(42)');
    expect(texto).not.toContain(TOKEN);
    expect(texto).not.toContain('martina.fuentes@gymtrack.test');
    expect(texto).not.toContain('Martina');
  });
});
